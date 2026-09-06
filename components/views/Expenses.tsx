import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  Search,
  X,
} from 'lucide-react';
import { List } from 'react-window';
import { Category, Expense, Payment } from '@/types/expense';
import { categoryFor, downloadCsv } from '@/lib/utils';
import { useProfileStore } from '@/lib/profile-store';
import {
  groupByCycle,
  getCycleKey,
  getCycleRange,
  getCurrentCycleKey,
  formatCycleLabel,
  toDateInputValue,
} from '@/lib/cycle';
import { toLocalDateKey } from '@/lib/cycle-calendar';
import { Money } from '@/components/Money';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { ExpenseCalendarGrid } from '@/components/expenses/ExpenseCalendarGrid';
import { ExpenseDayDialog } from '@/components/expenses/ExpenseDayDialog';
import {
  ExpenseListRow,
  ExpenseTableHeader,
  LIST_INNER,
  LIST_MAX_HEIGHT,
  ROW_HEIGHT,
  SortDir,
  SortKey,
  type ExpenseListRowData,
} from '@/components/expenses/expense-table';
import { toast } from '@/components/ToastHost';

const VIEW_STORAGE_KEY = 'pocket-expenses-view';

type ViewMode = 'list' | 'calendar';
type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

const EMPTY_CATEGORIES: Category[] = [];

const RANGES: { key: TimeRangeOption; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

const readViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'list';
  return localStorage.getItem(VIEW_STORAGE_KEY) === 'calendar'
    ? 'calendar'
    : 'list';
};

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
      paymentMethod?: Payment;
    }
  ) => void;
  categories?: Category[];
  cycleStartDay?: number;
  hideAmounts?: boolean;
}

