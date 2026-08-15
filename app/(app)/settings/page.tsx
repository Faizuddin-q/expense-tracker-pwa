'use client';

import { useApp } from '@/lib/app-context';
// Deprecated for now — double-tap / Back Tap shortcut
// import { usePwa } from '@/components/PwaProvider';
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
    changePassword,
    customCategories,
    categoryOverrides,
    categoryIconOverrides,
    theme,
    setTheme,
    hideAmounts,
    setHideAmounts,
  } = useApp();
  // Deprecated for now — double-tap / Back Tap shortcut
  // const { backTapEnabled, setBackTapEnabled, openBackTapGuide } = usePwa();

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
