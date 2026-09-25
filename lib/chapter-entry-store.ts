import { useMemo } from 'react';
import { create } from 'zustand';
import { ChapterEntry } from '@/types/chapter';
import { Category, CategoryId, Payment } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { money } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { getAllCategories, useAllCategories } from '@/lib/category-store';
import { toast } from '@/components/ToastHost';

interface ChapterEntryStore {
  entries: ChapterEntry[];
  add: (entry: ChapterEntry) => void;
  update: (id: string, patch: Partial<ChapterEntry>) => void;
  remove: (id: string) => void;
  hydrate: (items: ChapterEntry[]) => void;

  addEntry: (
    chapterId: string,
    input: {
      amount: number;
      category: CategoryId;
      note?: string;
      paymentMethod?: Payment;
      date?: string;
    }
  ) => void;
  updateEntry: (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: CategoryId;
      date: string;
      paymentMethod?: Payment;
    }
  ) => void;
  deleteEntry: (id: string) => void;
  resetOnLogout: () => void;
}

export const useChapterEntries = create<ChapterEntryStore>(
  (setState, getState) => ({
    entries: [],
    add: (entry) =>
      setState((s) => ({ entries: [entry, ...s.entries] })),
    update: (id, patch) =>
      setState((s) => ({
        entries: s.entries.map((e) =>
          e.id === id ? { ...e, ...patch, id: e.id } : e
        ),
      })),
    remove: (id) =>
      setState((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    hydrate: (items) =>
      setState({
        entries: items.map((e) => ({ ...e, amount: Number(e.amount) || 0 })),
      }),

    addEntry: (chapterId, input) => {
      if (!input.amount || input.amount <= 0) {
        toast.error('Could not add expense', 'Enter an amount first');
        return;
      }
      const userId = useAuthStore.getState().userId;
      const now = new Date().toISOString();
      const entry: ChapterEntry = {
        id: crypto.randomUUID(),
        chapterId,
        amount: input.amount,
        category: input.category,
        note: input.note?.trim() || undefined,
        paymentMethod: input.paymentMethod,
        date: input.date ?? now,
        createdAt: now,
        updatedAt: now,
      };
      getState().add(entry);
      toast.success(
        'Expense added',
        `${money(entry.amount)}${entry.note ? ` · ${entry.note}` : ''}`
      );
      void useSyncStore.getState().sync({
        id: userId,
        chapterEntries: getState().entries,
      });
    },

    updateEntry: (id, patch) => {
      const previous = getState().entries.find((e) => e.id === id);
      if (!previous) return;
      const userId = useAuthStore.getState().userId;
      const now = new Date().toISOString();
      const cleanedNote = patch.note?.trim() || undefined;
      getState().update(id, {
        amount: patch.amount,
        note: cleanedNote,
        category: patch.category,
        date: patch.date,
        paymentMethod: patch.paymentMethod,
        updatedAt: now,
        deletedAt: null,
      });

      const allCategories = getAllCategories();
      const categoryLabel =
        allCategories.find((c) => c.id === patch.category)?.label ??
        builtInCategories.find((c) => c.id === patch.category)?.label ??
        'Category';
      toast.success(
        'Updated an expense',
        [money(patch.amount), categoryLabel, cleanedNote || null]
          .filter(Boolean)
          .join(' · ')
      );

      void useSyncStore.getState().sync({
        id: userId,
        chapterEntries: getState().entries,
      });
    },

    deleteEntry: (id) => {
      const target = getState().entries.find((e) => e.id === id);
      if (!target) return;
      getState().remove(id);
      const userId = useAuthStore.getState().userId;
      void useSyncStore
        .getState()
        .sync({
          id: userId,
          chapterEntries: getState().entries,
          deletedChapterEntryIds: [id],
        })
        .then((ok) => {
          if (ok) toast.success('Deleted an expense', money(target.amount));
        });
    },

    resetOnLogout: () => {
      setState({ entries: [] });
    },
  })
);

export const useChapterTotal = (chapterId: string): number => {
  const entries = useChapterEntries((s) => s.entries);
  return useMemo(
    () =>
      entries
        .filter((e) => e.chapterId === chapterId)
        .reduce((sum, e) => sum + e.amount, 0),
    [entries, chapterId]
  );
};

export const useChapterEntriesFor = (chapterId: string): ChapterEntry[] => {
  const entries = useChapterEntries((s) => s.entries);
  return useMemo(
    () => entries.filter((e) => e.chapterId === chapterId),
    [entries, chapterId]
  );
};

export const useChapterByCategory = (
  chapterId: string
): (Category & { total: number })[] => {
  const entries = useChapterEntriesFor(chapterId);
  const allCategories = useAllCategories();
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    const result: (Category & { total: number })[] = [];
    for (const c of allCategories) {
      const total = totals.get(c.id) ?? 0;
      if (total) result.push({ ...c, total });
    }
    return result;
  }, [allCategories, entries]);
};
