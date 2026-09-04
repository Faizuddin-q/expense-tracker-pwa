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
import { fetchJson } from '@/lib/api-client';
import type { ProfileResponse } from '@/lib/profile-map';

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

const applyProfileResponse = (
  profileData: ProfileResponse,
  cloudExpenseCount: number
) => {
  const profile = useProfileStore.getState();

  const cloudIncome =
    typeof profileData.monthlyIncome === 'number' && profileData.monthlyIncome > 0
      ? profileData.monthlyIncome
      : 0;
  const onboardingDone = profileData.onboardingComplete === true;

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

  if (typeof profileData.monthlyBudget === 'number' && profileData.monthlyBudget > 0) {
    profile.setBudget(profileData.monthlyBudget);
    profile.setBudgetDraft(String(profileData.monthlyBudget));
  } else {
    profile.setBudget(0);
    profile.setBudgetDraft('');
  }

  if (typeof profileData.hideAmounts === 'boolean') {
    profile.setHideAmountsState(profileData.hideAmounts);
  }

  if (typeof profileData.name === 'string' && profileData.name) {
    profile.setNameState(profileData.name);
  }

  if (profileData.theme === 'dark' || profileData.theme === 'light') {
    useThemeStore.getState().setThemeState(profileData.theme);
  }

  if (
    typeof profileData.cycleStartDay === 'number' &&
    profileData.cycleStartDay >= 1 &&
    profileData.cycleStartDay <= 31
  ) {
    profile.setCycleStartDayState(profileData.cycleStartDay);
  }
};

const applyCloudExpenses = (
  cloudExpenses: Expense[],
  deletedIdSet: Set<string>
) => {
  const activeExpenses: Expense[] = [];
  for (const e of cloudExpenses) {
    const eid = e.localId ?? e.id;
    if (deletedIdSet.has(eid) || e.deletedAt) continue;
    activeExpenses.push({
      ...e,
      id: eid,
      amount: Number(e.amount) || 0,
    });
  }
  useExpenses.getState().hydrate(activeExpenses);
};

const applyPulledState = (
  cloudExpenses: Expense[],
  profileData: ProfileResponse,
  deletedIdSet: Set<string>
) => {
  applyCloudExpenses(cloudExpenses, deletedIdSet);
  applyProfileResponse(profileData, cloudExpenses.length);

  if (Array.isArray(profileData.categories) && profileData.categories.length) {
    const cloudCategories: Category[] = (
      profileData.categories as Category[]
    ).map((c) => ({ ...c, Icon: getCategoryIcon(c) }));
    useCategoryStore.getState().setCategories(cloudCategories);
  }
};

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
    const jsonHeaders = { 'Content-Type': 'application/json' };

    const writes: Array<ReturnType<typeof fetchJson>> = [];

    if (!options.pullOnly && local.length) {
      writes.push(
        fetchJson('/api/expenses', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ expenses: local }),
        })
      );
    }

    if (deletedIds.length > 0) {
      writes.push(
        fetchJson('/api/expenses', {
          method: 'DELETE',
          headers: jsonHeaders,
          body: JSON.stringify({ ids: deletedIds }),
        })
      );
    }

    if (categories !== null) {
      writes.push(
        fetchJson('/api/categories', {
          method: 'PUT',
          headers: jsonHeaders,
          body: JSON.stringify({
            categories: categories.map(
              ({ id: catId, label, tone, iconName, custom }) => ({
                id: catId,
                label,
                tone,
                iconName,
                custom,
              })
            ),
            deletedCategoryIds:
              Array.isArray(deletedCategoryIds) && deletedCategoryIds.length > 0
                ? deletedCategoryIds
                : undefined,
          }),
        })
      );
    }

    const profilePatch: Record<string, unknown> = {};
    if (typeof income === 'number' && income > 0) profilePatch.monthlyIncome = income;
    if (typeof budget === 'number' && budget > 0) profilePatch.monthlyBudget = budget;
    if (typeof hideAmounts === 'boolean') profilePatch.hideAmounts = hideAmounts;
    if (typeof onboardingComplete === 'boolean')
      profilePatch.onboardingComplete = onboardingComplete;
    if (typeof name === 'string' && name.trim()) profilePatch.name = name.trim();
    if (theme === 'dark' || theme === 'light') profilePatch.theme = theme;
    if (
      typeof cycleStartDay === 'number' &&
      Number.isInteger(cycleStartDay) &&
      cycleStartDay >= 1 &&
      cycleStartDay <= 31
    )
      profilePatch.cycleStartDay = cycleStartDay;

    if (Object.keys(profilePatch).length > 0) {
      writes.push(
        fetchJson('/api/profile', {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify(profilePatch),
        })
      );
    }

    const writeResults = await Promise.all(writes);
    const authFailure = writeResults.find(
      (r) => !r.ok && (r.status === 401 || r.status === 403)
    );
    if (authFailure) {
      set({ profileHydrated: false });
      const msg = 'Your session expired. Please sign in again.';
      useAuthStore.getState().handleSessionExpired(msg);
      toast.error('Signed out', msg);
      return false;
    }
    const firstFailure = writeResults.find((r) => !r.ok);
    if (firstFailure && !firstFailure.ok) throw new Error(firstFailure.message);

    const [expensesResult, profileResult] = await Promise.all([
      fetchJson<{ expenses: Expense[] }>('/api/expenses'),
      fetchJson<ProfileResponse>('/api/profile'),
    ]);

    if (!expensesResult.ok) {
      if (expensesResult.status === 401 || expensesResult.status === 403) {
        set({ profileHydrated: false });
        const msg = 'Your session expired. Please sign in again.';
        useAuthStore.getState().handleSessionExpired(msg);
        toast.error('Signed out', msg);
        return false;
      }
      throw new Error(expensesResult.message);
    }
    if (!profileResult.ok) throw new Error(profileResult.message);

    const deletedIdSet = new Set(deletedIds);

    if (deletedIds.length > 0) {
      get().setPendingDeletedIds((prev) =>
        prev.filter((item) => !deletedIdSet.has(item))
      );
    }

    applyPulledState(
      expensesResult.data.expenses,
      profileResult.data,
      deletedIdSet
    );

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

    if (get().profileHydrated && useAuthStore.getState().userId === id) {
      return true;
    }

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
