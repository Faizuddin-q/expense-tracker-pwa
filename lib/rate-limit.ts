import { NextResponse } from 'next/server';

// In-memory fixed-window limiter. Best-effort only: state is per server
// instance and resets on cold start, so on a multi-instance/serverless
// deployment this caps abuse from a single warm instance rather than
// guaranteeing a global limit. Good enough for a personal-use app; swap for
// a shared store (e.g. Redis) if this ever needs a real guarantee.

const hits = new Map<string, { count: number; windowStart: number }>();

// Sweep occasionally so the map doesn't grow unbounded across many callers/IPs.
let lastSweep = Date.now();
const sweep = (windowMs: number) => {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, entry] of hits) {
    if (now - entry.windowStart >= windowMs) hits.delete(key);
  }
};

export interface RateLimitResult {
  allowed: boolean;
  /** How many seconds until this key can try again — only set when blocked. */
  retryAfterSeconds?: number;
}

/**
 * Checks whether `key` is still under its limit and records this attempt if so.
 * `windowMs` is the time window in milliseconds — e.g. pass `15 * 60 * 1000` to mean "15 minutes".
 */
export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  sweep(windowMs);
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil(
      (entry.windowStart + windowMs - now) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }
  entry.count += 1;
  return { allowed: true };
};

/** Turns a retry-after duration into a human-readable phrase, e.g. "2 minutes" or "45 seconds". */
export const formatRetryAfter = (seconds: number): string => {
  if (seconds <= 90) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

/** Best-effort client identifier from standard proxy headers. */
export const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

/**
 * One-liner for route handlers: checks the limit and, if exceeded, builds
 * the 429 response (with a human-readable wait time and a `Retry-After`
 * header) for the caller to return immediately. Returns `null` when the
 * call is allowed, so the usual shape in a route is:
 *
 *   const limited = rateLimitOrResponse(`sync:${userId}`, 120, 60_000);
 *   if (limited) return limited;
 */
export const rateLimitOrResponse = (
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null => {
  const result = checkRateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  const retryAfterSeconds =
    result.retryAfterSeconds ?? Math.ceil(windowMs / 1000);
  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${formatRetryAfter(retryAfterSeconds)} and try again.`,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
};
