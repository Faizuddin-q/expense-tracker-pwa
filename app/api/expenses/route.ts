import { getDb } from '@/lib/db';
import { ok, fail, stampServerTiming } from '@/lib/api/response';
import { withUserAuth } from '@/lib/api/handler';
import { listActiveExpenses } from '@/lib/user-data';
import {
  EXPENSE_UPSERT_FIELDS,
  expensesDeleteSchema,
  expensesUpsertSchema,
} from '@/lib/validation/expense';

const pickExpenseFields = (
  expense: Record<string, unknown>
): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  for (const key of EXPENSE_UPSERT_FIELDS) {
    if (key in expense) picked[key] = expense[key];
  }
  return picked;
};

/** GET /api/expenses — pull the caller's active expenses. */
export const GET = withUserAuth(
  'expenses:list',
  async ({ userId }) => {
    const t0 = performance.now();
    const db = await getDb();
    const tDb = performance.now();
    const expenses = await listActiveExpenses(db, userId);
    return stampServerTiming(ok({ expenses }), [
      ['db', tDb - t0],
      ['query', performance.now() - tDb],
    ]);
  },
  {
    rateLimit: {
      key: (req, userId) => `expenses-list:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** POST /api/expenses — bulk upsert the caller's expenses. */
export const POST = withUserAuth(
  'expenses:upsert',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = expensesUpsertSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { expenses } = parsed.data;
    if (expenses.length) {
      const db = await getDb();
      await db.collection('expenses').bulkWrite(
        expenses.map((expense) => {
          const localId =
            (typeof expense.localId === 'string' && expense.localId) ||
            (typeof expense.id === 'string' && expense.id) ||
            '';
          const noteValue =
            typeof expense.note === 'string' && expense.note.trim()
              ? expense.note.trim()
              : null;
          const whitelisted = pickExpenseFields(expense);
          return {
            updateOne: {
              filter: { userId, localId },
              update: {
                $set: {
                  ...whitelisted,
                  userId,
                  localId,
                  note: noteValue,
                  updatedAt: new Date(
                    (typeof expense.updatedAt === 'string' ||
                    typeof expense.updatedAt === 'number'
                      ? expense.updatedAt
                      : Date.now()) as string | number
                  ),
                },
                $unset: { deletedAt: '' },
              },
              upsert: true,
            },
          };
        })
      );
    }

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `expenses-write:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);

/** DELETE /api/expenses — bulk soft-delete by id. */
export const DELETE = withUserAuth(
  'expenses:delete',
  async ({ request, userId }) => {
    const body = await request.json().catch(() => null);
    const parsed = expensesDeleteSchema.safeParse(body);
    if (!parsed.success) return fail('Invalid payload', 400);

    const { ids } = parsed.data;
    const db = await getDb();
    const now = new Date();
    await db.collection('expenses').updateMany(
      {
        userId,
        $or: [{ localId: { $in: ids } }, { id: { $in: ids } }],
      },
      {
        $set: {
          deletedAt: now,
          updatedAt: now,
        },
      }
    );

    return ok({ ok: true });
  },
  {
    rateLimit: {
      key: (req, userId) => `expenses-write:${userId}`,
      limit: 120,
      windowMs: 60 * 1000,
    },
  }
);
