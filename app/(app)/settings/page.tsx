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
        const ok = await sync(userId, expenses, null, null, undefined, null);
        if (ok) toast.success('Data synced', 'Latest expenses and profile pulled');
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
