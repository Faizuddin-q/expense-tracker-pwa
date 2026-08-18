import { useMemo } from 'react';
import { create } from 'zustand';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { parseRawNumber, formatIndianNumber, money } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { useProfileStore } from '@/lib/profile-store';
import { getAllCategories, useAllCategories } from '@/lib/category-store';
import { toast } from '@/components/ToastHost';
import { getCycleKey, getCurrentCycleKey } from '@/lib/cycle';

interface Store {
  expenses: Expense[];
  hydrated: boolean;
  add: (expense: Expense) => void;
  update: (id: string, patch: Partial<Expense>) => void;
  remove: (id: string) => void;
  hydrate: (items: Expense[]) => void;

  // Expense-entry draft state
  amount: string;
  note: string;
  undo: Expense | null;
  showAll: boolean;
  setAmount: (v: string) => void;
  setNote: (v: string) => void;
  setUndo: (e: Expense | null) => void;
  setShowAll: (v: boolean) => void;
  parseAmount: (v: string) => void;

  addExpense: (category: CategoryId, preset?: Partial<Expense>) => void;
  updateExpense: (
    id: string,
    patch: { amount: number; note?: string; category: CategoryId; date: string }
  ) => void;
  handleDeleteExpense: (id: string) => void;
}

export const useExpenses = create<Store>((setState, getState) => ({
  expenses: [],
  hydrated: false,
  add: (expense) => setState((s) => ({ expenses: [expense, ...s.expenses] })),
  update: (id, patch) =>
    setState((s) => ({
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, ...patch, id: e.id } : e
      ),
    })),
  remove: (id) =>
    setState((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
  hydrate: (items) =>
    setState({
      expenses: items.map((e) => ({ ...e, amount: Number(e.amount) || 0 })),
      hydrated: true,
    }),

  amount: '',
  note: '',
  undo: null,
  showAll: false,
  setAmount: (v) => setState({ amount: v }),
  setNote: (v) => setState({ note: v }),
  setUndo: (e) => setState({ undo: e }),
  setShowAll: (v) => setState({ showAll: v }),
  parseAmount: (value) => {
    const rawNum = parseRawNumber(value);
    setState({ amount: formatIndianNumber(rawNum) });
  },

  addExpense: (category, preset) => {
    const { amount, note } = getState();
    const rawNumber = parseRawNumber(amount);
    const parsed = Number(rawNumber);
    if (!parsed && !preset?.amount) {
      toast.error('Could not add expense', 'Enter an amount first');
      return;
    }
    const online = useSyncStore.getState().online;
    const userId = useAuthStore.getState().userId;
    const now = new Date().toISOString();
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: preset?.amount ?? parsed,
      category,
      note: preset?.note ?? (note.trim() || undefined),
      date: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: online ? 'synced' : 'pending',
    };
    getState().add(expense);
    setState({ amount: '', note: '' });
    getState().setUndo(expense);
    setTimeout(() => getState().setUndo(null), 5000);
    toast.success(
      'Expense added',
      `${money(expense.amount)}${expense.note ? ` · ${expense.note}` : ''}`
    );
    void useSyncStore.getState().sync({ id: userId, local: [expense] });
  },

  updateExpense: (id, patch) => {
    const previous = getState().expenses.find((e) => e.id === id);
    if (!previous) return;

    const online = useSyncStore.getState().online;
    const userId = useAuthStore.getState().userId;
    const allCategories = getAllCategories();

    const now = new Date().toISOString();
    const cleanedNote = patch.note?.trim() || undefined;
    const updated: Partial<Expense> = {
      amount: patch.amount,
      note: cleanedNote,
      category: patch.category,
      date: patch.date,
      updatedAt: now,
      deletedAt: null,
      syncStatus: online ? 'synced' : 'pending',
    };
    getState().update(id, updated);
    const next: Expense = {
      ...previous,
      ...updated,
      id: previous.id,
      note: cleanedNote,
    };

    const categoryLabel =
      allCategories.find((c) => c.id === patch.category)?.label ??
      builtInCategories.find((c) => c.id === patch.category)?.label ??
      'Category';
    const description = [money(patch.amount), categoryLabel, cleanedNote || null]
      .filter(Boolean)
      .join(' · ');

    toast.success('Updated an expense', description, {
      action: {
        label: 'Undo',
        onClick: () => {
          const restored: Expense = {
            ...previous,
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            syncStatus: online ? 'synced' : 'pending',
          };
          getState().update(id, {
            amount: restored.amount,
            note: restored.note,
            category: restored.category,
            date: restored.date,
            updatedAt: restored.updatedAt,
            deletedAt: null,
            syncStatus: restored.syncStatus,
          });
          void useSyncStore
            .getState()
            .sync({ id: userId, local: [restored], deletedIds: [] })
            .then((ok) => {
              if (ok) {
                const prevLabel =
                  allCategories.find((c) => c.id === previous.category)?.label ??
                  builtInCategories.find((c) => c.id === previous.category)?.label ??
                  'Category';
                const prevDescription = [
                  money(previous.amount),
                  prevLabel,
                  previous.note?.trim() || null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                toast.success('Change undone', prevDescription);
              }
            });
        },
      },
    });

    // Include note: null so clearing a note is persisted (JSON drops undefined)
    void useSyncStore
      .getState()
      .sync({
        id: userId,
        local: [{ ...next, note: cleanedNote ?? null } as Expense],
        deletedIds: [],
      });
  },

  handleDeleteExpense: (id) => {
    const { expenses, undo } = getState();
    const target = expenses.find((e) => e.id === id);
    if (!target) return;
    getState().remove(id);
    if (undo?.id === id) getState().setUndo(null);

    const syncStore = useSyncStore.getState();
    const nextDeleted = Array.from(new Set([...syncStore.pendingDeletedIds, id]));
    syncStore.setPendingDeletedIds(nextDeleted);
    const updatedExpenses = expenses.filter((e) => e.id !== id);

    const online = syncStore.online;
    const userId = useAuthStore.getState().userId;
    const allCategories = getAllCategories();

    const categoryLabel =
      allCategories.find((c) => c.id === target.category)?.label ??
      builtInCategories.find((c) => c.id === target.category)?.label ??
      'Category';
    const description = [money(target.amount), categoryLabel, target.note?.trim() || null]
      .filter(Boolean)
      .join(' · ');

    void useSyncStore
      .getState()
      .sync({ id: userId, local: updatedExpenses, deletedIds: nextDeleted })
      .then((ok) => {
        if (!ok) return;
        toast.success('Deleted an expense', description, {
          // Soft-deleted in Mongo — Undo available for ~5s while toast is visible
          action: {
            label: 'Undo',
            onClick: () => {
              const restored: Expense = {
                ...target,
                deletedAt: null,
                updatedAt: new Date().toISOString(),
                syncStatus: online ? 'synced' : 'pending',
              };
              getState().add(restored);
              useSyncStore
                .getState()
                .setPendingDeletedIds((prev) => prev.filter((x) => x !== id));
              void useSyncStore
                .getState()
                .sync({ id: userId, local: [restored], deletedIds: [] })
                .then((restoredOk) => {
                  if (restoredOk) {
                    toast.success('Expense restored', description);
                  }
                });
            },
          },
        });
      });
  },
}));

// ─── Derived selectors (React hooks — mirror the old context's memoized values) ───

export const useMonthSpend = (): number => {
  const expenses = useExpenses((s) => s.expenses);
  const cycleStartDay = useProfileStore((s) => s.cycleStartDay);
  return useMemo(() => {
    const currentKey = getCurrentCycleKey(cycleStartDay);
    return expenses
      .filter((e) => getCycleKey(new Date(e.date), cycleStartDay) === currentKey)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, cycleStartDay]);
};

export const useToday = (): Expense[] => {
  const expenses = useExpenses((s) => s.expenses);
  return useMemo(
    () =>
      expenses.filter(
        (e) => new Date(e.date).toDateString() === new Date().toDateString()
      ),
    [expenses]
  );
};

export const useByCategory = (): (Category & { total: number })[] => {
  const expenses = useExpenses((s) => s.expenses);
  const allCategories = useAllCategories();
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    const result: (Category & { total: number })[] = [];
    for (const c of allCategories) {
      const total = totals.get(c.id) ?? 0;
      if (total) result.push({ ...c, total });
    }
    return result;
  }, [allCategories, expenses]);
};
