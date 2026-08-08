import { create } from 'zustand';
import { Expense } from '@/types/expense';

interface Store {
  expenses: Expense[];
  hydrated: boolean;
  add: (expense: Expense) => void;
  remove: (id: string) => void;
  hydrate: (items: Expense[]) => void;
}

export const useExpenses = create<Store>((setState) => ({
  expenses: [],
  hydrated: false,
  add: (expense) => setState((s) => ({ expenses: [expense, ...s.expenses] })),
  remove: (id) =>
    setState((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
  hydrate: (items) => setState({ expenses: items, hydrated: true }),
}));
