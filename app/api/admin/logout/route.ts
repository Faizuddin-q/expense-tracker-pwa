import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import { clientIp } from '@/lib/rate-limit';
import { ok } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';

export const POST = withPublic(
  'admin:logout',
  async () => {
    const store = await cookies();
    store.delete(ADMIN_SESSION_COOKIE);
    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req) => `admin-logout:${clientIp(req)}`,
      limit: 20,
      windowMs: 60 * 1000,
    },
  }
);
