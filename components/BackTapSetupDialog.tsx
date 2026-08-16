'use client';

import { useEffect, useState } from 'react';
import { Check, Home, Smartphone, X } from 'lucide-react';
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
    : ['Safari → Share → Add to Home Screen, and name it Pockett.']),
  'Open Settings → Accessibility → Touch → Back Tap.',
  'Choose Double Tap.',
  'Select a Shortcut that opens Pockett (or Open URL to this site).',
  'Double-tap the back of your iPhone to launch Pockett.',
];

const androidSteps = (installed: boolean) => [
  ...(installed
    ? []
    : [
        'Install Pockett to your home screen (Install below, or Chrome menu → Install app).',
      ]),
  'Open Settings → search Quick Tap or Back tap (Pixel: System → Gestures → Quick Tap).',
  'Turn it on and set action to Open app.',
  'Choose Pockett.',
  'Double-tap the back of your phone to open Pockett.',
];

const desktopSteps = [
  'Open Pockett on your iPhone or Android.',
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm duration-150 animate-in fade-in sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="back-tap-guide-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0"
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <h2
            id="back-tap-guide-title"
            className="text-[13px] font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Smartphone className="size-3" strokeWidth={2} />
              {platform === 'ios'
                ? 'iPhone'
                : platform === 'android'
                  ? 'Android'
                  : 'Desktop'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                installed
                  ? 'border-positive/30 text-positive'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {installed ? (
                <Check className="size-3" strokeWidth={2.4} />
              ) : (
                <Home className="size-3" strokeWidth={2} />
              )}
              {installed ? 'Installed' : 'Not installed'}
            </span>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            The system switch couldn&apos;t be opened automatically. Follow
            these steps once.
          </p>

          {!installed && deferredInstall && (
            <button
              type="button"
              disabled={installing}
              onClick={() => void handleInstall()}
              className="mt-3 h-9 w-full cursor-pointer rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
            >
              {installing ? 'Installing…' : 'Install Pockett'}
            </button>
          )}

          {!installed && platform === 'ios' && !deferredInstall && (
            <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
              On iPhone: Safari →{' '}
              <span className="font-medium text-foreground">Share</span> →{' '}
              <span className="font-medium text-foreground">
                Add to Home Screen
              </span>
              .
            </p>
          )}

          <ol className="mt-4 space-y-0">
            {steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
              >
                <span className="font-mono-numbers w-4 shrink-0 text-[12px] text-faint">
                  {i + 1}
                </span>
                <p className="text-[12px] leading-relaxed text-foreground">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-full cursor-pointer rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
