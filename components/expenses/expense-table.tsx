'use client';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { RowComponentProps } from 'react-window';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { PAYMENT_LABELS } from '@/lib/constants';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ExpenseDateDisplay } from '@/components/expenses/ExpenseDateDisplay';

export const ROW_HEIGHT = 44;
export const LIST_MAX_HEIGHT = 480;

/** Shared column template so header / rows / footer stay aligned. */
export const COLS =
  'grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto_4.25rem] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem_3.5rem] md:grid-cols-[7.5rem_minmax(7rem,1fr)_minmax(6rem,1.2fr)_6.5rem_8.25rem_8.25rem_6.25rem_4rem]';

export const LIST_INNER =
  'w-full max-w-full min-w-0 sm:min-w-[620px] md:min-w-[980px]';

export type SortKey = 'date' | 'category' | 'amount' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
};

export const SortHeader = ({
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

export type ExpenseTableRowProps = {
  expense: Expense;
  categories: Category[];
  hideAmounts: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export const ExpenseTableRow = ({
  expense: e,
  categories,
  hideAmounts,
  onEdit,
  onDelete,
}: ExpenseTableRowProps) => {
  const c = categoryFor(e.category, categories);
  const color = getCategoryColor(c.tone);

  return (
    <div
      className={`group ${COLS} items-center border-b border-border text-[13px] transition-colors hover:bg-primary/[0.055]`}
    >
      <div className="px-2 py-2 transition-shadow group-hover:shadow-[inset_2px_0_0_var(--primary)] sm:px-3">
        <span className="sm:hidden">
          <ExpenseDateDisplay date={e.date} />
        </span>
        <span className="hidden sm:inline">
          <ExpenseDateDisplay date={e.date} withYear />
        </span>
      </div>
      <div className="min-w-0 px-2 py-2 sm:px-3">
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
      <div className="font-mono-numbers hidden min-w-0 truncate px-3 py-2 text-[12px] tabular-nums text-faint md:block">
        {formatDateTime(e.createdAt)}
      </div>
      <div className="font-mono-numbers hidden min-w-0 truncate px-3 py-2 text-[12px] tabular-nums text-faint md:block">
        {e.updatedAt ? formatDateTime(e.updatedAt) : '—'}
      </div>
      <div className="font-mono-numbers px-1 py-2 text-right font-medium whitespace-nowrap tabular-nums text-foreground sm:px-3">
        <Money value={e.amount} precise />
      </div>
      <div className="px-0.5 py-2 sm:px-3">
        <div className="flex items-center justify-end gap-0">
          {!hideAmounts && (
            <button
              type="button"
              aria-label="Edit expense"
              onClick={() => onEdit(e)}
              className="press grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary sm:size-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            >
              <Pencil className="size-3.5" strokeWidth={1.9} />
            </button>
          )}
          <button
            type="button"
            aria-label="Delete expense"
            onClick={() => onDelete(e)}
            className="press grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive sm:size-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Trash2 className="size-3.5" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </div>
  );
};

export type ExpenseListRowData = {
  expenses: Expense[];
  categories: Category[];
  hideAmounts: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

export const ExpenseListRow = ({
  index,
  style,
  ariaAttributes,
  expenses,
  categories,
  hideAmounts,
  onEdit,
  onDelete,
}: RowComponentProps<ExpenseListRowData>) => {
  const e = expenses[index];
  if (!e) return null;

  return (
    <div {...ariaAttributes} style={style}>
      <ExpenseTableRow
        expense={e}
        categories={categories}
        hideAmounts={hideAmounts}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

type ExpenseTableHeaderProps = {
  sortBy: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
};

export const ExpenseTableHeader = ({
  sortBy,
  sortDir,
  onSort,
}: ExpenseTableHeaderProps) => (
  <div
    className={`sticky-head ${COLS} border-b border-border text-[11px] tracking-[0.04em] text-muted-foreground uppercase`}
  >
    <SortHeader
      label="Date"
      active={sortBy === 'date'}
      dir={sortDir}
      onClick={() => onSort('date')}
    />
    <SortHeader
      label="Category"
      active={sortBy === 'category'}
      dir={sortDir}
      onClick={() => onSort('category')}
    />
    <div className="hidden px-3 py-2 text-left font-medium sm:block">Note</div>
    <div className="hidden px-3 py-2 text-left font-medium md:block">
      Payment
    </div>
    <SortHeader
      label="Added"
      active={sortBy === 'createdAt'}
      dir={sortDir}
      onClick={() => onSort('createdAt')}
      className="hidden md:block"
    />
    <SortHeader
      label="Updated"
      active={sortBy === 'updatedAt'}
      dir={sortDir}
      onClick={() => onSort('updatedAt')}
      className="hidden md:block"
    />
    <SortHeader
      label="Amount"
      active={sortBy === 'amount'}
      dir={sortDir}
      onClick={() => onSort('amount')}
      align="right"
    />
    <div className="px-1 py-2 sm:px-3">
      <span className="sr-only">Actions</span>
    </div>
  </div>
);

/** Stacked card row for day detail on small screens. */
export const ExpenseDayMobileRow = ({
  expense: e,
  categories,
  hideAmounts,
  onEdit,
  onDelete,
}: ExpenseTableRowProps) => {
  const c = categoryFor(e.category, categories);
  const color = getCategoryColor(c.tone);

  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 active:bg-primary/[0.04]">
      <CategoryIcon color={color} icon={getCategoryIcon(c)} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">
            {c.label}
          </p>
          <span className="font-mono-numbers shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
            <Money value={e.amount} precise />
          </span>
        </div>
        {e.note ? (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {e.note}
          </p>
        ) : null}
        {e.paymentMethod ? (
          <p className="mt-0.5 text-[11px] text-faint">
            {PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        {!hideAmounts && (
          <button
            type="button"
            aria-label="Edit expense"
            onClick={() => onEdit(e)}
            className="press grid size-9 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-primary/12 hover:text-primary"
          >
            <Pencil className="size-4" strokeWidth={1.9} />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete expense"
          onClick={() => onDelete(e)}
          className="press grid size-9 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
};
