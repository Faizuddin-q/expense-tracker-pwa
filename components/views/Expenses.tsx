import { useCallback, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { List, type RowComponentProps } from 'react-window';
import { Category, Expense } from '@/types/expense';
import { categoryFor, downloadCsv, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { useProfileStore } from '@/lib/profile-store';
import {
  groupByCycle,
  getCycleKey,
  getCycleRange,
  getCurrentCycleKey,
  formatCycleLabel,
  toDateInputValue,
} from '@/lib/cycle';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { toast } from '@/components/ToastHost';

const ROW_HEIGHT = 44;
const LIST_MAX_HEIGHT = 480;

/** Shared column template so header / rows / footer stay aligned. */
const COLS =
  'grid w-full grid-cols-[5.75rem_minmax(0,1fr)_5.25rem_2.75rem] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem_3.5rem] md:grid-cols-[7.5rem_minmax(7rem,1fr)_minmax(8rem,1.4fr)_6.5rem_6.5rem_6.5rem_5.5rem_4rem]';

const LIST_INNER =
  'w-full max-w-full min-w-0 sm:min-w-[620px] md:min-w-[860px]';

type SortKey = 'date' | 'category' | 'amount' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';
type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

const EMPTY_CATEGORIES: Category[] = [];

const PAYMENT_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

// Same order as the Overview (Dashboard) date-range filter, for consistency.
const RANGES: { key: TimeRangeOption; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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
    }
  ) => void;
  categories?: Category[];
}

const SortHeader = ({
  label,
  active,
  dir,
  onClick,
  align = 'left',
  className = '',
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
  className?: string;
}) => (
  <div
    className={`px-2.5 py-2 font-medium sm:px-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
  >
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${active ? 'text-primary' : ''}`}
    >
      {label}
      <span className="grid size-3 place-items-center">
        {active &&
          (dir === 'asc' ? (
            <ArrowUp className="size-3" strokeWidth={2.2} />
          ) : (
            <ArrowDown className="size-3" strokeWidth={2.2} />
          ))}
      </span>
    </button>
  </div>
);

