'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Expense } from '@/types/expense';
import { AdminUserDetail } from '@/lib/admin-types';
import { builtInCategories } from '@/lib/constants';
import { getCategoryIcon, moneyExact } from '@/lib/utils';
import { toast } from '@/components/ToastHost';
import { Dashboard } from '@/components/views/Dashboard';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { AdminAddExpenseDialog } from '@/components/admin/AdminAddExpenseDialog';
import { AdminDeleteUserDialog } from '@/components/admin/AdminDeleteUserDialog';

interface AdminUserPanelProps {
  detail: AdminUserDetail;
  onDetailChange: (next: AdminUserDetail) => void;
  onUserDeleted: () => void;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

export const AdminUserPanel = ({
  detail,
  onDetailChange,
  onUserDeleted,
}: AdminUserPanelProps) => {
  const { userId, profile, expenses } = detail;

  const [incomeDraft, setIncomeDraft] = useState(String(profile.monthlyIncome || ''));
  const [budgetDraft, setBudgetDraft] = useState(String(profile.monthlyBudget || ''));
  const [hideAmountsDraft, setHideAmountsDraft] = useState(profile.hideAmounts);
  const [savingProfile, setSavingProfile] = useState(false);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const tones = profile.categoryOverrides ?? {};
    const icons = profile.categoryIconOverrides ?? {};
    const merged = [
      ...builtInCategories,
      ...profile.categories.map((c) => ({ ...c, custom: true })),
    ];
    return merged.map((c) => {
      const iconName = icons[c.id] ?? c.iconName;
      return {
        ...c,
        tone: tones[c.id] ?? c.tone,
        iconName,
        Icon: getCategoryIcon({ iconName, Icon: c.Icon }),
      };
    });
  }, [profile]);

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

  const profileDirty =
    incomeDraft !== String(profile.monthlyIncome || '') ||
    budgetDraft !== String(profile.monthlyBudget || '') ||
    hideAmountsDraft !== profile.hideAmounts;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({
          monthlyIncome: Number(incomeDraft.replace(/[^0-9.]/g, '')) || 0,
          monthlyBudget: Number(budgetDraft.replace(/[^0-9.]/g, '')) || 0,
          hideAmounts: hideAmountsDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onDetailChange({
        ...detail,
        profile: { ...profile, ...data.profile },
      });
      toast.success('Profile updated', `Saved for +91 ${userId}`);
    } catch (err) {
      toast.error(
        'Could not save',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
      onDetailChange({
        ...detail,
        expenses: [data.expense, ...expenses],
      });
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
      onDetailChange({
        ...detail,
        expenses: expenses.map((e) =>
          e.id === editing.id
            ? { ...e, ...patch, note: patch.note ?? undefined }
            : e
        ),
      });
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
      onDetailChange({
        ...detail,
        expenses: expenses.filter((e) => e.id !== deleting.id),
      });
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

  const confirmDeleteUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      toast.success('Account deleted', `+91 ${userId} is gone for good`);
      onUserDeleted();
    } catch (err) {
      toast.error(
        'Could not delete account',
        err instanceof Error ? err.message : 'Try again'
      );
    }
  };

  return (
    <div className="space-y-4 border-t border-border bg-background/40 px-3 py-4 sm:px-5">
      {/* Profile controls */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
        <h3 className="label">Account controls</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <div>
            <label className="label mb-1.5 block" htmlFor={`income-${userId}`}>
              Monthly income
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id={`income-${userId}`}
                inputMode="decimal"
                value={incomeDraft}
                onChange={(e) => setIncomeDraft(e.target.value)}
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
              />
            </div>
          </div>
          <div>
            <label className="label mb-1.5 block" htmlFor={`budget-${userId}`}>
              Monthly budget
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id={`budget-${userId}`}
                inputMode="decimal"
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-foreground">
              <input
                type="checkbox"
                checked={hideAmountsDraft}
                onChange={(e) => setHideAmountsDraft(e.target.checked)}
                className="size-3.5 cursor-pointer accent-primary"
              />
              Hide amounts
            </label>
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={!profileDirty || savingProfile}
              className="h-9 cursor-pointer rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            >
              {savingProfile ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Overview — identical metrics to the user-facing Overview tab */}
      <div>
        <h3 className="label mb-2">Overview</h3>
        <Dashboard
          expenses={expenses}
          income={profile.monthlyIncome}
          budget={profile.monthlyBudget}
          categories={categories}
        />
      </div>

      {/* Expense management */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <h3 className="label">All expenses ({expenses.length})</h3>
          <div className="flex items-center gap-2">
            <div className="field-shell flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2">
              <Search className="size-3.5 shrink-0 text-faint" strokeWidth={2} />
              <input
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
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3.5 sm:p-4">
        <h3 className="label text-destructive/80">Danger zone</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Permanently delete this account, its income/budget, and every
            expense. There is no undo.
          </p>
          <button
            type="button"
            onClick={() => setDeletingUser(true)}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Delete account
          </button>
        </div>
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

      {deletingUser && (
        <AdminDeleteUserDialog
          userId={userId}
          expenseCount={expenses.length}
          onClose={() => setDeletingUser(false)}
          onConfirm={() => void confirmDeleteUser()}
        />
      )}
    </div>
  );
};
