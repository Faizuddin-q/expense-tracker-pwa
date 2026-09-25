import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { listActiveChapterEntries } from '@/lib/chapter-data';
import {
  CHAPTER_ENTRY_UPSERT_FIELDS,
  chapterEntriesDeleteSchema,
  chapterEntriesUpsertSchema,
} from '@/lib/validation/chapter';

const pickEntryFields = (
  entry: Record<string, unknown>
): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  for (const key of CHAPTER_ENTRY_UPSERT_FIELDS) {
    if (key in entry) picked[key] = entry[key];
  }
  return picked;
};

/** GET /api/chapters/entries — pull the caller's active chapter entries. */
export const GET = withUserAuth(
  'chapter-entries:list',
  async ({ userId }) => {
    const db = await getDb();
    const entries = await listActiveChapterEntries(db, userId);
    return ok({ entries });
  },
  {
    rateLimit: {
      key: (req, userId) => `chapter-entries-list:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** POST /api/chapters/entries — bulk upsert the caller's chapter entries. */
export const POST = withUserAuth(
  'chapter-entries:upsert',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = chapterEntriesUpsertSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { entries } = parsed.data;
    if (entries.length) {
      const db = await getDb();
      await db.collection('chapterEntries').bulkWrite(
        entries.map((entry) => {
          const localId =
            (typeof entry.localId === 'string' && entry.localId) ||
            (typeof entry.id === 'string' && entry.id) ||
            '';
          const noteValue =
            typeof entry.note === 'string' && entry.note.trim()
              ? entry.note.trim()
              : null;
          const whitelisted = pickEntryFields(entry);
          return {
            updateOne: {
              filter: { userId, localId },
              update: {
                $set: {
                  ...whitelisted,
                  userId,
                  localId,
                  note: noteValue,
                  updatedAt: new Date(
                    (typeof entry.updatedAt === 'string' ||
                    typeof entry.updatedAt === 'number'
                      ? entry.updatedAt
                      : Date.now()) as string | number
                  ),
                },
                $unset: { deletedAt: '' },
              },
              upsert: true,
            },
          };
        })
      );
    }

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `chapter-entries-write:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/chapters/entries — bulk soft-delete by id. */
export const DELETE = withUserAuth(
  'chapter-entries:delete',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = chapterEntriesDeleteSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { ids } = parsed.data;
    const db = await getDb();
    const now = new Date();
    await db.collection('chapterEntries').updateMany(
      {
        userId,
        $or: [{ localId: { $in: ids } }, { id: { $in: ids } }],
      },
      { $set: { deletedAt: now, updatedAt: now } }
    );

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `chapter-entries-write:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);
