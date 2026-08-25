import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { adminDb } from '@/lib/admin-db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';
import { auditFromRequest, writeAuditLog } from '@/lib/audit-log';

type Params = { params: Promise<{ userId: string }> };

/**
 * POST /api/admin/users/:userId/reset-password — clears whatever password
 * the user set, dropping them back to the same legacy path a pre-password
 * account already has: they sign in once with their phone number as the
 * password, then set a real one in Settings.
 *
 * Note: this doesn't revoke a session that's already active on another
 * device — only the ability to start a new one with the old password.
 */
export const POST = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Tighter cap than the general admin-write budget — this is the most
  // sensitive action here (grants sign-in access), worth extra friction.
  const limited = rateLimitOrResponse(
    `admin-reset-password:${clientIp(request)}`,
    10,
    15 * 60 * 1000
  );
  if (limited) return limited;

  const { userId } = await params;

  try {
    const db = await adminDb();
    const profile = await db.collection('profiles').findOne({ userId });
    if (!profile)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.collection('users').deleteOne({ userId });

    void writeAuditLog(
      db,
      auditFromRequest(request, userId, 'admin.user.reset_password', {
        actor: 'admin',
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] password reset failed', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 503 }
    );
  }
};
