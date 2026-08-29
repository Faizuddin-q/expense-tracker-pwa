import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { profileUpdateSchema } from '@/lib/validation/profile';

type ProfileResponse = {
  monthlyIncome: number | null;
  monthlyBudget: number | null;
  hideAmounts: boolean | null;
  onboardingComplete: boolean;
  categories: unknown[];
  name: string | null;
  theme: 'dark' | 'light' | null;
  cycleStartDay: number | null;
};

const toProfileResponse = (
  profile: Record<string, unknown> | null
): ProfileResponse => ({
  monthlyIncome:
    typeof profile?.monthlyIncome === 'number' ? profile.monthlyIncome : null,
  monthlyBudget:
    typeof profile?.monthlyBudget === 'number' ? profile.monthlyBudget : null,
  hideAmounts:
    typeof profile?.hideAmounts === 'boolean' ? profile.hideAmounts : null,
  onboardingComplete: profile?.onboardingComplete === true,
  categories: Array.isArray(profile?.categories) ? profile.categories : [],
  name: typeof profile?.name === 'string' ? profile.name : null,
  theme:
    profile?.theme === 'dark' || profile?.theme === 'light'
      ? profile.theme
      : null,
  cycleStartDay:
    typeof profile?.cycleStartDay === 'number' &&
    profile.cycleStartDay >= 1 &&
    profile.cycleStartDay <= 31
      ? profile.cycleStartDay
      : null,
});

/** GET /api/profile — the caller's profile. */
export const GET = withUserAuth(
  'profile:get',
  async ({ userId }) => {
    const db = await getDb();
    const profile = await db.collection('profiles').findOne({ userId });
    return ok(toProfileResponse(profile));
  },
  {
    rateLimit: {
      key: (req, userId) => `profile-read:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** PATCH /api/profile — partial update of scalar profile fields. */
export const PATCH = withUserAuth(
  'profile:patch',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const update: Record<string, unknown> = { userId, updatedAt: new Date() };
    const { name, ...rest } = parsed.data;
    Object.assign(update, rest);
    if (name !== undefined) update.name = name.slice(0, 60);

    const db = await getDb();
    const profiles = db.collection('profiles');
    await profiles.updateOne(
      { userId },
      {
        $set: update,
        // Dead leftover from the old built-in-shadow model. Categories
        // now store label/tone/icon on the row itself.
        $unset: { categoryOverrides: '', categoryIconOverrides: '' },
      },
      { upsert: true }
    );

    const profile = await profiles.findOne({ userId });
    return ok(toProfileResponse(profile));
  },
  {
    rateLimit: {
      key: (req, userId) => `profile-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
