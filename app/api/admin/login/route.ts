import { cookies } from 'next/headers';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminCredentials,
} from '@/lib/admin-auth';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';
import { adminLoginSchema } from '@/lib/validation/auth';

export const POST = withPublic(
  'admin:login',
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success)
      return fail('Enter a username and password', 400);

    const { username, password } = parsed.data;

    if (!verifyAdminCredentials(username, password))
      return fail('Invalid username or password', 401);

    const store = await cookies();
    store.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req) => `admin-login:${clientIp(req)}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    },
  }
);