export const Expenses = ({
  expenses,
  remove,
  updateExpense,
  categories = EMPTY_CATEGORIES,
  cycleStartDay: cycleStartDayProp,
  hideAmounts: hideAmountsProp,
}: ExpensesProps) => {
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const ownHideAmounts = useProfileStore((s) => s.hideAmounts);
  const ownCycleStartDay = useProfileStore((s) => s.cycleStartDay);
  const hideAmounts = hideAmountsProp ?? ownHideAmounts;
  const cycleStartDay = cycleStartDayProp ?? ownCycleStartDay;

  useEffect(() => {
    if (viewMode === 'calendar') {
      setTimeRange('month');
    }
  }, [viewMode]);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
    if (mode === 'calendar') {
      setTimeRange('month');
    }
  };

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
    if (key === 'custom' && !startDate && !endDate) {
      const { start, end } = getCycleRange(
        getCurrentCycleKey(cycleStartDay),
        cycleStartDay
      );
      setStartDate(toDateInputValue(start));
      setEndDate(toDateInputValue(end));
    }
  };

  const effectiveTimeRange =
    viewMode === 'calendar' ? 'month' : timeRange;

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

      if (effectiveTimeRange === '1d') return eDate >= daysAgo(1);
      if (effectiveTimeRange === '7d') return eDate >= daysAgo(7);
      if (effectiveTimeRange === '14d') return eDate >= daysAgo(14);
      if (effectiveTimeRange === '30d') return eDate >= daysAgo(30);

      if (effectiveTimeRange === 'month') {
        return getCycleKey(eDate, cycleStartDay) === activeMonthKey;
      }

      if (effectiveTimeRange === 'custom') {
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
    effectiveTimeRange,
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

  const selectedDayExpenses = useMemo(() => {
    if (!selectedDay) return [];
    return sorted.filter(
      (e) => toLocalDateKey(new Date(e.date)) === selectedDay
    );
  }, [sorted, selectedDay]);

  const filtersActive =
    effectiveTimeRange !== 'month' || Boolean(query || startDate || endDate);

  const resetFilters = () => {
    setQuery('');
    setTimeRange('month');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
  };

  const onEditExpense = useCallback((expense: Expense) => {
    setEditing(expense);
  }, []);

  const onDeleteExpense = useCallback((expense: Expense) => {
    setDeleting(expense);
  }, []);

  const listRowProps = useMemo(
    () => ({
      expenses: sorted,
      categories,
      hideAmounts,
      onEdit: onEditExpense,
      onDelete: onDeleteExpense,
    }),
    [sorted, categories, hideAmounts, onEditExpense, onDeleteExpense]
  );

  const listRowKey = useCallback(
    (index: number, data: ExpenseListRowData) =>
      data.expenses[index]?.id ?? index,
    []
  );

  return (
    <section className="mx-auto max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="field-shell group/search flex h-12 min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-card px-3 md:h-8 md:min-h-8 md:gap-2 md:px-2.5">
            <Search
              className={`size-4 shrink-0 transition-colors group-focus-within/search:text-primary md:size-3.5 ${
                query ? 'text-primary' : 'text-faint'
              }`}
              strokeWidth={2}
            />
            <input
              aria-label="Search expenses"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search note or category"
              className="h-full min-h-12 w-full min-w-0 bg-transparent text-[16px] leading-normal text-foreground outline-none placeholder:text-faint md:min-h-0 md:text-[13px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="press grid size-8 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:text-foreground md:size-4"
              >
                <X className="size-4 md:size-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              aria-label="List view"
              className={`press grid size-10 cursor-pointer place-items-center rounded-md transition-colors sm:flex sm:h-8 sm:min-h-8 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-[12px] sm:font-medium md:min-h-8 ${
                viewMode === 'list'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="size-4 md:size-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('calendar')}
              aria-label="Calendar view"
              className={`press grid size-10 cursor-pointer place-items-center rounded-md transition-colors sm:flex sm:h-8 sm:min-h-8 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-[12px] sm:font-medium md:min-h-8 ${
                viewMode === 'calendar'
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="size-4 md:size-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => downloadCsv(filtered, categories)}
          className="press flex h-12 min-h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary md:h-8 md:min-h-8 md:text-[12px]"
        >
          <Download className="size-4 md:size-3.5" strokeWidth={2} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {viewMode === 'list' && (
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
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
        )}

        {(viewMode === 'calendar' || timeRange === 'month') && (
          <div
            className={`inline-flex items-center gap-1 rounded-lg border border-border bg-card px-1 ${
              viewMode === 'calendar'
                ? 'h-10 w-full justify-between sm:h-8 sm:w-auto'
                : 'h-8'
            }`}
          >
            <button
              onClick={() =>
                monthIndex < availableMonths.length - 1 &&
                setSelectedMonth(availableMonths[monthIndex + 1].key)
              }
              disabled={monthIndex >= availableMonths.length - 1}
              aria-label="Previous month"
              className="press grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30 sm:size-6 sm:rounded"
            >
              <ChevronLeft className="size-4" strokeWidth={1.9} />
            </button>
            <span
              className={`text-center font-medium text-foreground ${
                viewMode === 'calendar'
                  ? 'min-w-0 flex-1 truncate px-1 text-[11px] sm:min-w-[112px] sm:flex-none sm:text-[12px]'
                  : 'min-w-[112px] text-[12px]'
              }`}
            >
              {availableMonths[monthIndex]?.label ?? 'Select month'}
            </span>
            <button
              onClick={() =>
                monthIndex > 0 &&
                setSelectedMonth(availableMonths[monthIndex - 1].key)
              }
              disabled={monthIndex <= 0}
              aria-label="Next month"
              className="press grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30 sm:size-6 sm:rounded"
            >
              <ChevronRight className="size-4" strokeWidth={1.9} />
            </button>
          </div>
        )}

        {viewMode === 'list' && timeRange === 'custom' && (
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

        {filtersActive && (
          <button
            onClick={resetFilters}
            className="cursor-pointer text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-[12px] text-muted-foreground">
          <span
            className={`font-mono-numbers ${
              filtersActive ? 'text-primary' : 'text-foreground'
            }`}
          >
            {filtered.length}
          </span>{' '}
          of{' '}
          <span className="font-mono-numbers">{expenses.length}</span>
        </span>
      </div>

      {viewMode === 'calendar' ? (
        <>
          <ExpenseCalendarGrid
            expenses={filtered}
            cycleKey={activeMonthKey}
            cycleStartDay={cycleStartDay}
            hideAmounts={hideAmounts}
            onDayClick={setSelectedDay}
          />
          <div className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-2.5">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
              Cycle total
            </span>
            <span className="font-mono-numbers text-right text-[13px] font-semibold whitespace-nowrap tabular-nums text-foreground">
              <Money value={filteredTotal} precise />
            </span>
          </div>
        </>
      ) : sorted.length ? (
        <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-border bg-card [contain:layout]">
          <div className="max-w-full overflow-x-auto overscroll-x-contain sm:overflow-x-auto">
            <div className={LIST_INNER}>
              <ExpenseTableHeader
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              <List
                rowComponent={ExpenseListRow}
                rowCount={sorted.length}
                rowHeight={ROW_HEIGHT}
                rowProps={listRowProps}
                rowKey={listRowKey}
                overscanCount={8}
                className="overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                style={{
                  height: Math.min(sorted.length * ROW_HEIGHT, LIST_MAX_HEIGHT),
                  width: '100%',
                }}
              />

              <div className="flex items-center justify-between gap-3 border-t border-primary/25 bg-primary/[0.07] px-2.5 py-2.5 sm:px-3">
                <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
                  Total
                </span>
                <span className="font-mono-numbers text-right text-[13px] font-semibold whitespace-nowrap tabular-nums text-foreground">
                  <Money value={filteredTotal} precise />
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-[13px] text-muted-foreground">
            No expenses match these filters.
          </p>
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="mt-2 cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {selectedDay && (
        <ExpenseDayDialog
          dateKey={selectedDay}
          expenses={selectedDayExpenses}
          categories={categories}
          hideAmounts={hideAmounts}
          onEdit={onEditExpense}
          onDelete={onDeleteExpense}
          onClose={() => setSelectedDay(null)}
        />
      )}

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
