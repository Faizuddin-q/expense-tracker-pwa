import { create } from 'zustand';
import { idbGet, idbSet, idbDel } from '@/lib/idb';
import { Category, Expense } from '@/types/expense';
import { getCategoryIcon } from '@/lib/utils';
import { defaultCategorySeed } from '@/lib/default-categories';
import { useExpenses } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { useThemeStore } from '@/lib/theme-store';
import { toast } from '@/components/ToastHost';

// Module-scope (non-reactive) bootstrap bookkeeping — mirrors the refs the
// old context kept on the AppProvider component instance. Never used as a
// skip-guard for bootstrapUser, only for in-flight de-duplication, so moving
// it from component-instance scope to module scope changes nothing observable.
let initialSyncDoneFor: string | null = null;
let bootstrapInflight: Promise<boolean> | null = null;
let bootstrapInflightFor: string | null = null;

/**
 * All fields optional and independent — pass only what actually changed.
 * `null` (or omitted) means "don't touch this on the server", not "clear it".
 * A named-options object instead of positional args on purpose: a long
 * positional signature (...null, null, true, null...) is exactly the shape
 * that causes silent miscounted-argument bugs.
 */
export interface SyncOptions {
  id?: string;
  local?: Expense[];
  income?: number | null;
  categories?: Category[] | null;
  deletedIds?: string[];
  budget?: number | null;
  hideAmounts?: boolean | null;
  onboardingComplete?: boolean | null;
  name?: string | null;
  theme?: 'dark' | 'light' | null;
  cycleStartDay?: number | null;
}

interface SyncStore {
  online: boolean;
  syncing: boolean;
  profileHydrated: boolean;
  pendingDeletedIds: string[];

  setOnline: (v: boolean) => void;
  setPendingDeletedIds: (v: string[] | ((prev: string[]) => string[])) => void;
  resetProfileHydrated: () => void;

  sync: (options?: SyncOptions) => Promise<boolean>;

  bootstrapUser: (id: string) => Promise<boolean>;
  /** Pulls the freshest cloud category list before any category mutation. */
  ensureFreshCategories: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  online: true,
  syncing: false,
  profileHydrated: false,
  pendingDeletedIds: [],

  setOnline: (v) => set({ online: v }),
  setPendingDeletedIds: (v) =>
    set((s) => ({
      pendingDeletedIds: typeof v === 'function' ? v(s.pendingDeletedIds) : v,
    })),
  resetProfileHydrated: () => {
    initialSyncDoneFor = null;
    set({ profileHydrated: false });
  },

