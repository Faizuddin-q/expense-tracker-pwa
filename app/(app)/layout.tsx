'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileStore } from '@/lib/profile-store';
import { useSyncStore } from '@/lib/sync-store';
import { useCategoryStore, useAllCategories } from '@/lib/category-store';
import { useThemeStore } from '@/lib/theme-store';
import { Brand } from '@/components/Brand';
import { NavButton } from '@/components/NavButton';
import { CategoryDialog } from '@/components/CategoryDialog';
import { IncomeSetup } from '@/components/IncomeSetup';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { AppSkeleton } from '@/components/AppSkeleton';
import { PwaProvider } from '@/components/PwaProvider';
import { navItems, mobileNavItems, moreNavItem, secondaryNavItems } from '@/lib/constants';
import { formatIndianMobileDisplay } from '@/lib/utils';

// ─── Page titles ──────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/': 'Add expense',
  '/dashboard': 'Overview',
  '/summary': 'Summary',
  '/expenses': 'Expenses',
  '/chapters': 'Chapters',
  '/settings': 'Settings',
  '/more': 'More',
};

// ─── Inner shell (needs context) ──────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  const { userId, initializing, error, logout } = useAuthStore();
  const { needsIncome, incomeDraft, setIncomeDraft, budgetDraft, setBudgetDraft, completeOnboarding, skipOnboarding } =
    useProfileStore();
  const { profileHydrated, syncing } = useSyncStore();
  const {
    categoryDialog,
    setCategoryDialog,
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
  } = useCategoryStore();
  const allCategories = useAllCategories();
  const { theme, setTheme, screenObscured } = useThemeStore();

  const router = useRouter();
  const pathname = usePathname();
  const isMoreSectionActive =
    pathname === moreNavItem.href ||
    secondaryNavItems.some((item) => item.href === pathname);
  // The section (Summary / Chapters / Settings) this page lives under, whether it's the
  // section's own top-level page or a nested sub-page (e.g. /chapters/[id]).
  const moreSection = secondaryNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const isNestedMorePage = Boolean(moreSection);
  const pageTitle = PAGE_TITLES[pathname] ?? moreSection?.label ?? 'Pockett';

  // Auth guard
  useEffect(() => {
    if (!initializing && !userId) {
      router.replace('/login');
    }
  }, [initializing, userId, router]);

  if (userId && !profileHydrated) {
    return pathname === '/' ? (
      <HomeSkeleton title={pageTitle} />
    ) : (
      <AppSkeleton title={pageTitle} pathname={pathname} />
    );
  }

  if (initializing) {
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

  const syncLabel = syncing ? 'Syncing' : 'Synced';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {screenObscured && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-background">
          <div className="text-center">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Pockett
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
            <span className="size-1.5 shrink-0 rounded-full bg-positive" />
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
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 relative after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-border/60 after:to-transparent">
          <div className="flex min-w-0 items-center gap-1">
            {isNestedMorePage ? (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={`Back to ${pageTitle}`}
                className="press -ml-1.5 flex min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-[14px] font-semibold tracking-tight text-foreground transition-colors hover:bg-secondary lg:hidden"
              >
                <ArrowLeft className="size-4 shrink-0" strokeWidth={1.9} />
                <span className="truncate">{pageTitle}</span>
              </button>
            ) : (
              <h1 className="truncate text-[14px] font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h1>
            )}
            {isNestedMorePage && (
              <h1 className="hidden truncate text-[14px] font-semibold tracking-tight text-foreground lg:block">
                {pageTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex lg:hidden">
              <span className="size-1.5 rounded-full bg-positive" />
              {syncLabel}
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="press grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
              className="press hidden size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive lg:grid"
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
          {mobileNavItems.map((item) => (
            <NavButton key={item.id} {...item} mobile />
          ))}
          <NavButton {...moreNavItem} mobile forceActive={isMoreSectionActive} />
        </div>
      </nav>
    </div>
  );
}

// ─── Layout export ────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PwaProvider>
      <AppShell>{children}</AppShell>
    </PwaProvider>
  );
}
