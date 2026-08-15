import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { adminDb } from '@/lib/admin-db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

/** GET /api/admin/users — every account, with lightweight totals for the table. */
export const GET = async (request: Request) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimitOrResponse(
    `admin-users-list:${clientIp(request)}`,
    60,
    60 * 1000
  );
  if (limited) return limited;

  try {
    const db = await adminDb();
    const [profiles, expenseAgg] = await Promise.all([
      db.collection('profiles').find({}).toArray(),
      db
        .collection('expenses')
        .aggregate([
          {
            $match: {
              $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
            },
          },
          {
            $group: {
              _id: '$userId',
              expenseCount: { $sum: 1 },
              totalSpend: { $sum: '$amount' },
              lastExpenseAt: { $max: '$updatedAt' },
            },
          },
        ])
        .toArray(),
    ]);

    const aggByUser = new Map(
      expenseAgg.map((a) => [a._id as string, a])
    );
    const profileByUser = new Map(
      profiles.map((p) => [p.userId as string, p])
    );
    const userIds = new Set<string>([
      ...profiles.map((p) => p.userId as string),
      ...expenseAgg.map((a) => a._id as string),
    ]);

    const users = Array.from(userIds)
      .filter(Boolean)
      .map((userId) => {
        const profile = profileByUser.get(userId);
        const agg = aggByUser.get(userId);
        const lastExpenseAt = agg?.lastExpenseAt
          ? new Date(agg.lastExpenseAt).toISOString()
          : null;
        const profileUpdatedAt = profile?.updatedAt
          ? new Date(profile.updatedAt).toISOString()
          : null;
        const lastActivity =
          [lastExpenseAt, profileUpdatedAt].filter(Boolean).sort().at(-1) ??
          null;

        return {
          userId,
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
          expenseCount: agg?.expenseCount ?? 0,
          totalSpend: agg?.totalSpend ?? 0,
          lastActivity,
        };
      })
      .sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return b.lastActivity.localeCompare(a.lastActivity);
      });

    const now = Date.now();
    const summary = {
      totalUsers: users.length,
      totalExpenses: users.reduce((s, u) => s + u.expenseCount, 0),
      totalSpend: users.reduce((s, u) => s + u.totalSpend, 0),
      activeLast30Days: users.filter(
        (u) =>
          u.lastActivity &&
          now - new Date(u.lastActivity).getTime() < 30 * 24 * 60 * 60 * 1000
      ).length,
    };

    return NextResponse.json({ users, summary });
  } catch (error) {
    console.error('[admin] users list failed', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load users';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
