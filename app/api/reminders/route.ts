import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { normalizeReminder } from '@/lib/reminder';
import { reminderPrefsSchema } from '@/lib/validation/reminder';
import { PROFILE_CLIENT_PROJECTION } from '@/lib/user-data';
import { toProfileResponse } from '@/lib/profile-map';

/** GET /api/reminders - current reminder prefs. */
export const GET = withUserAuth(
  'reminders:get',
  async ({ userId }) => {
    const db = await getDb();
    const profile = await db.collection('profiles').findOne(
      { userId },
      { projection: { reminder: 1 } }
    );
    return ok({
      reminder: normalizeReminder(
        (profile as { reminder?: unknown } | null)?.reminder
      ),
    });
  },
  {
    rateLimit: {
      key: (_req, userId) => `reminders-read:${userId}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);

/** PUT /api/reminders - replace reminder prefs on the profile. */
export const PUT = withUserAuth(
  'reminders:put',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = reminderPrefsSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
    }

    const db = await getDb();
    const existing = await db.collection('profiles').findOne(
      { userId },
      { projection: { reminder: 1 } }
    );
    const prev = normalizeReminder(
      (existing as { reminder?: unknown } | null)?.reminder
    );

    const now = new Date();
    const reminder = {
      ...parsed.data,
      lastSentAt: prev.lastSentAt ?? null,
      updatedAt: now,
    };

    const refreshed = await db.collection('profiles').findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          reminder,
          updatedAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        projection: { ...PROFILE_CLIENT_PROJECTION, reminder: 1 },
      }
    );

    return ok({
      reminder: normalizeReminder(
        (refreshed as { reminder?: unknown } | null)?.reminder
      ),
      profile: toProfileResponse(
        (refreshed as Record<string, unknown> | null) ?? null
      ),
    });
  },
  {
    rateLimit: {
      key: (_req, userId) => `reminders-write:${userId}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);
