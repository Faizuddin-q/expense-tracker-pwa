'use client';

import { useMemo, useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { Payment } from '@/types/expense';
import { AdminUserDetail } from '@/lib/admin-types';
import { builtInCategories } from '@/lib/constants';
import { getCategoryIcon, moneyExact } from '@/lib/utils';
import { toast } from '@/components/ToastHost';
import { Dashboard } from '@/components/views/Dashboard';
import { Expenses } from '@/components/views/Expenses';
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

  const [adding, setAdding] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const categories = useMemo(() => {
    // Accounts now own their full category list (seeded with the defaults at
    // signup — no separate built-in list). This fallback only fills in
    // defaults for an older account that hasn't synced since that change.
    const ownedIds = new Set(profile.categories.map((c) => c.id));
    const merged = [
      ...profile.categories.map((c) => ({ ...c, custom: true })),
      ...builtInCategories.filter((c) => !ownedIds.has(c.id)),
    ];
    return merged.map((c) => ({ ...c, Icon: getCategoryIcon(c) }));
  }, [profile]);

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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to save');
      onDetailChange({
        ...detail,
        profile: { ...profile, ...body.data.profile },
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to add expense');
      onDetailChange({
        ...detail,
        expenses: [body.data.expense, ...expenses],
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

  const updateExpense = async (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: string;
      date: string;
      paymentMethod?: Payment;
    }
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/expenses/${id}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to save');
      onDetailChange({
        ...detail,
        expenses: expenses.map((e) =>
          e.id === id ? { ...e, ...patch, note: patch.note ?? undefined } : e
        ),
      });
      toast.success('Expense updated', moneyExact(patch.amount));
    } catch (err) {
      toast.error(
        'Could not update',
        err instanceof Error ? err.message : 'Try again'
      );
    }
  };

  const removeExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/expenses/${id}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to delete');
      onDetailChange({
        ...detail,
        expenses: expenses.filter((e) => e.id !== id),
      });
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(
        'Could not delete',
        err instanceof Error ? err.message : 'Try again'
      );
    }
  };

  const resetPassword = async () => {
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to reset password');
      toast.success(
        'Password reset',
        `+91 ${userId} can sign in with their phone number as the password`
      );
    } catch (err) {
      toast.error(
        'Could not reset password',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setResettingPassword(false);
    }
  };

  const confirmDeleteUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete account');
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
    <div className="space-y-4 bg-background/40 px-3 py-4 sm:px-5">
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
              className="h-9 cursor-pointer rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            >
              {savingProfile ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Account access */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
        <h3 className="label">Account access</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Forgot their password? Reset it so they can sign in again using
            their phone number as a temporary password, then set a real one
            in Settings.
          </p>
          <button
            type="button"
            onClick={() => void resetPassword()}
            disabled={resettingPassword}
            className="press flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <KeyRound className="size-3.5" strokeWidth={2} />
            {resettingPassword ? 'Resetting…' : 'Reset password'}
          </button>
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
          cycleStartDay={profile.cycleStartDay}
        />
      </div>

      {/* Expense management — same view the user sees, filtered by their own
          billing cycle, with Added/Updated timestamps for support/audit use. */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="label">All expenses ({expenses.length})</h3>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="press flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
          >
            <Plus className="size-3.5" strokeWidth={2.2} />
            Add
          </button>
        </div>
        <Expenses
          expenses={expenses}
          remove={(id) => void removeExpense(id)}
          updateExpense={(id, patch) => void updateExpense(id, patch)}
          categories={categories}
          cycleStartDay={profile.cycleStartDay}
          hideAmounts={profile.hideAmounts}
        />
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
