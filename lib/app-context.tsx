'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { get, set, del } from 'idb-keyval';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import {
  getCategoryIcon,
  normalizePhone,
  isValidIndianMobile,
  parseRawNumber,
  formatIndianNumber,
  money,
  // recoverOrphanCategories, // disabled — see lib/utils.ts
  mergeCategoryDefs,
} from '@/lib/utils';
import { useExpenses } from '@/lib/store';
import { toast, ToastHost } from '@/components/ToastHost';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppContextValue {
  // Auth
  userId: string;
  phone: string;
  setPhone: (v: string) => void;
  initializing: boolean;
  needsIncome: boolean;
  continueWithPhone: () => Promise<void>;

  // Expenses
  expenses: Expense[];
  add: (expense: Expense) => void;
  handleDeleteExpense: (id: string) => void;
  addExpense: (category: CategoryId, preset?: Partial<Expense>) => void;
  updateExpense: (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: CategoryId;
      date: string;
    }
  ) => void;
  amount: string;
  setAmount: (v: string) => void;
  parseAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  undo: Expense | null;
  setUndo: (e: Expense | null) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;

  // Income
  income: number;
  setIncome: (v: number) => void;
  incomeDraft: string;
  setIncomeDraft: (v: string) => void;
  saveIncome: () => Promise<void>;

  // Monthly spend budget (analytics only — does not cap logging)
  budget: number;
  setBudget: (v: number) => void;
  budgetDraft: string;
  setBudgetDraft: (v: string) => void;
  saveBudget: () => Promise<void>;
  /** First-run onboarding: save income (+ optional budget) and dismiss */
  completeOnboarding: () => Promise<void>;
  /** First-run onboarding: dismiss without setting targets */
  skipOnboarding: () => Promise<void>;

  // Categories
  allCategories: Category[];
  customCategories: Category[];
  categoryOverrides: Record<string, string>;
  categoryIconOverrides: Record<string, string>;
  categoryDialog: boolean;
  setCategoryDialog: (v: boolean) => void;
  categoryName: string;
  setCategoryName: (v: string) => void;
  selectedTone: string;
  setSelectedTone: (v: string) => void;
  selectedIconName: string;
  setSelectedIconName: (v: string) => void;
  addCategory: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, label: string) => Promise<void>;
  updateCategoryColor: (id: string, tone: string) => Promise<void>;
  updateCategoryIcon: (id: string, iconName: string) => Promise<void>;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;

  // Privacy — hide ₹ amounts from peeking eyes (no lock)
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
  screenObscured: boolean;

  // Sync / network
  online: boolean;
  syncing: boolean;
  /** False until Mongo (or offline IndexedDB fallback) has been applied */
  profileHydrated: boolean;
  error: string;
  sync: (
    id?: string,
    local?: Expense[],
    /** Pass a number to push income; null/omit to leave cloud income unchanged */
    profileIncome?: number | null,
    /** Pass an array to push categories; null/omit to leave cloud categories unchanged */
    profileCategories?: Category[] | null,
    deletedIds?: string[],
    /** Pass a number to push budget; null/omit to leave cloud budget unchanged */
    profileBudget?: number | null,
    /** Pass boolean to push hide-amounts preference; null to leave unchanged */
    profileHideAmounts?: boolean | null,
    /** Pass a record to push color overrides; null to leave unchanged */
    profileCategoryOverrides?: Record<string, string> | null,
    /** Pass a record to push icon overrides; null to leave unchanged */
    profileCategoryIconOverrides?: Record<string, string> | null,
    /** Pass true when first-run onboarding is finished or skipped */
    profileOnboardingComplete?: boolean | null
  ) => Promise<boolean>;

  // Derived
  monthSpend: number;
  byCategory: (Category & { total: number })[];
  today: Expense[];

  // Identity reset
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const { expenses, add, update, remove, hydrated, hydrate } = useExpenses();

  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [needsIncome, setNeedsIncome] = useState(false);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<Expense | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [income, setIncome] = useState(0);
  const [incomeDraft, setIncomeDraft] = useState('');
  const [budget, setBudget] = useState(0);
  const [budgetDraft, setBudgetDraft] = useState('');

  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const customCategoriesRef = useRef<Category[]>([]);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [selectedTone, setSelectedTone] = useState('mint');
  const [selectedIconName, setSelectedIconName] = useState('plus');
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string>
  >({});
  const categoryOverridesRef = useRef<Record<string, string>>({});
  const [categoryIconOverrides, setCategoryIconOverrides] = useState<
    Record<string, string>
  >({});
  const categoryIconOverridesRef = useRef<Record<string, string>>({});

  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [hideAmounts, setHideAmountsState] = useState(false);
  const [screenObscured, setScreenObscured] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const initialSyncDoneFor = useRef<string | null>(null);
  const bootstrapInflight = useRef<Promise<boolean> | null>(null);
  const bootstrapInflightFor = useRef<string | null>(null);
  const expensesRef = useRef(expenses);
  const pendingDeletedIdsRef = useRef(pendingDeletedIds);
  // const recoveringCategories = useRef(false); // disabled — see lib/utils.ts

  useEffect(() => {
    customCategoriesRef.current = customCategories;
  }, [customCategories]);

  useEffect(() => {
    categoryOverridesRef.current = categoryOverrides;
  }, [categoryOverrides]);

  useEffect(() => {
    categoryIconOverridesRef.current = categoryIconOverrides;
  }, [categoryIconOverrides]);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    pendingDeletedIdsRef.current = pendingDeletedIds;
  }, [pendingDeletedIds]);

  const persistCustomCategories = useCallback(
    async (id: string, next: Category[]) => {
      setCustomCategories(next);
      customCategoriesRef.current = next;
      await set(
        `pocket-categories-${id}`,
        next.map(({ id: catId, label, tone, iconName, custom }) => ({
          id: catId,
          label,
          tone,
          iconName,
          custom,
        }))
      );
    },
    []
  );

  const persistToneOverrides = useCallback(
    async (id: string, next: Record<string, string>) => {
      setCategoryOverrides(next);
      categoryOverridesRef.current = next;
      await set(`pocket-cat-overrides-${id}`, next);
    },
    []
  );

  const persistIconOverrides = useCallback(
    async (id: string, next: Record<string, string>) => {
      setCategoryIconOverrides(next);
      categoryIconOverridesRef.current = next;
      await set(`pocket-cat-icon-overrides-${id}`, next);
    },
    []
  );

  const bakeCategoryStyles = useCallback(
    (
      cats: Category[],
      tones: Record<string, string> = categoryOverridesRef.current,
      icons: Record<string, string> = categoryIconOverridesRef.current
    ) =>
      cats.map((c) => ({
        ...c,
        tone: tones[c.id] ?? c.tone,
        iconName: icons[c.id] ?? c.iconName,
        Icon: getCategoryIcon({
          iconName: icons[c.id] ?? c.iconName,
        }),
      })),
    []
  );

  // ── Theme ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('pocket-theme') as
      'dark' | 'light' | null;
    setThemeState(saved === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('pocket-theme', theme);
  }, [theme]);

  const setTheme = (t: 'dark' | 'light') => setThemeState(t);

  // Obscure UI before OS captures app-switcher / multitasking preview
  useEffect(() => {
    const onVisibility = () => setScreenObscured(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── Session restore ───────────────────────────────────────────────────────

  useEffect(() => {
    get<string>('pocket-user-id').then((saved) => {
      if (saved) setUserId(saved);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (hydrated && userId) set(`pocket-expenses-${userId}`, expenses);
  }, [expenses, hydrated, userId]);

  // Persist deletions still awaiting a successful sync so an offline delete
  // survives an app restart instead of being forgotten and resurrected by
  // the next bootstrap pull from Mongo.
  useEffect(() => {
    if (userId) set(`pocket-pending-deleted-${userId}`, pendingDeletedIds);
  }, [pendingDeletedIds, userId]);

  // ── Sync ─────────────────────────────────────────────────────────────────

  const sync = useCallback(
    async (
      id = userId,
      local = expensesRef.current,
      // null = do not push (avoids overwriting cloud with defaults / stale local)
      profileIncome: number | null = null,
      // null = do not push categories (avoids wiping cloud customs with [])
      profileCategories: Category[] | null = null,
      deletedIds = pendingDeletedIdsRef.current,
      profileBudget: number | null = null,
      profileHideAmounts: boolean | null = null,
      profileCategoryOverrides: Record<string, string> | null = null,
      profileCategoryIconOverrides: Record<string, string> | null = null,
      profileOnboardingComplete: boolean | null = null
    ): Promise<boolean> => {
      if (!id) return false;
      setSyncing(true);
      setError('');
      try {
        const payload: Record<string, unknown> = {
          userId: id,
          expenses: local,
          deletedIds,
        };
        // Only push categories when explicitly provided (add/delete/rename/recover/styles)
        if (profileCategories !== null) {
          payload.categories = bakeCategoryStyles(profileCategories).map(
            ({ id: catId, label, tone, iconName, custom }) => ({
              id: catId,
              label,
              tone,
              iconName,
              custom,
            })
          );
        }
        if (profileCategoryOverrides !== null) {
          payload.categoryOverrides = profileCategoryOverrides;
        }
        if (profileCategoryIconOverrides !== null) {
          payload.categoryIconOverrides = profileCategoryIconOverrides;
        }
        // Only push profile money fields when explicitly provided
        if (typeof profileIncome === 'number' && profileIncome > 0) {
          payload.monthlyIncome = profileIncome;
        }
        if (typeof profileBudget === 'number' && profileBudget > 0) {
          payload.monthlyBudget = profileBudget;
        }
        if (typeof profileHideAmounts === 'boolean') {
          payload.hideAmounts = profileHideAmounts;
        }
        if (typeof profileOnboardingComplete === 'boolean') {
          payload.onboardingComplete = profileOnboardingComplete;
        }

        const response = await fetch('/api/expenses/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        const deletedIdSet = new Set(deletedIds);

        if (deletedIds.length > 0) {
          setPendingDeletedIds((prev) =>
            prev.filter((item) => !deletedIdSet.has(item))
          );
        }

        if (Array.isArray(data.expenses)) {
          const activeExpenses: Expense[] = [];
          for (const e of data.expenses as Expense[]) {
            const id = e.localId ?? e.id;
            if (deletedIdSet.has(id) || e.deletedAt) continue;
            activeExpenses.push({
              ...e,
              id,
              amount: Number(e.amount) || 0,
              syncStatus: 'synced' as const,
            });
          }
          hydrate(activeExpenses);
        }

        // Mongo is source of truth for income / budget / privacy
        const cloudIncome =
          typeof data.profile?.monthlyIncome === 'number' &&
          data.profile.monthlyIncome > 0
            ? data.profile.monthlyIncome
            : 0;
        const cloudExpenseCount = Array.isArray(data.expenses)
          ? data.expenses.length
          : 0;
        const onboardingDone = data.profile?.onboardingComplete === true;

        if (cloudIncome > 0) {
          setIncome(cloudIncome);
          setIncomeDraft(String(cloudIncome));
          await set(`pocket-income-${id}`, cloudIncome);
          setNeedsIncome(false);
        } else if (cloudExpenseCount > 0 || onboardingDone) {
          // Returning user with no income set — stay at ₹0, no onboarding wall
          setIncome(0);
          setIncomeDraft('');
          await set(`pocket-income-${id}`, 0);
          setNeedsIncome(false);
        } else {
          const [localIncome, localDone, localExpenses] = await Promise.all([
            get<number>(`pocket-income-${id}`),
            get<boolean>(`pocket-onboarding-complete-${id}`),
            get<Expense[]>(`pocket-expenses-${id}`),
          ]);
          if (typeof localIncome === 'number' && localIncome > 0) {
            setIncome(localIncome);
            setIncomeDraft(String(localIncome));
            setNeedsIncome(false);
          } else if (
            localDone ||
            (Array.isArray(localExpenses) && localExpenses.length > 0)
          ) {
            setIncome(0);
            setIncomeDraft('');
            setNeedsIncome(false);
          } else {
            setIncome(0);
            setIncomeDraft('');
            setNeedsIncome(true);
          }
        }

        if (onboardingDone) {
          await set(`pocket-onboarding-complete-${id}`, true);
        }

        if (
          typeof data.profile?.monthlyBudget === 'number' &&
          data.profile.monthlyBudget > 0
        ) {
          setBudget(data.profile.monthlyBudget);
          setBudgetDraft(String(data.profile.monthlyBudget));
          await set(`pocket-budget-${id}`, data.profile.monthlyBudget);
        } else {
          // No budget in Mongo — clear local so devices don't keep a ghost amount
          setBudget(0);
          setBudgetDraft('');
          await set(`pocket-budget-${id}`, 0);
        }

        if (typeof data.profile?.hideAmounts === 'boolean') {
          setHideAmountsState(data.profile.hideAmounts);
          await set(`pocket-hide-amounts-${id}`, data.profile.hideAmounts);
        }

        // Color / icon overrides — empty cloud must never wipe local styles
        const cloudToneOverrides =
          data.profile?.categoryOverrides &&
          typeof data.profile.categoryOverrides === 'object'
            ? (data.profile.categoryOverrides as Record<string, string>)
            : {};
        const cloudIconOverrides =
          data.profile?.categoryIconOverrides &&
          typeof data.profile.categoryIconOverrides === 'object'
            ? (data.profile.categoryIconOverrides as Record<string, string>)
            : {};

        if (profileCategoryOverrides !== null) {
          await persistToneOverrides(id, profileCategoryOverrides);
        } else if (Object.keys(cloudToneOverrides).length > 0) {
          await persistToneOverrides(id, {
            ...categoryOverridesRef.current,
            ...cloudToneOverrides,
          });
        }

        if (profileCategoryIconOverrides !== null) {
          await persistIconOverrides(id, profileCategoryIconOverrides);
        } else if (Object.keys(cloudIconOverrides).length > 0) {
          await persistIconOverrides(id, {
            ...categoryIconOverridesRef.current,
            ...cloudIconOverrides,
          });
        }

        // Merge cloud categories with local — fill missing tone/icon from local
        const cloudCategories: Category[] = Array.isArray(
          data.profile?.categories
        )
          ? data.profile.categories.map((c: Category) => ({
              ...c,
              Icon: getCategoryIcon(c),
              custom: true,
            }))
          : [];

        const mergedById = new Map<string, Category>();
        for (const c of cloudCategories) mergedById.set(c.id, c);
        for (const c of customCategoriesRef.current) {
          const existing = mergedById.get(c.id);
          mergedById.set(
            c.id,
            existing ? mergeCategoryDefs(existing, c) : mergeCategoryDefs(c)
          );
        }

        // Disabled: was fabricating "Recovered category N" placeholder
        // categories for orphaned expense category IDs and pushing them
        // back to the cloud — turned off, see recoverOrphanCategories in
        // lib/utils.ts.
        // const { categories: withOrphans, added } = recoverOrphanCategories(
        //   activeExpenses,
        //   Array.from(mergedById.values())
        // );
        // await persistCustomCategories(id, withOrphans);
        //
        // // Push recovered categories + styles so cloud stays complete
        // if (added.length > 0 && !recoveringCategories.current) {
        //   recoveringCategories.current = true;
        //   try {
        //     await fetch('/api/expenses/sync', {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         userId: id,
        //         expenses: [],
        //         categories: bakeCategoryStyles(withOrphans).map(
        //           ({ id: catId, label, tone, iconName, custom }) => ({
        //             id: catId,
        //             label,
        //             tone,
        //             iconName,
        //             custom,
        //           })
        //         ),
        //         categoryOverrides: categoryOverridesRef.current,
        //         categoryIconOverrides: categoryIconOverridesRef.current,
        //       }),
        //     });
        //     toast.success(
        //       'Categories restored',
        //       `${added.length} missing ${added.length === 1 ? 'category' : 'categories'} recovered — rename them in Categories`
        //     );
        //   } finally {
        //     recoveringCategories.current = false;
        //   }
        // }
        await persistCustomCategories(id, Array.from(mergedById.values()));

        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Cloud sync is unavailable. Your data is still saved on this device.';
        setError(msg);
        toast.error('Sync failed', msg);
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [
      userId,
      hydrate,
      persistCustomCategories,
      persistToneOverrides,
      persistIconOverrides,
      bakeCategoryStyles,
    ]
  );

  // Mongo first on login / session restore; IndexedDB only if offline or sync fails
  const bootstrapUser = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      if (
        bootstrapInflightFor.current === id &&
        bootstrapInflight.current
      ) {
        return bootstrapInflight.current;
      }

      const run = (async () => {
        const [
          savedExpenses,
          savedCategories,
          savedIncome,
          savedBudget,
          savedOverrides,
          savedIconOverrides,
          savedHideAmounts,
          savedPendingDeleted,
        ] = await Promise.all([
          get<Expense[]>(`pocket-expenses-${id}`),
          get<Category[]>(`pocket-categories-${id}`),
          get<number>(`pocket-income-${id}`),
          get<number>(`pocket-budget-${id}`),
          get<Record<string, string>>(`pocket-cat-overrides-${id}`),
          get<Record<string, string>>(`pocket-cat-icon-overrides-${id}`),
          get<boolean>(`pocket-hide-amounts-${id}`),
          get<string[]>(`pocket-pending-deleted-${id}`),
        ]);

        // Deletions queued while offline that never made it to Mongo — replay
        // them on the first sync so the server doesn't resurrect them.
        const localPendingDeleted = Array.isArray(savedPendingDeleted)
          ? savedPendingDeleted
          : [];
        if (localPendingDeleted.length) {
          pendingDeletedIdsRef.current = localPendingDeleted;
          setPendingDeletedIds(localPendingDeleted);
        }

        const localExpenses = Array.isArray(savedExpenses) ? savedExpenses : [];
        const localCategories = Array.isArray(savedCategories)
          ? savedCategories.map((c) => ({
              ...c,
              Icon: getCategoryIcon(c),
              custom: true as const,
            }))
          : [];
        const localTones = savedOverrides ?? {};
        const localIcons = savedIconOverrides ?? {};
        const localDone = await get<boolean>(
          `pocket-onboarding-complete-${id}`
        );

        // Seed category refs for merge
        if (localCategories.length) {
          customCategoriesRef.current = localCategories;
          setCustomCategories(localCategories);
        }
        if (Object.keys(localTones).length) {
          categoryOverridesRef.current = localTones;
          setCategoryOverrides(localTones);
        }
        if (Object.keys(localIcons).length) {
          categoryIconOverridesRef.current = localIcons;
          setCategoryIconOverrides(localIcons);
        }

        // Paint local data immediately when available — avoids a full-screen blank flash
        const hasLocalProfile =
          localExpenses.length > 0 ||
          (typeof savedIncome === 'number' && savedIncome > 0) ||
          Boolean(localDone);

        if (hasLocalProfile) {
          hydrate(localExpenses);
          if (typeof savedIncome === 'number' && savedIncome > 0) {
            setIncome(savedIncome);
            setIncomeDraft(String(savedIncome));
            setNeedsIncome(false);
          } else {
            setIncome(0);
            setIncomeDraft('');
            setNeedsIncome(false);
          }
          if (typeof savedBudget === 'number' && savedBudget > 0) {
            setBudget(savedBudget);
            setBudgetDraft(String(savedBudget));
          }
          if (typeof savedHideAmounts === 'boolean') {
            setHideAmountsState(savedHideAmounts);
          }
          setProfileHydrated(true);
        } else {
          setNeedsIncome(false);
          setProfileHydrated(false);
        }

        const isOnline = navigator.onLine;
        setOnline(isOnline);

        if (isOnline) {
          // Pull Mongo as source of truth.
          // Never push categories/income/budget on bootstrap — a sparse local
          // list would overwrite the full cloud profile (wiping customs).
          // Do replay any deletions that queued up while offline last session,
          // otherwise Mongo still has them as active and hydrate() below would
          // bring them back to life.
          const ok = await sync(
            id,
            localExpenses,
            null,
            null,
            localPendingDeleted,
            null,
            null,
            null,
            null
          );
          if (ok) {
            initialSyncDoneFor.current = id;
            setProfileHydrated(true);
            return true;
          }
        }

        // Offline or sync failed → IndexedDB fallback (may already be painted)
        if (!hasLocalProfile) {
          hydrate(localExpenses);
          await Promise.all([
            persistCustomCategories(id, localCategories),
            persistToneOverrides(id, localTones),
            persistIconOverrides(id, localIcons),
          ]);

          if (typeof savedIncome === 'number' && savedIncome > 0) {
            setIncome(savedIncome);
            setIncomeDraft(String(savedIncome));
            setNeedsIncome(false);
          } else if (localExpenses.length > 0 || localDone) {
            setIncome(0);
            setIncomeDraft('');
            setNeedsIncome(false);
          } else {
            setIncome(0);
            setIncomeDraft('');
            setNeedsIncome(true);
          }

          if (typeof savedBudget === 'number' && savedBudget > 0) {
            setBudget(savedBudget);
            setBudgetDraft(String(savedBudget));
          } else {
            setBudget(0);
            setBudgetDraft('');
          }

          if (typeof savedHideAmounts === 'boolean') {
            setHideAmountsState(savedHideAmounts);
          }
        }

        initialSyncDoneFor.current = id;
        setProfileHydrated(true);
        return false;
      })();

      bootstrapInflightFor.current = id;
      bootstrapInflight.current = run;
      try {
        return await run;
      } finally {
        if (bootstrapInflight.current === run) {
          bootstrapInflight.current = null;
          bootstrapInflightFor.current = null;
        }
      }
    },
    [
      sync,
      hydrate,
      persistCustomCategories,
      persistToneOverrides,
      persistIconOverrides,
    ]
  );

  const bootstrapUserRef = useRef(bootstrapUser);
  useEffect(() => {
    bootstrapUserRef.current = bootstrapUser;
  });

  // Only re-bootstrap when the signed-in user changes — not on every sync/expense update
  useEffect(() => {
    if (!userId) {
      setProfileHydrated(false);
      initialSyncDoneFor.current = null;
      return;
    }
    let cancelled = false;
    void bootstrapUserRef.current(userId).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const continueWithPhone = async () => {
    const normalized = normalizePhone(phone);
    if (!isValidIndianMobile(normalized)) {
      const msg =
        'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      setError(msg);
      toast.error('Invalid mobile number', msg);
      return;
    }
    setError('');
    setUserId(normalized);
    await set('pocket-user-id', normalized);
    const ok = await bootstrapUser(normalized);
    if (ok) {
      toast.success('Signed in', `Account +91 ${normalized}`);
    } else if (!navigator.onLine) {
      toast.success(
        'Signed in offline',
        'Using data saved on this device until you’re back online'
      );
    } else {
      toast.success(
        'Signed in',
        'Cloud sync unavailable — showing data saved on this device'
      );
    }
  };

  const logout = async () => {
    initialSyncDoneFor.current = null;
    setProfileHydrated(false);
    await del('pocket-user-id');
    setUserId('');
    setPhone('');
    hydrate([]);
    setIncome(0);
    setIncomeDraft('');
    setBudget(0);
    setBudgetDraft('');
    setNeedsIncome(false);
    setHideAmountsState(false);
    toast.success('Logged out', 'Your cloud data is still safe');
  };

  const setHideAmounts = (v: boolean) => {
    setHideAmountsState(v);
    if (userId) {
      void set(`pocket-hide-amounts-${userId}`, v);
      void sync(
        userId,
        expenses,
        null,
        null,
        pendingDeletedIds,
        null,
        v
      ).then((ok) => {
        if (ok) {
          toast.success(
            v ? 'Amounts hidden' : 'Amounts visible',
            v
              ? 'Synced to your account'
              : 'Synced — amounts show normally again'
          );
        }
      });
    }
  };

  // ── Income ────────────────────────────────────────────────────────────────

  const saveIncome = async () => {
    const parsed = Number(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a monthly income greater than zero.';
      setError(msg);
      toast.error('Could not save income', msg);
      return;
    }
    setError('');
    setIncome(parsed);
    await set(`pocket-income-${userId}`, parsed);
    setNeedsIncome(false);
    const ok = await sync(
      userId,
      expenses,
      parsed,
      null,
      pendingDeletedIds,
      null,
      null,
      null,
      null,
      true
    );
    if (ok) toast.success('Income updated', `Set to ${money(parsed)}`);
  };

  const saveBudget = async () => {
    const parsed = Number(budgetDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a monthly budget greater than zero.';
      setError(msg);
      toast.error('Could not save budget', msg);
      return;
    }
    setError('');
    setBudget(parsed);
    await set(`pocket-budget-${userId}`, parsed);
    const ok = await sync(
      userId,
      expenses,
      null,
      null,
      pendingDeletedIds,
      parsed
    );
    if (ok) toast.success('Budget updated', `Set to ${money(parsed)}`);
  };

  const completeOnboarding = async () => {
    const incomeParsed = Number(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(incomeParsed) || incomeParsed <= 0) {
      const msg = 'Enter a monthly income greater than zero, or skip for now.';
      setError(msg);
      toast.error('Could not continue', msg);
      return;
    }
    const budgetRaw = budgetDraft.replace(/[^0-9.]/g, '');
    const budgetParsed = budgetRaw ? Number(budgetRaw) : 0;
    const budgetValue =
      Number.isFinite(budgetParsed) && budgetParsed > 0 ? budgetParsed : null;

    setIncome(incomeParsed);
    setIncomeDraft(String(incomeParsed));
    await set(`pocket-income-${userId}`, incomeParsed);
    if (budgetValue) {
      setBudget(budgetValue);
      setBudgetDraft(String(budgetValue));
      await set(`pocket-budget-${userId}`, budgetValue);
    }
    await set(`pocket-onboarding-complete-${userId}`, true);
    setNeedsIncome(false);
    setError('');

    const ok = await sync(
      userId,
      expenses,
      incomeParsed,
      null,
      pendingDeletedIds,
      budgetValue,
      null,
      null,
      null,
      true
    );
    if (ok) {
      toast.success(
        'Targets saved',
        budgetValue
          ? `Income ${money(incomeParsed)} · Budget ${money(budgetValue)}`
          : `Income ${money(incomeParsed)}`
      );
    }
  };

  const skipOnboarding = async () => {
    setIncome(0);
    setIncomeDraft('');
    setBudget(0);
    setBudgetDraft('');
    setNeedsIncome(false);
    setError('');
    if (userId) {
      await set(`pocket-onboarding-complete-${userId}`, true);
      await sync(
        userId,
        expenses,
        null,
        null,
        pendingDeletedIds,
        null,
        null,
        null,
        null,
        true
      );
    }
    toast.success('Skipped', 'You can set income and budget anytime in Settings');
  };

  // ── Categories ────────────────────────────────────────────────────────────

  const allCategories = useMemo(
    () =>
      [...builtInCategories, ...customCategories].map((c) => {
        const iconName =
          categoryIconOverrides[c.id] ?? c.iconName;
        return {
          ...c,
          tone: categoryOverrides[c.id] ?? c.tone,
          iconName,
          Icon: getCategoryIcon({ iconName, Icon: c.Icon }),
        };
      }),
    [customCategories, categoryOverrides, categoryIconOverrides]
  );

  // Pull the freshest cloud category list right before any category
  // mutation is computed. Without this, a device whose local cache is
  // stale (e.g. right after login — profileHydrated can go true from a
  // local-only paint before the cloud pull finishes — or simply behind a
  // category added from another device) would compute "next" from an
  // incomplete list and push it as the full authoritative set, silently
  // deleting every category the cloud knew about that this device didn't.
  // That's what was producing "Missing category" for users after their
  // custom categories vanished.
  const ensureFreshCategories = useCallback(async () => {
    if (!userId) return;
    await sync(userId, expensesRef.current, null, null, pendingDeletedIdsRef.current);
  }, [userId, sync]);

  const updateCategoryColor = async (id: string, newTone: string) => {
    if (!userId) return;
    await ensureFreshCategories();
    const nextOverrides = { ...categoryOverridesRef.current, [id]: newTone };
    await persistToneOverrides(userId, nextOverrides);

    let nextCats = customCategoriesRef.current;
    if (nextCats.some((c) => c.id === id)) {
      nextCats = nextCats.map((c) =>
        c.id === id ? { ...c, tone: newTone } : c
      );
      await persistCustomCategories(userId, nextCats);
    }

    const ok = await sync(
      userId,
      expenses,
      null,
      nextCats.length > 0 ? nextCats : null,
      pendingDeletedIds,
      null,
      null,
      nextOverrides,
      categoryIconOverridesRef.current
    );
    if (!ok) toast.error('Sync failed', 'Color saved on this device only');
  };

  const updateCategoryIcon = async (id: string, iconName: string) => {
    if (!userId) return;
    await ensureFreshCategories();
    const nextIcons = {
      ...categoryIconOverridesRef.current,
      [id]: iconName,
    };
    await persistIconOverrides(userId, nextIcons);

    let nextCats = customCategoriesRef.current;
    if (nextCats.some((c) => c.id === id)) {
      nextCats = nextCats.map((c) =>
        c.id === id
          ? {
              ...c,
              iconName,
              Icon: getCategoryIcon({ iconName }),
            }
          : c
      );
      await persistCustomCategories(userId, nextCats);
    }

    const ok = await sync(
      userId,
      expenses,
      null,
      nextCats.length > 0 ? nextCats : null,
      pendingDeletedIds,
      null,
      null,
      categoryOverridesRef.current,
      nextIcons
    );
    if (!ok) toast.error('Sync failed', 'Icon saved on this device only');
  };

  const deleteCategory = async (id: string) => {
    if (!userId) return;
    await ensureFreshCategories();
    const removedLabel =
      customCategoriesRef.current.find((c) => c.id === id)?.label ??
      'Category';
    const next = customCategoriesRef.current.filter((c) => c.id !== id);
    await persistCustomCategories(userId, next);
    const ok = await sync(
      userId,
      expenses,
      null,
      next,
      pendingDeletedIds,
      null,
      null,
      categoryOverridesRef.current,
      categoryIconOverridesRef.current
    );
    if (ok) toast.success('Category removed', `"${removedLabel}" deleted`);
  };

  const renameCategory = async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed || !userId) return;
    await ensureFreshCategories();
    const target = customCategoriesRef.current.find((c) => c.id === id);
    if (!target || target.label === trimmed) return;
    const next = customCategoriesRef.current.map((c) =>
      c.id === id ? { ...c, label: trimmed } : c
    );
    await persistCustomCategories(userId, next);
    const ok = await sync(
      userId,
      expenses,
      null,
      next,
      pendingDeletedIds,
      null,
      null,
      categoryOverridesRef.current,
      categoryIconOverridesRef.current
    );
    if (ok) toast.success('Category renamed', `Now called "${trimmed}"`);
  };

  const addCategory = async () => {
    const label = categoryName.trim();
    if (!label || !userId) {
      toast.error('Could not add category', 'Enter a category name');
      return;
    }
    await ensureFreshCategories();
    const custom: Category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      tone: selectedTone,
      iconName: selectedIconName,
      Icon: getCategoryIcon({ iconName: selectedIconName }),
      custom: true,
    };
    const next = [...customCategoriesRef.current, custom];
    await persistCustomCategories(userId, next);
    setCategoryName('');
    setCategoryDialog(false);
    const ok = await sync(
      userId,
      expenses,
      null,
      next,
      pendingDeletedIds,
      null,
      null,
      categoryOverridesRef.current,
      categoryIconOverridesRef.current
    );
    if (ok) toast.success('Category added', `"${label}" is ready to use`);
  };

  // ── Expenses ──────────────────────────────────────────────────────────────

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;
    remove(id);
    if (undo?.id === id) setUndo(null);
    const nextDeleted = Array.from(new Set([...pendingDeletedIds, id]));
    setPendingDeletedIds(nextDeleted);
    const updatedExpenses = expenses.filter((e) => e.id !== id);

    const categoryLabel =
      allCategories.find((c) => c.id === target.category)?.label ??
      builtInCategories.find((c) => c.id === target.category)?.label ??
      'Category';
    const description = [
      money(target.amount),
      categoryLabel,
      target.note?.trim() || null,
    ]
      .filter(Boolean)
      .join(' · ');

    void sync(userId, updatedExpenses, null, null, nextDeleted).then((ok) => {
      if (!ok) return;
      toast.success('Deleted an expense', description, {
        // Soft-deleted in Mongo — Undo available for ~5s while toast is visible
        action: {
          label: 'Undo',
          onClick: () => {
            const restored: Expense = {
              ...target,
              deletedAt: null,
              updatedAt: new Date().toISOString(),
              syncStatus: online ? 'synced' : 'pending',
            };
            add(restored);
            setPendingDeletedIds((prev) => prev.filter((x) => x !== id));
            void sync(userId, [restored], null, null, []).then((restoredOk) => {
              if (restoredOk) {
                toast.success('Expense restored', description);
              }
            });
          },
        },
      });
    });
  };

  const addExpense = (category: CategoryId, preset?: Partial<Expense>) => {
    const rawNumber = parseRawNumber(amount);
    const parsed = Number(rawNumber);
    if (!parsed && !preset?.amount) {
      toast.error('Could not add expense', 'Enter an amount first');
      return;
    }
    const now = new Date().toISOString();
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: preset?.amount ?? parsed,
      category,
      note: preset?.note ?? (note.trim() || undefined),
      date: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: online ? 'synced' : 'pending',
    };
    add(expense);
    setAmount('');
    setNote('');
    setUndo(expense);
    setTimeout(() => setUndo(null), 5000);
    toast.success(
      'Expense added',
      `${money(expense.amount)}${expense.note ? ` · ${expense.note}` : ''}`
    );
    void sync(userId, [expense]);
  };

  const updateExpense = (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: CategoryId;
      date: string;
    }
  ) => {
    const previous = expenses.find((e) => e.id === id);
    if (!previous) return;

    const now = new Date().toISOString();
    const cleanedNote = patch.note?.trim() || undefined;
    const updated: Partial<Expense> = {
      amount: patch.amount,
      note: cleanedNote,
      category: patch.category,
      date: patch.date,
      updatedAt: now,
      deletedAt: null,
      syncStatus: online ? 'synced' : 'pending',
    };
    update(id, updated);
    const next: Expense = {
      ...previous,
      ...updated,
      id: previous.id,
      note: cleanedNote,
    };

    const categoryLabel =
      allCategories.find((c) => c.id === patch.category)?.label ??
      builtInCategories.find((c) => c.id === patch.category)?.label ??
      'Category';
    const description = [
      money(patch.amount),
      categoryLabel,
      cleanedNote || null,
    ]
      .filter(Boolean)
      .join(' · ');

    toast.success('Updated an expense', description, {
      action: {
        label: 'Undo',
        onClick: () => {
          const restored: Expense = {
            ...previous,
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            syncStatus: online ? 'synced' : 'pending',
          };
          update(id, {
            amount: restored.amount,
            note: restored.note,
            category: restored.category,
            date: restored.date,
            updatedAt: restored.updatedAt,
            deletedAt: null,
            syncStatus: restored.syncStatus,
          });
          void sync(userId, [restored], null, null, []).then((ok) => {
            if (ok) {
              const prevLabel =
                allCategories.find((c) => c.id === previous.category)?.label ??
                builtInCategories.find((c) => c.id === previous.category)
                  ?.label ??
                'Category';
              const prevDescription = [
                money(previous.amount),
                prevLabel,
                previous.note?.trim() || null,
              ]
                .filter(Boolean)
                .join(' · ');
              toast.success('Change undone', prevDescription);
            }
          });
        },
      },
    });

    // Include note: null so clearing a note is persisted (JSON drops undefined)
    void sync(
      userId,
      [{ ...next, note: cleanedNote ?? null } as Expense],
      null,
      null,
      []
    );
  };

  const parseAmount = (value: string) => {
    const rawNum = parseRawNumber(value);
    const formatted = formatIndianNumber(rawNum);
    setAmount(formatted);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const monthSpend = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.date).getMonth() === new Date().getMonth())
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const today = useMemo(
    () =>
      expenses.filter(
        (e) => new Date(e.date).toDateString() === new Date().toDateString()
      ),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    const result: (Category & { total: number })[] = [];
    for (const c of allCategories) {
      const total = totals.get(c.id) ?? 0;
      if (total) result.push({ ...c, total });
    }
    return result;
  }, [allCategories, expenses]);

  // ── Value ─────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    userId,
    phone,
    setPhone,
    initializing,
    needsIncome,
    continueWithPhone,
    expenses,
    add,
    handleDeleteExpense,
    addExpense,
    updateExpense,
    amount,
    setAmount,
    parseAmount,
    note,
    setNote,
    undo,
    setUndo,
    showAll,
    setShowAll,
    income,
    setIncome,
    incomeDraft,
    setIncomeDraft,
    saveIncome,
    budget,
    setBudget,
    budgetDraft,
    setBudgetDraft,
    saveBudget,
    completeOnboarding,
    skipOnboarding,
    allCategories,
    customCategories,
    categoryOverrides,
    categoryIconOverrides,
    categoryDialog,
    setCategoryDialog,
    categoryName,
    setCategoryName,
    selectedTone,
    setSelectedTone,
    selectedIconName,
    setSelectedIconName,
    addCategory,
    deleteCategory,
    renameCategory,
    updateCategoryColor,
    updateCategoryIcon,
    theme,
    setTheme,
    hideAmounts,
    setHideAmounts,
    screenObscured,
    online,
    syncing,
    profileHydrated,
    error,
    sync,
    monthSpend,
    byCategory,
    today,
    logout,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastHost />
    </AppContext.Provider>
  );
};
