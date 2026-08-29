import { create } from 'zustand';
import { normalizePhone, isValidIndianMobile } from '@/lib/utils';
import { useExpenses } from '@/lib/store';
import { useSyncStore } from '@/lib/sync-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { toast } from '@/components/ToastHost';

interface AuthStore {
  userId: string;
  phone: string;
  password: string;
  initializing: boolean;
  authenticating: boolean;
  error: string;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  setError: (v: string) => void;
  restoreSession: () => Promise<void>;
  signIn: () => Promise<void>;
  createAccount: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  handleSessionExpired: (message: string) => void;
}

const clearSessionState = () => {
  useSyncStore.getState().resetOnLogout();
  useCategoryStore.getState().resetOnLogout();
  useExpenses.getState().hydrate([]);
  useProfileStore.getState().resetOnLogout();
};

/** Sync lock so a double tap on mobile can't fire two sign-ins. */
let authInflight = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  userId: '',
  phone: '',
  password: '',
  initializing: true,
  authenticating: false,
  error: '',

  setPhone: (v) => set({ phone: v }),
  setPassword: (v) => set({ password: v }),
  setError: (v) => set({ error: v }),

  restoreSession: async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const { data } = await res.json();
        if (data?.authenticated && typeof data.userId === 'string') {
          set({ userId: data.userId });
        }
      }
    } catch {
      // Cloud-only — no local session fallback.
    }
    set({ initializing: false });
  },

  signIn: async () => {
    if (authInflight) return;
    const { phone, password } = get();
    const normalized = normalizePhone(phone);
    if (!isValidIndianMobile(normalized)) {
      const msg =
        'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      set({ error: msg });
      toast.error('Invalid mobile number', msg);
      return;
    }
    if (!password) {
      const msg = 'Enter your password.';
      set({ error: msg });
      toast.error('Password required', msg);
      return;
    }
    authInflight = true;
    set({ error: '', authenticating: true });
    clearSessionState();

    try {
      let data: { passwordIsDefault?: boolean };
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized, password }),
        });
        const body = await response.json();
        if (!response.ok) {
          const msg = body.error?.message || 'Could not sign in';
          set({ error: msg });
          toast.error('Could not sign in', msg);
          return;
        }
        data = body.data;
      } catch {
        const msg =
          'Could not reach the server. Check your connection and try again.';
        set({ error: msg });
        toast.error('Sign in failed', msg);
        return;
      }

      set({ password: '', userId: normalized });
      const ok = await useSyncStore.getState().bootstrapUser(normalized);

      if (data.passwordIsDefault) {
        toast.success(
          'Signed in',
          'You used your phone number as a temporary password — set a real one in Settings.'
        );
      } else if (ok) {
        toast.success('Signed in', `Account +91 ${normalized}`);
      } else {
        toast.error('Could not load account', 'Check your connection and try again.');
      }
    } finally {
      authInflight = false;
      set({ authenticating: false });
    }
  },

  createAccount: async () => {
    if (authInflight) return;
    const { phone, password } = get();
    const normalized = normalizePhone(phone);
    if (!isValidIndianMobile(normalized)) {
      const msg =
        'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      set({ error: msg });
      toast.error('Invalid mobile number', msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Choose a password with at least 6 characters.';
      set({ error: msg });
      toast.error('Password too short', msg);
      return;
    }
    authInflight = true;
    set({ error: '', authenticating: true });
    clearSessionState();

    try {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized, password }),
        });
        const body = await response.json();
        if (!response.ok) {
          const msg = body.error?.message || 'Could not create account';
          set({ error: msg });
          toast.error('Could not create account', msg);
          return;
        }
      } catch {
        const msg =
          'Could not reach the server. Check your connection and try again.';
        set({ error: msg });
        toast.error('Could not create account', msg);
        return;
      }

      set({ password: '', userId: normalized });
      await useSyncStore.getState().bootstrapUser(normalized);
      toast.success('Account created', `Signed in as +91 ${normalized}`);
    } finally {
      authInflight = false;
      set({ authenticating: false });
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error('Could not update password', data.error?.message || 'Try again');
        return false;
      }
      toast.success('Password updated', 'Use it next time you sign in');
      return true;
    } catch {
      toast.error(
        'Could not update password',
        'Check your connection and try again'
      );
      return false;
    }
  },

  logout: async () => {
    clearSessionState();
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    set({ userId: '', phone: '', password: '' });
    toast.success('Logged out', 'Your data is still saved in the cloud');
  },

  handleSessionExpired: (message) => {
    clearSessionState();
    set({ userId: '', error: message });
  },
}));
