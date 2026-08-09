import { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, downloadCsv } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { Money } from '@/components/Money';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { toast } from '@/components/ToastHost';

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

type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

export const Expenses = ({
  expenses,
  remove,
  updateExpense,
  categories = [],
}: ExpensesProps) => {
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const { hideAmounts } = useApp();

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

  const activeMonthKey = selectedMonth || currentMonthKey;

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

  // Filtered expense list
  const filtered = useMemo(() => {
    const now = new Date();

    return expenses.filter((e) => {
      // 1. Text Search Query Filter
      const matchesQuery =
        !query.trim() ||
        `${e.note ?? ''} ${categoryFor(e.category, categories).label}`
          .toLowerCase()
          .includes(query.toLowerCase());

      if (!matchesQuery) return false;

      // 2. Date Range Filter
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
  }, [
    expenses,
    query,
    timeRange,
    activeMonthKey,
    startDate,
    endDate,
    categories,
  ]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  const resetFilters = () => {
    setQuery('');
    setTimeRange('all');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <section className="mx-auto max-w-6xl">
      {/* Top Controls: Search Bar & Export CSV */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5">
        <div className="flex flex-1 items-center gap-3 rounded-xl sm:rounded-2xl border border-input bg-card px-3.5 py-2.5 sm:px-4 sm:py-3 transition focus-within:ring-2 focus-within:ring-ring">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses by note or category..."
            className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="cursor-pointer text-muted-foreground hover:text-foreground active:scale-95"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => downloadCsv(filtered, categories)}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98] sm:px-5 sm:py-3 sm:text-sm"
        >
          <Download className="size-3.5 sm:size-4" /> Export CSV (
          {filtered.length})
        </button>
      </div>

      {/* Date & Time Range Filter Pills — always horizontal scroll */}
      <div className="mt-3.5 flex overflow-x-auto scrollbar-none gap-2 pb-1">
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setTimeRange('all')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === 'all'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('1d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '1d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '7d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('14d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '14d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 14 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '30d'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`shrink-0 flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === 'month'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Calendar className="size-3.5" /> By Month
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === 'custom'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Custom Range
          </button>

          {(timeRange !== 'all' || query || startDate || endDate) && (
            <button
              onClick={resetFilters}
              className="shrink-0 cursor-pointer text-xs font-bold text-muted-foreground hover:text-destructive hover:underline"
            >
              Clear filters
            </button>
          )}
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

      {/* Summary Header */}
      <div className="mt-5 flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Showing{' '}
          <span className="font-bold text-foreground">{filtered.length}</span>{' '}
          of {expenses.length} expenses
        </p>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Total:{' '}
          <span className="font-mono-numbers font-bold text-primary">
            <Money value={filteredTotal} />
          </span>
        </p>
      </div>

      {/* Expense List */}
      <div className="mt-4 flex flex-col gap-3">
        {filtered.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            remove={remove}
            onEdit={hideAmounts ? undefined : setEditing}
            categories={categories}
          />
        ))}
        {!filtered.length && (
          <div className="rounded-3xl border border-dashed border-border/80 p-10 text-center text-sm font-medium text-muted-foreground">
            No expenses found matching the selected filters.
          </div>
        )}
      </div>

      {editing && (
        <ExpenseEditDialog
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (patch.amount <= 0) {
              toast.error('Invalid amount', 'Enter a valid amount greater than zero');
              return;
            }
            updateExpense(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
};
