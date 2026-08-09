'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { formatIndianNumber, getCategoryColor, parseRawNumber } from '@/lib/utils';

interface ExpenseEditDialogProps {
  expense: Expense;
  categories: Category[];
  onSave: (patch: {
    amount: number;
    note?: string;
    category: string;
    date: string;
  }) => void;
  onClose: () => void;
}

export const ExpenseEditDialog = ({
  expense,
  categories,
  onSave,
  onClose,
}: ExpenseEditDialogProps) => {
  const [amountDraft, setAmountDraft] = useState(
    formatIndianNumber(expense.amount)
  );
  const [noteDraft, setNoteDraft] = useState(expense.note ?? '');
  const [category, setCategory] = useState(expense.category);
  const [dateDraft, setDateDraft] = useState(() => {
    const d = new Date(expense.date);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    const parsed = Number(parseRawNumber(amountDraft));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const date = dateDraft
      ? new Date(`${dateDraft}T12:00:00`).toISOString()
      : expense.date;
    onSave({
      amount: parsed,
      note: noteDraft.trim() || undefined,
      category,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-expense-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl ring-1 ring-border duration-200 animate-in slide-in-from-bottom-5 sm:rounded-3xl sm:p-7 sm:zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="edit-expense-title"
              className="text-base font-bold tracking-tight text-foreground sm:text-lg"
            >
              Edit expense
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update amount, note, category, or date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mt-5 flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Amount
          <div className="flex h-11 items-center rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <span className="text-sm font-bold text-muted-foreground">₹</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amountDraft}
              onChange={(e) =>
                setAmountDraft(formatIndianNumber(e.target.value))
              }
              className="font-mono-numbers w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
            />
          </div>
        </label>

        <label className="mt-3.5 flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Note
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Optional note"
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="mt-3.5 flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Date
          <input
            type="date"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            className="h-11 cursor-pointer rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="mt-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Category
          </p>
          <div className="mt-2 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {categories.map((c) => {
              const active = category === c.id;
              const color = getCategoryColor(c.tone);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`cursor-pointer truncate rounded-xl px-2 py-2 text-[11px] font-bold transition active:scale-[0.97] ${
                    active
                      ? 'text-white shadow-2xs ring-2 ring-offset-1 ring-offset-card'
                      : 'border border-border/80 bg-background text-foreground hover:bg-muted'
                  }`}
                  style={
                    active
                      ? { backgroundColor: color, ['--tw-ring-color' as string]: color }
                      : undefined
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 cursor-pointer rounded-xl border border-border/80 bg-card text-sm font-bold text-foreground transition hover:bg-muted active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-2xs transition hover:opacity-90 active:scale-[0.98]"
          >
            <Check className="size-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};
