'use client';

import { useExpenses } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { useSyncStore } from '@/lib/sync-store';
import { useThemeStore } from '@/lib/theme-store';
import { Settings } from '@/components/views/Settings';
import { toast } from '@/components/ToastHost';

export default function SettingsPage() {
  const expenses = useExpenses((s) => s.expenses);
  const { userId, logout, changePassword } = useAuthStore();
  const {
    nameDraft,
    setNameDraft,
    saveName,
    incomeDraft,
    setIncomeDraft,
    saveIncome,
    budgetDraft,
    setBudgetDraft,
    saveBudget,
    hideAmounts,
    setHideAmounts,
    cycleStartDay,
    setCycleStartDay,
  } = useProfileStore();
  const { categories: customCategories } = useCategoryStore();
  const sync = useSyncStore((s) => s.sync);
  const { theme, setTheme } = useThemeStore();

  return (
    <Settings
      nameDraft={nameDraft}
      setNameDraft={setNameDraft}
      onSaveName={saveName}
      incomeDraft={incomeDraft}
      setIncomeDraft={setIncomeDraft}
      onSaveIncome={saveIncome}
      budgetDraft={budgetDraft}
      setBudgetDraft={setBudgetDraft}
      onSaveBudget={saveBudget}
      expenses={expenses}
      userId={userId}
      sync={async () => {
        const ok = await sync({ id: userId, local: expenses });
        if (ok) toast.success('Data synced', 'Expenses refreshed from the cloud');
      }}
      onChangeIdentity={logout}
      onLogout={logout}
      onChangePassword={changePassword}
      categories={customCategories}
      theme={theme}
      setTheme={setTheme}
      hideAmounts={hideAmounts}
      setHideAmounts={setHideAmounts}
      cycleStartDay={cycleStartDay}
      setCycleStartDay={setCycleStartDay}
    />
  );
}
