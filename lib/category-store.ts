import { useMemo } from 'react';
import { create } from 'zustand';
import { Category } from '@/types/expense';
import { getCategoryIcon } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { toast } from '@/components/ToastHost';

interface CategoryStore {
  categories: Category[];
  categoryDialog: boolean;
  categoryName: string;
  selectedTone: string;
  selectedIconName: string;

  setCategoryDialog: (v: boolean) => void;
  setCategoryName: (v: string) => void;
  setSelectedTone: (v: string) => void;
  setSelectedIconName: (v: string) => void;

  setCategories: (next: Category[]) => void;

  addCategory: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, label: string) => Promise<void>;
  updateCategoryColor: (id: string, tone: string) => Promise<void>;
  updateCategoryIcon: (id: string, iconName: string) => Promise<void>;
  resetOnLogout: () => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  categoryDialog: false,
  categoryName: '',
  selectedTone: 'mint',
  selectedIconName: 'plus',

  setCategoryDialog: (v) => set({ categoryDialog: v }),
  setCategoryName: (v) => set({ categoryName: v }),
  setSelectedTone: (v) => set({ selectedTone: v }),
  setSelectedIconName: (v) => set({ selectedIconName: v }),

  setCategories: (next) => {
    set({ categories: next });
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
    const next = [...get().categories, custom];
    await get().setCategories(next);
    set({ categoryName: '', categoryDialog: false });
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (ok) toast.success('Category added', `"${label}" is ready to use`);
  },

  deleteCategory: async (id) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const removedLabel =
      get().categories.find((c) => c.id === id)?.label ?? 'Category';
    const next = get().categories.filter((c) => c.id !== id);
    await get().setCategories(next);
    const ok = await useSyncStore
      .getState()
      .sync({ id: userId, categories: next, deletedCategoryIds: [id] });
    if (ok) toast.success('Category removed', `"${removedLabel}" deleted`);
  },

  renameCategory: async (id, label) => {
    const trimmed = label.trim();
    const userId = useAuthStore.getState().userId;
    if (!trimmed || !userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    const target = get().categories.find((c) => c.id === id);
    if (!target || target.label === trimmed) return;
    const next = get().categories.map((c) =>
      c.id === id ? { ...c, label: trimmed } : c
    );
    await get().setCategories(next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (ok) toast.success('Category renamed', `Now called "${trimmed}"`);
  },

  updateCategoryColor: async (id, newTone) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    if (!get().categories.some((c) => c.id === id)) return;
    const next = get().categories.map((c) =>
      c.id === id ? { ...c, tone: newTone } : c
    );
    await get().setCategories(next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (!ok) toast.error('Sync failed', 'Could not save category color');
  },

  updateCategoryIcon: async (id, iconName) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await useSyncStore.getState().ensureFreshCategories();
    if (!get().categories.some((c) => c.id === id)) return;
    const next = get().categories.map((c) =>
      c.id === id ? { ...c, iconName, Icon: getCategoryIcon({ iconName }) } : c
    );
    await get().setCategories(next);
    const ok = await useSyncStore.getState().sync({ id: userId, categories: next });
    if (!ok) toast.error('Sync failed', 'Could not save category icon');
  },

  resetOnLogout: () => {
    set({
      categories: [],
      categoryDialog: false,
      categoryName: '',
      selectedTone: 'mint',
      selectedIconName: 'plus',
    });
  },
}));

export const getAllCategories = (): Category[] =>
  useCategoryStore.getState().categories.map((c) => ({
    ...c,
    Icon: getCategoryIcon(c),
  }));

export const useAllCategories = (): Category[] => {
  const categories = useCategoryStore((s) => s.categories);
  return useMemo(
    () => categories.map((c) => ({ ...c, Icon: getCategoryIcon(c) })),
    [categories]
  );
};
