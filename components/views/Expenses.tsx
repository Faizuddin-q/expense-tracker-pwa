import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, downloadCsv, getCategoryColor } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { Money } from '@/components/Money';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { toast } from '@/components/ToastHost';

type SortKey = 'date' | 'category' | 'amount' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PAYMENT_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
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

type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

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
  <th className={`px-4 py-3 font-bold ${className}`}>
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1 transition hover:text-foreground ${
        align === 'right' ? 'ml-auto flex-row-reverse' : ''
      } ${active ? 'text-foreground' : ''}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
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

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
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
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            dir
          );
        case 'updatedAt':
          return (
            (new Date(a.updatedAt ?? a.createdAt).getTime() -
              new Date(b.updatedAt ?? b.createdAt).getTime()) *
            dir
          );
        case 'date':
        default:
          return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
      }
    });
  }, [filtered, sortBy, sortDir, categories]);

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
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:px-5 sm:py-3 sm:text-sm"
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
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeRange('1d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '1d'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '7d'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('14d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '14d'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 14 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === '30d'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`shrink-0 flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Calendar className="size-3.5" /> By Month
          </button>
          <button
            onClick={() => setTimeRange('custom')}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.97] ${
              timeRange === 'custom'
                ? 'bg-primary text-primary-foreground'
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

      {/* Month stepper */}
      {timeRange === 'month' && (
        <div className="mt-3 flex items-center justify-center gap-4 rounded-2xl border border-border/80 bg-card py-3">
          <button
            onClick={handlePrevMonth}
            disabled={
              availableMonths.findIndex((m) => m.key === activeMonthKey) >=
              availableMonths.length - 1
            }
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-mono-numbers min-w-[160px] text-center text-sm font-bold text-foreground">
            {availableMonths.find((m) => m.key === activeMonthKey)?.label ??
              'Select month'}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={
              availableMonths.findIndex((m) => m.key === activeMonthKey) <= 0
            }
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Custom Date Range Pickers */}
      {timeRange === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3.5">
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

      {/* Expense Table */}
      {sorted.length ? (
        <div
          className="mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-border/80 bg-card shadow-xs [contain:layout]"
        >
          <table className="w-full min-w-[420px] border-collapse text-left text-xs sm:min-w-[640px] sm:text-sm md:min-w-[860px]">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <SortHeader label="Date" active={sortBy === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
                <SortHeader label="Category" active={sortBy === 'category'} dir={sortDir} onClick={() => toggleSort('category')} />
                <th className="hidden px-4 py-3 font-bold sm:table-cell">Note</th>
                <th className="hidden px-4 py-3 font-bold md:table-cell">Payment</th>
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
                <SortHeader label="Amount" active={sortBy === 'amount'} dir={sortDir} onClick={() => toggleSort('amount')} align="right" />
                <th className="px-4 py-3 font-bold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((e) => {
                const c = categoryFor(e.category, categories);
                const Icon = c.Icon;
                const color = getCategoryColor(c.tone);
                return (
                  <tr key={e.id} className="transition-colors hover:bg-muted/30">
                    <td className="font-mono-numbers px-4 py-3 whitespace-nowrap text-foreground">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="grid size-6 shrink-0 place-items-center rounded-lg"
                          style={{ backgroundColor: `${color}26` }}
                        >
                          {Icon ? <Icon className="size-3.5" style={{ color }} /> : null}
                        </span>
                        <span className="font-semibold text-foreground">{c.label}</span>
                      </span>
                    </td>
                    <td className="hidden max-w-[220px] truncate px-4 py-3 text-muted-foreground sm:table-cell">
                      {e.note || '—'}
                    </td>
                    <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                      {e.paymentMethod ? PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod : '—'}
                    </td>
                    <td className="font-mono-numbers hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="font-mono-numbers hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                      {e.updatedAt ? formatDateTime(e.updatedAt) : '—'}
                    </td>
                    <td className="font-mono-numbers px-4 py-3 text-right font-bold whitespace-nowrap text-foreground">
                      <Money value={e.amount} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!hideAmounts && (
                          <button
                            aria-label="Edit expense"
                            onClick={() => setEditing(e)}
                            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-95"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        <button
                          aria-label="Delete expense"
                          onClick={() => remove(e.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40">
                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-foreground">
                  Total
                </td>
                <td className="hidden sm:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="hidden md:table-cell" />
                <td className="font-mono-numbers px-4 py-3 text-right text-sm font-extrabold whitespace-nowrap text-foreground">
                  <Money value={filteredTotal} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 p-10 text-center text-sm font-medium text-muted-foreground">
          No expenses found matching the selected filters.
        </div>
      )}

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
