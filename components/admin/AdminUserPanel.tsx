'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AdminUserDetail } from '@/lib/admin-types';
import { builtInCategories } from '@/lib/constants';
import { getCategoryIcon } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Dashboard } from '@/components/views/Dashboard';
import { AdminDeleteUserDialog } from '@/components/admin/AdminDeleteUserDialog';
import { AdminProfileControls } from '@/components/admin/AdminProfileControls';
import { AdminAccountAccess } from '@/components/admin/AdminAccountAccess';
import { AdminExpenseManager } from '@/components/admin/AdminExpenseManager';

interface AdminUserPanelProps {
  detail: AdminUserDetail;
  onDetailChange: (next: AdminUserDetail) => void;
  onUserDeleted: () => void;
}

export const AdminUserPanel = ({
  detail,
  onDetailChange,
  onUserDeleted,
}: AdminUserPanelProps) => {
  const { userId, profile, expenses } = detail;

  const [deletingUser, setDeletingUser] = useState(false);

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
      <AdminProfileControls
        userId={userId}
        monthlyIncome={profile.monthlyIncome}
        monthlyBudget={profile.monthlyBudget}
        hideAmounts={profile.hideAmounts}
        onSaved={(patch) =>
          onDetailChange({ ...detail, profile: { ...profile, ...patch } })
        }
      />

      <AdminAccountAccess userId={userId} />

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

      <AdminExpenseManager
        userId={userId}
        expenses={expenses}
        categories={categories}
        onExpensesChange={(next) =>
          onDetailChange({ ...detail, expenses: next })
        }
      />

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