type ExpenseListRowProps = {
  expenses: Expense[];
  categories: Category[];
  hideAmounts: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

const ExpenseListRow = ({
  index,
  style,
  ariaAttributes,
  expenses,
  categories,
  hideAmounts,
  onEdit,
  onDelete,
}: RowComponentProps<ExpenseListRowProps>) => {
  const e = expenses[index];
  if (!e) return null;
  const c = categoryFor(e.category, categories);
  const color = getCategoryColor(c.tone);

  return (
    <div
      {...ariaAttributes}
      style={style}
      className={`group ${COLS} items-center border-b border-border text-[13px] transition-colors hover:bg-primary/[0.055]`}
    >
      <div className="font-mono-numbers truncate px-2.5 py-2 text-[12px] whitespace-nowrap text-muted-foreground transition-shadow group-hover:shadow-[inset_2px_0_0_var(--primary)] sm:px-3 sm:text-[13px]">
        {formatDate(e.date)}
      </div>
      <div className="min-w-0 px-2.5 py-2 sm:px-3">
        <span className="inline-flex max-w-full items-center gap-1.5 sm:gap-2">
          <CategoryIcon color={color} icon={getCategoryIcon(c)} size="xs" />
          <span className="truncate font-medium text-foreground">{c.label}</span>
        </span>
      </div>
      <div className="hidden min-w-0 truncate px-3 py-2 text-muted-foreground sm:block">
        {e.note || <span className="text-faint">—</span>}
      </div>
      <div className="hidden px-3 py-2 whitespace-nowrap text-muted-foreground md:block">
        {e.paymentMethod ? (
          PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod
        ) : (
          <span className="text-faint">—</span>
        )}
      </div>
      <div className="font-mono-numbers hidden px-3 py-2 text-[12px] whitespace-nowrap text-faint md:block">
        {formatDateTime(e.createdAt)}
      </div>
      <div className="font-mono-numbers hidden px-3 py-2 text-[12px] whitespace-nowrap text-faint md:block">
        {e.updatedAt ? formatDateTime(e.updatedAt) : '—'}
      </div>
      <div className="font-mono-numbers truncate px-1.5 py-2 text-right font-medium tabular-nums text-foreground sm:px-3">
        <Money value={e.amount} precise />
      </div>
      <div className="px-1 py-2 sm:px-3">
        <div className="flex items-center justify-end gap-0.5">
          {!hideAmounts && (
            <button
              type="button"
              aria-label="Edit expense"
              onClick={() => onEdit(e)}
              className="grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary sm:size-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            >
              <Pencil className="size-3.5" strokeWidth={1.9} />
            </button>
          )}
          <button
            type="button"
            aria-label="Delete expense"
            onClick={() => onDelete(e)}
            className="grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive sm:size-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Trash2 className="size-3.5" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </div>
  );
};

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
    (index: number, data: ExpenseListRowProps) =>
      data.expenses[index]?.id ?? index,
    []
  );

  return (
    <section className="mx-auto max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="field-shell group/search flex h-8 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5">
          <Search
            className={`size-3.5 shrink-0 transition-colors group-focus-within/search:text-primary ${
              query ? 'text-primary' : 'text-faint'
            }`}
            strokeWidth={2}
          />
          <input
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search note or category"
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="press grid size-4 cursor-pointer place-items-center rounded text-faint transition-colors hover:text-foreground"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        <button
          onClick={() => downloadCsv(filtered, categories)}
          className="press flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
        >
          <Download className="size-3.5" strokeWidth={2} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
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

        {timeRange === 'month' && (
          <div className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-1">
            <button
              onClick={() =>
                monthIndex < availableMonths.length - 1 &&
                setSelectedMonth(availableMonths[monthIndex + 1].key)
              }
              disabled={monthIndex >= availableMonths.length - 1}
              aria-label="Previous month"
              className="press grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-4" strokeWidth={1.9} />
            </button>
            <span className="min-w-[112px] text-center text-[12px] font-medium text-foreground">
              {availableMonths[monthIndex]?.label ?? 'Select month'}
            </span>
            <button
              onClick={() =>
                monthIndex > 0 &&
                setSelectedMonth(availableMonths[monthIndex - 1].key)
              }
              disabled={monthIndex <= 0}
              aria-label="Next month"
              className="press grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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

      {/* Virtualized expense list */}
      {sorted.length ? (
        <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-border bg-card [contain:layout]">
          <div className="max-w-full overflow-x-auto overscroll-x-contain sm:overflow-x-auto">
            <div className={LIST_INNER}>
              <div
                className={`sticky-head ${COLS} border-b border-border text-[11px] tracking-[0.04em] text-muted-foreground uppercase`}
              >
                <SortHeader
                  label="Date"
                  active={sortBy === 'date'}
                  dir={sortDir}
                  onClick={() => toggleSort('date')}
                />
                <SortHeader
                  label="Category"
                  active={sortBy === 'category'}
                  dir={sortDir}
                  onClick={() => toggleSort('category')}
                />
                <div className="hidden px-3 py-2 text-left font-medium sm:block">
                  Note
                </div>
                <div className="hidden px-3 py-2 text-left font-medium md:block">
                  Payment
                </div>
                <SortHeader
                  label="Added"
                  active={sortBy === 'createdAt'}
                  dir={sortDir}
                  onClick={() => toggleSort('createdAt')}
                  className="hidden md:block"
                />
                <SortHeader
                  label="Updated"
                  active={sortBy === 'updatedAt'}
                  dir={sortDir}
                  onClick={() => toggleSort('updatedAt')}
                  className="hidden md:block"
                />
                <SortHeader
                  label="Amount"
                  active={sortBy === 'amount'}
                  dir={sortDir}
                  onClick={() => toggleSort('amount')}
                  align="right"
                />
                <div className="px-1 py-2 sm:px-3">
                  <span className="sr-only">Actions</span>
                </div>
              </div>

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
                <span className="font-mono-numbers min-w-0 truncate text-right text-[13px] font-semibold tabular-nums text-foreground">
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
