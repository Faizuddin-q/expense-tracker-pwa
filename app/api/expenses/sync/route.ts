import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;
async function db() {
  if (!process.env.MONGODB_URI)
    throw new Error('MONGODB_URI is not configured');
  client ??= new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('pocket');
}

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
    } = await request.json();
    if (
      typeof userId !== 'string' ||
      userId.length < 8 ||
      userId.length > 32 ||
      !Array.isArray(expenses)
    )
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const database = await db();
    const collection = database.collection('expenses');
    const profiles = database.collection('profiles');

    // Handle permanent deletion of deleted expense IDs
    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      await collection.deleteMany({
        userId,
        $or: [{ localId: { $in: deletedIds } }, { id: { $in: deletedIds } }],
      });
    }

    if (expenses.length)
      await collection.bulkWrite(
        expenses.map((expense) => {
          const { _id, ...rest } = expense;
          const localId = expense.localId || expense.id;
          return {
            updateOne: {
              filter: { userId, localId },
              update: {
                $set: {
                  ...rest,
                  userId,
                  localId,
                  updatedAt: new Date(expense.updatedAt ?? Date.now()),
                },
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
    if (Array.isArray(categories)) {
      profileUpdate.categories = categories
        .filter(
          (category) =>
            typeof category?.id === 'string' &&
            typeof category?.label === 'string'
        )
        .map((category) => ({
          id: category.id,
          label: category.label,
          tone: typeof category.tone === 'string' ? category.tone : 'gray',
          iconName:
            typeof category.iconName === 'string' ? category.iconName : 'plus',
          custom: category.custom !== false,
        }))
        .slice(0, 100);
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
        .find({ userId })
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
            categories: profile.categories ?? [],
            categoryOverrides: profile.categoryOverrides ?? {},
            categoryIconOverrides: profile.categoryIconOverrides ?? {},
          }
        : null,
    });
  } catch (error) {
    console.error('[v0] expense sync failed', error);
    const message = error instanceof Error ? error.message : 'Sync unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
