import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// Fixed admin credentials — this is a single-operator personal tracker, not
// a multi-tenant product, so a hardcoded pair (rather than a user table) is
// the right amount of machinery.
const ADMIN_USERNAME = 'faizadmin';
const ADMIN_PASSWORD = 'faiz@admin';

export const ADMIN_SESSION_COOKIE = 'pocket_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

// Falls back to a fixed dev secret so the panel still works without extra
// env setup; set ADMIN_SESSION_SECRET in production for a real signing key.
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'pocket-admin-session-secret-v1';

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

export const verifyAdminCredentials = (
  username: string,
  password: string
): boolean => safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);

export const createAdminSessionToken = (): string => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${sign(String(expiresAt))}`;
};

export const isValidAdminSessionToken = (
  token: string | undefined | null
): boolean => {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split('.');
  if (!expiresAtRaw || !signature) return false;
  if (!safeEqual(signature, sign(expiresAtRaw))) return false;
  const expiresAt = Number(expiresAtRaw);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
};

/** Server-side check for use inside Route Handlers (reads the httpOnly cookie). */
export const isAdminAuthenticated = async (): Promise<boolean> => {
  const store = await cookies();
  return isValidAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
};
