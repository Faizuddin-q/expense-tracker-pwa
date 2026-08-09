'use client';

import { useApp } from '@/lib/app-context';
import { Settings } from '@/components/views/Settings';

export default function SettingsPage() {
  const {
    income,
    setIncome,
    budget,
    setBudget,
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
      budget={budget}
      setBudget={setBudget}
      expenses={expenses}
      userId={userId}
      sync={(profileIncome?: number, profileBudget?: number) =>
        sync(
          userId,
          expenses,
          profileIncome ?? income,
          customCategories,
          undefined,
          profileBudget ?? budget
        )
      }
      onChangeIdentity={logout}
      onLogout={logout}
      categories={customCategories}
      theme={theme}
      setTheme={setTheme}
    />
  );
}
