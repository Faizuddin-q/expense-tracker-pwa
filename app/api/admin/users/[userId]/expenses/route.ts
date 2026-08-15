import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { adminDb } from '@/lib/admin-db';

type Params = { params: Promise<{ userId: string }> };

/** POST /api/admin/users/:userId/expenses — log a new expense on the user's behalf. */
export const POST = async (request: Request, { params }: Params) => {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  const category = typeof body?.category === 'string' ? body.category : '';

  if (!Number.isFinite(amount) || amount <= 0 || !category)
    return NextResponse.json(
      { error: 'Amount and category are required' },
      { status: 400 }
    );

  const now = new Date();
  const date =
    typeof body?.date === 'string' && body.date ? body.date : now.toISOString();
  const note =
    typeof body?.note === 'string' && body.note.trim()
      ? body.note.trim()
      : null;
  const localId = randomUUID();

  try {
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

    return NextResponse.json({
      ok: true,
      expense: {
        id: localId,
        amount,
        category,
        note: note ?? undefined,
        date,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        syncStatus: 'synced' as const,
      },
    });
  } catch (error) {
    console.error('[admin] add expense failed', error);
    return NextResponse.json(
      { error: 'Failed to add expense' },
      { status: 503 }
    );
  }
};
