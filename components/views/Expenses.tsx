import { useMemo, useState } from 'react';
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
import { Category, Expense } from '@/types/expense';
import { categoryFor, downloadCsv, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { toast } from '@/components/ToastHost';

type SortKey = 'date' | 'category' | 'amount' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';
type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

const PAYMENT_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

const RANGES: { key: TimeRangeOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'month', label: 'Month' },
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
  <th
    scope="col"
    className={`px-3 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
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
  </th>
);

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
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { hideAmounts } = useApp();

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const availableMonths = useMemo(() => {
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

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(currentKey)) {
      monthMap.set(
        currentKey,
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
  }, [expenses, query, timeRange, activeMonthKey, startDate, endDate, categories]);

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
    timeRange !== 'all' || Boolean(query || startDate || endDate);

  const resetFilters = () => {
    setQuery('');
    setTimeRange('all');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
  };

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
              className="grid size-4 cursor-pointer place-items-center rounded text-faint transition-colors hover:text-foreground"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        <button
          onClick={() => downloadCsv(filtered, categories)}
          className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
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
              onClick={() =>
                monthIndex < availableMonths.length - 1 &&
                setSelectedMonth(availableMonths[monthIndex + 1].key)
              }
              disabled={monthIndex >= availableMonths.length - 1}
              aria-label="Previous month"
              className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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
              className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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

      {/* Table */}
      {sorted.length ? (
        <div className="mt-3 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-card [contain:layout]">
          <table className="w-full min-w-[440px] border-collapse text-[13px] sm:min-w-[620px] md:min-w-[860px]">
            <thead className="sticky-head text-[11px] tracking-[0.04em] text-muted-foreground uppercase">
              <tr className="border-b border-border">
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
                <th scope="col" className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                  Note
                </th>
                <th scope="col" className="hidden px-3 py-2 text-left font-medium md:table-cell">
                  Payment
                </th>
                <SortHeader
                  label="Added"
                  active={sortBy === 'createdAt'}
                  dir={sortDir}
                  onClick={() => toggleSort('createdAt')}
                  className="hidden md:table-cell"
                />
                <SortHeader
                  label="Updated"
                  active={sortBy === 'updatedAt'}
                  dir={sortDir}
                  onClick={() => toggleSort('updatedAt')}
                  className="hidden md:table-cell"
                />
                <SortHeader
                  label="Amount"
                  active={sortBy === 'amount'}
                  dir={sortDir}
                  onClick={() => toggleSort('amount')}
                  align="right"
                />
                <th scope="col" className="w-[64px] px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {sorted.map((e) => {
                const c = categoryFor(e.category, categories);
                const color = getCategoryColor(c.tone);
                return (
                  <tr key={e.id} className="group transition-colors hover:bg-primary/[0.055]">
                    <td className="font-mono-numbers px-3 py-2 whitespace-nowrap text-muted-foreground transition-shadow group-hover:shadow-[inset_2px_0_0_var(--primary)]">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon
                          color={color}
                          icon={getCategoryIcon(c)}
                          size="xs"
                        />
                        <span className="font-medium text-foreground">
                          {c.label}
                        </span>
                      </span>
                    </td>
                    <td className="hidden max-w-[240px] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                      {e.note || <span className="text-faint">—</span>}
                    </td>
                    <td className="hidden px-3 py-2 whitespace-nowrap text-muted-foreground md:table-cell">
                      {e.paymentMethod ? (
                        PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="font-mono-numbers hidden px-3 py-2 text-[12px] whitespace-nowrap text-faint md:table-cell">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="font-mono-numbers hidden px-3 py-2 text-[12px] whitespace-nowrap text-faint md:table-cell">
                      {e.updatedAt ? formatDateTime(e.updatedAt) : '—'}
                    </td>
                    <td className="font-mono-numbers px-3 py-2 text-right font-medium whitespace-nowrap text-foreground">
                      <Money value={e.amount} precise />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        {!hideAmounts && (
                          <button
                            aria-label="Edit expense"
                            onClick={() => setEditing(e)}
                            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                          >
                            <Pencil className="size-3.5" strokeWidth={1.9} />
                          </button>
                        )}
                        <button
                          aria-label="Delete expense"
                          onClick={() => setDeleting(e)}
                          className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.9} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t border-primary/25 bg-primary/[0.07]">
                <td colSpan={2} className="px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
                  Total
                </td>
                <td className="hidden sm:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="font-mono-numbers px-3 py-2.5 text-right font-semibold whitespace-nowrap text-foreground">
                  <Money value={filteredTotal} precise />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
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
