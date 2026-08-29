import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { clientIp } from '@/lib/rate-limit';
import { ok } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';

export const POST = withPublic(
  'auth:logout',
  async () => {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req) => `logout:${clientIp(req)}`,
      limit: 20,
      windowMs: 60 * 1000,
    },
  }
);
