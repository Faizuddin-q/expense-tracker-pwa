import { z } from 'zod';

export const EXPENSE_UPSERT_FIELDS = [
  'amount',
  'category',
  'note',
  'date',
  'paymentMethod',
  'createdAt',
] as const;

export const expensePayloadSchema = z
  .object({
    localId: z.string().optional(),
    id: z.string().optional(),
    amount: z.number().optional(),
    category: z.string().optional(),
    note: z.string().nullable().optional(),
    date: z.union([z.string(), z.number()]).optional(),
    paymentMethod: z.string().optional(),
    createdAt: z.union([z.string(), z.number()]).optional(),
    updatedAt: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const expensesUpsertSchema = z.object({
  expenses: z.array(expensePayloadSchema).max(10000),
});

export const expensesDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(10000),
});

export const adminExpenseSchema = z.object({
  amount: z.number().finite().positive(),
  category: z.string().min(1, 'Amount and category are required'),
  note: z.string().nullable().optional(),
  date: z.string().optional(),
  paymentMethod: z.string().optional(),
});
