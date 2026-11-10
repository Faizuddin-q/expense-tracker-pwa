import type { Collection, Db } from 'mongodb';
import { toProfileResponse, type ProfileResponse } from '@/lib/profile-map';

export type { ProfileResponse };

const EXPENSE_CLIENT_PROJECTION = {
  _id: 0,
  localId: 1,
  id: 1,
  amount: 1,
  category: 1,
  note: 1,
  paymentMethod: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: 1,
} as const;

const toIso = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
};

export const toClientExpense = (doc: Record<string, unknown>) => {
  const localId = typeof doc.localId === 'string' ? doc.localId : undefined;
  const id = typeof doc.id === 'string' ? doc.id : localId;
  return {
    id: id ?? localId ?? '',
    localId,
    amount: Number(doc.amount) || 0,
    category: typeof doc.category === 'string' ? doc.category : '',
    note:
      typeof doc.note === 'string' && doc.note.trim() ? doc.note.trim() : undefined,
    paymentMethod:
      typeof doc.paymentMethod === 'string' ? doc.paymentMethod : undefined,
    date: toIso(doc.date) ?? new Date().toISOString(),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: doc.deletedAt ? toIso(doc.deletedAt) ?? null : null,
  };
};

/**
 * Active rows for one user. `{ deletedAt: null }` matches both null and a
 * missing field, so it is one equality and the compound index can also
 * satisfy the `updatedAt` sort. `$or` of `$exists` and `null` cannot.
 * https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
 */
export const activeUserFilter = (userId: string) => ({
  userId,
  deletedAt: null,
});

export const PROFILE_CLIENT_PROJECTION = {
  _id: 0,
  monthlyIncome: 1,
  monthlyBudget: 1,
  hideAmounts: 1,
  onboardingComplete: 1,
  categories: 1,
  name: 1,
  theme: 1,
  cycleStartDay: 1,
} as const;

export const listActiveExpenses = async (db: Db, userId: string) => {
  const records = await db
    .collection('expenses')
    .find(activeUserFilter(userId))
    .project(EXPENSE_CLIENT_PROJECTION)
    .sort({ updatedAt: -1 })
    .limit(10000)
    .toArray();

  return records.map((doc) => toClientExpense(doc as Record<string, unknown>));
};

export const findProfile = async (
  db: Db,
  userId: string
): Promise<ProfileResponse> => {
  const profile = await db.collection('profiles').findOne(
    { userId },
    { projection: PROFILE_CLIENT_PROJECTION }
  );
  return toProfileResponse((profile as Record<string, unknown> | null) ?? null);
};

let indexesPromise: Promise<void> | null = null;

const tryIndex = async (label: string, create: () => Promise<unknown>) => {
  try {
    await create();
  } catch (error) {
    console.error(`[db] index ${label} failed`, error);
  }
};

const dropIfPresent = async (
  collection: { dropIndex: (name: string) => Promise<unknown> },
  name: string
) => {
  try {
    await collection.dropIndex(name);
  } catch {
    // Already gone, or never created. The replacement index is in place.
  }
};

/**
 * Unique `{ userId, localId }` so an upsert is a point lookup.
 * A partial index is not used for a plain equality filter, which is what
 * bulkWrite sends. Recreate the index when an older partial definition
 * is already present under the same name.
 */
const ensureLocalIdIndex = async (collection: Collection, name: string) => {
  const spec = { userId: 1, localId: 1 } as const;
  const options = { name, unique: true as const };
  try {
    await collection.createIndex(spec, options);
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error ? error.code : undefined;
    if (code !== 85 && code !== 86) throw error;
    await collection.dropIndex(name);
    await collection.createIndex(spec, options);
  }
};

/**
 * Idempotent. Builds the indexes reads and upserts actually use, then
 * returns. A failure is logged and retried on the next process, not on
 * every request. Index work stays off the query await path.
 *
 * List indexes follow Equality, Sort, Range: userId + deletedAt, then
 * updatedAt. Upserts match `{ userId, localId }` and need that index or
 * each write scans the user.
 * https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
 */
export const ensureUserDataIndexes = (db: Db) => {
  if (indexesPromise) return indexesPromise;

  indexesPromise = (async () => {
    const expenses = db.collection('expenses');
    const chapters = db.collection('chapters');
    const entries = db.collection('chapterEntries');

    await Promise.all([
      tryIndex('expenses user+active+updated', async () => {
        await expenses.createIndex(
          { userId: 1, deletedAt: 1, updatedAt: -1 },
          { name: 'expenses_user_active_updated' }
        );
        await dropIfPresent(expenses, 'userId_1_updatedAt_-1');
      }),
      tryIndex('expenses user+localId', () =>
        ensureLocalIdIndex(expenses, 'expenses_user_localId')
      ),
      tryIndex('profiles userId', () =>
        db.collection('profiles').createIndex({ userId: 1 }, { unique: true })
      ),
      tryIndex('users userId', () =>
        db.collection('users').createIndex({ userId: 1 }, { unique: true })
      ),
      tryIndex('chapters user+active+updated', async () => {
        await chapters.createIndex(
          { userId: 1, deletedAt: 1, updatedAt: -1 },
          { name: 'chapters_user_active_updated' }
        );
        await dropIfPresent(chapters, 'userId_1_updatedAt_-1');
      }),
      tryIndex('chapters user+localId', () =>
        ensureLocalIdIndex(chapters, 'chapters_user_localId')
      ),
      tryIndex('chapterEntries user+active+updated', () =>
        entries.createIndex(
          { userId: 1, deletedAt: 1, updatedAt: -1 },
          { name: 'chapter_entries_user_active_updated' }
        )
      ),
      tryIndex('chapterEntries user+localId', () =>
        ensureLocalIdIndex(entries, 'chapter_entries_user_localId')
      ),
      tryIndex('chapterEntries user+chapter', () =>
        entries.createIndex({ userId: 1, chapterId: 1, updatedAt: -1 })
      ),
    ]);
  })().catch((error: unknown) => {
    indexesPromise = null;
    console.error('[db] ensure indexes failed', error);
  });

  return indexesPromise;
};
