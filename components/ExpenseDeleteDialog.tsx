'use client';

import { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { builtInCategories } from '@/lib/constants';

interface ExpenseDeleteDialogProps {
  expense: Expense;
  categories?: Category[];
  onConfirm: () => void;
  onClose: () => void;
}

export const ExpenseDeleteDialog = ({
  expense,
  categories = builtInCategories,
  onConfirm,
  onClose,
}: ExpenseDeleteDialogProps) => {
  const c = categoryFor(expense.category, categories);
  const color = getCategoryColor(c.tone);
  const Icon = getCategoryIcon(c);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // No input field to focus here — showModal() would otherwise default to
    // focusing the close button, since it's the first focusable descendant.
    // Focus the dialog container itself instead, a neutral target.
    dialogRef.current?.showModal();
    dialogRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="delete-expense-title"
      className="m-0 h-full max-h-full w-full max-w-full border-0 bg-background/70 p-0 backdrop-blur-sm flex items-end justify-center duration-150 animate-in fade-in sm:items-center sm:p-6"
    >
      <div className="relative w-full max-w-sm rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0">
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2
            id="delete-expense-title"
            className="text-[13px] font-semibold text-foreground"
          >
            Delete expense?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            This removes the expense from this device and the cloud. You can
            undo it for a few seconds after deleting.
          </p>

          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5">
            <CategoryIcon color={color} icon={Icon} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">
                {expense.note || c.label}
              </p>
              <p className="truncate text-[11px] text-faint">
                {expense.note ? c.label : 'No note'}
              </p>
            </div>
            <span className="font-mono-numbers shrink-0 text-[13px] font-semibold text-foreground">
              <Money value={expense.amount} />
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-9 flex-1 cursor-pointer rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-destructive text-[13px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
