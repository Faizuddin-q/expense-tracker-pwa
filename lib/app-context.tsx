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
  recoverOrphanCategories,
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

  // Categories
  allCategories: Category[];
  customCategories: Category[];
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
    profileHideAmounts?: boolean | null
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

  const [income, setIncome] = useState(60000);
  const [incomeDraft, setIncomeDraft] = useState('60000');
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

  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [hideAmounts, setHideAmountsState] = useState(false);
  const [screenObscured, setScreenObscured] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const initialSyncDoneFor = useRef<string | null>(null);
  const recoveringCategories = useRef(false);

  useEffect(() => {
    customCategoriesRef.current = customCategories;
  }, [customCategories]);

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

  // ── Init from IndexedDB ───────────────────────────────────────────────────

  useEffect(() => {
    get<string>('pocket-user-id').then((saved) => {
      if (saved) setUserId(saved);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfileHydrated(false);
      return;
    }

    let cancelled = false;

    const loadLocal = async () => {
      const [
        savedExpenses,
        savedCategories,
        savedIncome,
        savedBudget,
        savedOverrides,
        savedHideAmounts,
      ] = await Promise.all([
        get<Expense[]>(`pocket-expenses-${userId}`),
        get<Category[]>(`pocket-categories-${userId}`),
        get<number>(`pocket-income-${userId}`),
        get<number>(`pocket-budget-${userId}`),
        get<Record<string, string>>(`pocket-cat-overrides-${userId}`),
        get<boolean>(`pocket-hide-amounts-${userId}`),
      ]);

      if (cancelled) return;

      hydrate(savedExpenses ?? []);

      let nextCategories: Category[] = Array.isArray(savedCategories)
        ? savedCategories.map((c) => ({
            ...c,
            Icon: getCategoryIcon(c),
            custom: true,
          }))
        : [];

      const { categories: recovered, added } = recoverOrphanCategories(
        savedExpenses ?? [],
        nextCategories
      );
      nextCategories = recovered;
      await persistCustomCategories(userId, nextCategories);
      if (added.length > 0) {
        toast.success(
          'Categories restored',
          `${added.length} missing ${added.length === 1 ? 'category' : 'categories'} recovered from your expenses — rename them in Categories`
        );
      }

      if (typeof savedIncome === 'number' && savedIncome > 0) {
        setIncome(savedIncome);
        setIncomeDraft(String(savedIncome));
        setNeedsIncome(false);
      } else {
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

      setCategoryOverrides(savedOverrides ?? {});
      setProfileHydrated(true);
    };

    void loadLocal();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      cancelled = true;
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, [userId, hydrate, persistCustomCategories]);

  useEffect(() => {
    if (hydrated && userId) set(`pocket-expenses-${userId}`, expenses);
  }, [expenses, hydrated, userId]);

  // ── Sync ─────────────────────────────────────────────────────────────────

  const sync = useCallback(
    async (
      id = userId,
      local = expenses,
      // null = do not push (avoids overwriting cloud with defaults / stale local)
      profileIncome: number | null = null,
      // null = do not push categories (avoids wiping cloud customs with [])
      profileCategories: Category[] | null = null,
      deletedIds = pendingDeletedIds,
      profileBudget: number | null = null,
      profileHideAmounts: boolean | null = null
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
        // Only push categories when explicitly provided (add/delete/rename/recover)
        if (profileCategories !== null) {
          payload.categories = profileCategories.map(
            ({ id: catId, label, tone, iconName, custom }) => ({
              id: catId,
              label,
              tone,
              iconName,
              custom,
            })
          );
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

        const response = await fetch('/api/expenses/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (deletedIds.length > 0) {
          setPendingDeletedIds((prev) =>
            prev.filter((item) => !deletedIds.includes(item))
          );
        }

        let activeExpenses = local;
        if (Array.isArray(data.expenses)) {
          activeExpenses = data.expenses
            .map((e: Expense) => ({
              ...e,
              id: e.localId ?? e.id,
              amount: Number(e.amount) || 0,
              syncStatus: 'synced' as const,
            }))
            .filter((e: Expense) => !deletedIds.includes(e.id));
          hydrate(activeExpenses);
        }
        // Cloud profile is source of truth after sync
        if (data.profile?.monthlyIncome > 0) {
          setIncome(data.profile.monthlyIncome);
          setIncomeDraft(String(data.profile.monthlyIncome));
          await set(`pocket-income-${id}`, data.profile.monthlyIncome);
          setNeedsIncome(false);
        } else if (data.profile === null) {
          setNeedsIncome(true);
        }
        if (
          typeof data.profile?.monthlyBudget === 'number' &&
          data.profile.monthlyBudget > 0
        ) {
          setBudget(data.profile.monthlyBudget);
          setBudgetDraft(String(data.profile.monthlyBudget));
          await set(`pocket-budget-${id}`, data.profile.monthlyBudget);
        }
        if (typeof data.profile?.hideAmounts === 'boolean') {
          setHideAmountsState(data.profile.hideAmounts);
          await set(`pocket-hide-amounts-${id}`, data.profile.hideAmounts);
        }

        // Merge cloud categories with local — never wipe local customs with []
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
        // Keep local-only customs (e.g. just recovered, not yet on cloud)
        for (const c of customCategoriesRef.current) {
          if (!mergedById.has(c.id)) mergedById.set(c.id, c);
        }

        const { categories: withOrphans, added } = recoverOrphanCategories(
          activeExpenses,
          Array.from(mergedById.values())
        );
        await persistCustomCategories(id, withOrphans);

        // Push recovered categories back so cloud stays in sync
        if (added.length > 0 && !recoveringCategories.current) {
          recoveringCategories.current = true;
          try {
            await fetch('/api/expenses/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: id,
                expenses: [],
                categories: withOrphans.map(
                  ({ id: catId, label, tone, iconName, custom }) => ({
                    id: catId,
                    label,
                    tone,
                    iconName,
                    custom,
                  })
                ),
              }),
            });
            toast.success(
              'Categories restored',
              `${added.length} missing ${added.length === 1 ? 'category' : 'categories'} recovered — rename them in Categories`
            );
          } finally {
            recoveringCategories.current = false;
          }
        }

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
    [userId, expenses, pendingDeletedIds, hydrate, persistCustomCategories]
  );

  // Pull cloud after local expenses + profile are loaded (do not push income/budget)
  useEffect(() => {
    if (!userId || !hydrated || !profileHydrated || !online) return;
    if (initialSyncDoneFor.current === userId) return;
    initialSyncDoneFor.current = userId;
    void sync(userId);
  }, [userId, hydrated, profileHydrated, online, sync]);

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
    const saved = await get<Expense[]>(`pocket-expenses-${normalized}`);
    const savedIncome = await get<number>(`pocket-income-${normalized}`);
    const savedBudget = await get<number>(`pocket-budget-${normalized}`);
    hydrate(saved ?? []);

    const localIncome =
      typeof savedIncome === 'number' && savedIncome > 0 ? savedIncome : null;
    const localBudget =
      typeof savedBudget === 'number' && savedBudget > 0 ? savedBudget : null;

    if (localBudget) {
      setBudget(localBudget);
      setBudgetDraft(String(localBudget));
    }
    if (localIncome) {
      setIncome(localIncome);
      setIncomeDraft(String(localIncome));
      setNeedsIncome(false);
    } else {
      setNeedsIncome(false);
    }
    const ok = await sync(
      normalized,
      saved ?? [],
      localIncome,
      undefined,
      undefined,
      localBudget
    );
    if (ok) toast.success('Signed in', `Account +91 ${normalized}`);
  };

  const logout = async () => {
    initialSyncDoneFor.current = null;
    setProfileHydrated(false);
    await del('pocket-user-id');
    setUserId('');
    setPhone('');
    hydrate([]);
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
    setIncome(parsed);
    await set(`pocket-income-${userId}`, parsed);
    setNeedsIncome(false);
    const ok = await sync(
      userId,
      expenses,
      parsed,
      null,
      pendingDeletedIds,
      null
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

  // ── Categories ────────────────────────────────────────────────────────────

  const allCategories = useMemo(
    () =>
      [...builtInCategories, ...customCategories].map((c) => ({
        ...c,
        tone: categoryOverrides[c.id] ?? c.tone,
      })),
    [customCategories, categoryOverrides]
  );

  const updateCategoryColor = async (id: string, newTone: string) => {
    const nextOverrides = { ...categoryOverrides, [id]: newTone };
    setCategoryOverrides(nextOverrides);
    if (userId) await set(`pocket-cat-overrides-${userId}`, nextOverrides);
  };

  const deleteCategory = async (id: string) => {
    const removedLabel =
      customCategories.find((c) => c.id === id)?.label ?? 'Category';
    const next = customCategories.filter((c) => c.id !== id);
    await persistCustomCategories(userId, next);
    const ok = await sync(userId, expenses, null, next);
    if (ok) toast.success('Category removed', `"${removedLabel}" deleted`);
  };

  const renameCategory = async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed || !userId) return;
    const target = customCategories.find((c) => c.id === id);
    if (!target || target.label === trimmed) return;
    const next = customCategories.map((c) =>
      c.id === id ? { ...c, label: trimmed } : c
    );
    await persistCustomCategories(userId, next);
    const ok = await sync(userId, expenses, null, next);
    if (ok) toast.success('Category renamed', `Now called "${trimmed}"`);
  };

  const addCategory = async () => {
    const label = categoryName.trim();
    if (!label || !userId) {
      toast.error('Could not add category', 'Enter a category name');
      return;
    }
    const custom: Category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      tone: selectedTone,
      iconName: selectedIconName,
      Icon: getCategoryIcon({ iconName: selectedIconName }),
      custom: true,
    };
    const next = [...customCategories, custom];
    await persistCustomCategories(userId, next);
    setCategoryName('');
    setCategoryDialog(false);
    const ok = await sync(userId, expenses, null, next);
    if (ok) toast.success('Category added', `"${label}" is ready to use`);
  };

  // ── Expenses ──────────────────────────────────────────────────────────────

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    remove(id);
    if (undo?.id === id) setUndo(null);
    const nextDeleted = Array.from(new Set([...pendingDeletedIds, id]));
    setPendingDeletedIds(nextDeleted);
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    void sync(userId, updatedExpenses, null, null, nextDeleted).then(
      (ok) => {
        if (ok) {
          toast.success(
            'Expense deleted',
            target ? `${money(target.amount)} removed` : 'Removed from your list'
          );
        }
      }
    );
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
    const now = new Date().toISOString();
    const updated: Partial<Expense> = {
      amount: patch.amount,
      note: patch.note,
      category: patch.category,
      date: patch.date,
      updatedAt: now,
      syncStatus: online ? 'synced' : 'pending',
    };
    update(id, updated);
    const nextExpenses = expenses.map((e) =>
      e.id === id ? { ...e, ...updated, id: e.id } : e
    );
    toast.success(
      'Expense updated',
      `${money(patch.amount)}${patch.note ? ` · ${patch.note}` : ''}`
    );
    void sync(userId, nextExpenses.filter((e) => e.id === id));
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

  const byCategory = useMemo(
    () =>
      allCategories
        .map((c) => ({
          ...c,
          total: expenses
            .filter((e) => e.category === c.id)
            .reduce((s, e) => s + e.amount, 0),
        }))
        .filter((c) => c.total),
    [allCategories, expenses]
  );

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
    allCategories,
    customCategories,
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
    theme,
    setTheme,
    hideAmounts,
    setHideAmounts,
    screenObscured,
    online,
    syncing,
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
