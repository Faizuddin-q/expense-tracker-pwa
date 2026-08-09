'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BackTapSetupDialog } from '@/components/BackTapSetupDialog';
import {
  getBackTapPref,
  getPwaPlatform,
  isPwaInstalled,
  openSystemBackTapSettings,
  setBackTapPref,
} from '@/lib/pwa';
import { toast } from '@/components/ToastHost';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface PwaContextValue {
  backTapEnabled: boolean;
  setBackTapEnabled: (on: boolean) => Promise<void>;
  openBackTapGuide: () => void;
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
  const [backTapEnabled, setBackTapEnabledState] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deferredInstall, setDeferredInstall] =
    useState<BeforeInstallPromptEvent | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  const clearFallbackTimer = () => {
    if (fallbackTimer.current != null) {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  };

  const openBackTapGuide = useCallback(() => {
    clearFallbackTimer();
    setGuideOpen(true);
  }, []);

  useEffect(() => {
    setBackTapEnabledState(getBackTapPref());
    setIsInstalled(isPwaInstalled());
    return () => clearFallbackTimer();
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

  const showGuideFallback = useCallback(
    (delayMs = 0) => {
      clearFallbackTimer();
      if (delayMs <= 0) {
        setGuideOpen(true);
        return;
      }
      fallbackTimer.current = window.setTimeout(() => {
        // If deep link left the app, skip; otherwise show the guide
        if (!document.hidden) setGuideOpen(true);
        fallbackTimer.current = null;
      }, delayMs);
    },
    []
  );

  const setBackTapEnabled = useCallback(
    async (on: boolean) => {
      setBackTapEnabledState(on);
      setBackTapPref(on);

      if (!on) {
        clearFallbackTimer();
        setGuideOpen(false);
        toast.success('Double-tap off', 'Preference cleared on this device');
        return;
      }

      if (!isPwaInstalled()) {
        await installApp();
      }

      const platform = getPwaPlatform();
      if (platform === 'desktop') {
        toast.error(
          'Use your phone',
          'Double-tap open only works on iPhone or Android'
        );
        setBackTapEnabledState(false);
        setBackTapPref(false);
        showGuideFallback(0);
        return;
      }

      const opened = openSystemBackTapSettings();
      if (!opened) {
        // Deep link failed — show guide immediately
        showGuideFallback(0);
        return;
      }

      toast.success(
        'Check phone Settings',
        platform === 'ios'
          ? 'If Settings didn’t open, use the guide steps'
          : 'If Quick Tap didn’t open, use the guide steps'
      );
      // iOS often ignores prefs URLs; Android may leave us on-page — guide as fallback
      showGuideFallback(platform === 'ios' ? 600 : 1400);
    },
    [installApp, showGuideFallback]
  );

  return (
    <PwaContext.Provider
      value={{
        backTapEnabled,
        setBackTapEnabled,
        openBackTapGuide,
        canInstall: Boolean(deferredInstall) && !isInstalled,
        installApp,
        isInstalled,
      }}
    >
      {children}
      <BackTapSetupDialog
        open={guideOpen}
        deferredInstall={deferredInstall}
        onInstallConsumed={() => setDeferredInstall(null)}
        onInstallRequest={installApp}
        onClose={() => setGuideOpen(false)}
      />
    </PwaContext.Provider>
  );
};
