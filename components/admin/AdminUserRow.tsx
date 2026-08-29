'use client';

import { ChevronRight } from 'lucide-react';
import { AdminUserSummary } from '@/lib/admin-types';
import { formatIndianMobileDisplay, formatRelativeTime, moneyExact } from '@/lib/utils';

interface AdminUserRowProps {
  user: AdminUserSummary;
  expanded: boolean;
  onToggle: () => void;
}

export const AdminUserRow = ({ user, expanded, onToggle }: AdminUserRowProps) => {
  const initials = user.userId.slice(-2);

  return (
    <tr
      onClick={onToggle}
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
  );
};
