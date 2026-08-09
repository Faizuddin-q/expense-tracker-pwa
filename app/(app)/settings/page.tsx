'use client';

import { useApp } from '@/lib/app-context';
import { Settings } from '@/components/views/Settings';
import { toast } from '@/components/ToastHost';

export default function SettingsPage() {
  const {
    incomeDraft,
    setIncomeDraft,
    saveIncome,
    budgetDraft,
    setBudgetDraft,
    saveBudget,
    expenses,
    userId,
    sync,
    logout,
    customCategories,
    categoryOverrides,
    categoryIconOverrides,
    theme,
    setTheme,
    hideAmounts,
    setHideAmounts,
  } = useApp();

  return (
    <Settings
      incomeDraft={incomeDraft}
      setIncomeDraft={setIncomeDraft}
      onSaveIncome={saveIncome}
      budgetDraft={budgetDraft}
      setBudgetDraft={setBudgetDraft}
      onSaveBudget={saveBudget}
      expenses={expenses}
      userId={userId}
      sync={async () => {
        const ok = await sync(
          userId,
          expenses,
          null,
          customCategories.length > 0 ? customCategories : null,
          undefined,
          null,
          null,
          categoryOverrides,
          categoryIconOverrides
        );
        if (ok)
          toast.success(
            'Data synced',
            'Expenses, categories, colors, and icons pushed to your account'
          );
      }}
      onChangeIdentity={logout}
      onLogout={logout}
      categories={customCategories}
      theme={theme}
      setTheme={setTheme}
      hideAmounts={hideAmounts}
      setHideAmounts={setHideAmounts}
    />
  );
}
