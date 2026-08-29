import { getSessionUserId } from '@/lib/auth';
import { clientIp } from '@/lib/rate-limit';
import { ok } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';

export const GET = withPublic(
  'auth:session',
  async () => {
    const userId = await getSessionUserId();
    return ok(userId ? { authenticated: true, userId } : { authenticated: false });
  },
  {
    rateLimit: {
      key: (req) => `session-check:${clientIp(req)}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
