'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getPwaPlatform, isPwaInstalled } from '@/lib/pwa';
import { toast } from '@/lib/toast';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface PwaContextValue {
  canInstall: boolean;
  installApp: () => Promise<boolean>;
  isInstalled: boolean;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export const usePwa = () => {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used inside <PwaProvider>');
  return ctx;
};

export const PwaProvider = ({ children }: { children: React.ReactNode }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredInstall, setDeferredInstall] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsInstalled(isPwaInstalled());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredInstall) {
      const platform = getPwaPlatform();
      if (platform === 'ios') {
        toast.error(
          'Install from Share',
          'Safari → Share → Add to Home Screen'
        );
      } else {
        toast.error(
          'Install unavailable',
          'Use your browser menu → Install app / Add to Home screen'
        );
      }
      return false;
    }
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    setDeferredInstall(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredInstall]);

  const value = useMemo(
    () => ({
      canInstall: Boolean(deferredInstall) && !isInstalled,
      installApp,
      isInstalled,
    }),
    [deferredInstall, isInstalled, installApp]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};
