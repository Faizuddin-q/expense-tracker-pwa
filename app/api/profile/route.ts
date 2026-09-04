import { getDb } from '@/lib/db';
import { ok, fail, stampServerTiming } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { toProfileResponse } from '@/lib/profile-map';
import { findProfile } from '@/lib/user-data';
import { profileUpdateSchema } from '@/lib/validation/profile';

/** GET /api/profile — the caller's profile. */
export const GET = withUserAuth(
  'profile:get',
  async ({ userId }) => {
    const t0 = performance.now();
    const db = await getDb();
    const tDb = performance.now();
    const profile = await findProfile(db, userId);
    return stampServerTiming(ok(profile), [
      ['db', tDb - t0],
      ['query', performance.now() - tDb],
    ]);
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
    return ok(toProfileResponse((profile as Record<string, unknown> | null) ?? null));
  },
  {
    rateLimit: {
      key: (req, userId) => `profile-write:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