  sync: async (options = {}) => {
    const {
      income = null,
      categories = null,
      budget = null,
      hideAmounts = null,
      onboardingComplete = null,
      name = null,
      theme = null,
      cycleStartDay = null,
    } = options;
    const id = options.id ?? useAuthStore.getState().userId;
    const local = options.local ?? useExpenses.getState().expenses;
    const deletedIds = options.deletedIds ?? get().pendingDeletedIds;
    if (!id) return false;
    set({ syncing: true });
    useAuthStore.getState().setError('');
    try {
      const payload: Record<string, unknown> = {
        userId: id,
        expenses: local,
        deletedIds,
      };
      // Only push categories when explicitly provided (add/delete/rename/styles)
      // — each category already carries its own tone/iconName, so no baking needed.
      if (categories !== null) {
        payload.categories = categories.map(
          ({ id: catId, label, tone, iconName, custom }) => ({
            id: catId,
            label,
            tone,
            iconName,
            custom,
          })
        );
      }
      // Only push profile fields when explicitly provided
      if (typeof income === 'number' && income > 0) {
        payload.monthlyIncome = income;
      }
      if (typeof budget === 'number' && budget > 0) {
        payload.monthlyBudget = budget;
      }
      if (typeof hideAmounts === 'boolean') {
        payload.hideAmounts = hideAmounts;
      }
      if (typeof onboardingComplete === 'boolean') {
        payload.onboardingComplete = onboardingComplete;
      }
      if (typeof name === 'string' && name.trim()) {
        payload.name = name.trim();
      }
      if (theme === 'dark' || theme === 'light') {
        payload.theme = theme;
      }
      if (
        typeof cycleStartDay === 'number' &&
        Number.isInteger(cycleStartDay) &&
        cycleStartDay >= 1 &&
        cycleStartDay <= 31
      ) {
        payload.cycleStartDay = cycleStartDay;
      }

      const response = await fetch('/api/expenses/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Session cookie is missing/invalid/stale — this device needs to
          // sign in again, so stop retrying and send it back to login.
          initialSyncDoneFor = null;
          set({ profileHydrated: false });
          await idbDel('pocket-user-id');
          const msg = 'Your session expired. Please sign in again.';
          useAuthStore.getState().handleSessionExpired(msg);
          toast.error('Signed out', msg);
          return false;
        }
        throw new Error(data.error);
      }

      const deletedIdSet = new Set(deletedIds);

      if (deletedIds.length > 0) {
        get().setPendingDeletedIds((prev) =>
          prev.filter((item) => !deletedIdSet.has(item))
        );
      }

      const { hydrate } = useExpenses.getState();

      if (Array.isArray(data.expenses)) {
        const activeExpenses: Expense[] = [];
        for (const e of data.expenses as Expense[]) {
          const eid = e.localId ?? e.id;
          if (deletedIdSet.has(eid) || e.deletedAt) continue;
          activeExpenses.push({
            ...e,
            id: eid,
            amount: Number(e.amount) || 0,
            syncStatus: 'synced' as const,
          });
        }
        hydrate(activeExpenses);
      }

      const profile = useProfileStore.getState();

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
        profile.setIncome(cloudIncome);
        profile.setIncomeDraft(String(cloudIncome));
        await idbSet(`pocket-income-${id}`, cloudIncome);
        profile.setNeedsIncome(false);
      } else if (cloudExpenseCount > 0 || onboardingDone) {
        // Returning user with no income set — stay at ₹0, no onboarding wall
        profile.setIncome(0);
        profile.setIncomeDraft('');
        await idbSet(`pocket-income-${id}`, 0);
        profile.setNeedsIncome(false);
      } else {
        const [localIncome, localDone, localExpenses] = await Promise.all([
          idbGet<number>(`pocket-income-${id}`),
          idbGet<boolean>(`pocket-onboarding-complete-${id}`),
          idbGet<Expense[]>(`pocket-expenses-${id}`),
        ]);
        if (typeof localIncome === 'number' && localIncome > 0) {
          profile.setIncome(localIncome);
          profile.setIncomeDraft(String(localIncome));
          profile.setNeedsIncome(false);
        } else if (
          localDone ||
          (Array.isArray(localExpenses) && localExpenses.length > 0)
        ) {
          profile.setIncome(0);
          profile.setIncomeDraft('');
          profile.setNeedsIncome(false);
        } else {
          profile.setIncome(0);
          profile.setIncomeDraft('');
          profile.setNeedsIncome(true);
        }
      }

      if (onboardingDone) {
        await idbSet(`pocket-onboarding-complete-${id}`, true);
      }

      if (
        typeof data.profile?.monthlyBudget === 'number' &&
        data.profile.monthlyBudget > 0
      ) {
        profile.setBudget(data.profile.monthlyBudget);
        profile.setBudgetDraft(String(data.profile.monthlyBudget));
        await idbSet(`pocket-budget-${id}`, data.profile.monthlyBudget);
      } else {
        // No budget in Mongo — clear local so devices don't keep a ghost amount
        profile.setBudget(0);
        profile.setBudgetDraft('');
        await idbSet(`pocket-budget-${id}`, 0);
      }

      if (typeof data.profile?.hideAmounts === 'boolean') {
        profile.setHideAmountsState(data.profile.hideAmounts);
        await idbSet(`pocket-hide-amounts-${id}`, data.profile.hideAmounts);
      }

