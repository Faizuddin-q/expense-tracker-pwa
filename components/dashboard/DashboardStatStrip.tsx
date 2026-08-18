import { Money } from '@/components/Money';
import { Stat } from '@/components/dashboard/StatPrimitives';

interface DashboardStatStripProps {
  activeSpend: number;
  showTargets: boolean;
  hasBudget: boolean;
  target: number;
  targetPercent: number;
  over: boolean;
  remaining: number;
  spendOfBudgetPercent: number;
  spendOfSalaryPercent: number;
  budgetOfSalaryPercent: number;
  remainOfTargetPercent: number;
  scaledIncome: number;
  dailyAverage: number;
  isProrated: boolean;
  rangeDays: number | null;
  cycleLengthDays: number;
}

export const DashboardStatStrip = ({
  activeSpend,
  showTargets,
  hasBudget,
  target,
  targetPercent,
  over,
  remaining,
  spendOfBudgetPercent,
  spendOfSalaryPercent,
  budgetOfSalaryPercent,
  remainOfTargetPercent,
  scaledIncome,
  dailyAverage,
  isProrated,
  rangeDays,
  cycleLengthDays,
}: DashboardStatStripProps) => (
  <>
    <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:mt-4 sm:grid-cols-4 sm:divide-y-0">
      <Stat
        label="Spent"
        emphasize={activeSpend > 0}
        meter={
          showTargets && target > 0
            ? {
                value: targetPercent,
                color: over ? 'var(--destructive)' : 'var(--primary)',
                caption: hasBudget
                  ? `${spendOfBudgetPercent}% budget`
                  : `${spendOfSalaryPercent}% salary`,
              }
            : null
        }
      >
        <Money value={activeSpend} />
      </Stat>
      <Stat
        label={hasBudget ? 'Budget' : 'Income'}
        meter={
          hasBudget && scaledIncome > 0
            ? {
                value: budgetOfSalaryPercent,
                caption: `${budgetOfSalaryPercent}% of salary`,
              }
            : null
        }
      >
        {showTargets ? <Money value={target} /> : '—'}
      </Stat>
      <Stat
        label={over ? 'Over by' : 'Remaining'}
        tone={showTargets ? (over ? 'destructive' : 'positive') : 'default'}
        meter={
          showTargets && target > 0
            ? {
                value: remainOfTargetPercent,
                color: over ? 'var(--destructive)' : 'var(--positive)',
                caption: `${remainOfTargetPercent}% ${hasBudget ? 'budget' : 'salary'}`,
              }
            : null
        }
      >
        {showTargets ? <Money value={Math.abs(remaining)} /> : '—'}
      </Stat>
      <Stat label="Daily avg">
        <Money value={dailyAverage} />
      </Stat>
    </div>
    {isProrated && showTargets && (
      <p className="mt-1.5 px-1 text-[11px] text-faint">
        Budget/income prorated to {rangeDays} {rangeDays === 1 ? 'day' : 'days'} of your{' '}
        {cycleLengthDays}-day cycle — an estimate, not an exact target for this range.
      </p>
    )}
  </>
);
