'use client';

import { useApp } from '@/lib/app-context';
import { Settings } from '@/components/views/Settings';

export default function SettingsPage() {
  const {
    income,
    setIncome,
    expenses,
    userId,
    sync,
    logout,
    customCategories,
    theme,
    setTheme,
  } = useApp();

  return (
    <Settings
      income={income}
      setIncome={setIncome}
      expenses={expenses}
      userId={userId}
      sync={(profileIncome?: number) =>
        sync(userId, expenses, profileIncome ?? income)
      }
      onChangeIdentity={logout}
      categories={customCategories}
      theme={theme}
      setTheme={setTheme}
    />
  );
}
