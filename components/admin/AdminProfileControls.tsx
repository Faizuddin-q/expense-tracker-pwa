'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface ProfilePatch {
  monthlyIncome: number;
  monthlyBudget: number;
  hideAmounts: boolean;
}

interface AdminProfileControlsProps {
  userId: string;
  monthlyIncome: number;
  monthlyBudget: number;
  hideAmounts: boolean;
  onSaved: (patch: ProfilePatch) => void;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

export const AdminProfileControls = ({
  userId,
  monthlyIncome,
  monthlyBudget,
  hideAmounts,
  onSaved,
}: AdminProfileControlsProps) => {
  const [incomeDraft, setIncomeDraft] = useState(String(monthlyIncome || ''));
  const [budgetDraft, setBudgetDraft] = useState(String(monthlyBudget || ''));
  const [hideAmountsDraft, setHideAmountsDraft] = useState(hideAmounts);
  const [savingProfile, setSavingProfile] = useState(false);

  const profileDirty =
    incomeDraft !== String(monthlyIncome || '') ||
    budgetDraft !== String(monthlyBudget || '') ||
    hideAmountsDraft !== hideAmounts;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({
          monthlyIncome: Number(incomeDraft.replace(/[^0-9.]/g, '')) || 0,
          monthlyBudget: Number(budgetDraft.replace(/[^0-9.]/g, '')) || 0,
          hideAmounts: hideAmountsDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved(data.profile);
      toast.success('Profile updated', `Saved for +91 ${userId}`);
    } catch (err) {
      toast.error(
        'Could not save',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <h3 className="label">Account controls</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <div>
          <label className="label mb-1.5 block" htmlFor={`income-${userId}`}>
            Monthly income
          </label>
          <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
            <span className="font-mono-numbers text-[13px] text-faint">₹</span>
            <input
              id={`income-${userId}`}
              inputMode="decimal"
              value={incomeDraft}
              onChange={(e) => setIncomeDraft(e.target.value)}
              className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
            />
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor={`budget-${userId}`}>
            Monthly budget
          </label>
          <div className="field-shell flex h-9 items-center rounded-lg border border-border bg-background px-2.5">
            <span className="font-mono-numbers text-[13px] text-faint">₹</span>
            <input
              id={`budget-${userId}`}
              inputMode="decimal"
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value)}
              className="font-mono-numbers w-full min-w-0 bg-transparent px-1.5 text-[13px] font-medium text-foreground outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-foreground">
            <input
              type="checkbox"
              checked={hideAmountsDraft}
              onChange={(e) => setHideAmountsDraft(e.target.checked)}
              className="size-3.5 cursor-pointer accent-primary"
            />
            Hide amounts
          </label>
        </div>
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={!profileDirty || savingProfile}
            className="h-9 cursor-pointer rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
          >
            {savingProfile ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
