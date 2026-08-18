'use client';

import { useExpenses } from '@/lib/store';
import { useProfileStore } from '@/lib/profile-store';
import { useAllCategories } from '@/lib/category-store';
import { MonthlySummary } from '@/components/views/MonthlySummary';

export default function SummaryPage() {
  const expenses = useExpenses((s) => s.expenses);
  const { income, budget, cycleStartDay } = useProfileStore();
  const allCategories = useAllCategories();

  return (
    <MonthlySummary
      expenses={expenses}
      income={income}
      budget={budget}
      categories={allCategories}
      cycleStartDay={cycleStartDay}
    />
  );
}
