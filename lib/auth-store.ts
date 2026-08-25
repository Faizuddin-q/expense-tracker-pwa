import { create } from 'zustand';
import { idbGet, idbSet, idbDel } from '@/lib/idb';
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
  error: string;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  setError: (v: string) => void;
  /** Boot-time: restores the local session id and verifies it against the server. */
  restoreSession: () => Promise<void>;
  signIn: () => Promise<void>;
  createAccount: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Called by sync-store when a 401/403 means the session is no longer valid. */
  handleSessionExpired: (message: string) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  userId: '',
  phone: '',
  password: '',
  initializing: true,
  error: '',

  setPhone: (v) => set({ phone: v }),
  setPassword: (v) => set({ password: v }),
  setError: (v) => set({ error: v }),

  restoreSession: async () => {
    const saved = await idbGet<string>('pocket-user-id');
    if (saved) {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            set({ userId: saved });
          } else {
            // Cookie is gone/expired — this device needs to sign in again.
            await idbDel('pocket-user-id');
          }
        } else {
          // Server error while checking — trust the local session so
          // degraded/offline use still works; sync() will recover later.
          set({ userId: saved });
        }
      } catch {
        // Offline or unreachable — trust the local session.
        set({ userId: saved });
      }
    }
    set({ initializing: false });
  },

  signIn: async () => {
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
    set({ error: '' });

    // Wipe in-memory state before switching userId — otherwise AppInit persists
    // the previous account's expenses/categories under the new user's IDB keys.
    useSyncStore.getState().resetOnLogout();
    useCategoryStore.getState().resetOnLogout();
    useExpenses.getState().hydrate([]);
    useProfileStore.getState().resetOnLogout();

    let data: { error?: string; passwordIsDefault?: boolean };
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, password }),
      });
      data = await response.json();
      if (!response.ok) {
        const msg = data.error || 'Could not sign in';
        set({ error: msg });
        toast.error('Could not sign in', msg);
        return;
      }
    } catch {
      const msg =
        'Could not reach the server. Check your connection and try again.';
      set({ error: msg });
      toast.error('Sign in failed', msg);
      return;
    }

    set({ password: '', userId: normalized });
    await idbSet('pocket-user-id', normalized);
    const ok = await useSyncStore.getState().bootstrapUser(normalized);

    if (data.passwordIsDefault) {
      toast.success(
        'Signed in',
        'You used your phone number as a temporary password — set a real one in Settings.'
      );
    } else if (ok) {
      toast.success('Signed in', `Account +91 ${normalized}`);
    } else {
      toast.success(
        'Signed in',
        'Cloud sync unavailable — showing data saved on this device'
      );
    }
  },

  createAccount: async () => {
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
    set({ error: '' });

    useSyncStore.getState().resetOnLogout();
    useCategoryStore.getState().resetOnLogout();
    useExpenses.getState().hydrate([]);
    useProfileStore.getState().resetOnLogout();

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = data.error || 'Could not create account';
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
    await idbSet('pocket-user-id', normalized);
    await useSyncStore.getState().bootstrapUser(normalized);
    toast.success('Account created', `Signed in as +91 ${normalized}`);
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
        toast.error('Could not update password', data.error || 'Try again');
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
    useSyncStore.getState().resetOnLogout();
    useCategoryStore.getState().resetOnLogout();
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    await idbDel('pocket-user-id');
    set({ userId: '', phone: '', password: '' });
    useExpenses.getState().hydrate([]);
    useProfileStore.getState().resetOnLogout();
    toast.success('Logged out', 'Your cloud data is still safe');
  },

  handleSessionExpired: (message) => {
    useSyncStore.getState().resetOnLogout();
    useCategoryStore.getState().resetOnLogout();
    useExpenses.getState().hydrate([]);
    useProfileStore.getState().resetOnLogout();
    set({ userId: '', error: message });
  },
}));
