import { useMemo } from 'react';
import { create } from 'zustand';
import { idbSet } from '@/lib/idb';
import { Category } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryIcon } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { toast } from '@/components/ToastHost';

interface CategoryStore {
  customCategories: Category[];
  categoryDialog: boolean;
  categoryName: string;
  selectedTone: string;
  selectedIconName: string;

  setCategoryDialog: (v: boolean) => void;
  setCategoryName: (v: string) => void;
  setSelectedTone: (v: string) => void;
  setSelectedIconName: (v: string) => void;

  /** Plain in-memory setter — used by sync-store when seeding from local IndexedDB or merging cloud data. */
  setCustomCategoriesLocal: (v: Category[]) => void;

  /** Persist to IndexedDB + update state. Used by the CRUD actions below and by sync-store after a cloud round-trip. */
  persistCustomCategories: (id: string, next: Category[]) => Promise<void>;

  addCategory: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, label: string) => Promise<void>;
  /** No-op for built-in categories — only custom (user-created) categories can be recolored/re-iconed. */
  updateCategoryColor: (id: string, tone: string) => Promise<void>;
  updateCategoryIcon: (id: string, iconName: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  customCategories: [],
  categoryDialog: false,
  categoryName: '',
  selectedTone: 'mint',
  selectedIconName: 'plus',

  setCategoryDialog: (v) => set({ categoryDialog: v }),
  setCategoryName: (v) => set({ categoryName: v }),
  setSelectedTone: (v) => set({ selectedTone: v }),
  setSelectedIconName: (v) => set({ selectedIconName: v }),

  setCustomCategoriesLocal: (v) => set({ customCategories: v }),

  persistCustomCategories: async (id, next) => {
    set({ customCategories: next });
    await idbSet(
      `pocket-categories-${id}`,
      next.map(({ id: catId, label, tone, iconName, custom }) => ({
        id: catId,
        label,
        tone,
        iconName,
        custom,
      }))
    );
  },

  addCategory: async () => {
    const { categoryName, selectedTone, selectedIconName } = get();
    const userId = useAuthStore.getState().userId;
    const label = categoryName.trim();
    if (!label || !userId) {
      toast.error('Could not add category', 'Enter a category name');
      return;
    }
    await useSyncStore.getState().ensureFreshCategories();
    const custom: Category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      tone: selectedTone,
      iconName: selectedIconName,
      Icon: getCategoryIcon({ iconName: selectedIconName }),
      custom: true,
    };
    const next = [...get().customCategories, custom];
    await get().persistCustomCategories(userId, next);
    set({ categoryName: '', categoryDialog: false });
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (ok) toast.success('Category added', `"${label}" is ready to use`);
  },

  deleteCategory: async (id) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const removedLabel =
      get().customCategories.find((c) => c.id === id)?.label ?? 'Category';
    const next = get().customCategories.filter((c) => c.id !== id);
    await get().persistCustomCategories(userId, next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (ok) toast.success('Category removed', `"${removedLabel}" deleted`);
  },

  renameCategory: async (id, label) => {
    const trimmed = label.trim();
    const userId = useAuthStore.getState().userId;
    if (!trimmed || !userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const target = get().customCategories.find((c) => c.id === id);
    if (!target || target.label === trimmed) return;
    const next = get().customCategories.map((c) =>
      c.id === id ? { ...c, label: trimmed } : c
    );
    await get().persistCustomCategories(userId, next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (ok) toast.success('Category renamed', `Now called "${trimmed}"`);
  },

  updateCategoryColor: async (id, newTone) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    // Only custom categories carry their own styling — built-ins are static
    // shared definitions with nowhere to save a per-user color.
    if (!get().customCategories.some((c) => c.id === id)) return;
    const next = get().customCategories.map((c) =>
      c.id === id ? { ...c, tone: newTone } : c
    );
    await get().persistCustomCategories(userId, next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (!ok) toast.error('Sync failed', 'Color saved on this device only');
  },

  updateCategoryIcon: async (id, iconName) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    if (!get().customCategories.some((c) => c.id === id)) return;
    const next = get().customCategories.map((c) =>
      c.id === id ? { ...c, iconName, Icon: getCategoryIcon({ iconName }) } : c
    );
    await get().persistCustomCategories(userId, next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (!ok) toast.error('Sync failed', 'Icon saved on this device only');
  },
}));

/** Plain (non-hook) combined category list — for use outside React, e.g. toast copy in store actions. */
export const getAllCategories = (): Category[] => {
  const { customCategories } = useCategoryStore.getState();
  return [...builtInCategories, ...customCategories].map((c) => ({
    ...c,
    Icon: getCategoryIcon(c),
  }));
};

/** Memoized hook version — for components (mirrors the old `allCategories` context value). */
export const useAllCategories = (): Category[] => {
  const customCategories = useCategoryStore((s) => s.customCategories);
  return useMemo(
    () =>
      [...builtInCategories, ...customCategories].map((c) => ({
        ...c,
        Icon: getCategoryIcon(c),
      })),
    [customCategories]
  );
};
