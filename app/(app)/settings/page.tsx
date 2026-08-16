'use client';

import { useExpenses } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useCategoryStore } from '@/lib/category-store';
import { useSyncStore } from '@/lib/sync-store';
import { useThemeStore } from '@/lib/theme-store';
// Deprecated for now — double-tap / Back Tap shortcut
// import { usePwa } from '@/components/PwaProvider';
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
  } = useProfileStore();
  const { customCategories, categoryOverrides, categoryIconOverrides } =
    useCategoryStore();
  const sync = useSyncStore((s) => s.sync);
  const { theme, setTheme } = useThemeStore();
  // Deprecated for now — double-tap / Back Tap shortcut
  // const { backTapEnabled, setBackTapEnabled, openBackTapGuide } = usePwa();

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
      onChangePassword={changePassword}
      categories={customCategories}
      theme={theme}
      setTheme={setTheme}
      hideAmounts={hideAmounts}
      setHideAmounts={setHideAmounts}
      // Deprecated for now — double-tap / Back Tap shortcut
      // backTapEnabled={backTapEnabled}
      // setBackTapEnabled={(on) => void setBackTapEnabled(on)}
      // onOpenBackTapGuide={openBackTapGuide}
    />
  );
}
