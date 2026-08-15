'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, TriangleAlert, X } from 'lucide-react';
import { formatIndianMobileDisplay } from '@/lib/utils';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface AdminDeleteUserDialogProps {
  userId: string;
  expenseCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

/** Irreversible — requires typing the account's phone number before the button unlocks. */
export const AdminDeleteUserDialog = ({
  userId,
  expenseCount,
  onConfirm,
  onClose,
}: AdminDeleteUserDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  const matches =
    confirmText.replace(/\D/g, '') === userId.replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm duration-150 animate-in fade-in sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        className="relative z-10 w-full max-w-sm rounded-t-xl border border-destructive/30 bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0"
      >
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2
            id="delete-user-title"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive"
          >
            <TriangleAlert className="size-3.5" strokeWidth={2.2} />
            Delete this account?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            This permanently deletes{' '}
            <span className="font-mono-numbers font-medium text-foreground">
              {formatIndianMobileDisplay(userId)}
            </span>{' '}
            and all {expenseCount} of their expenses, income, and budget.
            This cannot be undone.
          </p>

          <label htmlFor="confirm-phone" className="label mb-1.5 mt-4 block">
            Type the 10-digit number to confirm
          </label>
          <input
            id="confirm-phone"
            autoFocus
            inputMode="numeric"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={userId}
            className="field font-mono-numbers h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 flex-1 cursor-pointer rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!matches}
              className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-destructive text-[13px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
