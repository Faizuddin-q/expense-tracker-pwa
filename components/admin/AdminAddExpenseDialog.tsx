'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Category } from '@/types/expense';
import {
  formatIndianNumber,
  getCategoryColor,
  getCategoryIcon,
  parseRawNumber,
} from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

interface AdminAddExpenseDialogProps {
  categories: Category[];
  onSave: (expense: {
    amount: number;
    note?: string;
    category: string;
    date: string;
  }) => void;
  onClose: () => void;
}

/** Same shell as ExpenseEditDialog, but seeded blank — for logging a new expense on a user's behalf. */
export const AdminAddExpenseDialog = ({
  categories,
  onSave,
  onClose,
}: AdminAddExpenseDialogProps) => {
  const [amountDraft, setAmountDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [category, setCategory] = useState(categories[0]?.id ?? '');
  const [dateDraft, setDateDraft] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // showModal() focuses the first focusable descendant by default — that's
    // the close button here, since it comes first in the markup. Focus the
    // amount field explicitly right after, overriding that default.
    dialogRef.current?.showModal();
    amountInputRef.current?.focus();
  }, []);

  const parsedAmount = Number(parseRawNumber(amountDraft));
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0 && category;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      amount: parsedAmount,
      note: noteDraft.trim() || undefined,
      category,
      date: dateDraft
        ? new Date(`${dateDraft}T12:00:00`).toISOString()
        : new Date().toISOString(),
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="add-expense-title"
      className="m-0 h-full max-h-full w-full max-w-full border-0 bg-background/70 p-0 backdrop-blur-sm flex items-end justify-center duration-150 animate-in fade-in sm:items-center sm:p-6"
    >
      <div className="relative w-full max-w-sm rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0">
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2
            id="add-expense-title"
            className="text-[13px] font-semibold text-foreground"
          >
            Add expense on their behalf
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

        <div className="space-y-3.5 px-4 py-4">
          <div>
            <label htmlFor="add-amount" className="label mb-1.5 block">
              Amount
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id="add-amount"
                ref={amountInputRef}
                inputMode="decimal"
                value={amountDraft}
                onChange={(e) =>
                  setAmountDraft(formatIndianNumber(e.target.value))
                }
                placeholder="0"
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-note" className="label mb-1.5 block">
              Note
            </label>
            <input
              id="add-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Optional"
              className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="add-date" className="label mb-1.5 block">
              Date
            </label>
            <input
              id="add-date"
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="field font-mono-numbers h-9 w-full cursor-pointer rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground"
            />
          </div>

          <div>
            <p className="label mb-1.5">Category</p>
            <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto">
              {categories.map((c) => {
                const active = category === c.id;
                const color = getCategoryColor(c.tone);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2 text-left transition-colors ${
                      active
                        ? 'border-border-strong bg-secondary'
                        : 'border-transparent hover:bg-secondary/60'
                    }`}
                  >
                    <CategoryIcon
                      color={color}
                      icon={getCategoryIcon(c)}
                      size="xs"
                    />
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 flex-1 cursor-pointer rounded-lg border border-border bg-background text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid}
            className="h-9 flex-1 cursor-pointer rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
          >
            Add expense
          </button>
        </div>
      </div>
    </dialog>
  );
};
