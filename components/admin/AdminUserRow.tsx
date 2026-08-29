'use client';

import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { AdminUserDetail, AdminUserSummary } from '@/lib/admin-types';
import { formatIndianMobileDisplay, formatRelativeTime, moneyExact } from '@/lib/utils';
import { toast } from '@/components/ToastHost';
import { AdminUserPanel } from '@/components/admin/AdminUserPanel';

interface AdminUserRowProps {
  user: AdminUserSummary;
  expanded: boolean;
  onToggle: () => void;
  onUserDeleted: (userId: string) => void;
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

export const AdminUserRow = ({
  user,
  expanded,
  onToggle,
  onUserDeleted,
  onUserChanged,
}: AdminUserRowProps) => {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    onToggle();
    if (detail || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to load user');
      setDetail(body.data);
    } catch (err) {
      toast.error(
        'Could not load account',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDetailChange = (next: AdminUserDetail) => {
    setDetail(next);
    onUserChanged(summaryFromDetail(next));
  };

  const initials = user.userId.slice(-2);

  return (
    <>
      <tr
        onClick={() => void handleToggle()}
        className={`cursor-pointer border-b border-border transition-colors last:border-b-0 ${
          expanded ? 'bg-primary/[0.045]' : 'hover:bg-primary/[0.03]'
        }`}
      >
        <td className="w-9 py-2.5 pl-3 sm:pl-4">
          <span
            className={`grid size-6 place-items-center rounded-md text-muted-foreground transition-transform ${
              expanded ? 'rotate-90 text-primary' : ''
            }`}
          >
            <ChevronRight className="size-4" strokeWidth={2} />
          </span>
        </td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono-numbers grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="font-mono-numbers truncate text-[13px] font-medium text-foreground">
                {formatIndianMobileDisplay(user.userId)}
              </p>
              {!user.onboardingComplete && (
                <p className="text-[11px] text-faint">Onboarding incomplete</p>
              )}
            </div>
          </div>
        </td>
        <td className="font-mono-numbers py-2.5 pr-3 text-[13px] text-foreground">
          {user.expenseCount}
        </td>
        <td className="font-mono-numbers py-2.5 pr-3 text-[13px] font-medium text-foreground">
          {moneyExact(user.totalSpend)}
        </td>
        <td className="font-mono-numbers py-2.5 pr-3 text-[13px] text-muted-foreground">
          {user.monthlyIncome ? moneyExact(user.monthlyIncome) : '—'}
        </td>
        <td className="font-mono-numbers py-2.5 pr-3 text-[13px] text-muted-foreground">
          {user.monthlyBudget ? moneyExact(user.monthlyBudget) : '—'}
        </td>
        <td className="py-2.5 pr-3 text-[12px] whitespace-nowrap text-muted-foreground sm:pr-4">
          {formatRelativeTime(user.lastActivity)}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border last:border-b-0">
          <td colSpan={7} className="p-0">
            {loading || !detail ? (
              <div className="flex items-center justify-center gap-2 border-t border-border bg-background/40 py-10 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                Loading account…
              </div>
            ) : (
              <AdminUserPanel
                detail={detail}
                onDetailChange={handleDetailChange}
                onUserDeleted={() => onUserDeleted(user.userId)}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
};
