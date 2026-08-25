import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { rateLimitOrResponse } from '@/lib/rate-limit';
import {
  mergeCategoriesById,
  shouldSkipCategoryUpdate,
} from '@/lib/category-sync-merge';
import { ensureDefaultCategories } from '@/lib/ensure-default-categories';

const EXPENSE_UPSERT_FIELDS = [
  'amount',
  'category',
  'note',
  'date',
  'paymentMethod',
  'createdAt',
] as const;

const pickExpenseFields = (
  expense: Record<string, unknown>
): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  for (const key of EXPENSE_UPSERT_FIELDS) {
    if (key in expense) picked[key] = expense[key];
  }
  return picked;
};

export const POST = async (request: Request) => {
  try {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limited = rateLimitOrResponse(`sync:${sessionUserId}`, 120, 60 * 1000);
    if (limited) return limited;

    const {
      userId,
      expenses,
      monthlyIncome,
      monthlyBudget,
      categories,
      deletedCategoryIds,
      deletedIds,
      hideAmounts,
      onboardingComplete,
      name,
      theme,
      cycleStartDay,
    } = await request.json();
    if (
      typeof userId !== 'string' ||
      userId.length < 8 ||
      userId.length > 32 ||
      (expenses !== undefined && !Array.isArray(expenses))
    )
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    if (userId !== sessionUserId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const database = await getDb();
    const collection = database.collection('expenses');
    const profiles = database.collection('profiles');

    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      const now = new Date();
      await collection.updateMany(
        {
          userId,
          $or: [{ localId: { $in: deletedIds } }, { id: { $in: deletedIds } }],
        },
        {
          $set: {
            deletedAt: now,
            updatedAt: now,
          },
        }
      );
    }

    if (Array.isArray(expenses) && expenses.length) {
      await collection.bulkWrite(
        expenses.map((expense: Record<string, unknown>) => {
          const localId =
            (typeof expense.localId === 'string' && expense.localId) ||
            (typeof expense.id === 'string' && expense.id) ||
            '';
          const noteValue =
            typeof expense.note === 'string' && expense.note.trim()
              ? expense.note.trim()
              : null;
          const whitelisted = pickExpenseFields(expense);
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
                    (typeof expense.updatedAt === 'string' ||
                    typeof expense.updatedAt === 'number'
                      ? expense.updatedAt
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

    const profileUpdate: Record<string, unknown> = {
      userId,
      updatedAt: new Date(),
    };
    if (
      typeof monthlyIncome === 'number' &&
      Number.isFinite(monthlyIncome) &&
      monthlyIncome > 0
    ) {
      profileUpdate.monthlyIncome = monthlyIncome;
    }
    if (
      typeof monthlyBudget === 'number' &&
      Number.isFinite(monthlyBudget) &&
      monthlyBudget > 0
    ) {
      profileUpdate.monthlyBudget = monthlyBudget;
    }
    if (typeof hideAmounts === 'boolean') {
      profileUpdate.hideAmounts = hideAmounts;
    }
    if (typeof onboardingComplete === 'boolean') {
      profileUpdate.onboardingComplete = onboardingComplete;
    }
    if (typeof name === 'string' && name.trim().length > 0) {
      profileUpdate.name = name.trim().slice(0, 60);
    }
    if (theme === 'dark' || theme === 'light') {
      profileUpdate.theme = theme;
    }
    if (
      typeof cycleStartDay === 'number' &&
      Number.isInteger(cycleStartDay) &&
      cycleStartDay >= 1 &&
      cycleStartDay <= 31
    ) {
      profileUpdate.cycleStartDay = cycleStartDay;
    }
    if (Array.isArray(categories)) {
      const cleanedCategories = [];
      for (const category of categories) {
        if (cleanedCategories.length >= 100) break;
        if (
          typeof category?.id !== 'string' ||
          typeof category?.label !== 'string'
        )
          continue;
        cleanedCategories.push({
          id: category.id,
          label: category.label,
          tone: typeof category.tone === 'string' ? category.tone : 'gray',
          iconName:
            typeof category.iconName === 'string' ? category.iconName : 'plus',
          custom: category.custom !== false,
        });
      }

      if (!shouldSkipCategoryUpdate(cleanedCategories, deletedCategoryIds)) {
        const existingProfile = await profiles.findOne(
          { userId },
          { projection: { categories: 1 } }
        );
        profileUpdate.categories = mergeCategoriesById(
          existingProfile?.categories ?? [],
          cleanedCategories,
          deletedCategoryIds
        );
      }
    }

    await profiles.updateOne(
      { userId },
      { $set: profileUpdate },
      { upsert: true }
    );

    const [records, profile] = await Promise.all([
      collection
        .find({
          userId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        })
        .sort({ updatedAt: -1 })
        .limit(10000)
        .toArray(),
      profiles.findOne({ userId }),
    ]);

    const referencedCategoryIds = records
      .map((e) => e.category)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    let responseCategories = profile?.categories ?? [];
    const backfill = ensureDefaultCategories(
      Array.isArray(responseCategories) ? responseCategories : [],
      referencedCategoryIds
    );
    if (backfill.added.length > 0) {
      responseCategories = backfill.categories;
      await profiles.updateOne(
        { userId },
        { $set: { categories: responseCategories, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      expenses: records,
      profile: profile
        ? {
            monthlyIncome: profile.monthlyIncome,
            monthlyBudget: profile.monthlyBudget,
            hideAmounts:
              typeof profile.hideAmounts === 'boolean'
                ? profile.hideAmounts
                : null,
            onboardingComplete: profile.onboardingComplete === true,
            categories: responseCategories,
            name: typeof profile.name === 'string' ? profile.name : null,
            theme:
              profile.theme === 'dark' || profile.theme === 'light'
                ? profile.theme
                : null,
            cycleStartDay:
              typeof profile.cycleStartDay === 'number' &&
              profile.cycleStartDay >= 1 &&
              profile.cycleStartDay <= 31
                ? profile.cycleStartDay
                : null,
          }
        : null,
    });
  } catch (error) {
    console.error('[v0] expense sync failed', error);
    const message = error instanceof Error ? error.message : 'Sync unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
