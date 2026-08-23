'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from '@/lib/toast';

interface AdminAccountAccessProps {
  userId: string;
}

export const AdminAccountAccess = ({ userId }: AdminAccountAccessProps) => {
  const [resettingPassword, setResettingPassword] = useState(false);

  const resetPassword = async () => {
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      toast.success(
        'Password reset',
        `+91 ${userId} can sign in with their phone number as the password`
      );
    } catch (err) {
      toast.error(
        'Could not reset password',
        err instanceof Error ? err.message : 'Try again'
      );
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <h3 className="label">Account access</h3>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
          Forgot their password? Reset it so they can sign in again using
          their phone number as a temporary password, then set a real one
          in Settings.
        </p>
        <button
          type="button"
          onClick={() => void resetPassword()}
          disabled={resettingPassword}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary disabled:pointer-events-none disabled:opacity-50"
        >
          <KeyRound className="size-3.5" strokeWidth={2} />
          {resettingPassword ? 'Resetting…' : 'Reset password'}
        </button>
      </div>
    </div>
  );
};
