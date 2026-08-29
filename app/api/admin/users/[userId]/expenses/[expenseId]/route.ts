import { adminDb } from '@/lib/admin-db';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/api/handler';
import { adminExpenseSchema } from '@/lib/validation/expense';

type Params = { userId: string; expenseId: string };

/** PATCH /api/admin/users/:userId/expenses/:expenseId — edit one expense on the user's behalf. */
export const PATCH = withAdminAuth<Params>(
  'admin:expenses:update',
  async ({ request, params }) => {
    const { userId, expenseId } = params;
    const body = await request.json().catch(() => null);
    const parsed = adminExpenseSchema.safeParse(body);
    if (!parsed.success)
      return fail('Amount and category are required', 400);

    const { amount, category, date, paymentMethod } = parsed.data;
    const update: Record<string, unknown> = {
      amount,
      category,
      updatedAt: new Date(),
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
    };
    if (date) update.date = date;
    if (paymentMethod) update.paymentMethod = paymentMethod;

    const db = await adminDb();
    const result = await db.collection('expenses').updateOne(
      { userId, $or: [{ localId: expenseId }, { id: expenseId }] },
      { $set: update, $unset: { deletedAt: '' } }
    );
    if (result.matchedCount === 0) return fail('Expense not found', 404);
    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req) => `admin-expense-write:${clientIp(req)}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/admin/users/:userId/expenses/:expenseId — soft-delete, same as the app's own delete. */
export const DELETE = withAdminAuth<Params>(
  'admin:expenses:delete',
  async ({ params }) => {
    const { userId, expenseId } = params;
    const db = await adminDb();
    const now = new Date();
    const result = await db.collection('expenses').updateOne(
      { userId, $or: [{ localId: expenseId }, { id: expenseId }] },
      { $set: { deletedAt: now, updatedAt: now } }
    );
    if (result.matchedCount === 0) return fail('Expense not found', 404);
    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req) => `admin-expense-write:${clientIp(req)}`,
      limit: 30,
      windowMs: 60 * 1000,
    },
  }
);
