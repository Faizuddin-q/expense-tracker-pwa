import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  hashPassword,
  isValidPhone,
} from '@/lib/auth';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';
import { defaultCategorySeed } from '@/lib/default-categories';
import { auditFromRequest, writeAuditLog } from '@/lib/audit-log';

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!isValidPhone(phone))
    return NextResponse.json(
      { error: 'Enter a valid 10-digit Indian mobile number.' },
      { status: 400 }
    );
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  )
    return NextResponse.json(
      {
        error: `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 }
    );

  // Same brute-force budget as login — registration also takes a guessable
  // phone number and turns it into an account if left unthrottled.
  const limited = rateLimitOrResponse(
    `register:${clientIp(request)}:${phone}`,
    8,
    15 * 60 * 1000
  );
  if (limited) return limited;

  try {
    const db = await getDb();
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    const [existingUser, existingProfile] = await Promise.all([
      users.findOne({ userId: phone }),
      profiles.findOne({ userId: phone }),
    ]);

    if (existingUser)
      return NextResponse.json(
        { error: 'An account with this number already exists. Sign in instead.' },
        { status: 409 }
      );

    if (existingProfile)
      return NextResponse.json(
        {
          error:
            'This number already has an account from before passwords were required. Sign in using your phone number as the password, then set a real one in Settings.',
        },
        { status: 409 }
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

    void writeAuditLog(
      db,
      auditFromRequest(request, phone, 'auth.register')
    );

    return NextResponse.json({ ok: true, userId: phone });
  } catch (error) {
    console.error('[auth] register failed', error);
    const message =
      error instanceof Error ? error.message : 'Could not create account';
    return NextResponse.json({ error: message }, { status: 503 });
  }
};
