import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';
import { auditFromRequest, writeAuditLog } from '@/lib/audit-log';

export const GET = async (request: Request) => {
  // Generous cap — the app polls this on every boot/tab focus to verify the
  // local session is still valid, so this needs headroom normal use won't hit.
  const limited = rateLimitOrResponse(
    `session-check:${clientIp(request)}`,
    60,
    60 * 1000
  );
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (userId) {
    void writeAuditLog(
      await getDb(),
      auditFromRequest(request, userId, 'session.read')
    );
  }
  return NextResponse.json(
    userId ? { authenticated: true, userId } : { authenticated: false }
  );
};
