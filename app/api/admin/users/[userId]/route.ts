import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { adminDb } from '@/lib/admin-db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

type Params = { params: Promise<{ userId: string }> };

/** GET /api/admin/users/:userId — full profile + active expenses for the expanded row. */
export const GET = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimitOrResponse(
    `admin-user-detail:${clientIp(request)}`,
    60,
    60 * 1000
  );
  if (limited) return limited;

  const { userId } = await params;

  try {
    const db = await adminDb();
    const [profile, expenses] = await Promise.all([
      db.collection('profiles').findOne({ userId }),
      db
        .collection('expenses')
        .find({
          userId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        })
        .sort({ date: -1 })
        .limit(5000)
        .toArray(),
    ]);

    if (!profile && expenses.length === 0)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      userId,
      profile: {
        monthlyIncome:
          typeof profile?.monthlyIncome === 'number'
            ? profile.monthlyIncome
            : 0,
        monthlyBudget:
          typeof profile?.monthlyBudget === 'number'
            ? profile.monthlyBudget
            : 0,
        hideAmounts: profile?.hideAmounts === true,
        onboardingComplete: profile?.onboardingComplete === true,
        categories: Array.isArray(profile?.categories)
          ? profile.categories
          : [],
        updatedAt: profile?.updatedAt
          ? new Date(profile.updatedAt).toISOString()
          : null,
      },
      expenses: expenses.map((e) => ({
        id: e.localId ?? e.id ?? String(e._id),
        amount: Number(e.amount) || 0,
        category: e.category,
        note: e.note ?? undefined,
        paymentMethod: e.paymentMethod,
        date: e.date,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        syncStatus: 'synced' as const,
      })),
    });
  } catch (error) {
    console.error('[admin] user detail failed', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load user';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};

/** PATCH /api/admin/users/:userId — edit income / budget / hide-amounts on the user's behalf. */
export const PATCH = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimitOrResponse(
    `admin-user-write:${clientIp(request)}`,
    30,
    60 * 1000
  );
  if (limited) return limited;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const update: Record<string, unknown> = { userId, updatedAt: new Date() };
  if (typeof body.monthlyIncome === 'number' && body.monthlyIncome >= 0)
    update.monthlyIncome = body.monthlyIncome;
  if (typeof body.monthlyBudget === 'number' && body.monthlyBudget >= 0)
    update.monthlyBudget = body.monthlyBudget;
  if (typeof body.hideAmounts === 'boolean')
    update.hideAmounts = body.hideAmounts;

  try {
    const db = await adminDb();
    await db
      .collection('profiles')
      .updateOne({ userId }, { $set: update }, { upsert: true });
    const profile = await db.collection('profiles').findOne({ userId });
    return NextResponse.json({
      ok: true,
      profile: {
        monthlyIncome: profile?.monthlyIncome ?? 0,
        monthlyBudget: profile?.monthlyBudget ?? 0,
        hideAmounts: profile?.hideAmounts === true,
      },
    });
  } catch (error) {
    console.error('[admin] user update failed', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 503 }
    );
  }
};

/** DELETE /api/admin/users/:userId — permanently remove the account and all of its expenses. */
export const DELETE = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Tighter cap — irreversible, so this is the one write worth throttling
  // harder than the general 30/min admin-write budget.
  const limited = rateLimitOrResponse(
    `admin-user-delete:${clientIp(request)}`,
    10,
    15 * 60 * 1000
  );
  if (limited) return limited;

  const { userId } = await params;

  try {
    const db = await adminDb();
    await Promise.all([
      db.collection('profiles').deleteOne({ userId }),
      db.collection('expenses').deleteMany({ userId }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] user delete failed', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 503 }
    );
  }
};
