'use client';

import { useApp } from '@/lib/app-context';
import { Expenses } from '@/components/views/Expenses';

export default function ExpensesPage() {
  const { expenses, handleDeleteExpense, allCategories } = useApp();

  return (
    <Expenses
      expenses={expenses}
      remove={handleDeleteExpense}
      categories={allCategories}
    />
  );
}
