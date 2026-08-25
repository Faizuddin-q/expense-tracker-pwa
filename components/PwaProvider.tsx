'use client';

import { useEffect } from 'react';

/** Registers the minimal service worker required for PWA install prompts. */
export const PwaProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return children;
};
