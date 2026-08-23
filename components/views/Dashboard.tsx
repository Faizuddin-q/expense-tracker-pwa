import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor } from '@/lib/utils';
import {
  groupByCycle,
  getCycleKey,
  getCycleRange,
  getCurrentCycleKey,
  formatCycleLabel,
  toDateInputValue,
} from '@/lib/cycle';
import {
  DashboardRangeControls,
  type TimeRangeOption,
} from '@/components/dashboard/DashboardRangeControls';
import { DashboardStatStrip } from '@/components/dashboard/DashboardStatStrip';
import { DashboardBudgetMeters } from '@/components/dashboard/DashboardBudgetMeters';
import {
  DashboardBreakdown,
  type CategoryBreakdown,
} from '@/components/dashboard/DashboardBreakdown';

interface DashboardProps {
  expenses: Expense[];
  income: number;
  /** Monthly spend target for analytics. Falls back to income when unset. */
  budget?: number;
  categories?: Category[];
  cycleStartDay?: number;
}

const expenseAmount = (e: Expense) => {
  const n = Number(e.amount);
  return Number.isFinite(n) ? n : 0;
};

const pctOf = (value: number, base: number) =>
  base > 0 ? Math.round((Math.abs(value) / base) * 100) : 0;

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
          label: id === 'other' || id.startsWith('custom-') ? 'Other' : id,
          tone: 'gray',
          Icon: Plus,
        } satisfies Category);
      breakdown.push({ ...meta, total, count: counts.get(id) ?? 0 });
    }
    return breakdown.sort((a, b) => b.total - a.total);
  }, [categories, filteredExpenses]);

  // Budget/income are monthly figures. Outside the Month view we prorate
  // them to the selected range's share of a "typical" cycle, so 7D/14D/30D/
  // Custom still show a meaningful target instead of a bare "—". "All" has
  // no natural length to prorate against, so it stays unprorated (no target).
  const cycleLengthDays = useMemo(() => {
    const { start, end } = getCycleRange(getCurrentCycleKey(cycleStartDay), cycleStartDay);
    // Normalize both to local midnight before diffing — `end` is 23:59:59.999
    // of its day, which would otherwise inflate the count by a day.
    const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMid = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endMid.getTime() - startMid.getTime()) / 86400000) + 1;
  }, [cycleStartDay]);

  const rangeDays = useMemo(() => {
    if (timeRange === 'month') return cycleLengthDays;
    if (timeRange === '1d') return 1;
    if (timeRange === '7d') return 7;
    if (timeRange === '14d') return 14;
    if (timeRange === '30d') return 30;
    if (timeRange === 'custom') {
      if (!startDate || !endDate) return null;
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      return days > 0 ? days : null;
    }
    return null; // 'all' — unbounded, nothing sensible to prorate against
  }, [timeRange, startDate, endDate, cycleLengthDays]);

  const isProrated = timeRange !== 'month' && rangeDays !== null;
  const scaleFactor = rangeDays === null ? null : rangeDays / cycleLengthDays;

  const showTargets = scaleFactor !== null;
  const hasBudget = showTargets && budget > 0;
  const scaledBudget = hasBudget ? budget * (scaleFactor as number) : 0;
  const scaledIncome = showTargets && income > 0 ? income * (scaleFactor as number) : 0;
  const target = hasBudget ? scaledBudget : scaledIncome;
  const targetPercent = showTargets
    ? Math.round((activeSpend / Math.max(target || 1, 1)) * 100)
    : 0;
  const remaining = (target || 0) - activeSpend;
  const over = showTargets && remaining < 0;

  const spendOfBudgetPercent = hasBudget ? pctOf(activeSpend, scaledBudget) : 0;
  const spendOfSalaryPercent =
    showTargets && scaledIncome > 0 ? pctOf(activeSpend, scaledIncome) : 0;
  const budgetOfSalaryPercent =
    hasBudget && scaledIncome > 0 ? pctOf(scaledBudget, scaledIncome) : 0;
  const remainOfTargetPercent = showTargets ? pctOf(remaining, target || 1) : 0;

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
      <DashboardRangeControls
        timeRange={timeRange}
        onRangeSelect={handleRangeSelect}
        periodLabel={periodLabel}
        canGoPrevMonth={monthIndex < availableMonths.length - 1}
        canGoNextMonth={monthIndex > 0}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        filteredCount={filteredExpenses.length}
        filtersActive={filtersActive}
      />

      <DashboardStatStrip
        activeSpend={activeSpend}
        showTargets={showTargets}
        hasBudget={hasBudget}
        target={target}
        targetPercent={targetPercent}
        over={over}
        remaining={remaining}
        spendOfBudgetPercent={spendOfBudgetPercent}
        spendOfSalaryPercent={spendOfSalaryPercent}
        budgetOfSalaryPercent={budgetOfSalaryPercent}
        remainOfTargetPercent={remainOfTargetPercent}
        scaledIncome={scaledIncome}
        dailyAverage={dailyAverage}
        isProrated={isProrated}
        rangeDays={rangeDays}
        cycleLengthDays={cycleLengthDays}
      />

      <DashboardBudgetMeters
        showTargets={showTargets}
        hasBudget={hasBudget}
        scaledIncome={scaledIncome}
        scaledBudget={scaledBudget}
        activeSpend={activeSpend}
        spendOfBudgetPercent={spendOfBudgetPercent}
        spendOfSalaryPercent={spendOfSalaryPercent}
        budgetOfSalaryPercent={budgetOfSalaryPercent}
        over={over}
      />

      <DashboardBreakdown
        activeByCategory={activeByCategory}
        activeSpend={activeSpend}
        periodLabel={periodLabel}
        radius={radius}
        slices={slices}
        hovered={hovered}
        setHovered={setHovered}
      />
    </section>
  );
};
