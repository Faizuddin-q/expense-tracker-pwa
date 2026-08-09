'use client';

import { useEffect, useState } from 'react';
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
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3600);
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
      {toasts.map((t) => {
        const isError = t.type === 'error';
        return (
          <div
            key={t.id}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md animate-in fade-in slide-in-from-top-2 items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg duration-200 lg:max-w-sm ${
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
              <p className="text-sm font-bold leading-5">{t.title}</p>
              {t.message ? (
                <p
                  className={`mt-0.5 text-xs font-medium leading-4 ${
                    isError ? 'text-destructive/80' : 'text-muted-foreground'
                  }`}
                >
                  {t.message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
