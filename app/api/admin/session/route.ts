import { isAdminAuthenticated } from '@/lib/admin-auth';
import { clientIp } from '@/lib/rate-limit';
import { ok } from '@/lib/api/response';
import { withPublic } from '@/lib/api/handler';

export const GET = withPublic(
  'admin:session',
  async () => ok({ authenticated: await isAdminAuthenticated() }),
  {
    rateLimit: {
      key: (req) => `admin-session-check:${clientIp(req)}`,
      limit: 60,
      windowMs: 60 * 1000,
    },
  }
);
