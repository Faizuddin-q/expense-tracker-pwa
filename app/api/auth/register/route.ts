import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  hashPassword,
} from '@/lib/auth';
import { clientIp } from '@/lib/rate-limit';
import { defaultCategorySeed } from '@/lib/default-categories';
import { ok, fail } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';
import { registerSchema } from '@/lib/validation/auth';

export const POST = withPublic(
  'auth:register',
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);

    const { phone, password } = parsed.data;

    const db = await getDb();
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    const [existingUser, existingProfile] = await Promise.all([
      users.findOne({ userId: phone }),
      profiles.findOne({ userId: phone }),
    ]);

    if (existingUser)
      return fail('An account with this number already exists. Sign in instead.', 409);

    if (existingProfile)
      return fail(
        'This number already has an account from before passwords were required. Sign in using your phone number as the password, then set a real one in Settings.',
        409
      );

    const passwordHash = await hashPassword(password);
    await users.insertOne({
      userId: phone,
      passwordHash,
      passwordIsDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Seed the starter category set as real, owned rows — not a separate
    // built-in list — so they're editable/deletable from day one, no
    // override/shadow mechanism needed.
    await profiles.insertOne({
      userId: phone,
      categories: defaultCategorySeed.map((c) => ({ ...c })),
      updatedAt: new Date(),
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(phone), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return ok({ userId: phone });
  },
  {
    rateLimit: {
      key: async (req) => {
        const body = await req.json().catch(() => null);
        const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
        return `register:${clientIp(req)}:${phone}`;
      },
      limit: 8,
      windowMs: 15 * 60 * 1000,
    },
  }
);
