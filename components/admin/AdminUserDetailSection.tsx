'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminUserDetail, AdminUserSummary } from '@/lib/admin-types';
import { toast } from '@/components/ToastHost';
import { AdminUserPanel } from '@/components/admin/AdminUserPanel';

interface AdminUserDetailSectionProps {
  userId: string;
  onUserDeleted: () => void;
  onUserChanged: (summary: AdminUserSummary) => void;
}

const summaryFromDetail = (detail: AdminUserDetail): AdminUserSummary => ({
  userId: detail.userId,
  monthlyIncome: detail.profile.monthlyIncome,
  monthlyBudget: detail.profile.monthlyBudget,
  hideAmounts: detail.profile.hideAmounts,
  onboardingComplete: detail.profile.onboardingComplete,
  expenseCount: detail.expenses.length,
  totalSpend: detail.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
  lastActivity:
    detail.expenses[0]?.updatedAt ?? detail.profile.updatedAt ?? null,
});

/** Rendered as a full-width block below the (horizontally-scrollable) users
 *  table, not inside a <td> — so Dashboard/Expenses can reflow to the actual
 *  viewport width on mobile instead of being trapped in the table's
 *  min-width scroll container. */
export const AdminUserDetailSection = ({
  userId,
  onUserDeleted,
  onUserChanged,
}: AdminUserDetailSectionProps) => {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to load user');
        if (!cancelled) setDetail(body.data);
      } catch (err) {
        if (!cancelled)
          toast.error(
            'Could not load account',
            err instanceof Error ? err.message : 'Try again'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleDetailChange = (next: AdminUserDetail) => {
    setDetail(next);
    onUserChanged(summaryFromDetail(next));
  };

  if (loading || !detail) {
    return (
      <div className="flex items-center justify-center gap-2 bg-background/40 py-10 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        Loading account…
      </div>
    );
  }

  return (
    <AdminUserPanel
      detail={detail}
      onDetailChange={handleDetailChange}
      onUserDeleted={onUserDeleted}
    />
  );
};
