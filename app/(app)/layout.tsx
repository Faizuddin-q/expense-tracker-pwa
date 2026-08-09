'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Moon, Sparkles, Sun, Wifi, WifiOff } from 'lucide-react';
import { AppProvider, useApp } from '@/lib/app-context';
import { Brand } from '@/components/Brand';
import { NavButton } from '@/components/NavButton';
import { CategoryDialog } from '@/components/CategoryDialog';
import { IncomeSetup } from '@/components/IncomeSetup';
import { navItems } from '@/lib/constants';

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/': 'Good morning, there.',
  '/dashboard': 'Your month at a glance',
  '/summary': 'Month by month',
  '/expenses': 'All expenses',
  '/settings': 'Settings',
};

// ─── Inner shell (needs context) ──────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  const {
    userId,
    initializing,
    needsIncome,
    incomeDraft,
    setIncomeDraft,
    saveIncome,
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

  // Blank screen while loading
  if (initializing) {
    return <div className="min-h-screen bg-background" />;
  }

  // Income setup screen
  if (userId && needsIncome) {
    return (
      <IncomeSetup
        value={incomeDraft}
        setValue={setIncomeDraft}
        onSave={async () => {
          await saveIncome();
        }}
        error={error}
      />
    );
  }

  // Category dialog overlay
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {screenObscured && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-background">
          <div className="text-center">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              Pocket
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Amounts hidden</p>
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card px-5 py-7 lg:flex">
        <Brand />
        <nav className="mt-14 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavButton key={item.id} {...item} />
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-accent/70 p-4.5 ring-1 ring-border/50">
          <Sparkles className="mb-2.5 size-5 text-primary" />
          <p className="text-sm font-semibold">Small steps add up.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your money picture gets clearer with every entry.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-24 lg:ml-64 lg:pb-8">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-12 lg:py-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }).format(new Date())}
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted active:scale-95 sm:px-3.5"
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-primary" />
              )}
              <span className="hidden sm:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>
            <span className="hidden items-center gap-2 rounded-lg border border-border/80 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs sm:flex">
              {online ? (
                <Wifi className="size-3.5 text-primary" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {syncing ? 'Syncing' : online ? 'Synced' : 'Offline mode'}
            </span>
            <button
              onClick={() => void logout()}
              title="Log out"
              className="hidden cursor-pointer items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted hover:text-destructive active:scale-95 lg:flex lg:px-3.5"
            >
              <LogOut className="size-3.5" />
              Log out
            </button>
          </div>
        </header>

        <div className="px-4 sm:px-8 lg:px-12">
          {children}
          {error && (
            <p className="mx-auto mt-5 max-w-3xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* Mobile floating tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="mx-auto flex h-14 max-w-md items-stretch rounded-2xl border border-border/70 bg-card/90 px-1 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-xl dark:shadow-black/40 dark:ring-white/5">
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
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
