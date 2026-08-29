import { randomUUID } from 'crypto';
import { adminDb } from '@/lib/admin-db';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/api/handler';
import { adminExpenseSchema } from '@/lib/validation/expense';

type Params = { userId: string };

/** POST /api/admin/users/:userId/expenses — log a new expense on the user's behalf. */
export const POST = withAdminAuth<Params>(
  'admin:expenses:create',
  async ({ request, params }) => {
    const { userId } = params;
    const body = await request.json().catch(() => null);
    const parsed = adminExpenseSchema.safeParse(body);
    if (!parsed.success)
      return fail('Amount and category are required', 400);

    const { amount, category } = parsed.data;
    const now = new Date();
    const date = parsed.data.date || now.toISOString();
    const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
    const localId = randomUUID();

    const db = await adminDb();
    await db.collection('expenses').insertOne({
      userId,
      localId,
      amount,
      category,
      note,
      date,
      createdAt: now,
      updatedAt: now,
    });

    return ok({
      expense: {
        id: localId,
        amount,
        category,
        note: note ?? undefined,
        date,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  },
  {
    rateLimit: {
      key: (req) => `admin-expense-write:${clientIp(req)}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);
