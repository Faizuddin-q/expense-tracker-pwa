import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const isValidPhone = (value: string): boolean => /^[6-9]\d{9}$/.test(value);
const GENERIC_ERROR = 'Incorrect phone number or password';

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!isValidPhone(phone))
    return NextResponse.json(
      { error: 'Enter a valid 10-digit Indian mobile number.' },
      { status: 400 }
    );
  if (!password)
    return NextResponse.json(
      { error: 'Enter your password.' },
      { status: 400 }
    );
  if (password.length > MAX_PASSWORD_LENGTH)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });

  // Allow at most 8 login attempts per phone number, per IP, every 15 minutes
  // — slows down someone guessing a password without locking real users out.
  const limited = rateLimitOrResponse(
    `login:${clientIp(request)}:${phone}`,
    8,
    15 * 60 * 1000
  );
  if (limited) return limited;

  try {
    const db = await getDb();
    const users = db.collection('users');
    const existing = await users.findOne({ userId: phone });

    let isNewUser = false;
    let passwordIsDefault = false;

    if (existing) {
      const ok = await verifyPassword(password, existing.passwordHash);
      if (!ok)
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
      passwordIsDefault = existing.passwordIsDefault === true;
    } else {
      const profiles = db.collection('profiles');
      const legacyProfile = await profiles.findOne({ userId: phone });

      if (legacyProfile) {
        // Pre-password account: the phone number itself is the interim
        // password until the user sets a real one in Settings.
        if (password !== phone)
          return NextResponse.json(
            {
              error:
                'This account was created before passwords were required. Sign in once using your phone number as the password, then set a real one in Settings.',
            },
            { status: 401 }
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
      } else {
        // Brand-new phone number — this is registration.
        if (password.length < MIN_PASSWORD_LENGTH)
          return NextResponse.json(
            {
              error: `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters to create your account.`,
            },
            { status: 400 }
          );
        const passwordHash = await hashPassword(password);
        await users.updateOne(
          { userId: phone },
          {
            $set: {
              userId: phone,
              passwordHash,
              passwordIsDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        isNewUser = true;
      }
    }

    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(phone), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ ok: true, userId: phone, isNewUser, passwordIsDefault });
  } catch (error) {
    console.error('[auth] login failed', error);
    const message =
      error instanceof Error ? error.message : 'Sign in unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
