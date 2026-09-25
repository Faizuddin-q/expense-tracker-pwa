'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Chapter } from '@/types/chapter';
import { formatIndianNumber, parseRawNumber } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useDialogExit } from '@/lib/useDialogExit';

interface ChapterFormDialogProps {
  chapter?: Chapter;
  onSave: (input: { name: string; budget?: number }) => void;
  onClose: () => void;
}

export const ChapterFormDialog = ({
  chapter,
  onSave,
  onClose,
}: ChapterFormDialogProps) => {
  const [name, setName] = useState(chapter?.name ?? '');
  const [budgetDraft, setBudgetDraft] = useState(() =>
    chapter?.budget ? formatIndianNumber(chapter.budget) : ''
  );
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

  const trimmedName = name.trim();
  const parsedBudget = Number(parseRawNumber(budgetDraft));
  const valid = Boolean(trimmedName);

  const handleSave = () => {
    if (!valid) return;
    onSave({
      name: trimmedName,
      budget: parsedBudget > 0 ? parsedBudget : undefined,
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
        aria-labelledby="chapter-form-title"
        className={`relative z-10 w-full max-w-sm rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] sm:rounded-xl ${
          leaving
            ? 'animate-out fade-out slide-out-to-bottom-4 sm:zoom-out-[0.98] sm:slide-out-to-bottom-0'
            : 'animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] sm:slide-in-from-bottom-0'
        }`}
      >
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2
            id="chapter-form-title"
            className="text-[13px] font-semibold text-foreground"
          >
            {chapter ? 'Edit chapter' : 'New chapter'}
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
            <label htmlFor="chapter-name" className="label mb-1.5 block">
              Name
            </label>
            <input
              id="chapter-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSave();
              }}
              placeholder="Goa trip, New car…"
              className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-faint"
            />
          </div>

          <div>
            <label htmlFor="chapter-budget" className="label mb-1.5 block">
              Budget (optional)
            </label>
            <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
              <span className="font-mono-numbers text-[13px] text-faint">₹</span>
              <input
                id="chapter-budget"
                inputMode="decimal"
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(formatIndianNumber(e.target.value))}
                placeholder="No limit"
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none placeholder:text-faint placeholder:font-normal"
              />
            </div>
            <p className="mt-1 text-[11px] text-faint">
              You can set or change this any time.
            </p>
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
            {chapter ? 'Save' : 'Create chapter'}
          </button>
        </div>
      </div>
    </div>
  );
};
