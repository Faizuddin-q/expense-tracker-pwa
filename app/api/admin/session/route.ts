import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

export const GET = async (request: Request) => {
  const limited = rateLimitOrResponse(
    `admin-session-check:${clientIp(request)}`,
    60,
    60 * 1000
  );
  if (limited) return limited;

  return NextResponse.json({ authenticated: await isAdminAuthenticated() });
};
