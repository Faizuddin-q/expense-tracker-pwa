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
  categoryOverrides: Record<string, string>;
  categoryIconOverrides: Record<string, string>;
  categoryDialog: boolean;
  categoryName: string;
  selectedTone: string;
  selectedIconName: string;

  setCategoryDialog: (v: boolean) => void;
  setCategoryName: (v: string) => void;
  setSelectedTone: (v: string) => void;
  setSelectedIconName: (v: string) => void;

  // Plain in-memory setters — used by sync-store when seeding from local
  // IndexedDB or merging cloud data. No persistence side effects.
  setCustomCategoriesLocal: (v: Category[]) => void;
  setCategoryOverridesLocal: (v: Record<string, string>) => void;
  setCategoryIconOverridesLocal: (v: Record<string, string>) => void;

  // Persist to IndexedDB + update state. Used both by CRUD actions below
  // and by sync-store after a successful cloud round-trip.
  persistCustomCategories: (id: string, next: Category[]) => Promise<void>;
  persistToneOverrides: (id: string, next: Record<string, string>) => Promise<void>;
  persistIconOverrides: (id: string, next: Record<string, string>) => Promise<void>;

  /** Same tone/icon-baking the sync payload needs — shared so CRUD actions and sync() match. */
  bakeCategoryStyles: (
    cats: Category[],
    tones?: Record<string, string>,
    icons?: Record<string, string>
  ) => Category[];

  addCategory: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, label: string) => Promise<void>;
  updateCategoryColor: (id: string, tone: string) => Promise<void>;
  updateCategoryIcon: (id: string, iconName: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  customCategories: [],
  categoryOverrides: {},
  categoryIconOverrides: {},
  categoryDialog: false,
  categoryName: '',
  selectedTone: 'mint',
  selectedIconName: 'plus',

  setCategoryDialog: (v) => set({ categoryDialog: v }),
  setCategoryName: (v) => set({ categoryName: v }),
  setSelectedTone: (v) => set({ selectedTone: v }),
  setSelectedIconName: (v) => set({ selectedIconName: v }),

  setCustomCategoriesLocal: (v) => set({ customCategories: v }),
  setCategoryOverridesLocal: (v) => set({ categoryOverrides: v }),
  setCategoryIconOverridesLocal: (v) => set({ categoryIconOverrides: v }),

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

  persistToneOverrides: async (id, next) => {
    set({ categoryOverrides: next });
    await idbSet(`pocket-cat-overrides-${id}`, next);
  },

  persistIconOverrides: async (id, next) => {
    set({ categoryIconOverrides: next });
    await idbSet(`pocket-cat-icon-overrides-${id}`, next);
  },

  bakeCategoryStyles: (cats, tones, icons) => {
    const { categoryOverrides, categoryIconOverrides } = get();
    const t = tones ?? categoryOverrides;
    const i = icons ?? categoryIconOverrides;
    return cats.map((c) => ({
      ...c,
      tone: t[c.id] ?? c.tone,
      iconName: i[c.id] ?? c.iconName,
      Icon: getCategoryIcon({ iconName: i[c.id] ?? c.iconName }),
    }));
  },

  addCategory: async () => {
    const { categoryName, selectedTone, selectedIconName, persistCustomCategories } = get();
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
    await persistCustomCategories(userId, next);
    set({ categoryName: '', categoryDialog: false });
    const ok = await useSyncStore
      .getState()
      .sync(
        userId,
        undefined,
        null,
        next,
        undefined,
        null,
        null,
        get().categoryOverrides,
        get().categoryIconOverrides
      );
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
    const ok = await useSyncStore
      .getState()
      .sync(
        userId,
        undefined,
        null,
        next,
        undefined,
        null,
        null,
        get().categoryOverrides,
        get().categoryIconOverrides
      );
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
    const ok = await useSyncStore
      .getState()
      .sync(
        userId,
        undefined,
        null,
        next,
        undefined,
        null,
        null,
        get().categoryOverrides,
        get().categoryIconOverrides
      );
    if (ok) toast.success('Category renamed', `Now called "${trimmed}"`);
  },

  updateCategoryColor: async (id, newTone) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const nextOverrides = { ...get().categoryOverrides, [id]: newTone };
    await get().persistToneOverrides(userId, nextOverrides);

    let nextCats = get().customCategories;
    if (nextCats.some((c) => c.id === id)) {
      nextCats = nextCats.map((c) => (c.id === id ? { ...c, tone: newTone } : c));
      await get().persistCustomCategories(userId, nextCats);
    }

    const ok = await useSyncStore
      .getState()
      .sync(
        userId,
        undefined,
        null,
        nextCats.length > 0 ? nextCats : null,
        undefined,
        null,
        null,
        nextOverrides,
        get().categoryIconOverrides
      );
    if (!ok) toast.error('Sync failed', 'Color saved on this device only');
  },

  updateCategoryIcon: async (id, iconName) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const nextIcons = { ...get().categoryIconOverrides, [id]: iconName };
    await get().persistIconOverrides(userId, nextIcons);

    let nextCats = get().customCategories;
    if (nextCats.some((c) => c.id === id)) {
      nextCats = nextCats.map((c) =>
        c.id === id ? { ...c, iconName, Icon: getCategoryIcon({ iconName }) } : c
      );
      await get().persistCustomCategories(userId, nextCats);
    }

    const ok = await useSyncStore
      .getState()
      .sync(
        userId,
        undefined,
        null,
        nextCats.length > 0 ? nextCats : null,
        undefined,
        null,
        null,
        get().categoryOverrides,
        nextIcons
      );
    if (!ok) toast.error('Sync failed', 'Icon saved on this device only');
  },
}));

/** Plain (non-hook) combined category list — for use outside React, e.g. toast copy in store actions. */
export const getAllCategories = (): Category[] => {
  const { customCategories, categoryOverrides, categoryIconOverrides } =
    useCategoryStore.getState();
  return [...builtInCategories, ...customCategories].map((c) => {
    const iconName = categoryIconOverrides[c.id] ?? c.iconName;
    return {
      ...c,
      tone: categoryOverrides[c.id] ?? c.tone,
      iconName,
      Icon: getCategoryIcon({ iconName, Icon: c.Icon }),
    };
  });
};

/** Memoized hook version — for components (mirrors the old `allCategories` context value). */
export const useAllCategories = (): Category[] => {
  const customCategories = useCategoryStore((s) => s.customCategories);
  const categoryOverrides = useCategoryStore((s) => s.categoryOverrides);
  const categoryIconOverrides = useCategoryStore((s) => s.categoryIconOverrides);
  return useMemo(
    () =>
      [...builtInCategories, ...customCategories].map((c) => {
        const iconName = categoryIconOverrides[c.id] ?? c.iconName;
        return {
          ...c,
          tone: categoryOverrides[c.id] ?? c.tone,
          iconName,
          Icon: getCategoryIcon({ iconName, Icon: c.Icon }),
        };
      }),
    [customCategories, categoryOverrides, categoryIconOverrides]
  );
};
