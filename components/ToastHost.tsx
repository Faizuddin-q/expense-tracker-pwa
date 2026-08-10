'use client';

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { CheckCircle2, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastStore = {
  toasts: ToastItem[];
  push: (type: ToastType, title: string, message?: string) => void;
  dismiss: (id: string) => void;
};

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, title, message) => {
    const id = crypto.randomUUID();
    set((s) => ({
      toasts: [...s.toasts.slice(-4), { id, type, title, message }],
    }));
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push('success', title, message),
  error: (title: string, message?: string) =>
    useToastStore.getState().push('error', title, message),
};

const AUTO_DISMISS_MS = 3600;
const EXIT_MS = 200;

/** Owns its own enter/exit transition so removal is animated, not instant. */
const ToastCard = ({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) => {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startExit = () => {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = setTimeout(() => onRemove(item.id), EXIT_MS);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const autoTimer = setTimeout(startExit, AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(autoTimer);
      clearTimeout(exitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isError = item.type === 'error';
  const visible = entered && !leaving;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg transition-[transform,opacity] duration-200 ease-[var(--ease-drawer)] lg:max-w-sm ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${
        isError
          ? 'border-destructive/30 bg-card text-destructive'
          : 'border-primary/25 bg-card text-foreground'
      }`}
    >
      {isError ? (
        <XCircle className="mt-0.5 size-4.5 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5">{item.title}</p>
        {item.message ? (
          <p
            className={`mt-0.5 text-xs font-medium leading-4 ${
              isError ? 'text-destructive/80' : 'text-muted-foreground'
            }`}
          >
            {item.message}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={startExit}
        className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition hover:text-foreground active:scale-90"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};

export const ToastHost = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:items-end lg:px-6 lg:pt-5"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onRemove={dismiss} />
      ))}
    </div>
  );
};
