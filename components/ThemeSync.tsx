'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/theme-store';

/**
 * Loads the saved theme preference and keeps <html>'s class + localStorage
 * in sync with it. Shared by the main app (via AppInit) and the admin
 * dashboard (which has no Pocket account/session, so its theme is always
 * device-local — setTheme() only pushes to the cloud when signed in).
 */
export const ThemeSync = () => {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const saved = localStorage.getItem('pocket-theme') as
      'dark' | 'light' | null;
    // Non-syncing setter — this is loading a saved preference, not the user
    // making a change, so it shouldn't push anything to the cloud.
    useThemeStore.getState().setThemeState(saved === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('pocket-theme', theme);
  }, [theme]);

  return null;
};
