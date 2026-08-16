import { create } from 'zustand';
import { idbSet } from '@/lib/idb';
import { money } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { toast } from '@/components/ToastHost';

interface ProfileStore {
  income: number;
  incomeDraft: string;
  budget: number;
  budgetDraft: string;
  hideAmounts: boolean;
  needsIncome: boolean;
  name: string;
  nameDraft: string;

  // Plain setters — no persistence/sync side effects. Used internally by
  // sync-store when applying cloud/local data, and by components for drafts.
  setIncome: (v: number) => void;
  setIncomeDraft: (v: string) => void;
  setBudget: (v: number) => void;
  setBudgetDraft: (v: string) => void;
  setNeedsIncome: (v: boolean) => void;
  setHideAmountsState: (v: boolean) => void;
  setNameState: (v: string) => void;
  setNameDraft: (v: string) => void;

  /** Public action — persists locally and pushes to the cloud, unlike setHideAmountsState. */
  setHideAmounts: (v: boolean) => void;
  saveIncome: () => Promise<void>;
  saveBudget: () => Promise<void>;
  saveName: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  resetOnLogout: () => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  income: 0,
  incomeDraft: '',
  budget: 0,
  budgetDraft: '',
  hideAmounts: false,
  needsIncome: false,
  name: '',
  nameDraft: '',

  setIncome: (v) => set({ income: v }),
  setIncomeDraft: (v) => set({ incomeDraft: v }),
  setBudget: (v) => set({ budget: v }),
  setBudgetDraft: (v) => set({ budgetDraft: v }),
  setNeedsIncome: (v) => set({ needsIncome: v }),
  setHideAmountsState: (v) => set({ hideAmounts: v }),
  setNameState: (v) => set({ name: v, nameDraft: v }),
  setNameDraft: (v) => set({ nameDraft: v }),

  setHideAmounts: (v) => {
    set({ hideAmounts: v });
    const userId = useAuthStore.getState().userId;
    if (userId) {
      void idbSet(`pocket-hide-amounts-${userId}`, v);
      void useSyncStore
        .getState()
        .sync({ id: userId, hideAmounts: v })
        .then((ok) => {
          if (ok) {
            toast.success(
              v ? 'Amounts hidden' : 'Amounts visible',
              v
                ? 'Synced to your account'
                : 'Synced — amounts show normally again'
            );
          }
        });
    }
  },

  saveIncome: async () => {
    const { incomeDraft } = get();
    const parsed = Number(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a monthly income greater than zero.';
      useAuthStore.getState().setError(msg);
      toast.error('Could not save income', msg);
      return;
    }
    useAuthStore.getState().setError('');
    set({ income: parsed });
    const userId = useAuthStore.getState().userId;
    await idbSet(`pocket-income-${userId}`, parsed);
    set({ needsIncome: false });
    const ok = await useSyncStore
      .getState()
      .sync({ id: userId, income: parsed, onboardingComplete: true });
    if (ok) toast.success('Income updated', `Set to ${money(parsed)}`);
  },

  saveName: async () => {
    const { nameDraft } = get();
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      const msg = 'Enter a name.';
      useAuthStore.getState().setError(msg);
      toast.error('Could not save name', msg);
      return;
    }
    useAuthStore.getState().setError('');
    set({ name: trimmed, nameDraft: trimmed });
    const userId = useAuthStore.getState().userId;
    await idbSet(`pocket-name-${userId}`, trimmed);
    const ok = await useSyncStore.getState().sync({ id: userId, name: trimmed });
    if (ok) toast.success('Name updated', `Set to "${trimmed}"`);
  },

  saveBudget: async () => {
    const { budgetDraft } = get();
    const parsed = Number(budgetDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a monthly budget greater than zero.';
      useAuthStore.getState().setError(msg);
      toast.error('Could not save budget', msg);
      return;
    }
    useAuthStore.getState().setError('');
    set({ budget: parsed });
    const userId = useAuthStore.getState().userId;
    await idbSet(`pocket-budget-${userId}`, parsed);
    const ok = await useSyncStore.getState().sync({ id: userId, budget: parsed });
    if (ok) toast.success('Budget updated', `Set to ${money(parsed)}`);
  },

  completeOnboarding: async () => {
    const { incomeDraft, budgetDraft } = get();
    const incomeParsed = Number(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(incomeParsed) || incomeParsed <= 0) {
      const msg = 'Enter a monthly income greater than zero, or skip for now.';
      useAuthStore.getState().setError(msg);
      toast.error('Could not continue', msg);
      return;
    }
    const budgetRaw = budgetDraft.replace(/[^0-9.]/g, '');
    const budgetParsed = budgetRaw ? Number(budgetRaw) : 0;
    const budgetValue =
      Number.isFinite(budgetParsed) && budgetParsed > 0 ? budgetParsed : null;

    const userId = useAuthStore.getState().userId;
    set({ income: incomeParsed, incomeDraft: String(incomeParsed) });
    await idbSet(`pocket-income-${userId}`, incomeParsed);
    if (budgetValue) {
      set({ budget: budgetValue, budgetDraft: String(budgetValue) });
      await idbSet(`pocket-budget-${userId}`, budgetValue);
    }
    await idbSet(`pocket-onboarding-complete-${userId}`, true);
    set({ needsIncome: false });
    useAuthStore.getState().setError('');

    const ok = await useSyncStore.getState().sync({
      id: userId,
      income: incomeParsed,
      budget: budgetValue,
      onboardingComplete: true,
    });
    if (ok) {
      toast.success(
        'Targets saved',
        budgetValue
          ? `Income ${money(incomeParsed)} · Budget ${money(budgetValue)}`
          : `Income ${money(incomeParsed)}`
      );
    }
  },

  skipOnboarding: async () => {
    set({ income: 0, incomeDraft: '', budget: 0, budgetDraft: '', needsIncome: false });
    useAuthStore.getState().setError('');
    const userId = useAuthStore.getState().userId;
    if (userId) {
      await idbSet(`pocket-onboarding-complete-${userId}`, true);
      await useSyncStore.getState().sync({ id: userId, onboardingComplete: true });
    }
    toast.success('Skipped', 'You can set income and budget anytime in Settings');
  },

  resetOnLogout: () => {
    set({
      income: 0,
      incomeDraft: '',
      budget: 0,
      budgetDraft: '',
      needsIncome: false,
      hideAmounts: false,
      name: '',
      nameDraft: '',
    });
  },
}));
