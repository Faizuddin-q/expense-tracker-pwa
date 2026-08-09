import { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor } from '@/lib/utils';
import { Money } from '@/components/Money';

interface MonthlySummaryProps {
  expenses: Expense[];
  income: number;
  budget?: number;
  categories?: Category[];
}

interface MonthSummary {
  key: string;
  label: string;
  year: number;
  total: number;
  count: number;
  topCategory: (Category & { total: number }) | null;
  byCategory: (Category & { total: number })[];
  budgetPercent: number;
  incomePercent: number;
  budgetRemaining: number;
  incomeRemaining: number;
  isCurrent: boolean;
}

export const MonthlySummary = ({
  expenses,
  income,
  budget = 0,
  categories = builtInCategories,
}: MonthlySummaryProps) => {
  const hasBudget = budget > 0;
  const [expanded, setExpanded] = useState<string | null>(null);

  const months = useMemo<MonthSummary[]>(() => {
    const cats = categories.length ? categories : builtInCategories;
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const groups = new Map<string, Expense[]>();

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    });

    // Always include current month even with zero spend
    if (!groups.has(currentKey)) groups.set(currentKey, []);

    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => {
        const [yearStr, monthStr] = key.split('-');
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1;
        const label = new Date(year, monthIndex, 1).toLocaleDateString(
          'en-IN',
          { month: 'long', year: 'numeric' }
        );
        const total = list.reduce((sum, e) => sum + e.amount, 0);
        const byCategory = cats
          .map((c) => ({
            ...c,
            total: list
              .filter((e) => e.category === c.id)
              .reduce((sum, e) => sum + e.amount, 0),
          }))
          .filter((c) => c.total > 0)
          .sort((a, b) => b.total - a.total);

        return {
          key,
          label,
          year,
          total,
          count: list.length,
          topCategory: byCategory[0] ?? null,
          byCategory,
          budgetPercent: Math.round((total / Math.max(budget || 1, 1)) * 100),
          incomePercent: Math.round((total / Math.max(income, 1)) * 100),
          budgetRemaining: budget - total,
          incomeRemaining: income - total,
          isCurrent: key === currentKey,
        };
      });
  }, [expenses, income, budget, categories]);

  const totals = useMemo(() => {
    const spent = months.reduce((sum, m) => sum + m.total, 0);
    const avg = months.length ? spent / months.length : 0;
    return { spent, avg, months: months.length };
  }, [months]);

  return (
    <section className="mx-auto max-w-4xl">
      {/* Overview strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Months tracked
          </p>
          <p className="font-mono-numbers mt-1.5 text-2xl font-extrabold text-foreground">
            {totals.months}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total spent
          </p>
          <p className="font-mono-numbers mt-1.5 text-2xl font-extrabold text-foreground">
            <Money value={totals.spent} />
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg / month
          </p>
          <p className="font-mono-numbers mt-1.5 text-2xl font-extrabold text-foreground">
            <Money value={totals.avg} />
          </p>
        </div>
      </div>

      {/* Month cards */}
      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:gap-4">
        {months.map((m) => {
          const isOpen = expanded === m.key;
          const overBudget = hasBudget && m.budgetRemaining < 0;
          const overIncome = m.incomeRemaining < 0;

          return (
            <article
              key={m.key}
              className="rounded-2xl border border-border/80 bg-card shadow-2xs sm:rounded-3xl"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : m.key)}
                className="flex w-full cursor-pointer items-start gap-3 p-4 text-left transition hover:bg-muted/40 sm:gap-4 sm:p-5"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary sm:size-11">
                  <CalendarRange className="size-4.5 sm:size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                      {m.label}
                    </h3>
                    {m.isCurrent && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.count} {m.count === 1 ? 'expense' : 'expenses'}
                    {m.topCategory
                      ? ` · top: ${m.topCategory.label}`
                      : ' · no spending yet'}
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {hasBudget && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Budget <Money value={budget} /></span>
                          <span className="font-mono-numbers">
                            {m.budgetPercent}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
                          <div
                            className={`h-full rounded-sm ${
                              overBudget ? 'bg-destructive' : 'bg-primary'
                            }`}
                            style={{
                              width: `${Math.min(100, m.budgetPercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                        <span>Income <Money value={income} /></span>
                        <span className="font-mono-numbers">
                          {m.incomePercent}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
                        <div
                          className={`h-full rounded-sm ${
                            overIncome ? 'bg-destructive' : 'bg-primary'
                          }`}
                          style={{
                            width: `${Math.min(100, m.incomePercent)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="font-mono-numbers text-base font-extrabold text-foreground sm:text-lg">
                    <Money value={m.total} />
                  </p>
                  {hasBudget ? (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        overBudget ? 'text-destructive' : 'text-primary'
                      }`}
                    >
                      {overBudget ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {overBudget
                        ? <><Money value={Math.abs(m.budgetRemaining)} /> over</> : <><Money value={m.budgetRemaining} /> left</>}
                    </span>
                  ) : (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-bold ${
                        overIncome ? 'text-destructive' : 'text-primary'
                      }`}
                    >
                      {overIncome
                        ? <><Money value={Math.abs(m.incomeRemaining)} /> over</> : <><Money value={m.incomeRemaining} /> left</>}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="mt-1 size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-1 size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hasBudget && (
                      <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          vs Budget
                        </p>
                        <p className="font-mono-numbers mt-0.5 text-sm font-bold text-foreground">
                          {m.budgetPercent}% of <Money value={budget} />
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            overBudget ? 'text-destructive' : 'text-primary'
                          }`}
                        >
                          {overBudget
                            ? <><Money value={Math.abs(m.budgetRemaining)} /> over budget</> : <><Money value={m.budgetRemaining} /> under budget</>}
                        </p>
                      </div>
                    )}
                    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        vs Income
                      </p>
                      <p className="font-mono-numbers mt-0.5 text-sm font-bold text-foreground">
                        {m.incomePercent}% of <Money value={income} />
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          overIncome ? 'text-destructive' : 'text-primary'
                        }`}
                      >
                        {overIncome
                          ? <><Money value={Math.abs(m.incomeRemaining)} /> over income</> : <><Money value={m.incomeRemaining} /> of income left</>}
                      </p>
                    </div>
                  </div>

                  {m.byCategory.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Category breakdown
                      </p>
                      {m.byCategory.map((c) => {
                        const catPercent = Math.round(
                          (c.total / Math.max(m.total, 1)) * 100
                        );
                        const Icon = c.Icon;
                        const color = getCategoryColor(c.tone);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-2.5"
                          >
                            <div
                              className="grid size-7 shrink-0 place-items-center rounded-lg text-white"
                              style={{ backgroundColor: color }}
                            >
                              {Icon ? (
                                <Icon className="size-3.5 text-white" />
                              ) : null}
                            </div>
                            <span className="w-20 shrink-0 text-xs font-semibold text-foreground sm:w-24">
                              {c.label}
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted">
                              <div
                                className="h-full rounded-sm"
                                style={{
                                  width: `${catPercent}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                            <span className="font-mono-numbers w-16 shrink-0 text-right text-xs font-bold text-foreground sm:w-20">
                              <Money value={c.total} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                      No expenses recorded this month.
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
