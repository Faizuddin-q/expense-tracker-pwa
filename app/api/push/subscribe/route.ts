import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from '@/lib/validation/reminder';

/** POST /api/push/subscribe - upsert the caller's Web Push subscription. */
export const POST = withUserAuth(
  'push:subscribe',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = pushSubscribeSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid push subscription', 400);

    const { endpoint, keys } = parsed.data;
    const db = await getDb();
    const now = new Date();
    await db.collection('pushSubscriptions').updateOne(
      { endpoint },
      {
        $set: {
          userId,
          endpoint,
          keys,
          userAgent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (_req, userId) => `push-subscribe:${userId}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/push/subscribe - remove a subscription (or all for the user). */
export const DELETE = withUserAuth(
  'push:unsubscribe',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = pushUnsubscribeSchema.safeParse(body ?? {});
    if (!parsed.success) return fail('Invalid payload', 400);

    const db = await getDb();
    if (parsed.data.endpoint) {
      await db.collection('pushSubscriptions').deleteOne({
        userId,
        endpoint: parsed.data.endpoint,
      });
    } else {
      await db.collection('pushSubscriptions').deleteMany({ userId });
    }

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (_req, userId) => `push-unsubscribe:${userId}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);
