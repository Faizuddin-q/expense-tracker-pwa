import { create } from 'zustand';
import { Category, Expense } from '@/types/expense';
import { getCategoryIcon } from '@/lib/utils';
import { useExpenses } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { useThemeStore } from '@/lib/theme-store';
import { toast } from '@/components/ToastHost';
import type { SyncOptions } from '@/lib/sync-types';
import { mergeSyncOptions } from '@/lib/sync-merge-options';

export type { SyncOptions } from '@/lib/sync-types';

let bootstrapInflight: Promise<boolean> | null = null;
let bootstrapInflightFor: string | null = null;

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
        set({ profileHydrated: false });
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
      profile.setNeedsIncome(false);
    } else if (cloudExpenseCount > 0 || onboardingDone) {
      profile.setIncome(0);
      profile.setIncomeDraft('');
      profile.setNeedsIncome(false);
    } else {
      profile.setIncome(0);
      profile.setIncomeDraft('');
      profile.setNeedsIncome(true);
    }

    if (
      typeof data.profile?.monthlyBudget === 'number' &&
      data.profile.monthlyBudget > 0
    ) {
      profile.setBudget(data.profile.monthlyBudget);
      profile.setBudgetDraft(String(data.profile.monthlyBudget));
    } else {
      profile.setBudget(0);
      profile.setBudgetDraft('');
    }

    if (typeof data.profile?.hideAmounts === 'boolean') {
      profile.setHideAmountsState(data.profile.hideAmounts);
    }

    if (typeof data.profile?.name === 'string' && data.profile.name) {
      profile.setNameState(data.profile.name);
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
    }

    if (Array.isArray(data.profile?.categories)) {
      const cloudCategories: Category[] = data.profile.categories.map(
        (c: Category) => ({ ...c, Icon: getCategoryIcon(c) })
      );
      await useCategoryStore.getState().setCategories(cloudCategories);
    }

    return true;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Could not reach the server. Try again.';
    useAuthStore.getState().setError(msg);
    toast.error('Sync failed', msg);
    return false;
  } finally {
    set({ syncing: false });
  }
}

interface SyncStore {
  syncing: boolean;
  profileHydrated: boolean;
  pendingDeletedIds: string[];

  setPendingDeletedIds: (v: string[] | ((prev: string[]) => string[])) => void;
  resetOnLogout: () => void;

  sync: (options?: SyncOptions) => Promise<boolean>;

  bootstrapUser: (id: string) => Promise<boolean>;
  ensureFreshCategories: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  syncing: false,
  profileHydrated: false,
  pendingDeletedIds: [],

  setPendingDeletedIds: (v) =>
    set((s) => ({
      pendingDeletedIds: typeof v === 'function' ? v(s.pendingDeletedIds) : v,
    })),
  resetOnLogout: () => {
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

  bootstrapUser: async (id) => {
    if (!id) return false;

    if (bootstrapInflightFor === id && bootstrapInflight) {
      return bootstrapInflight;
    }

    const run = (async () => {
      set({ profileHydrated: false, pendingDeletedIds: [] });
      useExpenses.getState().hydrate([]);

      const ok = await get().sync({ id, pullOnly: true });
      if (ok) {
        set({ profileHydrated: true });
        return true;
      }

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
    await get().sync({ id: userId, pullOnly: true });
  },
}));
