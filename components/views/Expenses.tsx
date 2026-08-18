import { useMemo, useState } from 'react';
import { Category, Expense } from '@/types/expense';
import { categoryFor } from '@/lib/utils';
import { useProfileStore } from '@/lib/profile-store';
import {
  groupByCycle,
  getCycleKey,
  getCycleRange,
  getCurrentCycleKey,
  formatCycleLabel,
  toDateInputValue,
} from '@/lib/cycle';
import type { TimeRangeOption } from '@/components/dashboard/DashboardRangeControls';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { ExpensesToolbar } from '@/components/expenses/ExpensesToolbar';
import { ExpensesFilterBar } from '@/components/expenses/ExpensesFilterBar';
import { ExpensesTable, type SortKey, type SortDir } from '@/components/expenses/ExpensesTable';
import { toast } from '@/lib/toast';

const EMPTY_CATEGORIES: Category[] = [];

interface ExpensesProps {
  expenses: Expense[];
  remove: (id: string) => void;
  updateExpense: (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: string;
      date: string;
    }
  ) => void;
  categories?: Category[];
}

export const Expenses = ({
  expenses,
  remove,
  updateExpense,
  categories = EMPTY_CATEGORIES,
}: ExpensesProps) => {
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const hideAmounts = useProfileStore((s) => s.hideAmounts);
  const cycleStartDay = useProfileStore((s) => s.cycleStartDay);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

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

  const filtered = useMemo(() => {
    const now = new Date();
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    return expenses.filter((e) => {
      const matchesQuery =
        !query.trim() ||
        `${e.note ?? ''} ${categoryFor(e.category, categories).label}`
          .toLowerCase()
          .includes(query.toLowerCase());
      if (!matchesQuery) return false;

      const eDate = new Date(e.date);
      if (isNaN(eDate.getTime())) return true;

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
  }, [
    expenses,
    query,
    timeRange,
    activeMonthKey,
    startDate,
    endDate,
    categories,
    cycleStartDay,
  ]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const time = (v?: string) => new Date(v ?? 0).getTime();
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (a.amount - b.amount) * dir;
        case 'category':
          return (
            categoryFor(a.category, categories).label.localeCompare(
              categoryFor(b.category, categories).label
            ) * dir
          );
        case 'createdAt':
          return (time(a.createdAt) - time(b.createdAt)) * dir;
        case 'updatedAt':
          return (
            (time(a.updatedAt ?? a.createdAt) -
              time(b.updatedAt ?? b.createdAt)) *
            dir
          );
        case 'date':
        default:
          return (time(a.date) - time(b.date)) * dir;
      }
    });
  }, [filtered, sortBy, sortDir, categories]);

  const filtersActive =
    timeRange !== 'month' || Boolean(query || startDate || endDate);

  const resetFilters = () => {
    setQuery('');
    setTimeRange('month');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <section className="mx-auto max-w-6xl">
      <ExpensesToolbar
        query={query}
        setQuery={setQuery}
        filtered={filtered}
        categories={categories}
      />

      <ExpensesFilterBar
        timeRange={timeRange}
        onRangeSelect={handleRangeSelect}
        monthLabel={availableMonths[monthIndex]?.label ?? 'Select month'}
        canGoPrevMonth={monthIndex < availableMonths.length - 1}
        canGoNextMonth={monthIndex > 0}
        onPrevMonth={() =>
          monthIndex < availableMonths.length - 1 &&
          setSelectedMonth(availableMonths[monthIndex + 1].key)
        }
        onNextMonth={() =>
          monthIndex > 0 && setSelectedMonth(availableMonths[monthIndex - 1].key)
        }
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        filtersActive={filtersActive}
        onClear={resetFilters}
        filteredCount={filtered.length}
        totalCount={expenses.length}
      />

      <ExpensesTable
        sorted={sorted}
        categories={categories}
        sortBy={sortBy}
        sortDir={sortDir}
        toggleSort={toggleSort}
        hideAmounts={hideAmounts}
        filteredTotal={filteredTotal}
        onEdit={setEditing}
        onDelete={setDeleting}
        filtersActive={filtersActive}
        onClearFilters={resetFilters}
      />

      {editing && (
        <ExpenseEditDialog
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (patch.amount <= 0) {
              toast.error(
                'Invalid amount',
                'Enter a valid amount greater than zero'
              );
              return;
            }
            updateExpense(editing.id, patch);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ExpenseDeleteDialog
          expense={deleting}
          categories={categories}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
};
