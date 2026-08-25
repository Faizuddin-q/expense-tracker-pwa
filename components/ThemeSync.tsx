'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/theme-store';

/**
 * Loads the saved theme preference and keeps <html>'s class + localStorage
 * in sync with it. Mounted once from root AppInit. Admin has no Pockett
 * user session, so its theme stays device-local — setTheme() only pushes
 * to the cloud when a user is signed in.
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
