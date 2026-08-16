import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { rateLimitOrResponse } from '@/lib/rate-limit';

const asStringRecord = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 80 &&
      typeof entry === 'string' &&
      entry.length > 0 &&
      entry.length <= 64
    ) {
      out[key] = entry;
    }
  }
  return out;
};

export const POST = async (request: Request) => {
  try {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Not a credential-guessing endpoint — this is normal app traffic (every
    // add/edit/delete triggers a sync), so the cap is generous and keyed to
    // the authenticated session rather than IP.
    const limited = rateLimitOrResponse(`sync:${sessionUserId}`, 120, 60 * 1000);
    if (limited) return limited;

    const {
      userId,
      expenses,
      monthlyIncome,
      monthlyBudget,
      categories,
      deletedIds,
      hideAmounts,
      categoryOverrides,
      categoryIconOverrides,
      onboardingComplete,
      name,
      theme,
    } = await request.json();
    if (
      typeof userId !== 'string' ||
      userId.length < 8 ||
      userId.length > 32 ||
      !Array.isArray(expenses)
    )
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    if (userId !== sessionUserId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const database = await getDb();
    const collection = database.collection('expenses');
    const profiles = database.collection('profiles');

    // Soft-delete: keep the document so accidents can be recovered.
    // Active lists exclude deletedAt; purge later if you add a TTL/cron.
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

    if (expenses.length)
      await collection.bulkWrite(
        expenses.map((expense) => {
          const { _id, deletedAt: _ignored, note: _note, ...rest } = expense;
          const localId = expense.localId || expense.id;
          const noteValue =
            typeof expense.note === 'string' && expense.note.trim()
              ? expense.note.trim()
              : null;
          return {
            updateOne: {
              filter: { userId, localId },
              update: {
                $set: {
                  ...rest,
                  userId,
                  localId,
                  note: noteValue,
                  updatedAt: new Date(expense.updatedAt ?? Date.now()),
                },
                // Restoring an expense (sync after undo) clears soft-delete
                $unset: { deletedAt: '' },
              },
              upsert: true,
            },
          };
        })
      );

    const profileUpdate: Record<string, unknown> = {
      userId,
      updatedAt: new Date(),
    };
    // Only overwrite income/budget when the client explicitly sends them
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
      profileUpdate.categories = cleanedCategories;
    }

    const toneOverrides = asStringRecord(categoryOverrides);
    if (toneOverrides) {
      profileUpdate.categoryOverrides = toneOverrides;
    }
    const iconOverrides = asStringRecord(categoryIconOverrides);
    if (iconOverrides) {
      profileUpdate.categoryIconOverrides = iconOverrides;
    }

    // Always touch the profile doc so findOne returns it even when only expenses sync
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
            categories: profile.categories ?? [],
            categoryOverrides: profile.categoryOverrides ?? {},
            categoryIconOverrides: profile.categoryIconOverrides ?? {},
            name: typeof profile.name === 'string' ? profile.name : null,
            theme:
              profile.theme === 'dark' || profile.theme === 'light'
                ? profile.theme
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
