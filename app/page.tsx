'use client';

import { useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';
import {
  Check,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories, navItems } from '@/lib/constants';
import {
  formatIndianNumber,
  getCategoryIcon,
  normalizePhone,
  parseRawNumber,
} from '@/lib/utils';
import { useExpenses } from '@/lib/store';
import { Brand } from '@/components/Brand';
import { NavButton } from '@/components/NavButton';
import { Login } from '@/components/Login';
import { IncomeSetup } from '@/components/IncomeSetup';
import { CategoryDialog } from '@/components/CategoryDialog';
import { Home } from '@/components/views/Home';
import { Dashboard } from '@/components/views/Dashboard';
import { Expenses } from '@/components/views/Expenses';
import { Settings } from '@/components/views/Settings';

const Page = () => {
  const { expenses, add, remove, hydrated, hydrate } = useExpenses();
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [view, setView] = useState<
    'home' | 'dashboard' | 'expenses' | 'settings'
  >('home');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [online, setOnline] = useState(true);
  const [undo, setUndo] = useState<Expense | null>(null);
  const [income, setIncome] = useState(60000);
  const [incomeDraft, setIncomeDraft] = useState('60000');
  const [needsIncome, setNeedsIncome] = useState(false);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('pocket-theme') as
      'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('pocket-theme', theme);
  }, [theme]);

  useEffect(() => {
    get<string>('pocket-user-id').then((saved) => saved && setUserId(saved));
  }, []);

  useEffect(() => {
    if (!userId) return;
    get<Expense[]>(`pocket-expenses-${userId}`).then((saved) =>
      hydrate(saved ?? [])
    );
    get<Category[]>(`pocket-categories-${userId}`).then((saved) => {
      if (Array.isArray(saved)) {
        setCustomCategories(
          saved.map((c) => ({
            ...c,
            Icon: getCategoryIcon(c),
            custom: true,
          }))
        );
      }
    });
    get<number>(`pocket-income-${userId}`).then((saved) => {
      if (typeof saved === 'number' && saved > 0) {
        setIncome(saved);
        setIncomeDraft(String(saved));
        setNeedsIncome(false);
      } else setNeedsIncome(true);
    });
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, [userId, hydrate]);

  useEffect(() => {
    if (hydrated && userId) set(`pocket-expenses-${userId}`, expenses);
  }, [expenses, hydrated, userId]);

  const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);

  const sync = async (
    id = userId,
    local = expenses,
    profileIncome = income,
    profileCategories = customCategories,
    deletedIds = pendingDeletedIds
  ) => {
    if (!id) return;
    setSyncing(true);
    setError('');
    try {
      const response = await fetch('/api/expenses/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          expenses: local,
          monthlyIncome: profileIncome,
          categories: profileCategories.map(
            ({ id, label, tone, iconName, custom }) => ({
              id,
              label,
              tone,
              iconName,
              custom,
            })
          ),
          deletedIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (deletedIds.length > 0) {
        setPendingDeletedIds((prev) =>
          prev.filter((item) => !deletedIds.includes(item))
        );
      }

      if (Array.isArray(data.expenses)) {
        const activeExpenses = data.expenses
          .map((e: Expense) => ({
            ...e,
            id: e.localId ?? e.id,
            syncStatus: 'synced' as const,
          }))
          .filter((e: Expense) => !deletedIds.includes(e.id));
        hydrate(activeExpenses);
      }
      if (data.profile?.monthlyIncome > 0) {
        setIncome(data.profile.monthlyIncome);
        setIncomeDraft(String(data.profile.monthlyIncome));
        await set(`pocket-income-${id}`, data.profile.monthlyIncome);
        setNeedsIncome(false);
      } else if (data.profile === null) setNeedsIncome(true);
      if (Array.isArray(data.profile?.categories)) {
        setCustomCategories(
          data.profile.categories.map((c: Category) => ({
            ...c,
            Icon: getCategoryIcon(c),
            custom: true,
          }))
        );
        await set(`pocket-categories-${id}`, data.profile.categories);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Cloud sync is unavailable. Your data is still saved on this device.';
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    remove(id);
    if (undo?.id === id) setUndo(null);
    const nextDeleted = Array.from(new Set([...pendingDeletedIds, id]));
    setPendingDeletedIds(nextDeleted);
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    sync(userId, updatedExpenses, income, customCategories, nextDeleted);
  };

  const continueWithPhone = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      setError('Enter a valid mobile number.');
      return;
    }
    setError('');
    setUserId(normalized);
    await set('pocket-user-id', normalized);
    const saved = await get<Expense[]>(`pocket-expenses-${normalized}`);
    const savedIncome = await get<number>(`pocket-income-${normalized}`);
    hydrate(saved ?? []);
    if (typeof savedIncome === 'number' && savedIncome > 0) {
      setIncome(savedIncome);
      setIncomeDraft(String(savedIncome));
      setNeedsIncome(false);
      sync(normalized, saved, savedIncome);
    } else {
      setNeedsIncome(false);
      sync(normalized, saved, 0);
    }
  };

  const [selectedTone, setSelectedTone] = useState('mint');
  const [selectedIconName, setSelectedIconName] = useState('plus');
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!userId) return;
    get<Record<string, string>>(`pocket-cat-overrides-${userId}`).then(
      (saved) => setCategoryOverrides(saved ?? {})
    );
  }, [userId]);

  const allCategories = useMemo(
    () =>
      [...builtInCategories, ...customCategories].map((c) => ({
        ...c,
        tone: categoryOverrides[c.id] ?? c.tone,
      })),
    [customCategories, categoryOverrides]
  );

  const updateCategoryColor = async (id: string, newTone: string) => {
    const nextOverrides = { ...categoryOverrides, [id]: newTone };
    setCategoryOverrides(nextOverrides);
    if (userId) {
      await set(`pocket-cat-overrides-${userId}`, nextOverrides);
    }
  };

  const deleteCategory = async (id: string) => {
    const next = customCategories.filter((c) => c.id !== id);
    setCustomCategories(next);
    await set(
      `pocket-categories-${userId}`,
      next.map(({ id, label, tone, iconName, custom }) => ({
        id,
        label,
        tone,
        iconName,
        custom,
      }))
    );
    sync(userId, expenses, income, next);
  };

  const addCategory = async () => {
    const label = categoryName.trim();
    if (!label || !userId) return;
    const custom: Category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      tone: selectedTone,
      iconName: selectedIconName,
      Icon: getCategoryIcon({ iconName: selectedIconName }),
      custom: true,
    };
    const next = [...customCategories, custom];
    setCustomCategories(next);
    await set(
      `pocket-categories-${userId}`,
      next.map(({ id, label, tone, iconName, custom }) => ({
        id,
        label,
        tone,
        iconName,
        custom,
      }))
    );
    setCategoryName('');
    setCategoryDialog(false);
    sync(userId, expenses, income, next);
  };

  const saveIncome = async () => {
    const parsed = Number(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a monthly income greater than zero.');
      return;
    }
    setIncome(parsed);
    await set(`pocket-income-${userId}`, parsed);
    setNeedsIncome(false);
    sync(userId, expenses, parsed);
  };

  const monthSpend = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.date).getMonth() === new Date().getMonth())
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const today = useMemo(
    () =>
      expenses.filter(
        (e) => new Date(e.date).toDateString() === new Date().toDateString()
      ),
    [expenses]
  );

  const byCategory = useMemo(
    () =>
      allCategories
        .map((c) => ({
          ...c,
          total: expenses
            .filter((e) => e.category === c.id)
            .reduce((s, e) => s + e.amount, 0),
        }))
        .filter((c) => c.total),
    [allCategories, expenses]
  );

  const addExpense = (category: CategoryId, preset?: Partial<Expense>) => {
    const rawNumber = parseRawNumber(amount);
    const parsed = Number(rawNumber);
    if (!parsed && !preset?.amount) return;
    const now = new Date().toISOString();
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: preset?.amount ?? parsed,
      category,
      note: preset?.note ?? (note.trim() || undefined),
      date: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: online ? 'synced' : 'pending',
    };
    add(expense);
    setAmount('');
    setNote('');
    setUndo(expense);
    setTimeout(() => setUndo(null), 5000);
    setTimeout(() => sync(userId, [expense]), 0);
  };

  const parseAmount = (value: string) => {
    const rawNum = parseRawNumber(value);
    const formatted = formatIndianNumber(rawNum);
    setAmount(formatted);
  };

  if (!userId)
    return (
      <Login
        phone={phone}
        setPhone={setPhone}
        onContinue={continueWithPhone}
        error={error}
      />
    );

  if (needsIncome)
    return (
      <IncomeSetup
        value={incomeDraft}
        setValue={setIncomeDraft}
        onSave={saveIncome}
        error={error}
      />
    );

  if (categoryDialog)
    return (
      <>
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
          onDeleteCategory={deleteCategory}
          onClose={() => setCategoryDialog(false)}
        />
        <div className="hidden" />
      </>
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card px-5 py-7 lg:flex">
        <Brand />
        <nav className="mt-14 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              {...item}
              active={view === item.id}
              onClick={() => setView(item.id as typeof view)}
            />
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
      <main className="pb-28 sm:pb-24 lg:ml-64 lg:pb-8">
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
              {view === 'home'
                ? 'Good morning, there.'
                : view === 'dashboard'
                  ? 'Your month at a glance'
                  : view === 'expenses'
                    ? 'All expenses'
                    : 'Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted active:scale-95 sm:px-3.5"
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

            <span className="hidden items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs sm:flex">
              {online ? (
                <Wifi className="size-3.5 text-primary" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {syncing ? 'Syncing' : online ? 'Synced' : 'Offline mode'}
            </span>
          </div>
        </header>
        <div className="px-4 sm:px-8 lg:px-12">
          {view === 'home' && (
            <Home
              amount={amount}
              note={note}
              setNote={setNote}
              parseAmount={parseAmount}
              addExpense={addExpense}
              displayed={showAll ? expenses : today}
              showAll={showAll}
              setShowAll={setShowAll}
              remove={handleDeleteExpense}
              undo={undo}
              setUndo={setUndo}
              categories={allCategories}
              onAddCategory={() => setCategoryDialog(true)}
            />
          )}
          {view === 'dashboard' && (
            <Dashboard
              expenses={expenses}
              income={income}
              categories={allCategories}
            />
          )}
          {view === 'expenses' && (
            <Expenses
              expenses={expenses}
              remove={handleDeleteExpense}
              categories={allCategories}
            />
          )}
          {view === 'settings' && (
            <Settings
              income={income}
              setIncome={setIncome}
              expenses={expenses}
              userId={userId}
              sync={(profileIncome?: number) =>
                sync(userId, expenses, profileIncome ?? income)
              }
              onChangeIdentity={() => {
                setUserId('');
                setPhone('');
                hydrate([]);
              }}
              categories={customCategories}
              theme={theme}
              setTheme={setTheme}
            />
          )}
          {error && (
            <p className="mx-auto mt-5 max-w-3xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>
      <nav className="fixed bottom-3 inset-x-4 z-50 mx-auto flex max-w-md justify-around rounded-2xl border border-border/80 bg-card/90 px-2 py-1.5 shadow-xl backdrop-blur-md lg:hidden">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            active={view === item.id}
            onClick={() => setView(item.id as typeof view)}
            mobile
          />
        ))}
      </nav>
    </div>
  );
};

export default Page;
