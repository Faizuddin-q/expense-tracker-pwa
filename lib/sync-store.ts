import { create } from 'zustand';
import { Category, Expense } from '@/types/expense';
import { Chapter, ChapterEntry } from '@/types/chapter';
import { getCategoryIcon } from '@/lib/utils';
import { useExpenses } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { useThemeStore } from '@/lib/theme-store';
import { useChapters } from '@/lib/chapter-store';
import { useChapterEntries } from '@/lib/chapter-entry-store';
import { toast } from '@/components/ToastHost';
import type { SyncOptions } from '@/lib/sync-types';
import { mergeSyncOptions } from '@/lib/sync-merge-options';
import { fetchJson } from '@/lib/api-client';
import { takeInitialLists } from '@/lib/initial-load';
import type { ProfileResponse } from '@/lib/profile-map';

export type { SyncOptions } from '@/lib/sync-types';

let bootstrapInflight: Promise<boolean> | null = null;
let bootstrapInflightFor: string | null = null;

let syncInflight: Promise<boolean> | null = null;
let syncQueued: SyncOptions | undefined;

type PendingRow = { id: string; localId?: string };

/** Rows whose last upload failed. The next sync retries them before a pull. */
const createPending = <T extends PendingRow>() => {
  let rows: T[] = [];
  const keyOf = (row: T) => row.localId ?? row.id;
  const without = (ids: string[]) => {
    if (!ids.length) return rows;
    const drop = new Set(ids);
    return rows.filter(
      (row) => !drop.has(row.id) && !(row.localId && drop.has(row.localId))
    );
  };
  return {
    collect(explicit: T[] | null | undefined, deleted: string[]) {
      if (explicit?.length) {
        const byId = new Map(rows.map((row) => [keyOf(row), row]));
        for (const row of explicit) byId.set(keyOf(row), row);
        rows = [...byId.values()];
      }
      rows = without(deleted);
      return rows;
    },
    ack(sent: T[]) {
      const done = new Set(sent.map(keyOf));
      rows = rows.filter((row) => !done.has(keyOf(row)));
    },
    clear() {
      rows = [];
    },
  };
};

const pendingExpenses = createPending<Expense>();
const pendingChapters = createPending<Chapter>();
const pendingEntries = createPending<ChapterEntry>();

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

const applyCloudChapters = (
  cloudChapters: Chapter[],
  deletedIdSet: Set<string>
) => {
  const active: Chapter[] = [];
  for (const c of cloudChapters) {
    if (deletedIdSet.has(c.id) || c.deletedAt) continue;
    active.push(c);
  }
  useChapters.getState().hydrate(active);
};

const applyCloudChapterEntries = (
  cloudEntries: ChapterEntry[],
  deletedIdSet: Set<string>
) => {
  const active: ChapterEntry[] = [];
  for (const e of cloudEntries) {
    const eid = e.localId ?? e.id;
    if (deletedIdSet.has(eid) || e.deletedAt) continue;
    active.push({ ...e, id: eid, amount: Number(e.amount) || 0 });
  }
  useChapterEntries.getState().hydrate(active);
};

