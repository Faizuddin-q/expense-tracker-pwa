import { adminDb } from '@/lib/admin-db';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/api/handler';
import { adminProfilePatchSchema } from '@/lib/validation/profile';

type Params = { userId: string };

/** GET /api/admin/users/:userId — full profile + active expenses for the expanded row. */
export const GET = withAdminAuth<Params>(
  'admin:users:detail',
  async ({ params }) => {
    const { userId } = params;
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

    if (!profile && expenses.length === 0) return fail('User not found', 404);

    return ok({
      userId,
      profile: {
        monthlyIncome:
          typeof profile?.monthlyIncome === 'number' ? profile.monthlyIncome : 0,
        monthlyBudget:
          typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : 0,
        hideAmounts: profile?.hideAmounts === true,
        onboardingComplete: profile?.onboardingComplete === true,
        categories: Array.isArray(profile?.categories) ? profile.categories : [],
        cycleStartDay:
          typeof profile?.cycleStartDay === 'number' &&
          profile.cycleStartDay >= 1 &&
          profile.cycleStartDay <= 31
            ? profile.cycleStartDay
            : 1,
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
      })),
    });
  },
  {
    rateLimit: {
      key: (req) => `admin-user-detail:${clientIp(req)}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);

/** PATCH /api/admin/users/:userId — edit income / budget / hide-amounts on the user's behalf. */
export const PATCH = withAdminAuth<Params>(
  'admin:users:patch',
  async ({ request, params }) => {
    const { userId } = params;
    const body = await request.json().catch(() => null);
    const parsed = adminProfilePatchSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const update: Record<string, unknown> = { userId, updatedAt: new Date() };
    if (parsed.data.monthlyIncome !== undefined)
      update.monthlyIncome = parsed.data.monthlyIncome;
    if (parsed.data.monthlyBudget !== undefined)
      update.monthlyBudget = parsed.data.monthlyBudget;
    if (parsed.data.hideAmounts !== undefined)
      update.hideAmounts = parsed.data.hideAmounts;

    const db = await adminDb();
    await db
      .collection('profiles')
      .updateOne({ userId }, { $set: update }, { upsert: true });
    const profile = await db.collection('profiles').findOne({ userId });
    return ok({
      profile: {
        monthlyIncome: profile?.monthlyIncome ?? 0,
        monthlyBudget: profile?.monthlyBudget ?? 0,
        hideAmounts: profile?.hideAmounts === true,
      },
    });
  },
  {
    rateLimit: {
      key: (req) => `admin-user-write:${clientIp(req)}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/admin/users/:userId — permanently remove the account and all of its expenses. */
export const DELETE = withAdminAuth<Params>(
  'admin:users:delete',
  async ({ params }) => {
    const { userId } = params;
    const db = await adminDb();
    await Promise.all([
      db.collection('profiles').deleteOne({ userId }),
      db.collection('expenses').deleteMany({ userId }),
    ]);
    return ok({ ok: true });
  },
  {
    // Tighter cap — irreversible, so this is the one write worth throttling
    // harder than the general 30/min admin-write budget.
    rateLimit: {
      key: (req) => `admin-user-delete:${clientIp(req)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  }
);
