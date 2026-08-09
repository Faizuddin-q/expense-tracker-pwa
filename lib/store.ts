import { create } from 'zustand';
import { Expense } from '@/types/expense';

interface Store {
  expenses: Expense[];
  hydrated: boolean;
  add: (expense: Expense) => void;
  update: (id: string, patch: Partial<Expense>) => void;
  remove: (id: string) => void;
  hydrate: (items: Expense[]) => void;
}

export const useExpenses = create<Store>((setState) => ({
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
  hydrate: (items) => setState({ expenses: items, hydrated: true }),
}));
