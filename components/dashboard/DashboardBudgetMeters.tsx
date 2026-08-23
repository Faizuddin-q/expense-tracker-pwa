import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { PercentMeter } from '@/components/dashboard/StatPrimitives';

interface DashboardBudgetMetersProps {
  showTargets: boolean;
  hasBudget: boolean;
  scaledIncome: number;
  scaledBudget: number;
  activeSpend: number;
  spendOfBudgetPercent: number;
  spendOfSalaryPercent: number;
  budgetOfSalaryPercent: number;
  over: boolean;
}

export const DashboardBudgetMeters = ({
  showTargets,
  hasBudget,
  scaledIncome,
  scaledBudget,
  activeSpend,
  spendOfBudgetPercent,
  spendOfSalaryPercent,
  budgetOfSalaryPercent,
  over,
}: DashboardBudgetMetersProps) => {
  if (!showTargets || !(hasBudget || scaledIncome > 0)) return null;

  return (
    <div
      className={`mt-3 rounded-xl border bg-card px-3 py-3.5 sm:px-4 sm:py-4 ${
        over ? 'border-destructive/30' : 'border-border'
      }`}
    >
      <div
        className={`grid gap-4 ${hasBudget && scaledIncome > 0 ? 'sm:grid-cols-2' : ''}`}
      >
        {hasBudget ? (
          <PercentMeter
            label="Of budget"
            percent={spendOfBudgetPercent}
            over={over}
            detail={
              <>
                <Money value={activeSpend} /> of <Money value={scaledBudget} />
              </>
            }
          />
        ) : (
          <PercentMeter
            label="Of salary"
            percent={spendOfSalaryPercent}
            over={over}
            detail={
              <>
                <Money value={activeSpend} /> of <Money value={scaledIncome} />
              </>
            }
          />
        )}

        {hasBudget && scaledIncome > 0 && (
          <PercentMeter
            label="Of salary"
            percent={spendOfSalaryPercent}
            over={spendOfSalaryPercent > 100}
            detail={
              <>
                <Money value={activeSpend} /> of <Money value={scaledIncome} />
              </>
            }
          />
        )}
      </div>

      {hasBudget && scaledIncome > 0 && (
        <div className="mt-4 border-t border-border pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label">Budget vs salary</span>
            <span className="font-mono-numbers text-[13px] font-semibold text-foreground">
              {budgetOfSalaryPercent}%
            </span>
          </div>
          <Bar value={budgetOfSalaryPercent} className="mt-2 h-1.5" color="var(--primary)" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            <Money value={scaledBudget} /> reserved from <Money value={scaledIncome} /> salary
          </p>
        </div>
      )}
    </div>
  );
};
