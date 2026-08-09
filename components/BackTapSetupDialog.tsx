'use client';

import { useEffect, useState } from 'react';
import { Check, Hand, Home, Smartphone, Sparkles, X } from 'lucide-react';
import {
  getPwaPlatform,
  isPwaInstalled,
  type PwaPlatform,
} from '@/lib/pwa';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface BackTapSetupDialogProps {
  open: boolean;
  onClose: () => void;
  deferredInstall: BeforeInstallPromptEvent | null;
  onInstallConsumed: () => void;
  onInstallRequest?: () => Promise<boolean>;
}

const iosSteps = (installed: boolean) => [
  ...(installed
    ? []
    : ['Safari → Share → Add to Home Screen, and name it Pocket.']),
  'Open Settings → Accessibility → Touch → Back Tap.',
  'Choose Double Tap.',
  'Select a Shortcut that opens Pocket (or Open URL to this site).',
  'Double-tap the back of your iPhone to launch Pocket.',
];

const androidSteps = (installed: boolean) => [
  ...(installed
    ? []
    : [
        'Install Pocket to your home screen (Install below, or Chrome menu → Install app).',
      ]),
  'Open Settings → search Quick Tap or Back tap (Pixel: System → Gestures → Quick Tap).',
  'Turn it on and set action to Open app.',
  'Choose Pocket.',
  'Double-tap the back of your phone to open Pocket.',
];

const desktopSteps = [
  'Open Pocket on your iPhone or Android.',
  'Turn on “Open with double tap” in Settings, or follow the on-phone steps there.',
];

export const BackTapSetupDialog = ({
  open,
  onClose,
  deferredInstall,
  onInstallConsumed,
  onInstallRequest,
}: BackTapSetupDialogProps) => {
  const [platform, setPlatform] = useState<PwaPlatform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlatform(getPwaPlatform());
    setInstalled(isPwaInstalled());
  }, [open]);

  if (!open) return null;

  const steps =
    platform === 'ios'
      ? iosSteps(installed)
      : platform === 'android'
        ? androidSteps(installed)
        : desktopSteps;

  const title =
    platform === 'ios'
      ? 'Set up double tap'
      : platform === 'android'
        ? 'Set up Quick Tap'
        : 'Double-tap setup';

  const handleInstall = async () => {
    setInstalling(true);
    try {
      if (onInstallRequest) {
        const ok = await onInstallRequest();
        if (ok) setInstalled(true);
        return;
      }
      if (!deferredInstall) return;
      await deferredInstall.prompt();
      await deferredInstall.userChoice;
      onInstallConsumed();
      setInstalled(isPwaInstalled());
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="back-tap-guide-title"
        className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl ring-1 ring-border duration-200 animate-in slide-in-from-bottom-5 sm:rounded-3xl sm:p-7 sm:zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Hand className="size-5" />
            </div>
            <div>
              <h2
                id="back-tap-guide-title"
                className="text-base font-bold tracking-tight text-foreground sm:text-lg"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Couldn’t open the system switch automatically — follow these
                steps once.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              installed
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {installed ? (
              <Check className="size-3" />
            ) : (
              <Home className="size-3" />
            )}
            {installed ? 'On home screen' : 'Not installed yet'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Smartphone className="size-3" />
            {platform === 'ios'
              ? 'iPhone'
              : platform === 'android'
                ? 'Android'
                : 'Desktop'}
          </span>
        </div>

        {!installed && deferredInstall && (
          <button
            type="button"
            disabled={installing}
            onClick={() => void handleInstall()}
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-2xs transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {installing ? 'Installing…' : 'Install Pocket'}
          </button>
        )}

        {!installed && platform === 'ios' && !deferredInstall && (
          <p className="mt-4 rounded-xl border border-border/80 bg-background/60 px-3.5 py-3 text-xs font-medium leading-relaxed text-muted-foreground">
            On iPhone: Safari →{' '}
            <span className="font-bold text-foreground">Share</span> →{' '}
            <span className="font-bold text-foreground">Add to Home Screen</span>
            .
          </p>
        )}

        <ol className="mt-4 max-h-[50vh] space-y-2.5 overflow-y-auto pr-0.5">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex gap-3 rounded-2xl border border-border/70 bg-background/50 px-3.5 py-3"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-foreground text-[11px] font-extrabold text-background">
                {i + 1}
              </span>
              <p className="text-xs font-medium leading-relaxed text-foreground sm:text-sm">
                {step}
              </p>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full cursor-pointer rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-2xs transition hover:opacity-90 active:scale-[0.98] sm:text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
