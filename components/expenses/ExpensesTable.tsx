import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';

export type SortKey = 'date' | 'category' | 'amount' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

const PAYMENT_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

// Fixed to IST regardless of server/browser timezone — this app is
// India-only (phone-number auth, ₹ currency), and pinning the timezone
// means server-rendered and client-rendered output can never mismatch.
const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
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
    timeZone: 'Asia/Kolkata',
  });
};

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

interface ExpensesTableProps {
  sorted: Expense[];
  categories: Category[];
  sortBy: SortKey;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
  hideAmounts: boolean;
  filteredTotal: number;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
}

export const ExpensesTable = ({
  sorted,
  categories,
  sortBy,
  sortDir,
  toggleSort,
  hideAmounts,
  filteredTotal,
  onEdit,
  onDelete,
  filtersActive,
  onClearFilters,
}: ExpensesTableProps) => {
  if (!sorted.length) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-[13px] text-muted-foreground">
          No expenses match these filters.
        </p>
        {filtersActive && (
          <button
            onClick={onClearFilters}
            className="mt-2 cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
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
                    <CategoryIcon color={color} icon={getCategoryIcon(c)} size="xs" />
                    <span className="font-medium text-foreground">{c.label}</span>
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
                        onClick={() => onEdit(e)}
                        className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      >
                        <Pencil className="size-3.5" strokeWidth={1.9} />
                      </button>
                    )}
                    <button
                      aria-label="Delete expense"
                      onClick={() => onDelete(e)}
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
  );
};
