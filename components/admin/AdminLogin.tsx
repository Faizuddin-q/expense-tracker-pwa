'use client';

import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/Brand';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Enter a username and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid username or password');
        return;
      }
      onSuccess();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-[380px]">
        <Brand />

        <div className="mt-8 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" strokeWidth={2} />
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-foreground">
            Admin sign in
          </h1>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Manage every account, review spending, and act on a user&apos;s
          behalf.
        </p>

        <div className="mt-7 rounded-xl border border-border bg-card p-4">
          <div>
            <label htmlFor="admin-username" className="label mb-1.5 block">
              Username
            </label>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="faizadmin"
              className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
            />
          </div>

          <div className="mt-3">
            <label htmlFor="admin-password" className="label mb-1.5 block">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                )
                  void handleSubmit();
              }}
              className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground outline-none placeholder:text-faint"
            />
          </div>

          {error && (
            <p className="mt-2 text-[12px] text-destructive">{error}</p>
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRight className="size-3.5" strokeWidth={2.2} />}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-faint">
          This is a separate, admin-only area — your regular Pocket sign-in
          at /login is unaffected.
        </p>
      </section>
    </main>
  );
};
