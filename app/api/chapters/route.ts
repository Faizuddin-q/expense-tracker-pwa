import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { listActiveChapters } from '@/lib/chapter-data';
import { chaptersDeleteSchema, chaptersUpsertSchema } from '@/lib/validation/chapter';

/** GET /api/chapters - pull the caller's active chapters. */
export const GET = withUserAuth(
  'chapters:list',
  async ({ userId }) => {
    const db = await getDb();
    const chapters = await listActiveChapters(db, userId);
    return ok({ chapters });
  },
  {
    rateLimit: {
      key: (req, userId) => `chapters-list:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** POST /api/chapters - bulk upsert the caller's chapters. */
export const POST = withUserAuth(
  'chapters:upsert',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = chaptersUpsertSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { chapters } = parsed.data;
    if (chapters.length) {
      const db = await getDb();
      await db.collection('chapters').bulkWrite(
        chapters.map((chapter) => {
          const localId =
            (typeof chapter.localId === 'string' && chapter.localId) ||
            (typeof chapter.id === 'string' && chapter.id) ||
            '';
          return {
            updateOne: {
              filter: { userId, localId },
              update: {
                $set: {
                  userId,
                  localId,
                  name: chapter.name,
                  budget: typeof chapter.budget === 'number' ? chapter.budget : null,
                  archived: chapter.archived === true,
                  createdAt: chapter.createdAt
                    ? new Date(chapter.createdAt)
                    : new Date(),
                  updatedAt: new Date(
                    (typeof chapter.updatedAt === 'string' ||
                    typeof chapter.updatedAt === 'number'
                      ? chapter.updatedAt
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
      key: (req, userId) => `chapters-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/chapters - bulk soft-delete by id. */
export const DELETE = withUserAuth(
  'chapters:delete',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = chaptersDeleteSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { ids } = parsed.data;
    const db = await getDb();
    const now = new Date();
    await db.collection('chapters').updateMany(
      {
        userId,
        $or: [{ localId: { $in: ids } }, { id: { $in: ids } }],
      },
      { $set: { deletedAt: now, updatedAt: now } }
    );
    // Cascade: also soft-delete every entry that belonged to the deleted chapter(s).
    await db.collection('chapterEntries').updateMany(
      { userId, chapterId: { $in: ids } },
      { $set: { deletedAt: now, updatedAt: now } }
    );

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `chapters-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
