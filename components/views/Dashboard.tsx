import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils';
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

/** One figure in the top stat strip. */
const Stat = ({
  label,
  children,
  tone,
  emphasize,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'positive' | 'destructive';
  emphasize?: boolean;
  hint?: string;
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
    {hint && (
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
        {hint}
      </p>
    )}
  </div>
);

export const Dashboard = ({
  expenses,
  income,
  budget = 0,
  categories = builtInCategories,
}: DashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [hovered, setHovered] = useState<CategoryBreakdown | null>(null);

  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthMap = new Map<string, string>();

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(
        key,
        d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      );
    });

    if (!monthMap.has(currentMonthKey)) {
      monthMap.set(
        currentMonthKey,
        now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      );
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, label]) => ({ key, label }));
  }, [expenses]);

  const activeMonthKey = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const monthIndex = availableMonths.findIndex((m) => m.key === activeMonthKey);

  const handlePrevMonth = () => {
    if (monthIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[monthIndex + 1].key);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex > 0) setSelectedMonth(availableMonths[monthIndex - 1].key);
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
        const ym = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
        return ym === activeMonthKey;
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
  }, [expenses, timeRange, activeMonthKey, startDate, endDate]);

  const expenseAmount = (e: Expense) => {
    const n = Number(e.amount);
    return Number.isFinite(n) ? n : 0;
  };

  const activeSpend = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + expenseAmount(e), 0),
    [filteredExpenses]
  );

  const activeByCategory = useMemo(() => {
    const catMeta = categories.length ? categories : builtInCategories;
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();

    filteredExpenses.forEach((e) => {
      const id = e.category || 'other';
      totals.set(id, (totals.get(id) ?? 0) + expenseAmount(e));
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });

    return Array.from(totals.entries())
      .map(([id, total]) => {
        const meta =
          catMeta.find((c) => c.id === id) ??
          builtInCategories.find((c) => c.id === id) ??
          ({
            id,
            label: id === 'other' ? 'Other' : id,
            tone: 'gray',
            Icon: Plus,
          } satisfies Category);
        return { ...meta, total, count: counts.get(id) ?? 0 };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, filteredExpenses]);

  const showTargets = timeRange === 'month';
  const hasBudget = showTargets && budget > 0;
  const target = hasBudget ? budget : income;
  const targetPercent = showTargets
    ? Math.round((activeSpend / Math.max(target || 1, 1)) * 100)
    : 0;
  const remaining = (target || 0) - activeSpend;
  const over = showTargets && remaining < 0;

  const pctOf = (value: number, base: number) =>
    base > 0 ? Math.round((Math.abs(value) / base) * 100) : null;

  const vsTargets = (value: number) => {
    if (!showTargets) return undefined;
    const parts: string[] = [];
    if (hasBudget) {
      const p = pctOf(value, budget);
      if (p != null) parts.push(`${p}% of budget`);
    }
    if (income > 0) {
      const p = pctOf(value, income);
      if (p != null) parts.push(`${p}% of salary`);
    }
    return parts.length ? parts.join(' · ') : undefined;
  };

  const budgetOfSalaryHint =
    hasBudget && income > 0
      ? `${pctOf(budget, income)}% of salary`
      : undefined;

  const spendOfSalaryPercent =
    showTargets && income > 0 ? pctOf(activeSpend, income) : null;

  const dailyAverage = useMemo(() => {
    if (!filteredExpenses.length) return 0;
    const days = new Set(
      filteredExpenses.map((e) => new Date(e.date).toDateString())
    ).size;
    return activeSpend / Math.max(days, 1);
  }, [filteredExpenses, activeSpend]);

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
      return availableMonths.find((m) => m.key === activeMonthKey)?.label ?? '';
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
              onClick={() => setTimeRange(key)}
              className={`h-7 cursor-pointer rounded-md px-2.5 text-[12px] font-medium transition-colors ${
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
              className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
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
              className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
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
      <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:mt-4 sm:grid-cols-4 sm:divide-y-0">
        <Stat label="Spent" emphasize={activeSpend > 0} hint={vsTargets(activeSpend)}>
          <Money value={activeSpend} />
        </Stat>
        <Stat
          label={hasBudget ? 'Budget' : 'Income'}
          hint={budgetOfSalaryHint}
        >
          {showTargets ? <Money value={target} /> : '—'}
        </Stat>
        <Stat
          label={over ? 'Over by' : 'Remaining'}
          tone={showTargets ? (over ? 'destructive' : 'positive') : 'default'}
          hint={showTargets ? vsTargets(remaining) : undefined}
        >
          {showTargets ? <Money value={Math.abs(remaining)} /> : '—'}
        </Stat>
        <Stat label="Daily avg" hint={vsTargets(dailyAverage)}>
          <Money value={dailyAverage} />
        </Stat>
      </div>

      {/* Budget progress */}
      {showTargets && (
        <div
          className={`mt-3 rounded-xl border bg-card px-3 py-3 sm:px-4 ${
            over ? 'border-destructive/30' : 'border-border'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="label">
              {hasBudget ? 'Budget used' : 'Income used'}
            </span>
            <span
              className={`font-mono-numbers shrink-0 text-[12px] font-medium ${
                over ? 'text-destructive' : 'text-primary'
              }`}
            >
              {hasBudget
                ? `${targetPercent}% of budget`
                : `${targetPercent}% of salary`}
              {hasBudget && spendOfSalaryPercent != null
                ? ` · ${spendOfSalaryPercent}% of salary`
                : ''}
            </span>
          </div>
          <Bar
            value={targetPercent}
            className="mt-2"
            color={over ? 'var(--destructive)' : 'var(--primary)'}
          />
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
