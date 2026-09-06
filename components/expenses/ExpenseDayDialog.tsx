'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useDialogExit } from '@/lib/useDialogExit';
import { Money } from '@/components/Money';
import { ExpenseDateDisplay } from '@/components/expenses/ExpenseDateDisplay';
import {
  ExpenseDayMobileRow,
  ExpenseTableHeader,
  ExpenseTableRow,
  LIST_INNER,
  SortDir,
  SortKey,
} from '@/components/expenses/expense-table';

interface ExpenseDayDialogProps {
  dateKey: string;
  expenses: Expense[];
  categories: Category[];
  hideAmounts: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onClose: () => void;
}

const formatTitle = (dateKey: string, short = false) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (short) {
    return (
      <ExpenseDateDisplay date={date} withYear className="font-sans text-[13px] font-semibold text-foreground" />
    );
  }
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{weekday},</span>
      <ExpenseDateDisplay date={date} withYear className="font-sans font-semibold text-foreground" />
    </span>
  );
};

export const ExpenseDayDialog = ({
  dateKey,
  expenses,
  categories,
  hideAmounts,
  onEdit,
  onDelete,
  onClose,
}: ExpenseDayDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const { leaving, close } = useDialogExit();
  const dismiss = () => close(onClose);

  const [sortBy, setSortBy] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'date',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    const dir = sortBy.dir === 'asc' ? 1 : -1;
    const time = (v?: string) => new Date(v ?? 0).getTime();
    return [...expenses].sort((a, b) => {
      switch (sortBy.key) {
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
  }, [expenses, sortBy, categories]);

  const dayTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const toggleSort = (key: SortKey) => {
    setSortBy((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm duration-150 sm:items-center sm:p-4 ${
        leaving ? 'animate-out fade-out' : 'animate-in fade-in'
      }`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-day-title"
        className={`relative z-10 flex h-[min(92dvh,720px)] w-full max-w-6xl flex-col rounded-t-2xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] sm:h-auto sm:max-h-[min(90dvh,720px)] sm:rounded-xl ${
          leaving
            ? 'animate-out fade-out slide-out-to-bottom-4 sm:zoom-out-[0.98] sm:slide-out-to-bottom-0'
            : 'animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] sm:slide-in-from-bottom-0'
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4 sm:h-11">
          <h2
            id="expense-day-title"
            className="min-w-0 truncate text-[13px] font-semibold text-foreground"
          >
            <span className="sm:hidden">{formatTitle(dateKey, true)}</span>
            <span className="hidden sm:inline">{formatTitle(dateKey)}</span>
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={dismiss}
            className="press grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-secondary hover:text-foreground sm:size-6 sm:rounded"
          >
            <X className="size-4 sm:size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {sorted.length ? (
            <>
              <div className="sm:hidden">
                {sorted.map((expense) => (
                  <ExpenseDayMobileRow
                    key={expense.id}
                    expense={expense}
                    categories={categories}
                    hideAmounts={hideAmounts}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <div className={LIST_INNER}>
                  <ExpenseTableHeader
                    sortBy={sortBy.key}
                    sortDir={sortBy.dir}
                    onSort={toggleSort}
                  />
                  {sorted.map((expense) => (
                    <ExpenseTableRow
                      key={expense.id}
                      expense={expense}
                      categories={categories}
                      hideAmounts={hideAmounts}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">
              No expenses on this day.
            </p>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-primary/25 bg-primary/[0.07] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
              Day total
            </span>
            <span className="font-mono-numbers text-right text-[13px] font-semibold whitespace-nowrap tabular-nums text-foreground">
              <Money value={dayTotal} precise />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
