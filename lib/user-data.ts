import type { Db } from 'mongodb';
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

export const listActiveExpenses = async (db: Db, userId: string) => {
  const records = await db
    .collection('expenses')
    .find({
      userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    })
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
    { projection: { _id: 0 } }
  );
  return toProfileResponse((profile as Record<string, unknown> | null) ?? null);
};

let indexesEnsured = false;

/** Idempotent — safe to call on every process start. */
export const ensureUserDataIndexes = async (db: Db) => {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await Promise.all([
      db.collection('expenses').createIndex({ userId: 1, updatedAt: -1 }),
      db.collection('profiles').createIndex({ userId: 1 }, { unique: true }),
    ]);
  } catch (error) {
    console.error('[db] ensure indexes failed', error);
  }
};
