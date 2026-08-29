import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';
import { loginSchema } from '@/lib/validation/auth';

const GENERIC_ERROR = 'Incorrect phone number or password';

export const POST = withPublic(
  'auth:login',
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

    const { phone, password } = parsed.data;

    const db = await getDb();
    const users = db.collection('users');
    const existing = await users.findOne({ userId: phone });

    let passwordIsDefault = false;

    if (existing) {
      const valid = await verifyPassword(password, existing.passwordHash);
      if (!valid) return fail(GENERIC_ERROR, 401);
      passwordIsDefault = existing.passwordIsDefault === true;
    } else {
      const profiles = db.collection('profiles');
      const legacyProfile = await profiles.findOne({ userId: phone });

      if (!legacyProfile)
        return fail('No account found for this number. Create one instead.', 404);

      // Pre-password account: the phone number itself is the interim
      // password until the user sets a real one in Settings.
      if (password !== phone)
        return fail(
          'This account was created before passwords were required. Sign in once using your phone number as the password, then set a real one in Settings.',
          401
        );
      const passwordHash = await hashPassword(phone);
      await users.updateOne(
        { userId: phone },
        {
          $set: {
            userId: phone,
            passwordHash,
            passwordIsDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      passwordIsDefault = true;
    }

    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(phone), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return ok({ userId: phone, passwordIsDefault });
  },
  {
    rateLimit: {
      key: async (req) => {
        const body = await req.json().catch(() => null);
        const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
        return `login:${clientIp(req)}:${phone}`;
      },
      limit: 8,
      windowMs: 15 * 60 * 1000,
    },
  }
);
