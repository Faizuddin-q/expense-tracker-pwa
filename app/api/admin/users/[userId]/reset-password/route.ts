import { adminDb } from '@/lib/admin-db';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/api/handler';

type Params = { userId: string };

/**
 * POST /api/admin/users/:userId/reset-password — clears whatever password
 * the user set, dropping them back to the same legacy path a pre-password
 * account already has: they sign in once with their phone number as the
 * password, then set a real one in Settings.
 *
 * Note: this doesn't revoke a session that's already active on another
 * device — only the ability to start a new one with the old password.
 */
export const POST = withAdminAuth<Params>(
  'admin:reset-password',
  async ({ params }) => {
    const { userId } = params;
    const db = await adminDb();
    const profile = await db.collection('profiles').findOne({ userId });
    if (!profile) return fail('User not found', 404);

    await db.collection('users').deleteOne({ userId });
    return ok({ ok: true });
  },
  {
    // Tighter cap than the general admin-write budget — this is the most
    // sensitive action here (grants sign-in access), worth extra friction.
    rateLimit: {
      key: (req) => `admin-reset-password:${clientIp(req)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  }
);
