'use client';

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { CheckCircle2, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
};

type ToastStore = {
  toasts: ToastItem[];
  push: (
    type: ToastType,
    title: string,
    message?: string,
    action?: ToastAction
  ) => void;
  dismiss: (id: string) => void;
};

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, title, message, action) => {
    const id = crypto.randomUUID();
    set((s) => ({
      toasts: [...s.toasts.slice(-4), { id, type, title, message, action }],
    }));
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (
    title: string,
    message?: string,
    opts?: { action?: ToastAction }
  ) =>
    useToastStore
      .getState()
      .push('success', title, message, opts?.action),
  error: (title: string, message?: string) =>
    useToastStore.getState().push('error', title, message),
};

const AUTO_DISMISS_MS = 5000;
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
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

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
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg shadow-black/5 transition-[transform,opacity] duration-200 ease-[var(--ease-drawer)] dark:shadow-black/30 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      {isError ? (
        <XCircle
          className="mt-px size-4 shrink-0 text-destructive"
          strokeWidth={1.9}
        />
      ) : (
        <CheckCircle2
          className="mt-px size-4 shrink-0 text-positive"
          strokeWidth={1.9}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight font-medium text-foreground">
          {item.title}
        </p>
        {item.message ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {item.message}
          </p>
        ) : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              startExit();
            }}
            className="press mt-1.5 cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={startExit}
        className="press grid size-5 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-3.5" strokeWidth={2} />
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
