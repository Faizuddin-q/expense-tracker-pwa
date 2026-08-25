'use client';

import { useEffect } from 'react';
import { idbSet } from '@/lib/idb';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { useExpenses } from '@/lib/store';
import { useCategoryStore } from '@/lib/category-store';
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
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const onOnline = () => {
      useSyncStore.getState().setOnline(true);
      const userId = useAuthStore.getState().userId;
      if (!userId) return;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        const expenses = useExpenses.getState().expenses;
        const pendingDeletedIds = useSyncStore.getState().pendingDeletedIds;
        void useSyncStore.getState().sync({
          id: userId,
          local: expenses,
          deletedIds: pendingDeletedIds,
        });
      }, 2000);
    };

    const onOffline = () => {
      clearTimeout(reconnectTimer);
      useSyncStore.getState().setOnline(false);
    };

    addEventListener('online', onOnline);
    addEventListener('offline', onOffline);
    return () => {
      clearTimeout(reconnectTimer);
      removeEventListener('online', onOnline);
      removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !userId) return;
    // Never persist until bootstrap finished for this user — avoids writing a
    // previous account's in-memory list under a new user's IDB key mid-login.
    if (!useSyncStore.getState().profileHydrated) return;
    void idbSet(`pocket-expenses-${userId}`, expenses);
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
      useSyncStore.getState().resetOnLogout();
      useCategoryStore.getState().resetOnLogout();
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
