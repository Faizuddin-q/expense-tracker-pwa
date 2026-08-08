import { useMemo, useState } from 'react';
import { BarChart3, Calendar, Plus, Sparkles } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor, money } from '@/lib/utils';

interface CategoryBreakdown extends Category {
  total: number;
}

interface DashboardProps {
  expenses: Expense[];
  income: number;
  categories?: Category[];
}

type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

export const Dashboard = ({
  expenses,
  income,
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

  // Extract available months from expenses
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        });
        monthMap.set(key, label);
      }
    });

    const currentYear = new Date().getFullYear();
    const currentMonthKey = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    if (monthMap.size === 0) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(currentYear, m, 1);
        const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric',
        });
        monthMap.set(key, label);
      }
    }

    return Array.from(monthMap.entries()).map(([key, label]) => ({
      key,
      label,
      isCurrent: key === currentMonthKey,
    }));
  }, [expenses]);

  const currentMonthKey = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    if (availableMonths.length > 0) return availableMonths[0].key;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [availableMonths, selectedMonth]);

  // Filter expenses by selected time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const eDate = new Date(e.date);
      if (isNaN(eDate.getTime())) return true;

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
        const targetMonth = selectedMonth || currentMonthKey;
        const yearMonth = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
        return yearMonth === targetMonth;
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
  }, [expenses, timeRange, selectedMonth, currentMonthKey, startDate, endDate]);

  const activeSpend = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const activeByCategory = useMemo(() => {
    const cats = categories.length ? categories : builtInCategories;
    return cats
      .map((c) => ({
        ...c,
        total: filteredExpenses
          .filter((e) => e.category === c.id)
          .reduce((sum, e) => sum + e.amount, 0),
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, filteredExpenses]);

  const percent = Math.min(
    100,
    Math.round((activeSpend / Math.max(income, 1)) * 100)
  );

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
      const match = availableMonths.find(
        (m) => m.key === (selectedMonth || currentMonthKey)
      );
      return match ? match.label : 'This Month';
    }
    if (timeRange === 'custom') return 'Custom Date Range';
    return 'All Time Overview';
  }, [timeRange, selectedMonth, currentMonthKey, availableMonths]);

  return (
    <section className="mx-auto max-w-6xl">
      {/* Time Range Filter Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Month Dropdown Bar */}
      {timeRange === 'month' && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Month:
          </label>
          <select
            value={selectedMonth || currentMonthKey}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="cursor-pointer rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {availableMonths.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Date Range Pickers */}
      {timeRange === 'custom' && (
        <div className="mt-3 flex flex-wrap items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              From:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="cursor-pointer rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              To:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="cursor-pointer rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Overview Hero Cards */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {periodLabel}
              </p>
              <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
                You&apos;re doing well.
              </h2>
            </div>
            <div className="rounded-2xl bg-accent p-3 text-primary shadow-2xs">
              <BarChart3 className="size-5" />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row">
            {/* Interactive SVG Donut Chart */}
            <div
              className="relative flex size-44 shrink-0 items-center justify-center"
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
                    <span className="text-lg font-bold tracking-tight text-foreground">
                      {money(hoveredCategory.total)}
                    </span>
                    <span className="text-[11px] font-semibold text-primary">
                      {Math.round(
                        (hoveredCategory.total / Math.max(activeSpend, 1)) * 100
                      )}
                      %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {percent}%
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      of income
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
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(hoveredCategory.tone),
                      }}
                    />
                    <span>{hoveredCategory.label}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-bold">
                    {money(hoveredCategory.total)}
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Spent in this period
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {money(activeSpend)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                of {money(income)} income ·{' '}
                <span className="font-semibold text-primary">
                  {money(Math.max(0, income - activeSpend))} left
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-accent/70 p-7 shadow-2xs ring-1 ring-border/50 sm:p-8">
          <Sparkles className="size-5 text-primary" />
          <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            A gentle insight
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {activeByCategory[0]?.label ?? 'Your first'} is your top spending
            category for this period ({money(activeByCategory[0]?.total ?? 0)}
            ). Mindful choices keep your pace comfortable.
          </p>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs font-medium text-muted-foreground">
            {percent <= 80
              ? "You're on track for a calm spending pace"
              : 'Approaching your monthly income budget'}
          </p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="mt-8 rounded-3xl bg-card p-7 ring-1 ring-border">
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
                <span className="w-28 text-sm font-semibold text-foreground">
                  {c.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, catPercent)}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>
                <span className="w-24 text-right text-sm font-bold text-foreground">
                  {money(c.total)}
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
