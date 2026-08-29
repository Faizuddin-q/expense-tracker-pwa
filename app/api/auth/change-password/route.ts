import { getDb } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { changePasswordSchema } from '@/lib/validation/auth';

export const POST = withUserAuth(
  'auth:change-password',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

    const { currentPassword, newPassword } = parsed.data;

    const db = await getDb();
    const users = db.collection('users');
    const existing = await users.findOne({ userId });
    if (!existing) return fail('Account not found', 404);

    const valid = await verifyPassword(currentPassword, existing.passwordHash);
    if (!valid) return fail('Current password is incorrect.', 401);

    const passwordHash = await hashPassword(newPassword);
    await users.updateOne(
      { userId },
      {
        $set: {
          passwordHash,
          passwordIsDefault: false,
          updatedAt: new Date(),
        },
      }
    );

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `change-password:${clientIp(req)}:${userId}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    },
  }
);
