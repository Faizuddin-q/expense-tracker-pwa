'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { AppProvider, useApp } from '@/lib/app-context';
import { Brand } from '@/components/Brand';
import { NavButton } from '@/components/NavButton';
import { CategoryDialog } from '@/components/CategoryDialog';
import { IncomeSetup } from '@/components/IncomeSetup';
import { PwaProvider } from '@/components/PwaProvider';
import { navItems } from '@/lib/constants';
import { formatIndianMobileDisplay } from '@/lib/utils';

// ─── Page titles ──────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/': 'Add expense',
  '/dashboard': 'Overview',
  '/summary': 'Summary',
  '/expenses': 'Expenses',
  '/settings': 'Settings',
};

// ─── Inner shell (needs context) ──────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  const {
    userId,
    initializing,
    needsIncome,
    profileHydrated,
    incomeDraft,
    setIncomeDraft,
    budgetDraft,
    setBudgetDraft,
    completeOnboarding,
    skipOnboarding,
    error,
    theme,
    setTheme,
    online,
    syncing,
    categoryDialog,
    setCategoryDialog,
    allCategories,
    categoryName,
    setCategoryName,
    selectedTone,
    setSelectedTone,
    selectedIconName,
    setSelectedIconName,
    addCategory,
    updateCategoryColor,
    updateCategoryIcon,
    deleteCategory,
    renameCategory,
    logout,
    screenObscured,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Pocket';

  // Auth guard
  useEffect(() => {
    if (!initializing && !userId) {
      router.replace('/login');
    }
  }, [initializing, userId, router]);

  if (initializing || (userId && !profileHydrated)) {
    return <div className="min-h-screen bg-background" />;
  }

  if (userId && needsIncome) {
    return (
      <IncomeSetup
        income={incomeDraft}
        setIncome={setIncomeDraft}
        budget={budgetDraft}
        setBudget={setBudgetDraft}
        onContinue={() => void completeOnboarding()}
        onSkip={() => void skipOnboarding()}
        error={error}
      />
    );
  }

  if (categoryDialog) {
    return (
      <CategoryDialog
        categories={allCategories}
        name={categoryName}
        setName={setCategoryName}
        selectedTone={selectedTone}
        setSelectedTone={setSelectedTone}
        selectedIconName={selectedIconName}
        setSelectedIconName={setSelectedIconName}
        onAdd={addCategory}
        onUpdateCategoryColor={updateCategoryColor}
        onUpdateCategoryIcon={updateCategoryIcon}
        onRenameCategory={renameCategory}
        onDeleteCategory={deleteCategory}
        onClose={() => setCategoryDialog(false)}
      />
    );
  }

  if (!userId) return null;

  const syncLabel = syncing ? 'Syncing' : online ? 'Synced' : 'Offline';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {screenObscured && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-background">
          <div className="text-center">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Pocket
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Amounts hidden
            </p>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-12 items-center border-b border-border px-4">
          <Brand />
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {navItems.map((item) => (
            <NavButton key={item.id} {...item} />
          ))}
        </nav>

        <div className="mt-auto border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                online ? 'bg-positive' : 'bg-faint'
              }`}
            />
            <span className="text-[11px] font-medium text-muted-foreground">
              {syncLabel}
            </span>
          </div>
          <p className="font-mono-numbers mt-1.5 text-[11px] text-faint">
            {formatIndianMobileDisplay(userId)}
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:ml-56 lg:pb-10">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-1">
            <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex lg:hidden">
              <span
                className={`size-1.5 rounded-full ${online ? 'bg-positive' : 'bg-faint'}`}
              />
              {syncLabel}
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" strokeWidth={1.9} />
              ) : (
                <Moon className="size-4" strokeWidth={1.9} />
              )}
            </button>
            <button
              onClick={() => void logout()}
              title="Log out"
              aria-label="Log out"
              className="hidden size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive lg:grid"
            >
              <LogOut className="size-4" strokeWidth={1.9} />
            </button>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          {children}
          {error && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="mx-auto flex h-14 max-w-md items-stretch rounded-xl border border-border bg-card/95 px-1 shadow-lg shadow-black/5 backdrop-blur-xl dark:shadow-black/30">
          {navItems.map((item) => (
            <NavButton key={item.id} {...item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}

// ─── Layout export ────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <PwaProvider>
        <AppShell>{children}</AppShell>
      </PwaProvider>
    </AppProvider>
  );
}
