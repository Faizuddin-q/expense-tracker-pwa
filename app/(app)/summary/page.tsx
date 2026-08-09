'use client';

import { useApp } from '@/lib/app-context';
import { MonthlySummary } from '@/components/views/MonthlySummary';

export default function SummaryPage() {
  const { expenses, income, budget, allCategories } = useApp();

  return (
    <MonthlySummary
      expenses={expenses}
      income={income}
      budget={budget}
      categories={allCategories}
    />
  );
}
