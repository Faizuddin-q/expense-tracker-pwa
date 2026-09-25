import type { Db } from 'mongodb';

const CHAPTER_CLIENT_PROJECTION = {
  _id: 0,
  localId: 1,
  id: 1,
  name: 1,
  budget: 1,
  archived: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: 1,
} as const;

const CHAPTER_ENTRY_CLIENT_PROJECTION = {
  _id: 0,
  localId: 1,
  id: 1,
  chapterId: 1,
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

export const toClientChapter = (doc: Record<string, unknown>) => {
  const localId = typeof doc.localId === 'string' ? doc.localId : undefined;
  const id = typeof doc.id === 'string' ? doc.id : localId;
  return {
    id: id ?? localId ?? '',
    name: typeof doc.name === 'string' ? doc.name : '',
    budget:
      typeof doc.budget === 'number' && doc.budget > 0 ? doc.budget : undefined,
    archived: doc.archived === true,
    createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: doc.deletedAt ? (toIso(doc.deletedAt) ?? null) : null,
  };
};

export const toClientChapterEntry = (doc: Record<string, unknown>) => {
  const localId = typeof doc.localId === 'string' ? doc.localId : undefined;
  const id = typeof doc.id === 'string' ? doc.id : localId;
  return {
    id: id ?? localId ?? '',
    localId,
    chapterId: typeof doc.chapterId === 'string' ? doc.chapterId : '',
    amount: Number(doc.amount) || 0,
    category: typeof doc.category === 'string' ? doc.category : '',
    note:
      typeof doc.note === 'string' && doc.note.trim() ? doc.note.trim() : undefined,
    paymentMethod:
      typeof doc.paymentMethod === 'string' ? doc.paymentMethod : undefined,
    date: toIso(doc.date) ?? new Date().toISOString(),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: doc.deletedAt ? (toIso(doc.deletedAt) ?? null) : null,
  };
};

export const listActiveChapters = async (db: Db, userId: string) => {
  const records = await db
    .collection('chapters')
    .find({
      userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    })
    .project(CHAPTER_CLIENT_PROJECTION)
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();

  return records.map((doc) => toClientChapter(doc as Record<string, unknown>));
};

export const listActiveChapterEntries = async (db: Db, userId: string) => {
  const records = await db
    .collection('chapterEntries')
    .find({
      userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    })
    .project(CHAPTER_ENTRY_CLIENT_PROJECTION)
    .sort({ updatedAt: -1 })
    .limit(10000)
    .toArray();

  return records.map((doc) => toClientChapterEntry(doc as Record<string, unknown>));
};
