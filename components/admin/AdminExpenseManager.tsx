'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { moneyExact } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { AdminAddExpenseDialog } from '@/components/admin/AdminAddExpenseDialog';

interface AdminExpenseManagerProps {
  userId: string;
  expenses: Expense[];
  categories: Category[];
  onExpensesChange: (next: Expense[]) => void;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

export const AdminExpenseManager = ({
  userId,
  expenses,
  categories,
  onExpensesChange,
}: AdminExpenseManagerProps) => {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => {
      const cat = categories.find((c) => c.id === e.category);
      return (
        e.note?.toLowerCase().includes(q) ||
        cat?.label.toLowerCase().includes(q) ||
        String(e.amount).includes(q)
      );
    });
  }, [expenses, query, categories]);

  const addExpense = async (payload: {
    amount: number;
    note?: string;
    category: string;
    date: string;
  }) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/expenses`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');
      onExpensesChange([data.expense, ...expenses]);
      setAdding(false);
      toast.success('Expense added', moneyExact(payload.amount));
    } catch (err) {
      toast.error(
        'Could not add expense',
        err instanceof Error ? err.message : 'Try again'
      );
    }
  };

  const saveEdit = async (patch: {
    amount: number;
    note?: string;
    category: string;
    date: string;
  }) => {
    if (!editing) return;
    setBusyExpenseId(editing.id);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/expenses/${editing.id}`,
        {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onExpensesChange(
        expenses.map((e) =>
          e.id === editing.id
            ? { ...e, ...patch, note: patch.note ?? undefined }
            : e
        )
      );
      setEditing(null);
      toast.success('Expense updated', moneyExact(patch.amount));
    } catch (err) {
      toast.error(
        'Could not update',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setBusyExpenseId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyExpenseId(deleting.id);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/expenses/${deleting.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      onExpensesChange(expenses.filter((e) => e.id !== deleting.id));
      setDeleting(null);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(
        'Could not delete',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setBusyExpenseId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        <h3 className="label">All expenses ({expenses.length})</h3>
        <div className="flex items-center gap-2">
          <div className="field-shell flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2">
            <Search className="size-3.5 shrink-0 text-faint" strokeWidth={2} />
            <input
              aria-label="Search note, category, amount"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search note, category, amount"
              className="w-36 min-w-0 bg-transparent text-[12px] text-foreground outline-none placeholder:text-faint sm:w-48"
            />
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
          >
            <Plus className="size-3.5" strokeWidth={2.2} />
            Add
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-3 sm:px-4">
        {filteredExpenses.length ? (
          <div className="divide-y divide-border">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className={
                  busyExpenseId === expense.id
                    ? 'pointer-events-none opacity-50'
                    : undefined
                }
              >
                <ExpenseRow
                  expense={expense}
                  onDelete={setDeleting}
                  onEdit={setEditing}
                  categories={categories}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {expenses.length ? 'No expenses match your search.' : 'No expenses yet.'}
          </p>
        )}
      </div>

      {editing && (
        <ExpenseEditDialog
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (patch.amount <= 0) {
              toast.error('Invalid amount', 'Enter an amount greater than zero');
              return;
            }
            void saveEdit(patch);
          }}
        />
      )}

      {deleting && (
        <ExpenseDeleteDialog
          expense={deleting}
          categories={categories}
          onClose={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {adding && (
        <AdminAddExpenseDialog
          categories={categories}
          onClose={() => setAdding(false)}
          onSave={(payload) => void addExpense(payload)}
        />
      )}
    </div>
  );
};