const applyPulledState = (
  cloudExpenses: Expense[],
  profileData: ProfileResponse,
  deletedIdSet: Set<string>,
  cloudChapters: Chapter[],
  deletedChapterIdSet: Set<string>,
  cloudChapterEntries: ChapterEntry[],
  deletedChapterEntryIdSet: Set<string>
) => {
  applyCloudExpenses(cloudExpenses, deletedIdSet);
  applyProfileResponse(profileData, cloudExpenses.length);
  applyCloudChapters(cloudChapters, deletedChapterIdSet);
  applyCloudChapterEntries(cloudChapterEntries, deletedChapterEntryIdSet);

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
    chapters = null,
    chapterEntries = null,
  } = options;
  const id = options.id ?? useAuthStore.getState().userId;
  // Only the rows the caller passed. Omitting `local` must not upsert every
  // expense (that used to happen on theme, income, and category saves).
  const local = options.local;
  const deletedIds = options.deletedIds ?? get().pendingDeletedIds;
  const deletedChapterIds = options.deletedChapterIds ?? [];
  const deletedChapterEntryIds = options.deletedChapterEntryIds ?? [];
  if (!id) return false;
  set({ syncing: true });
  useAuthStore.getState().setError('');
  try {
    const jsonHeaders = { 'Content-Type': 'application/json' };

    const writes: Array<ReturnType<typeof fetchJson>> = [];
    const expensesToPush = options.pullOnly
      ? pendingExpenses.collect(undefined, deletedIds)
      : pendingExpenses.collect(local, deletedIds);
    const chaptersToPush = options.pullOnly
      ? pendingChapters.collect(undefined, deletedChapterIds)
      : pendingChapters.collect(chapters, deletedChapterIds);
    const entriesToPush = options.pullOnly
      ? pendingEntries.collect(undefined, deletedChapterEntryIds)
      : pendingEntries.collect(chapterEntries, deletedChapterEntryIds);

    if (expensesToPush.length) {
      writes.push(
        fetchJson('/api/expenses', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ expenses: expensesToPush }),
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

    if (chaptersToPush.length) {
      writes.push(
        fetchJson('/api/chapters', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ chapters: chaptersToPush }),
        })
      );
    }

    if (deletedChapterIds.length > 0) {
      writes.push(
        fetchJson('/api/chapters', {
          method: 'DELETE',
          headers: jsonHeaders,
          body: JSON.stringify({ ids: deletedChapterIds }),
        })
      );
    }

    if (entriesToPush.length) {
      writes.push(
        fetchJson('/api/chapters/entries', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ entries: entriesToPush }),
        })
      );
    }

    if (deletedChapterEntryIds.length > 0) {
      writes.push(
        fetchJson('/api/chapters/entries', {
          method: 'DELETE',
          headers: jsonHeaders,
          body: JSON.stringify({ ids: deletedChapterEntryIds }),
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

    // Profile-only saves already updated local state. Skip the four list
    // reads. Expense, category, and chapter writes still pull cloud truth.
    pendingExpenses.ack(expensesToPush);
    pendingChapters.ack(chaptersToPush);
    pendingEntries.ack(entriesToPush);

    const refreshesLists =
      options.pullOnly === true ||
      expensesToPush.length > 0 ||
      deletedIds.length > 0 ||
      categories !== null ||
      chaptersToPush.length > 0 ||
      deletedChapterIds.length > 0 ||
      entriesToPush.length > 0 ||
      deletedChapterEntryIds.length > 0;
    if (!refreshesLists) return true;

    const prefetched = options.pullOnly ? await takeInitialLists(id) : null;
    const {
      expenses: expensesResult,
      profile: profileResult,
      chapters: chaptersResult,
      entries: chapterEntriesResult,
    } = prefetched ??
      (await Promise.all([
        fetchJson<{ expenses: Expense[] }>('/api/expenses'),
        fetchJson<ProfileResponse>('/api/profile'),
        fetchJson<{ chapters: Chapter[] }>('/api/chapters'),
        fetchJson<{ entries: ChapterEntry[] }>('/api/chapters/entries'),
      ]).then(([expenses, profile, chapters, entries]) => ({
        expenses,
        profile,
        chapters,
        entries,
      })));

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
    if (!chaptersResult.ok) throw new Error(chaptersResult.message);
    if (!chapterEntriesResult.ok) throw new Error(chapterEntriesResult.message);

    const deletedIdSet = new Set(deletedIds);
    const deletedChapterIdSet = new Set(deletedChapterIds);
    const deletedChapterEntryIdSet = new Set(deletedChapterEntryIds);

    if (deletedIds.length > 0) {
      get().setPendingDeletedIds((prev) =>
        prev.filter((item) => !deletedIdSet.has(item))
      );
    }

    applyPulledState(
      expensesResult.data.expenses,
      profileResult.data,
      deletedIdSet,
      chaptersResult.data.chapters,
      deletedChapterIdSet,
      chapterEntriesResult.data.entries,
      deletedChapterEntryIdSet
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
  ensureFreshChapters: () => Promise<void>;
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
    pendingExpenses.clear();
    pendingChapters.clear();
    pendingEntries.clear();
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

  ensureFreshChapters: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await get().sync({ id: userId, pullOnly: true });
  },
}));
