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
import type { SyncOptions } from '@/lib/sync-types';
import { mergeSyncOptions } from '@/lib/sync-merge-options';

export type { SyncOptions } from '@/lib/sync-types';

// Module-scope (non-reactive) bootstrap bookkeeping — mirrors the refs the
// old context kept on the AppProvider component instance. Never used as a
// skip-guard for bootstrapUser, only for in-flight de-duplication, so moving
// it from component-instance scope to module scope changes nothing observable.
let initialSyncDoneFor: string | null = null;
let bootstrapInflight: Promise<boolean> | null = null;
let bootstrapInflightFor: string | null = null;

// Single-flight sync queue — prevents out-of-order hydrate from stale responses.
let syncInflight: Promise<boolean> | null = null;
let syncQueued: SyncOptions | undefined;

type SyncSet = (
  partial:
    | Partial<SyncStore>
    | ((state: SyncStore) => Partial<SyncStore>)
) => void;
type SyncGet = () => SyncStore;

async function runSync(
  options: SyncOptions,
  set: SyncSet,
  get: SyncGet
): Promise<boolean> {
  const {
    income = null,
    categories = null,
    deletedCategoryIds,
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
      deletedIds,
    };
    if (!options.pullOnly) {
      payload.expenses = local;
    }
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
    if (Array.isArray(deletedCategoryIds) && deletedCategoryIds.length > 0) {
      payload.deletedCategoryIds = deletedCategoryIds;
    }
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

    if (Array.isArray(data.profile?.categories)) {
      const cloudCategories: Category[] = data.profile.categories.map(
        (c: Category) => ({ ...c, Icon: getCategoryIcon(c) })
      );
      const localCategories = useCategoryStore.getState().categories;
      const localExpenseCount = useExpenses.getState().expenses.length;
      if (
        cloudCategories.length === 0 &&
        localCategories.length > 0 &&
        localExpenseCount > 0
      ) {
        console.warn(
          '[sync] ignoring empty cloud categories while local data exists'
        );
      } else {
        await useCategoryStore.getState().persistCategories(id, cloudCategories);
      }
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
}

interface SyncStore {
  online: boolean;
  syncing: boolean;
  profileHydrated: boolean;
  pendingDeletedIds: string[];

  setOnline: (v: boolean) => void;
  setPendingDeletedIds: (v: string[] | ((prev: string[]) => string[])) => void;
  resetProfileHydrated: () => void;
  resetOnLogout: () => void;

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

  resetOnLogout: () => {
    initialSyncDoneFor = null;
    syncQueued = undefined;
    set({
      profileHydrated: false,
      pendingDeletedIds: [],
      syncing: false,
    });
  },

  sync: async (options = {}) => {
    if (syncInflight) {
      syncQueued = mergeSyncOptions(syncQueued, options);
      return syncInflight;
    }

    syncInflight = (async () => {
      let current: SyncOptions | undefined = options;
      let lastResult = false;
      while (current) {
        lastResult = await runSync(current, set, get);
        current = syncQueued;
        syncQueued = undefined;
      }
      return lastResult;
    })();

    try {
      return await syncInflight;
    } finally {
      syncInflight = null;
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
      } else {
        profile.setNeedsIncome(false);
        set({ profileHydrated: false });
      }

      const isOnline = navigator.onLine;
      set({ online: isOnline });

      if (isOnline) {
        // Pull Mongo first — never push the IDB snapshot on login; a stale/wrong-user
        // cache must not overwrite cloud (cross-account contamination on logout→login).
        const ok = await get().sync({
          id,
          deletedIds: localPendingDeleted,
          pullOnly: true,
        });
        if (ok) {
          await idbSet(`pocket-expenses-${id}`, useExpenses.getState().expenses);
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
