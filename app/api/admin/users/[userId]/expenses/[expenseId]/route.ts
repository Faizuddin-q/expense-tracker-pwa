import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { adminDb } from '@/lib/admin-db';
import { clientIp, rateLimitOrResponse } from '@/lib/rate-limit';

type Params = { params: Promise<{ userId: string; expenseId: string }> };

/** PATCH /api/admin/users/:userId/expenses/:expenseId — edit one expense on the user's behalf. */
export const PATCH = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimitOrResponse(
    `admin-expense-write:${clientIp(request)}`,
    30,
    60 * 1000
  );
  if (limited) return limited;

  const [{ userId, expenseId }, body] = await Promise.all([
    params,
    request.json().catch(() => null),
  ]);
  const amount = Number(body?.amount);
  const category = typeof body?.category === 'string' ? body.category : '';

  if (!Number.isFinite(amount) || amount <= 0 || !category)
    return NextResponse.json(
      { error: 'Amount and category are required' },
      { status: 400 }
    );

  const update: Record<string, unknown> = {
    amount,
    category,
    updatedAt: new Date(),
    note:
      typeof body?.note === 'string' && body.note.trim()
        ? body.note.trim()
        : null,
  };
  if (typeof body?.date === 'string' && body.date) update.date = body.date;

  try {
    const db = await adminDb();
    const result = await db.collection('expenses').updateOne(
      { userId, $or: [{ localId: expenseId }, { id: expenseId }] },
      { $set: update, $unset: { deletedAt: '' } }
    );
    if (result.matchedCount === 0)
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] edit expense failed', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 503 }
    );
  }
};

/** DELETE /api/admin/users/:userId/expenses/:expenseId — soft-delete, same as the app's own delete. */
export const DELETE = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = rateLimitOrResponse(
    `admin-expense-write:${clientIp(request)}`,
    30,
    60 * 1000
  );
  if (limited) return limited;

  const { userId, expenseId } = await params;

  try {
    const db = await adminDb();
    const now = new Date();
    const result = await db.collection('expenses').updateOne(
      { userId, $or: [{ localId: expenseId }, { id: expenseId }] },
      { $set: { deletedAt: now, updatedAt: now } }
    );
    if (result.matchedCount === 0)
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] delete expense failed', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 503 }
    );
  }
};
