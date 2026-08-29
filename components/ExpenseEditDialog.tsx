'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Category, Expense, Payment } from '@/types/expense';
import {
  formatIndianNumber,
  getCategoryColor,
  getCategoryIcon,
  parseRawNumber,
} from '@/lib/utils';
import { PAYMENT_METHODS } from '@/lib/constants';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useDialogExit } from '@/lib/useDialogExit';

interface ExpenseEditDialogProps {
  expense: Expense;
  categories: Category[];
  onSave: (patch: {
    amount: number;
    note?: string;
    category: string;
    date: string;
    paymentMethod?: Payment;
  }) => void;
  onClose: () => void;
}

export const ExpenseEditDialog = ({
  expense,
  categories,
  onSave,
  onClose,
}: ExpenseEditDialogProps) => {
  const [amountDraft, setAmountDraft] = useState(() =>
    formatIndianNumber(expense.amount)
  );
  const [noteDraft, setNoteDraft] = useState(expense.note ?? '');
  const [category, setCategory] = useState(expense.category);
  const [paymentMethod, setPaymentMethod] = useState<Payment | null>(
    expense.paymentMethod ?? null
  );
  const [dateDraft, setDateDraft] = useState(() => {
    const d = new Date(expense.date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const { leaving, close } = useDialogExit();
  const dismiss = () => close(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const parsedAmount = Number(parseRawNumber(amountDraft));
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      amount: parsedAmount,
      note: noteDraft.trim() || undefined,
      category,
      date: dateDraft
        ? new Date(`${dateDraft}T12:00:00`).toISOString()
        : expense.date,
      paymentMethod: paymentMethod ?? undefined,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm duration-150 sm:items-center sm:p-6 ${
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
        aria-labelledby="edit-expense-title"
        className={`relative z-10 w-full max-w-sm rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] sm:rounded-xl ${
          leaving
            ? 'animate-out fade-out slide-out-to-bottom-4 sm:zoom-out-[0.98] sm:slide-out-to-bottom-0'
            : 'animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] sm:slide-in-from-bottom-0'
        }`}
      >
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2
            id="edit-expense-title"
            className="text-[13px] font-semibold text-foreground"
          >
            Edit expense
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={dismiss}
            className="press grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3.5 px-4 py-4">
          <div>
            <label htmlFor="edit-amount" className="label mb-1.5 block">
              Amount
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id="edit-amount"
                autoFocus
                inputMode="decimal"
                value={amountDraft}
                onChange={(e) =>
                  setAmountDraft(formatIndianNumber(e.target.value))
                }
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-note" className="label mb-1.5 block">
              Note
            </label>
            <input
              id="edit-note"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Optional"
              className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="edit-date" className="label mb-1.5 block">
              Date
            </label>
            <input
              id="edit-date"
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

          <div>
            <p className="label mb-1.5">Payment method</p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      setPaymentMethod((prev) =>
                        prev === method.id ? null : method.id
                      )
                    }
                    className={`h-8 cursor-pointer rounded-lg border px-3 text-[12px] font-medium transition-colors ${
                      active
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-accent/50 bg-background text-muted-foreground hover:border-accent hover:text-foreground'
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={dismiss}
            className="h-9 flex-1 cursor-pointer rounded-lg border border-border bg-background text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid}
            className="h-9 flex-1 cursor-pointer rounded-lg bg-primary text-[13px] font-medium text-primary-foreground press transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
