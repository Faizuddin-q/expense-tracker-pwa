'use client';

import { useEffect } from 'react';
import { idbSet } from '@/lib/idb';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { useExpenses } from '@/lib/store';
import { useThemeStore } from '@/lib/theme-store';
import { ThemeSync } from '@/components/ThemeSync';
import { ToastHost } from '@/components/ToastHost';

/**
 * Replaces the old <AppProvider> — Zustand stores need no Provider, so this
 * component only runs the one-time browser-environment side effects the old
 * context used to run in its top-level useEffects (theme sync, visibility/
 * online listeners, session restore, expense/deletion persistence).
 *
 * Mounted in both app/(app)/layout.tsx and app/login/layout.tsx, same as
 * <AppProvider> was — so these effects still re-run on every crossing
 * between the /login and (app) route groups, exactly like before.
 */
export const AppInit = ({ children }: { children: React.ReactNode }) => {
  const userId = useAuthStore((s) => s.userId);
  const expenses = useExpenses((s) => s.expenses);
  const hydrated = useExpenses((s) => s.hydrated);
  const pendingDeletedIds = useSyncStore((s) => s.pendingDeletedIds);

  // Obscure UI before OS captures app-switcher / multitasking preview
  useEffect(() => {
    const onVisibility = () =>
      useThemeStore.getState().setScreenObscured(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── Session restore ───────────────────────────────────────────────────────

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

  useEffect(() => {
    useSyncStore.getState().setOnline(navigator.onLine);
    const on = () => useSyncStore.getState().setOnline(true);
    const off = () => useSyncStore.getState().setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (hydrated && userId) void idbSet(`pocket-expenses-${userId}`, expenses);
  }, [expenses, hydrated, userId]);

  // Persist deletions still awaiting a successful sync so an offline delete
  // survives an app restart instead of being forgotten and resurrected by
  // the next bootstrap pull from Mongo.
  useEffect(() => {
    if (userId) void idbSet(`pocket-pending-deleted-${userId}`, pendingDeletedIds);
  }, [pendingDeletedIds, userId]);

  // Only re-bootstrap when the signed-in user changes — not on every sync/expense update
  useEffect(() => {
    if (!userId) {
      useSyncStore.getState().resetProfileHydrated();
      return;
    }
    let cancelled = false;
    void useSyncStore
      .getState()
      .bootstrapUser(userId)
      .then(() => {
        if (cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <>
      <ThemeSync />
      {children}
      <ToastHost />
    </>
  );
};
