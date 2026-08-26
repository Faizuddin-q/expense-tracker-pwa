import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils';
import {
  groupByCycle,
  getCycleKey,
  getCycleRange,
  getCurrentCycleKey,
  getDaysRemainingInCycle,
  formatCycleLabel,
  toDateInputValue,
} from '@/lib/cycle';
import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { CategoryIcon } from '@/components/CategoryIcon';

interface CategoryBreakdown extends Category {
  total: number;
  count: number;
}

interface DashboardProps {
  expenses: Expense[];
  income: number;
  /** Monthly spend target for analytics. Falls back to income when unset. */
  budget?: number;
  categories?: Category[];
  cycleStartDay?: number;
}

type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

const RANGES: { key: TimeRangeOption; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

const expenseAmount = (e: Expense) => {
  const n = Number(e.amount);
  return Number.isFinite(n) ? n : 0;
};

const pctOf = (value: number, base: number) =>
  base > 0 ? Math.round((Math.abs(value) / base) * 100) : 0;

/** One figure in the top stat strip. */
const Stat = ({
  label,
  children,
  tone,
  emphasize,
  meter,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'positive' | 'destructive';
  emphasize?: boolean;
  meter?: { value: number; color?: string; caption: string } | null;
}) => (
  <div className="px-3 py-2.5 sm:px-4 sm:py-3">
    <p className="label">{label}</p>
    <p
      className={`font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight sm:text-[17px] ${
        tone === 'positive'
          ? 'text-positive'
          : tone === 'destructive'
            ? 'text-destructive'
            : emphasize
              ? 'text-primary'
              : 'text-foreground'
      }`}
    >
      {children}
    </p>
    {meter && (
      <div className="mt-2">
        <Bar
          value={meter.value}
          color={meter.color}
          className="h-1.5"
        />
        <p className="font-mono-numbers mt-1 text-[11px] text-muted-foreground">
          {meter.caption}
        </p>
      </div>
    )}
  </div>
);

/** Labeled % meter — used for spend vs budget / salary. */
const PercentMeter = ({
  label,
  percent,
  over,
  detail,
}: {
  label: string;
  percent: number;
  over?: boolean;
  detail: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <span className="label">{label}</span>
      <span
        className={`font-mono-numbers text-[18px] font-semibold tracking-tight ${
          over ? 'text-destructive' : 'text-primary'
        }`}
      >
        {percent}%
      </span>
    </div>
    <Bar
      value={percent}
      className="mt-2 h-2"
      color={over ? 'var(--destructive)' : 'var(--primary)'}
    />
    <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>
  </div>
);

export const Dashboard = ({
  expenses,
  income,
  budget = 0,
  categories = builtInCategories,
  cycleStartDay = 1,
}: DashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [hovered, setHovered] = useState<CategoryBreakdown | null>(null);

  const availableMonths = useMemo(() => {
    const groups = groupByCycle(expenses, (e) => new Date(e.date), cycleStartDay);
    return Array.from(groups.keys())
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({ key, label: formatCycleLabel(key, cycleStartDay) }));
  }, [expenses, cycleStartDay]);

  const activeMonthKey = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    return getCurrentCycleKey(cycleStartDay);
  }, [selectedMonth, cycleStartDay]);

  const monthIndex = availableMonths.findIndex((m) => m.key === activeMonthKey);

  const handlePrevMonth = () => {
    if (monthIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[monthIndex + 1].key);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex > 0) setSelectedMonth(availableMonths[monthIndex - 1].key);
  };

  const handleRangeSelect = (key: TimeRangeOption) => {
    setTimeRange(key);
    // First time landing on Custom, default the range to the user's current
    // cycle so it starts pre-filled with something meaningful.
    if (key === 'custom' && !startDate && !endDate) {
      const { start, end } = getCycleRange(getCurrentCycleKey(cycleStartDay), cycleStartDay);
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(end));
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    return expenses.filter((e) => {
      const eDate = new Date(e.date);
      if (isNaN(eDate.getTime())) return false;

      if (timeRange === '1d') return eDate >= daysAgo(1);
      if (timeRange === '7d') return eDate >= daysAgo(7);
      if (timeRange === '14d') return eDate >= daysAgo(14);
      if (timeRange === '30d') return eDate >= daysAgo(30);

      if (timeRange === 'month') {
        return getCycleKey(eDate, cycleStartDay) === activeMonthKey;
      }

      if (timeRange === 'custom') {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (eDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (eDate > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [expenses, timeRange, activeMonthKey, startDate, endDate, cycleStartDay]);

  const activeSpend = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + expenseAmount(e), 0),
    [filteredExpenses]
  );

  const activeByCategory = useMemo(() => {
    const catMeta = categories.length ? categories : builtInCategories;
    const catMetaById = new Map(catMeta.map((c) => [c.id, c]));
    const builtInById = new Map(builtInCategories.map((c) => [c.id, c]));
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();

    filteredExpenses.forEach((e) => {
      const id = e.category || 'other';
      totals.set(id, (totals.get(id) ?? 0) + expenseAmount(e));
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });

    const breakdown: CategoryBreakdown[] = [];
    for (const [id, total] of totals.entries()) {
      if (total <= 0) continue;
      const meta =
        catMetaById.get(id) ??
        builtInById.get(id) ??
        ({
          id,
          label:
            id === 'other' || id.startsWith('custom-') ? 'Other' : id,
          tone: 'gray',
          Icon: Plus,
        } satisfies Category);
      breakdown.push({ ...meta, total, count: counts.get(id) ?? 0 });
    }
    return breakdown.sort((a, b) => b.total - a.total);
  }, [categories, filteredExpenses]);

  const showTargets = timeRange === 'month';
  const hasBudget = showTargets && budget > 0;
  const target = hasBudget ? budget : income;
  const targetPercent = showTargets
    ? Math.round((activeSpend / Math.max(target || 1, 1)) * 100)
    : 0;
  const remaining = (target || 0) - activeSpend;
  const over = showTargets && remaining < 0;

  const spendOfBudgetPercent = hasBudget ? pctOf(activeSpend, budget) : 0;
  const spendOfSalaryPercent =
    showTargets && income > 0 ? pctOf(activeSpend, income) : 0;
  const budgetOfSalaryPercent =
    hasBudget && income > 0 ? pctOf(budget, income) : 0;
  const remainOfTargetPercent = showTargets
    ? pctOf(remaining, target || 1)
    : 0;

  const dailyAverage = useMemo(() => {
    if (!filteredExpenses.length) return 0;
    const days = new Set(
      filteredExpenses.map((e) => new Date(e.date).toDateString())
    ).size;
    return activeSpend / Math.max(days, 1);
  }, [filteredExpenses, activeSpend]);

  /** Remaining budget ÷ days left in the active cycle. Only meaningful when
   *  Overview is on the current cycle (past cycles have no days left). */
  const daysLeftInCycle = useMemo(() => {
    if (!showTargets) return 0;
    if (activeMonthKey !== getCurrentCycleKey(cycleStartDay)) return 0;
    return getDaysRemainingInCycle(cycleStartDay);
  }, [showTargets, activeMonthKey, cycleStartDay]);

  const canShowDailyRoom = showTargets && target > 0 && daysLeftInCycle > 0;
  const dailyRoom = canShowDailyRoom
    ? remaining > 0
      ? remaining / daysLeftInCycle
      : 0
    : null;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const slices = activeByCategory.map((c) => {
    const fraction = activeSpend > 0 ? c.total / activeSpend : 0;
    const slice = {
      category: c,
      dasharray: `${(fraction * circumference).toFixed(2)} ${circumference.toFixed(2)}`,
      dashoffset: (-accumulated * circumference).toFixed(2),
      color: getCategoryColor(c.tone),
    };
    accumulated += fraction;
    return slice;
  });

  const periodLabel = useMemo(() => {
    if (timeRange === '1d') return 'Last 24 hours';
    if (timeRange === '7d') return 'Last 7 days';
    if (timeRange === '14d') return 'Last 14 days';
    if (timeRange === '30d') return 'Last 30 days';
    if (timeRange === 'month')
      return (
        availableMonths.find((m) => m.key === activeMonthKey)?.label ??
        'Select month'
      );
    if (timeRange === 'custom') return 'Custom range';
    return 'All time';
  }, [timeRange, activeMonthKey, availableMonths]);

  const filtersActive = timeRange !== 'month' || Boolean(startDate || endDate);

  return (
    <section className="mx-auto max-w-6xl">
      {/* Range control — same segment pattern as Expenses */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleRangeSelect(key)}
              className={`press h-7 cursor-pointer rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                timeRange === key
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {timeRange === 'month' && (
          <div className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={monthIndex >= availableMonths.length - 1}
              aria-label="Previous month"
              className="press grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-4" strokeWidth={1.9} />
            </button>
            <span className="min-w-[112px] text-center text-[12px] font-medium text-foreground">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={monthIndex <= 0}
              aria-label="Next month"
              className="press grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-4" strokeWidth={1.9} />
            </button>
          </div>
        )}

        {timeRange === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="From"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-[12px] text-foreground"
            />
            <span className="text-[12px] text-faint">to</span>
            <input
              type="date"
              aria-label="To"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-[12px] text-foreground"
            />
          </div>
        )}

        <span className="ml-auto text-[12px] text-muted-foreground">
          <span
            className={`font-mono-numbers ${
              filtersActive || filteredExpenses.length > 0
                ? 'text-primary'
                : 'text-foreground'
            }`}
          >
            {filteredExpenses.length}
          </span>{' '}
          expenses
        </span>
      </div>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:mt-4 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
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
            hasBudget && income > 0
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
        <Stat
          label="Can spend / day"
          tone={
            dailyRoom === null
              ? 'default'
              : over
                ? 'destructive'
                : dailyRoom > 0
                  ? 'positive'
                  : 'default'
          }
          meter={
            canShowDailyRoom
              ? {
                  value: over ? 0 : remainOfTargetPercent,
                  color: over ? 'var(--destructive)' : 'var(--positive)',
                  caption: `for next ${daysLeftInCycle} day${daysLeftInCycle === 1 ? '' : 's'}`,
                }
              : null
          }
        >
          {dailyRoom === null ? '—' : <Money value={dailyRoom} />}
        </Stat>
        <Stat label="Avg. spent / day">
          <Money value={dailyAverage} />
        </Stat>
      </div>

      {/* Spend vs budget / salary — visual meters */}
      {showTargets && (hasBudget || income > 0) && (
        <div
          className={`mt-3 rounded-xl border bg-card px-3 py-3.5 sm:px-4 sm:py-4 ${
            over ? 'border-destructive/30' : 'border-border'
          }`}
        >
          <div
            className={`grid gap-4 ${
              hasBudget && income > 0 ? 'sm:grid-cols-2' : ''
            }`}
          >
            {hasBudget ? (
              <PercentMeter
                label="Of budget"
                percent={spendOfBudgetPercent}
                over={over}
                detail={
                  <>
                    <Money value={activeSpend} /> of{' '}
                    <Money value={budget} />
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
                    <Money value={activeSpend} /> of{' '}
                    <Money value={income} />
                  </>
                }
              />
            )}

            {hasBudget && income > 0 && (
              <PercentMeter
                label="Of salary"
                percent={spendOfSalaryPercent}
                over={spendOfSalaryPercent > 100}
                detail={
                  <>
                    <Money value={activeSpend} /> of{' '}
                    <Money value={income} />
                  </>
                }
              />
            )}
          </div>

          {hasBudget && income > 0 && (
            <div className="mt-4 border-t border-border pt-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="label">Budget vs salary</span>
                <span className="font-mono-numbers text-[13px] font-semibold text-foreground">
                  {budgetOfSalaryPercent}%
                </span>
              </div>
              <Bar
                value={budgetOfSalaryPercent}
                className="mt-2 h-1.5"
                color="var(--primary)"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                <Money value={budget} /> reserved from{' '}
                <Money value={income} /> salary
              </p>
            </div>
          )}
        </div>
      )}

      {/* Breakdown */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-6">
          <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="fill-none stroke-muted"
                strokeWidth="10"
              />
              {activeSpend > 0 &&
                slices.map(({ category, dasharray, dashoffset, color }) => (
                  <circle
                    key={category.id}
                    cx="50"
                    cy="50"
                    r={radius}
                    className="cursor-pointer fill-none transition-opacity"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    opacity={hovered && hovered.id !== category.id ? 0.25 : 1}
                    onMouseEnter={() => setHovered(category)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {hovered ? (
                <>
                  <span className="max-w-[104px] truncate text-[12px] text-muted-foreground">
                    {hovered.label}
                  </span>
                  <span className="font-mono-numbers text-[15px] font-semibold tracking-tight text-foreground">
                    <Money value={hovered.total} />
                  </span>
                  <span className="font-mono-numbers text-[11px] text-primary">
                    {Math.round(
                      (hovered.total / Math.max(activeSpend, 1)) * 100
                    )}
                    %
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono-numbers text-[17px] font-semibold tracking-tight text-foreground">
                    <Money value={activeSpend} />
                  </span>
                  <span className="text-[11px] text-faint">
                    <span className="font-mono-numbers text-primary">
                      {activeByCategory.length}
                    </span>{' '}
                    {activeByCategory.length === 1 ? 'category' : 'categories'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-3 py-2.5 sm:px-4">
            <h3 className="label">Breakdown</h3>
            <span className="text-[11px] text-muted-foreground">
              {periodLabel}
            </span>
          </div>

          {activeByCategory.length ? (
            <>
              <div className="divide-y divide-border">
                {activeByCategory.map((c) => {
                  const color = getCategoryColor(c.tone);
                  const pct = Math.round(
                    (c.total / Math.max(activeSpend, 1)) * 100
                  );
                  const active = hovered?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => setHovered(c)}
                      onMouseLeave={() => setHovered(null)}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors sm:px-4 ${
                        active ? 'bg-primary/[0.055]' : 'hover:bg-primary/[0.035]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryIcon
                          color={color}
                          icon={getCategoryIcon(c)}
                          size="xs"
                        />
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {c.label}
                        </span>
                        <span className="font-mono-numbers shrink-0 text-[11px] text-primary">
                          {c.count}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-baseline gap-2">
                        <span className="font-mono-numbers w-9 text-right text-[11px] text-faint">
                          {pct}%
                        </span>
                        <span className="font-mono-numbers text-[13px] font-medium text-foreground">
                          <Money value={c.total} />
                        </span>
                      </div>

                      <div className="col-span-2">
                        <Bar value={pct} color={color} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-primary/25 bg-primary/[0.07] px-3 py-2.5 sm:px-4">
                <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
                  Total
                </span>
                <span className="font-mono-numbers text-[13px] font-semibold text-foreground">
                  <Money value={activeSpend} precise />
                </span>
              </div>
            </>
          ) : (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              No expenses in this period.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
