'use client';

import { useApp } from '@/lib/app-context';
import { Dashboard } from '@/components/views/Dashboard';

export default function DashboardPage() {
  const { expenses, income, allCategories } = useApp();

  return (
    <Dashboard expenses={expenses} income={income} categories={allCategories} />
  );
}
