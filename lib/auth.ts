import { randomBytes, createHmac, timingSafeEqual, scrypt } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'pocket_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

// Shared with lib/admin-auth.ts (admin sessions) — one signing secret for the
// whole app. Falls back to a fixed dev secret so auth still works without
// extra env setup locally; set SESSION_SECRET in production for a real
// signing key.
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'pocket-session-secret-v1';

const SCRYPT_KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;
export const isValidPhone = (value: string): boolean =>
  /^[6-9]\d{9}$/.test(value) || value === '1234567890';

// ─── Passwords ──────────────────────────────────────────────────────────────

/** `salt:hash`, both hex — scrypt with a random salt per user. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEYLEN
  )) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
};

export const verifyPassword = async (
  password: string,
  stored: string
): Promise<boolean> => {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const derived = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEYLEN
  )) as Buffer;
  return timingSafeEqual(derived, expected);
};

// ─── Sessions ───────────────────────────────────────────────────────────────

const sign = (payload: string) =>
  createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison so failure timing doesn't leak the length diff.
    timingSafeEqual(bufA, Buffer.from(randomBytes(bufA.length)));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
};

export const createSessionToken = (userId: string): string => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
};

/** Returns the userId encoded in the token, or null if missing/expired/tampered. */
export const verifySessionToken = (
  token: string | undefined | null
): string | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAtRaw, signature] = parts;
  if (!userId || !expiresAtRaw || !signature) return null;
  const payload = `${userId}.${expiresAtRaw}`;
  if (!safeEqual(signature, sign(payload))) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;
  return userId;
};

/** Server-side read of the session cookie inside a Route Handler. */
export const getSessionUserId = async (): Promise<string | null> => {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
};