      if (typeof data.profile?.name === 'string' && data.profile.name) {
        profile.setNameState(data.profile.name);
        await idbSet(`pocket-name-${id}`, data.profile.name);
      }

      if (data.profile?.theme === 'dark' || data.profile?.theme === 'light') {
        useThemeStore.getState().setThemeState(data.profile.theme);
      }

      if (
        typeof data.profile?.cycleStartDay === 'number' &&
        data.profile.cycleStartDay >= 1 &&
        data.profile.cycleStartDay <= 31
      ) {
        profile.setCycleStartDayState(data.profile.cycleStartDay);
        await idbSet(`pocket-cycle-start-day-${id}`, data.profile.cycleStartDay);
      }

      // Merge cloud categories with local — fill missing tone/icon from local.
      // Mongo is source of truth for categories too, same as income/budget —
      // trust the response directly rather than merging with whatever local
      // state happens to be at this moment. A merge-with-local-snapshot is
      // exactly the pattern that previously caused a plain expense sync to
      // wipe the whole category list: if the merge ever ran against a stale
      // or empty local snapshot, that wrong result got persisted as truth.
      if (Array.isArray(data.profile?.categories)) {
        const cloudCategories: Category[] = data.profile.categories.map(
          (c: Category) => ({ ...c, Icon: getCategoryIcon(c) })
        );
        await useCategoryStore.getState().persistCategories(id, cloudCategories);
      }

      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Cloud sync is unavailable. Your data is still saved on this device.';
      useAuthStore.getState().setError(msg);
      toast.error('Sync failed', msg);
      return false;
    } finally {
      set({ syncing: false });
    }
  },

  // Mongo first on login / session restore; IndexedDB only if offline or sync fails
  bootstrapUser: async (id) => {
    if (!id) return false;

    if (bootstrapInflightFor === id && bootstrapInflight) {
      return bootstrapInflight;
    }

    const run = (async () => {
      const [
        savedExpenses,
        savedCategories,
        savedIncome,
        savedBudget,
        savedHideAmounts,
        savedPendingDeleted,
        savedName,
        savedCycleStartDay,
      ] = await Promise.all([
        idbGet<Expense[]>(`pocket-expenses-${id}`),
        idbGet<Category[]>(`pocket-categories-${id}`),
        idbGet<number>(`pocket-income-${id}`),
        idbGet<number>(`pocket-budget-${id}`),
        idbGet<boolean>(`pocket-hide-amounts-${id}`),
        idbGet<string[]>(`pocket-pending-deleted-${id}`),
        idbGet<string>(`pocket-name-${id}`),
        idbGet<number>(`pocket-cycle-start-day-${id}`),
      ]);

      const { hydrate } = useExpenses.getState();
      const profile = useProfileStore.getState();
      const categoryStore = useCategoryStore.getState();

      // Deletions queued while offline that never made it to Mongo — replay
      // them on the first sync so the server doesn't resurrect them.
      const localPendingDeleted = Array.isArray(savedPendingDeleted)
        ? savedPendingDeleted
        : [];
      if (localPendingDeleted.length) {
        set({ pendingDeletedIds: localPendingDeleted });
      }

      const localExpenses = Array.isArray(savedExpenses) ? savedExpenses : [];
      const localCategories = Array.isArray(savedCategories)
        ? savedCategories.map((c) => ({
            ...c,
            Icon: getCategoryIcon(c),
            custom: true as const,
          }))
        : [];
      const localDone = await idbGet<boolean>(`pocket-onboarding-complete-${id}`);

      // Seed category state for merge
      if (localCategories.length) {
        categoryStore.setCategoriesLocal(localCategories);
      }

      // Paint local data immediately when available — avoids a full-screen blank flash
      const hasLocalProfile =
        localExpenses.length > 0 ||
        (typeof savedIncome === 'number' && savedIncome > 0) ||
        Boolean(localDone);

      if (hasLocalProfile) {
        hydrate(localExpenses);
        if (typeof savedIncome === 'number' && savedIncome > 0) {
          profile.setIncome(savedIncome);
          profile.setIncomeDraft(String(savedIncome));
          profile.setNeedsIncome(false);
        } else {
          profile.setIncome(0);
          profile.setIncomeDraft('');
          profile.setNeedsIncome(false);
        }
        if (typeof savedBudget === 'number' && savedBudget > 0) {
          profile.setBudget(savedBudget);
          profile.setBudgetDraft(String(savedBudget));
        }
        if (typeof savedHideAmounts === 'boolean') {
          profile.setHideAmountsState(savedHideAmounts);
        }
        if (typeof savedName === 'string' && savedName) {
          profile.setNameState(savedName);
        }
        if (
          typeof savedCycleStartDay === 'number' &&
          savedCycleStartDay >= 1 &&
          savedCycleStartDay <= 31
        ) {
          profile.setCycleStartDayState(savedCycleStartDay);
        }
        set({ profileHydrated: true });
      } else {
        profile.setNeedsIncome(false);
        set({ profileHydrated: false });
      }

      const isOnline = navigator.onLine;
      set({ online: isOnline });

      if (isOnline) {
        // Pull Mongo as source of truth.
        // Never push categories/income/budget on bootstrap — a sparse local
        // list would overwrite the full cloud profile (wiping customs).
        // Do replay any deletions that queued up while offline last session,
        // otherwise Mongo still has them as active and hydrate() below would
        // bring them back to life.
        const ok = await get().sync({
          id,
          local: localExpenses,
          deletedIds: localPendingDeleted,
        });
        if (ok) {
          initialSyncDoneFor = id;
          set({ profileHydrated: true });
          return true;
        }
      }

      // Offline or sync failed → IndexedDB fallback (may already be painted)
      if (!hasLocalProfile) {
        hydrate(localExpenses);
        // Brand-new account, first-ever launch, offline: nothing to pull from
        // Mongo yet, so seed the same starter set registration would have
        // given them. One-time only — once anything is saved (here or via
        // the server), this branch never runs for this account again.
        const seededCategories = localCategories.length
          ? localCategories
          : defaultCategorySeed.map((c) => ({ ...c, Icon: getCategoryIcon(c) }));
        await categoryStore.persistCategories(id, seededCategories);

        if (typeof savedIncome === 'number' && savedIncome > 0) {
          profile.setIncome(savedIncome);
          profile.setIncomeDraft(String(savedIncome));
          profile.setNeedsIncome(false);
        } else if (localExpenses.length > 0 || localDone) {
          profile.setIncome(0);
          profile.setIncomeDraft('');
          profile.setNeedsIncome(false);
        } else {
          profile.setIncome(0);
          profile.setIncomeDraft('');
          profile.setNeedsIncome(true);
        }

        if (typeof savedBudget === 'number' && savedBudget > 0) {
          profile.setBudget(savedBudget);
          profile.setBudgetDraft(String(savedBudget));
        } else {
          profile.setBudget(0);
          profile.setBudgetDraft('');
        }

        if (typeof savedHideAmounts === 'boolean') {
          profile.setHideAmountsState(savedHideAmounts);
        }
        if (typeof savedName === 'string' && savedName) {
          profile.setNameState(savedName);
        }
        if (
          typeof savedCycleStartDay === 'number' &&
          savedCycleStartDay >= 1 &&
          savedCycleStartDay <= 31
        ) {
          profile.setCycleStartDayState(savedCycleStartDay);
        }
      }

      initialSyncDoneFor = id;
      set({ profileHydrated: true });
      return false;
    })();

    bootstrapInflightFor = id;
    bootstrapInflight = run;
    try {
      return await run;
    } finally {
      if (bootstrapInflight === run) {
        bootstrapInflight = null;
        bootstrapInflightFor = null;
      }
    }
  },

  ensureFreshCategories: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await get().sync({ id: userId });
  },
}));
