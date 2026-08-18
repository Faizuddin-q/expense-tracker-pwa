import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// Reuses the exact same HMAC verification as the route handlers (lib/auth.ts
// uses node:crypto, and Proxy defaults to the Node.js runtime) — a separate
// reimplementation here would risk silently drifting from the real session
// check.
const PROTECTED_PATHS = ['/', '/dashboard', '/summary', '/expenses', '/settings'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PATHS.includes(pathname) && !userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard', '/summary', '/expenses', '/settings', '/login'],
};
