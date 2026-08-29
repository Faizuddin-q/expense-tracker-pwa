import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { categoriesReplaceSchema } from '@/lib/validation/category';
import {
  mergeCategoriesById,
  shouldSkipCategoryUpdate,
} from '@/lib/category-sync-merge';
import { ensureDefaultCategories } from '@/lib/ensure-default-categories';

/** PUT /api/categories — replace/merge the caller's category set. */
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

    const existingProfile = await profiles.findOne(
      { userId },
      { projection: { categories: 1 } }
    );
    const merged = mergeCategoriesById(
      existingProfile?.categories ?? [],
      cleanedCategories,
      deletedCategoryIds
    );

    await profiles.updateOne(
      { userId },
      { $set: { categories: merged, updatedAt: new Date() } },
      { upsert: true }
    );

    // Additively backfill any default category still referenced by an
    // active expense but missing from the caller's set.
    const referencedCategoryIds = await db
      .collection('expenses')
      .find({
        userId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .project({ category: 1 })
      .toArray();
    const backfill = ensureDefaultCategories(
      merged,
      referencedCategoryIds
        .map((e) => e.category)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    let responseCategories = merged;
    if (backfill.added.length > 0) {
      responseCategories = backfill.categories;
      await profiles.updateOne(
        { userId },
        { $set: { categories: responseCategories, updatedAt: new Date() } }
      );
    }

    return ok({ categories: responseCategories });
  },
  {
    rateLimit: {
      key: (req, userId) => `categories-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
