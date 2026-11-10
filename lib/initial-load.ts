import { fetchJson } from '@/lib/api-client';
import type { ProfileResponse } from '@/lib/profile-map';
import type { Chapter, ChapterEntry } from '@/types/chapter';
import type { Expense } from '@/types/expense';

type SessionData = { authenticated: boolean; userId?: string };

type InitialLists = {
  expenses: Awaited<ReturnType<typeof fetchJson<{ expenses: Expense[] }>>>;
  profile: Awaited<ReturnType<typeof fetchJson<ProfileResponse>>>;
  chapters: Awaited<ReturnType<typeof fetchJson<{ chapters: Chapter[] }>>>;
  entries: Awaited<ReturnType<typeof fetchJson<{ entries: ChapterEntry[] }>>>;
};

type InitialLoad = {
  session: ReturnType<typeof fetchJson<SessionData>>;
  lists: Promise<InitialLists>;
};

let pending: InitialLoad | null = null;

const loadLists = (): Promise<InitialLists> =>
  Promise.all([
    fetchJson<{ expenses: Expense[] }>('/api/expenses'),
    fetchJson<ProfileResponse>('/api/profile'),
    fetchJson<{ chapters: Chapter[] }>('/api/chapters'),
    fetchJson<{ entries: ChapterEntry[] }>('/api/chapters/entries'),
  ]).then(([expenses, profile, chapters, entries]) => ({
    expenses,
    profile,
    chapters,
    entries,
  }));

/**
 * Start the session check and the four list reads together.
 * Opening the app otherwise waits for the session response before any list starts.
 */
export const startInitialLoad = (): InitialLoad => {
  if (!pending) {
    pending = {
      session: fetchJson<SessionData>('/api/auth/session'),
      lists: loadLists(),
    };
  }
  return pending;
};

export const clearInitialLoad = () => {
  pending = null;
};

/**
 * Hand the in-flight lists to the first pull for this user.
 * A logged-out prefetch (401) is dropped so sign-in loads the real account.
 */
export const takeInitialLists = async (
  userId: string
): Promise<InitialLists | null> => {
  const current = pending;
  if (!current) return null;
  const session = await current.session;
  if (!session.ok || session.data.userId !== userId) {
    pending = null;
    return null;
  }
  pending = null;
  const lists = await current.lists;
  if (
    !lists.expenses.ok ||
    !lists.profile.ok ||
    !lists.chapters.ok ||
    !lists.entries.ok
  ) {
    return null;
  }
  return lists;
};
