import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { rateLimitOrResponse } from '@/lib/rate-limit';
import { fail } from '@/lib/api/response';

type RateLimitOpts<Extra = undefined> = {
  /** Receives a clone of the request (body stream still readable by the handler afterward) plus any extra context, e.g. the session userId. */
  key: (request: Request, extra: Extra) => string | Promise<string>;
  limit: number;
  windowMs: number;
};

type RouteContext<P> = { params: Promise<P> };

type UserHandlerCtx<P> = {
  request: Request;
  params: P;
  userId: string;
};

type AdminHandlerCtx<P> = {
  request: Request;
  params: P;
};

type PublicHandlerCtx<P> = {
  request: Request;
  params: P;
};

const runRateLimit = async <Extra>(
  request: Request,
  extra: Extra,
  rateLimit?: RateLimitOpts<Extra>
): Promise<NextResponse | null> => {
  if (!rateLimit) return null;
  const key = await Promise.resolve(rateLimit.key(request.clone(), extra));
  return rateLimitOrResponse(key, rateLimit.limit, rateLimit.windowMs);
};

/** Wraps a route handler with session-user auth, rate limiting, and a catch-all 503. */
export function withUserAuth<P = Record<string, never>>(
  logTag: string,
  fn: (ctx: UserHandlerCtx<P>) => Promise<NextResponse>,
  opts: { rateLimit?: RateLimitOpts<string> } = {}
) {
  return async (request: Request, context: RouteContext<P>) => {
    const userId = await getSessionUserId();
    if (!userId) return fail('Unauthorized', 401);

    const limited = await runRateLimit(request, userId, opts.rateLimit);
    if (limited) return limited;

    try {
      const params = await context.params;
      return await fn({ request, params, userId });
    } catch (error) {
      console.error(`[${logTag}] request failed`, error);
      const message = error instanceof Error ? error.message : 'Request failed';
      return fail(message, 503);
    }
  };
}

/** Wraps a route handler with rate limiting and a catch-all 503, but no auth requirement. */
export function withPublic<P = Record<string, never>>(
  logTag: string,
  fn: (ctx: PublicHandlerCtx<P>) => Promise<NextResponse>,
  opts: { rateLimit?: RateLimitOpts<undefined> } = {}
) {
  return async (request: Request, context: RouteContext<P>) => {
    const limited = await runRateLimit(request, undefined, opts.rateLimit);
    if (limited) return limited;

    try {
      const params = await context.params;
      return await fn({ request, params });
    } catch (error) {
      console.error(`[${logTag}] request failed`, error);
      const message = error instanceof Error ? error.message : 'Request failed';
      return fail(message, 503);
    }
  };
}

/** Wraps a route handler with admin-session auth, rate limiting, and a catch-all 503. */
export function withAdminAuth<P = Record<string, never>>(
  logTag: string,
  fn: (ctx: AdminHandlerCtx<P>) => Promise<NextResponse>,
  opts: { rateLimit?: RateLimitOpts<undefined> } = {}
) {
  return async (request: Request, context: RouteContext<P>) => {
    if (!(await isAdminAuthenticated())) return fail('Unauthorized', 401);

    const limited = await runRateLimit(request, undefined, opts.rateLimit);
    if (limited) return limited;

    try {
      const params = await context.params;
      return await fn({ request, params });
    } catch (error) {
      console.error(`[${logTag}] request failed`, error);
      const message = error instanceof Error ? error.message : 'Request failed';
      return fail(message, 503);
    }
  };
}
