import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId, hashPassword, verifyPassword } from '@/lib/auth';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

export const POST = async (request: Request) => {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Allow at most 8 password-change attempts per account, per IP, every 15 minutes
  // — same brute-force guard as login, since this also checks a password.
  const limited = rateLimitOrResponse(
    `change-password:${clientIp(request)}:${userId}`,
    8,
    15 * 60 * 1000
  );
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword)
    return NextResponse.json(
      { error: 'Enter your current password.' },
      { status: 400 }
    );
  if (
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  )
    return NextResponse.json(
      {
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 }
    );

  try {
    const db = await getDb();
    const users = db.collection('users');
    const existing = await users.findOne({ userId });
    if (!existing)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const ok = await verifyPassword(currentPassword, existing.passwordHash);
    if (!ok)
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401 }
      );

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth] change-password failed', error);
    const message =
      error instanceof Error ? error.message : 'Could not update password';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
