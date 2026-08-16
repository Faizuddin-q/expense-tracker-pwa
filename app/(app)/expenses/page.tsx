'use client';

import { useExpenses } from '@/lib/store';
import { useAllCategories } from '@/lib/category-store';
import { Expenses } from '@/components/views/Expenses';

export default function ExpensesPage() {
  const { expenses, handleDeleteExpense, updateExpense } = useExpenses();
  const allCategories = useAllCategories();

  return (
    <Expenses
      expenses={expenses}
      remove={handleDeleteExpense}
      updateExpense={updateExpense}
      categories={allCategories}
    />
  );
}
