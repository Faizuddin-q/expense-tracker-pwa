import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { categoriesReplaceSchema } from '@/lib/validation/category';
import {
  mergeCategoriesById,
  shouldSkipCategoryUpdate,
} from '@/lib/category-sync-merge';
import { ensureDefaultCategories } from '@/lib/ensure-default-categories';
import { activeUserFilter } from '@/lib/user-data';

/** PUT /api/categories - replace/merge the caller's category set. */
export const PUT = withUserAuth(
  'categories:replace',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = categoriesReplaceSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { deletedCategoryIds } = parsed.data;
    const cleanedCategories = [];
    for (const category of parsed.data.categories) {
      if (cleanedCategories.length >= 100) break;
      cleanedCategories.push({
        id: category.id,
        label: category.label,
        tone: typeof category.tone === 'string' ? category.tone : 'gray',
        iconName:
          typeof category.iconName === 'string' ? category.iconName : 'plus',
        custom: category.custom !== false,
      });
    }

    const db = await getDb();
    const profiles = db.collection('profiles');

    if (shouldSkipCategoryUpdate(cleanedCategories, deletedCategoryIds)) {
      const profile = await profiles.findOne(
        { userId },
        { projection: { categories: 1 } }
      );
      return ok({ categories: profile?.categories ?? [] });
    }

    const [existingProfile, referencedCategoryIds] = await Promise.all([
      profiles.findOne({ userId }, { projection: { categories: 1 } }),
      db.collection('expenses').distinct('category', activeUserFilter(userId)),
    ]);
    const merged = mergeCategoriesById(
      existingProfile?.categories ?? [],
      cleanedCategories,
      deletedCategoryIds
    );

    // One write, including any default category an active expense still uses.
    const backfill = ensureDefaultCategories(
      merged,
      referencedCategoryIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    );

    await profiles.updateOne(
      { userId },
      { $set: { categories: backfill.categories, updatedAt: new Date() } },
      { upsert: true }
    );

    return ok({ categories: backfill.categories });
  },
  {
    rateLimit: {
      key: (req, userId) => `categories-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
