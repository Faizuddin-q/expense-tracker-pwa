'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  LogOut,
  Moon,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { AdminSummary, AdminUserSummary } from '@/lib/admin-types';
import { moneyExact } from '@/lib/utils';
import { useThemeStore } from '@/lib/theme-store';
import { Brand } from '@/components/Brand';
import { toast } from '@/components/ToastHost';
import { AdminUserRow } from '@/components/admin/AdminUserRow';

interface AdminDashboardProps {
  onSignedOut: () => void;
}

const Stat = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) => (
  <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
      <Icon className="size-4" strokeWidth={1.9} />
    </span>
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className="font-mono-numbers mt-0.5 truncate text-[15px] font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  </div>
);

export const AdminDashboard = ({ onSignedOut }: AdminDashboardProps) => {
  const { theme, setTheme } = useThemeStore();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to load users');
      setUsers(body.data.users);
      setSummary(body.data.summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      setError(msg);
      toast.error('Could not load accounts', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    onSignedOut();
  };

  const filteredUsers = useMemo(() => {
    const q = query.replace(/\D/g, '');
    if (!q) return users;
    return users.filter((u) => u.userId.includes(q));
  }, [users, query]);

  const handleUserDeleted = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.userId !== userId));
    setExpandedId((prev) => (prev === userId ? null : prev));
  };

  const handleUserChanged = (next: AdminUserSummary) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === next.userId ? next : u))
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 relative bg-background/90 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-border/60 after:to-transparent">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <ShieldCheck className="size-3" strokeWidth={2.4} />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="press grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" strokeWidth={1.9} />
              ) : (
                <Moon className="size-4" strokeWidth={1.9} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              title="Refresh"
              aria-label="Refresh"
              className="press grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
                strokeWidth={1.9}
              />
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
            >
              <LogOut className="size-3.5" strokeWidth={1.9} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Platform-wide summary */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0">
          <Stat label="Total users" value={summary?.totalUsers ?? '—'} icon={Users} />
          <Stat
            label="Total expenses"
            value={summary?.totalExpenses ?? '—'}
            icon={Receipt}
          />
          <Stat
            label="Total spend"
            value={summary ? moneyExact(summary.totalSpend) : '—'}
            icon={Wallet}
          />
          <Stat
            label="Active (30d)"
            value={summary?.activeLast30Days ?? '—'}
            icon={Activity}
          />
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="field-shell flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-card px-2.5">
            <Search className="size-3.5 shrink-0 text-faint" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by phone number"
              className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
            />
          </div>
          <span className="shrink-0 text-[12px] text-muted-foreground">
            <span className="font-mono-numbers text-primary">
              {filteredUsers.length}
            </span>{' '}
            of {users.length}
          </span>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky-head">
                <tr className="border-b border-border">
                  <th className="w-9 py-2.5 pl-3 sm:pl-4" />
                  <th className="label py-2.5 pr-3 font-semibold">User</th>
                  <th className="label py-2.5 pr-3 font-semibold">Expenses</th>
                  <th className="label py-2.5 pr-3 font-semibold">Total spent</th>
                  <th className="label py-2.5 pr-3 font-semibold">Income</th>
                  <th className="label py-2.5 pr-3 font-semibold">Budget</th>
                  <th className="label py-2.5 pr-3 font-semibold sm:pr-4">
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[13px] text-muted-foreground">
                      Loading accounts…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[13px] text-destructive">
                      {error}
                    </td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <AdminUserRow
                      key={user.userId}
                      user={user}
                      expanded={expandedId === user.userId}
                      onToggle={() =>
                        setExpandedId((prev) =>
                          prev === user.userId ? null : user.userId
                        )
                      }
                      onUserDeleted={handleUserDeleted}
                      onUserChanged={handleUserChanged}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[13px] text-muted-foreground">
                      {users.length ? 'No accounts match your search.' : 'No accounts yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
