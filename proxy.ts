import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// Reuses the exact same HMAC verification as the route handlers (lib/auth.ts
// uses node:crypto, and Proxy defaults to the Node.js runtime) — a separate
// reimplementation here would risk silently drifting from the real session
// check.
const PROTECTED_PATHS = ['/', '/dashboard', '/summary', '/expenses', '/settings'];

// Lets a locally-running frontend (e.g. another project's `next dev` on its
// default port) call this deployed API directly from the browser. Cookie
// auth requires the browser to send credentials cross-origin, which in turn
// requires echoing back a single explicit origin — `*` is rejected by
// browsers whenever `Access-Control-Allow-Credentials` is set.
const ALLOWED_ORIGIN = 'http://localhost:3000';

const withCors = (response: NextResponse, origin: string | null) => {
  if (origin !== ALLOWED_ORIGIN) return response;
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');
  return response;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  if (pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      const preflight = new NextResponse(null, { status: 204 });
      preflight.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
      );
      preflight.headers.set(
        'Access-Control-Allow-Headers',
        request.headers.get('access-control-request-headers') ?? 'Content-Type'
      );
      return withCors(preflight, origin);
    }
    return withCors(NextResponse.next(), origin);
  }

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
  matcher: [
    '/',
    '/dashboard',
    '/summary',
    '/expenses',
    '/settings',
    '/login',
    '/api/:path*',
  ],
};
