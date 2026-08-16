import { create } from 'zustand';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';

interface ThemeStore {
  theme: 'dark' | 'light';
  screenObscured: boolean;
  /** Plain setter — no cloud push. Used internally by sync-store when applying the account's synced theme. */
  setThemeState: (t: 'dark' | 'light') => void;
  /** Public action — also pushes the theme to the account so it follows across devices. */
  setTheme: (t: 'dark' | 'light') => void;
  setScreenObscured: (v: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'light',
  screenObscured: false,
  setThemeState: (t) => set({ theme: t }),
  setTheme: (t) => {
    set({ theme: t });
    const userId = useAuthStore.getState().userId;
    if (userId) {
      void useSyncStore.getState().sync({ id: userId, theme: t });
    }
  },
  setScreenObscured: (v) => set({ screenObscured: v }),
}));
