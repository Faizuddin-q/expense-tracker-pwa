'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { useCategoryStore } from '@/lib/category-store';
import { useThemeStore } from '@/lib/theme-store';
import { ThemeSync } from '@/components/ThemeSync';
import { ToastHost } from '@/components/ToastHost';

export const AppInit = ({ children }: { children: React.ReactNode }) => {
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    const onVisibility = () =>
      useThemeStore.getState().setScreenObscured(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

  useEffect(() => {
    if (!userId) {
      useSyncStore.getState().resetOnLogout();
      useCategoryStore.getState().resetOnLogout();
      return;
    }
    if (useSyncStore.getState().profileHydrated) return;
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
