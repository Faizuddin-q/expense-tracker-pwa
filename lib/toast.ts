import { create } from 'zustand';

type ToastType = 'success' | 'error';

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
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

export const useToastStore = create<ToastStore>((set) => ({
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
