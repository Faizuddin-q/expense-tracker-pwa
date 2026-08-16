'use client';

import { useExpenses } from '@/lib/store';
import { useProfileStore } from '@/lib/profile-store';
import { useAllCategories } from '@/lib/category-store';
import { Dashboard } from '@/components/views/Dashboard';

export default function DashboardPage() {
  const expenses = useExpenses((s) => s.expenses);
  const { income, budget } = useProfileStore();
  const allCategories = useAllCategories();

  return (
    <Dashboard
      expenses={expenses}
      income={income}
      budget={budget}
      categories={allCategories}
    />
  );
}
