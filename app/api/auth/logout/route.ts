import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, getSessionUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';
import { auditFromRequest, writeAuditLog } from '@/lib/audit-log';

export const POST = async (request: Request) => {
  // Logout has no secret to guess and no destructive effect, but every
  // route gets a limit — this one's just generous since it's harmless.
  const limited = rateLimitOrResponse(
    `logout:${clientIp(request)}`,
    20,
    60 * 1000
  );
  if (limited) return limited;

  const userId = await getSessionUserId();
  const store = await cookies();
  store.delete(SESSION_COOKIE);

  if (userId) {
    void writeAuditLog(
      await getDb(),
      auditFromRequest(request, userId, 'auth.logout')
    );
  }

  return NextResponse.json({ ok: true });
};
