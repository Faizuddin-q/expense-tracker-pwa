import { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor } from '@/lib/utils';
import { Money } from '@/components/Money';

interface CategoryBreakdown extends Category {
  total: number;
}

interface DashboardProps {
  expenses: Expense[];
  income: number;
  /** Monthly spend target for analytics. Falls back to income when unset. */
  budget?: number;
  categories?: Category[];
}

type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

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

  const [hoveredCategory, setHoveredCategory] =
    useState<CategoryBreakdown | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Extract available months from expenses (newest first; always include current)
  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthMap = new Map<string, string>();

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
      monthMap.set(key, label);
    });

    if (!monthMap.has(currentMonthKey)) {
      monthMap.set(
        currentMonthKey,
        now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      );
    }

    if (monthMap.size === 1 && !expenses.length) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(now.getFullYear(), m, 1);
        const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
        monthMap.set(
          key,
          d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        );
      }
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, label]) => ({
        key,
        label,
        isCurrent: key === currentMonthKey,
      }));
  }, [expenses]);

  const activeMonthKey = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const currentIndex = availableMonths.findIndex(
      (m) => m.key === activeMonthKey
    );
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1].key);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.findIndex(
      (m) => m.key === activeMonthKey
    );
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1].key);
    }
  };

  // Filter expenses by selected time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const eDate = new Date(e.date);
      if (isNaN(eDate.getTime())) return false;

      if (timeRange === '1d') {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return eDate >= oneDayAgo;
      }

      if (timeRange === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return eDate >= sevenDaysAgo;
      }

      if (timeRange === '14d') {
        const fourteenDaysAgo = new Date(
          now.getTime() - 14 * 24 * 60 * 60 * 1000
        );
        return eDate >= fourteenDaysAgo;
      }

      if (timeRange === '30d') {
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        return eDate >= thirtyDaysAgo;
      }

      if (timeRange === 'month') {
        const yearMonth = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
        return yearMonth === activeMonthKey;
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

      return true; // 'all'
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

  // Group by expense category IDs first so orphaned/custom IDs are never dropped
  const activeByCategory = useMemo(() => {
    const catMeta = categories.length ? categories : builtInCategories;
    const totals = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const id = e.category || 'other';
      totals.set(id, (totals.get(id) ?? 0) + expenseAmount(e));
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
        return { ...meta, total };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, filteredExpenses]);

  // Income/budget are monthly targets — only compare in calendar-month view
  const showMoneyTargets = timeRange === 'month';
  const hasBudget = showMoneyTargets && budget > 0;
  const budgetPercent = showMoneyTargets
    ? Math.round((activeSpend / Math.max(budget || 1, 1)) * 100)
    : 0;
  const incomePercent = showMoneyTargets
    ? Math.round((activeSpend / Math.max(income, 1)) * 100)
    : 0;
  const budgetRemaining = (budget || 0) - activeSpend;
  const incomeRemaining = income - activeSpend;
  const overBudget = hasBudget && budgetRemaining < 0;
  const overIncome = showMoneyTargets && incomeRemaining < 0;
  const primaryPercent = hasBudget ? budgetPercent : incomePercent;

  // SVG Donut Chart Calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = activeByCategory.map((c) => {
    const slicePercent = activeSpend > 0 ? c.total / activeSpend : 0;
    const strokeDasharray = `${(slicePercent * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    const strokeDashoffset = (-accumulatedPercent * circumference).toFixed(2);
    accumulatedPercent += slicePercent;

    return {
      category: c,
      slicePercent,
      strokeDasharray,
      strokeDashoffset,
      color: getCategoryColor(c.tone),
    };
  });

  const handleMouseMove = (
    e: React.MouseEvent<SVGElement>,
    c: CategoryBreakdown
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredCategory(c);
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
    setTooltipPos(null);
  };

  // Label for period header
  const periodLabel = useMemo(() => {
    if (timeRange === '1d') return 'Last 24 Hours';
    if (timeRange === '7d') return 'Last 7 Days';
    if (timeRange === '14d') return 'Last 14 Days';
    if (timeRange === '30d') return 'Last 30 Days';
    if (timeRange === 'month') {
      const match = availableMonths.find((m) => m.key === activeMonthKey);
      return match ? match.label : 'This Month';
    }
    if (timeRange === 'custom') return 'Custom Date Range';
    return 'All Time Overview';
  }, [timeRange, activeMonthKey, availableMonths]);

  return (
    <section className="mx-auto max-w-6xl">
      {/* Time Range Filter Selector Bar — always horizontal scroll */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1">
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setTimeRange('month')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === 'month'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Calendar className="size-3.5" /> By Month
          </button>
          <button
            onClick={() => setTimeRange('1d')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === '1d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === '7d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('14d')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === '14d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 14 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === '30d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === 'all'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${
              timeRange === 'custom'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Modern By Month Navigation Bar */}
      {timeRange === 'month' && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs sm:p-4">
          <div className="flex items-center justify-between gap-2">
            {/* Stepper Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                disabled={
                  availableMonths.findIndex((m) => m.key === activeMonthKey) >=
                  availableMonths.length - 1
                }
                className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border/80 bg-background text-foreground transition hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                title="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono-numbers min-w-[90px] text-center text-sm font-bold text-foreground">
                {availableMonths.find((m) => m.key === activeMonthKey)?.label ??
                  'Select Month'}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={
                  availableMonths.findIndex((m) => m.key === activeMonthKey) <=
                  0
                }
                className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border/80 bg-background text-foreground transition hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                title="Next Month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Direct Jump Dropdown */}
            <select
              value={activeMonthKey}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="cursor-pointer rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {availableMonths.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Horizontal Scrollable Month Pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {availableMonths.map(({ key, label }) => {
              const isActive = activeMonthKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMonth(key)}
                  className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'border border-border/60 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Date Range Pickers */}
      {timeRange === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs sm:flex sm:flex-wrap sm:items-center sm:gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Overview Hero Cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:rounded-3xl sm:p-7 md:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                {periodLabel}
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
                You&apos;re doing well.
              </h2>
            </div>
            <div className="rounded-2xl bg-accent p-2.5 text-primary shadow-2xs sm:p-3">
              <BarChart3 className="size-4.5 sm:size-5" />
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-5 sm:mt-8 sm:flex-row sm:gap-8">
            {/* Interactive SVG Donut Chart */}
            <div
              className="relative flex size-36 shrink-0 items-center justify-center sm:size-44"
              onMouseLeave={handleMouseLeave}
            >
              <svg
                viewBox="0 0 100 100"
                className="size-full -rotate-90 transform"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="fill-none stroke-muted/80"
                  strokeWidth="14"
                />

                {activeSpend > 0 &&
                  slices.map(
                    ({
                      category,
                      strokeDasharray,
                      strokeDashoffset,
                      color,
                    }) => (
                      <circle
                        key={category.id}
                        cx="50"
                        cy="50"
                        r={radius}
                        className="cursor-pointer fill-none transition-all duration-200 hover:stroke-[16]"
                        stroke={color}
                        strokeWidth="13"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="butt"
                        onMouseEnter={(e) => handleMouseMove(e, category)}
                        onMouseMove={(e) => handleMouseMove(e, category)}
                        onMouseLeave={handleMouseLeave}
                      />
                    )
                  )}
              </svg>

              {/* Center Content inside Donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                {hoveredCategory ? (
                  <>
                    <span className="max-w-[90px] truncate text-xs font-semibold text-muted-foreground">
                      {hoveredCategory.label}
                    </span>
                    <span className="font-mono-numbers text-lg font-bold tracking-tight text-foreground">
                      <Money value={hoveredCategory.total} />
                    </span>
                    <span className="text-[11px] font-semibold text-primary">
                      {Math.round(
                        (hoveredCategory.total / Math.max(activeSpend, 1)) * 100
                      )}
                      %
                    </span>
                  </>
                ) : showMoneyTargets ? (
                  <>
                    <span className="font-mono-numbers text-2xl font-bold tracking-tight text-foreground">
                      {primaryPercent}%
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      of {hasBudget ? 'budget' : 'income'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono-numbers text-2xl font-bold tracking-tight text-foreground">
                      <Money value={activeSpend} />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      total spend
                    </span>
                  </>
                )}
              </div>

              {/* Floating Tooltip */}
              {hoveredCategory && tooltipPos && (
                <div
                  className="pointer-events-none absolute z-30 mb-2 whitespace-nowrap -translate-x-1/2 -translate-y-full transform rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-lg ring-1 ring-border"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span
                      className="size-2 rounded-sm"
                      style={{
                        backgroundColor: getCategoryColor(hoveredCategory.tone),
                      }}
                    />
                    <span>{hoveredCategory.label}</span>
                  </div>
                  <div className="font-mono-numbers mt-0.5 text-sm font-bold">
                    <Money value={hoveredCategory.total} />
                  </div>
                  <div className="text-[10px] opacity-80">
                    {Math.round(
                      (hoveredCategory.total / Math.max(activeSpend, 1)) * 100
                    )}
                    % of period spend
                  </div>
                </div>
              )}
            </div>

            <div className="w-full min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                Spent in this period
              </p>
              <p className="font-mono-numbers mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                <Money value={activeSpend} />
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {showMoneyTargets && hasBudget && (
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      vs Budget
                    </p>
                    <p className="font-mono-numbers mt-1 text-sm font-bold text-foreground">
                      {budgetPercent}% · <Money value={budget} />
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        overBudget ? 'text-destructive' : 'text-primary'
                      }`}
                    >
                      {overBudget
                        ? <><Money value={Math.abs(budgetRemaining)} /> over</> : <><Money value={budgetRemaining} /> left</>}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-muted">
                      <div
                        className={`h-full rounded-sm transition-all duration-300 ${
                          overBudget ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{
                          width: `${Math.min(100, budgetPercent)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {showMoneyTargets && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    vs Income
                  </p>
                  <p className="font-mono-numbers mt-1 text-sm font-bold text-foreground">
                    {incomePercent}% · <Money value={income} />
                  </p>
                  <p
                    className={`mt-0.5 text-xs font-semibold ${
                      overIncome ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {overIncome
                      ? <><Money value={Math.abs(incomeRemaining)} /> over</> : <><Money value={incomeRemaining} /> left</>}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-muted">
                    <div
                      className={`h-full rounded-sm transition-all duration-300 ${
                        overIncome ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{
                        width: `${Math.min(100, incomePercent)}%`,
                      }}
                    />
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-accent/70 p-5 shadow-2xs ring-1 ring-border/50 sm:rounded-3xl sm:p-7 md:p-8">
          <Sparkles className="size-5 text-primary" />
          <h3 className="mt-3 text-base font-bold tracking-tight text-foreground sm:mt-4 sm:text-xl">
            A gentle insight
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {activeByCategory[0]?.label ?? 'Your first'} is your top spending
            category for this period (
            <span className="font-mono-numbers font-semibold text-foreground">
              <Money value={activeByCategory[0]?.total ?? 0} />
            </span>
            ). Mindful choices keep your pace comfortable.
          </p>
          {showMoneyTargets && hasBudget && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Budget</span>
                <span className="font-mono-numbers">{budgetPercent}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-card">
                <div
                  className={`h-full rounded-sm transition-all duration-300 ${
                    overBudget ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, budgetPercent)}%` }}
                />
              </div>
            </div>
          )}
          {showMoneyTargets && (
          <div className={hasBudget ? 'mt-3' : 'mt-5'}>
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Income</span>
              <span className="font-mono-numbers">{incomePercent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-card">
              <div
                className={`h-full rounded-sm transition-all duration-300 ${
                  overIncome ? 'bg-destructive' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, incomePercent)}%` }}
              />
            </div>
          </div>
          )}
          <p className="mt-2.5 text-xs font-medium text-muted-foreground">
            {!showMoneyTargets
              ? `${activeByCategory.length} categories in this period`
              : overBudget
              ? 'Past your monthly spend budget — logging still works'
              : overIncome
                ? 'Past your monthly income for this period'
                : (hasBudget ? budgetPercent : incomePercent) <= 80
                  ? "You're on track for a calm spending pace"
                  : hasBudget
                    ? 'Approaching your monthly spend budget'
                    : 'Approaching your monthly income'}
          </p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:mt-8 sm:rounded-3xl sm:p-7">
        <div className="flex items-center justify-between">
          <h3 className="font-bold tracking-tight text-foreground">
            Category breakdown ({activeByCategory.length})
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {periodLabel}
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {activeByCategory.map((c) => {
            const catColor = getCategoryColor(c.tone);
            const isHovered = hoveredCategory?.id === c.id;
            const IconComponent = c.Icon || Plus;
            const catPercent = Math.round(
              (c.total / Math.max(activeSpend, 1)) * 100
            );

            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoveredCategory(c)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5 transition-all duration-200 ${
                  isHovered ? 'bg-accent/70' : 'hover:bg-accent/40'
                }`}
              >
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-2xs"
                  style={{
                    backgroundColor: catColor,
                  }}
                >
                  <IconComponent className="size-4 text-white" />
                </div>
                <span className="w-20 shrink-0 text-xs font-semibold text-foreground sm:w-28 sm:text-sm">
                  {c.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${Math.min(100, catPercent)}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>
                <span className="font-mono-numbers w-20 shrink-0 text-right text-xs font-bold text-foreground sm:w-24 sm:text-sm">
                  <Money value={c.total} />
                </span>
              </div>
            );
          })}
          {!activeByCategory.length && (
            <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-sm font-medium text-muted-foreground">
              No expenses recorded for this period ({periodLabel}).
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
