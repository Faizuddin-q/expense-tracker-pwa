'use client';

import { useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import {
  BarChart3,
  Car,
  Check,
  CircleDollarSign,
  Download,
  Film,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Utensils,
  Wifi,
  WifiOff,
} from 'lucide-react';

type CategoryId = string;
type Payment = 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other';
type Expense = {
  id: string;
  amount: number;
  category: CategoryId;
  note?: string;
  paymentMethod?: Payment;
  date: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus: 'pending' | 'synced';
};

type Category = {
  id: CategoryId;
  label: string;
  tone: string;
  Icon: typeof Utensils;
  custom?: boolean;
};
const builtInCategories: Category[] = [
  { id: 'food', label: 'Food', tone: 'mint', Icon: Utensils },
  { id: 'transport', label: 'Transport', tone: 'sky', Icon: Car },
  { id: 'shopping', label: 'Shopping', tone: 'lavender', Icon: ShoppingBag },
  { id: 'bills', label: 'Bills', tone: 'peach', Icon: Receipt },
  { id: 'health', label: 'Health', tone: 'blush', Icon: HeartPulse },
  { id: 'entertainment', label: 'Fun', tone: 'butter', Icon: Film },
  { id: 'other', label: 'Other', tone: 'gray', Icon: Plus },
];
const categoryFor = (id: CategoryId, custom: Category[] = []) =>
  [...builtInCategories, ...custom].find((c) => c.id === id) ??
  builtInCategories.at(-1)!;
const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const normalizePhone = (value: string) =>
  value.replace(/[^\d+]/g, '').replace(/^00/, '+');

interface Store {
  expenses: Expense[];
  hydrated: boolean;
  add: (expense: Expense) => void;
  remove: (id: string) => void;
  hydrate: (items: Expense[]) => void;
}
const useExpenses = create<Store>((setState) => ({
  expenses: [],
  hydrated: false,
  add: (expense) => setState((s) => ({ expenses: [expense, ...s.expenses] })),
  remove: (id) =>
    setState((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
  hydrate: (items) => setState({ expenses: items, hydrated: true }),
}));

export default function Page() {
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

  useEffect(() => {
    get<string>('pocket-user-id').then((saved) => saved && setUserId(saved));
  }, []);
  useEffect(() => {
    if (!userId) return;
    get<Expense[]>(`pocket-expenses-${userId}`).then((saved) =>
      hydrate(saved ?? [])
    );
    get<Category[]>(`pocket-categories-${userId}`).then((saved) =>
      setCustomCategories(saved ?? [])
    );
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

  const sync = async (
    id = userId,
    local = expenses,
    profileIncome = income,
    profileCategories = customCategories
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
          categories: profileCategories.map(({ id, label, tone, custom }) => ({
            id,
            label,
            tone,
            custom,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (Array.isArray(data.expenses))
        hydrate(
          data.expenses.map((e: Expense) => ({
            ...e,
            id: e.localId ?? e.id,
            syncStatus: 'synced',
          }))
        );
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
            Icon: Plus,
            custom: true,
          }))
        );
        await set(`pocket-categories-${id}`, data.profile.categories);
      }
    } catch {
      setError(
        'Cloud sync is unavailable. Your data is still saved on this device.'
      );
    } finally {
      setSyncing(false);
    }
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
  const allCategories = [...builtInCategories, ...customCategories];
  const addCategory = async () => {
    const label = categoryName.trim();
    if (!label || !userId) return;
    const custom: Category = {
      id: `custom-${crypto.randomUUID()}`,
      label,
      tone: 'gray',
      Icon: Plus,
      custom: true,
    };
    const next = [...customCategories, custom];
    setCustomCategories(next);
    await set(
      `pocket-categories-${userId}`,
      next.map(({ id, label, tone, custom }) => ({ id, label, tone, custom }))
    );
    setCategoryName('');
    setCategoryDialog(false);
    sync(userId, expenses, income, next);
  };
  const deleteCategory = async (id: string) => {
    const next = customCategories.filter((c) => c.id !== id);
    setCustomCategories(next);
    await set(
      `pocket-categories-${userId}`,
      next.map(({ id, label, tone, custom }) => ({ id, label, tone, custom }))
    );
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
  const today = expenses.filter(
    (e) => new Date(e.date).toDateString() === new Date().toDateString()
  );
  const byCategory = allCategories
    .map((c) => ({
      ...c,
      total: expenses
        .filter((e) => e.category === c.id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total);
  const addExpense = (category: CategoryId, preset?: Partial<Expense>) => {
    const parsed = Number(amount.replace(/[^0-9.]/g, ''));
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
    const match = value.match(/^\s*([\d,.]+)(?:\s+(.*))?$/);
    if (match) {
      setAmount(match[1].replace(/,/g, ''));
      setNote(match[2] ?? '');
    } else setAmount(value);
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
          name={categoryName}
          setName={setCategoryName}
          onAdd={addCategory}
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
        <div className="mt-auto rounded-2xl bg-accent p-4">
          <Sparkles className="mb-3 size-5 text-primary" />
          <p className="text-sm font-medium">Small steps add up.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your money picture gets clearer with every entry.
          </p>
        </div>
      </aside>
      <main className="pb-24 lg:ml-64 lg:pb-0">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
          <div>
            <p className="text-sm text-muted-foreground">
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }).format(new Date())}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {view === 'home'
                ? 'Good morning, there.'
                : view === 'dashboard'
                  ? 'Your month at a glance'
                  : view === 'expenses'
                    ? 'All expenses'
                    : 'Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground sm:flex">
              {online ? (
                <Wifi className="size-3.5 text-primary" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {syncing ? 'Syncing' : online ? 'Synced' : 'Offline mode'}
            </span>
            <button
              aria-label="Menu"
              className="rounded-xl p-2 hover:bg-muted lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>
        <div className="px-5 sm:px-8 lg:px-12">
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
              remove={remove}
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
              monthSpend={monthSpend}
              byCategory={byCategory}
            />
          )}
          {view === 'expenses' && (
            <Expenses expenses={expenses} remove={remove} />
          )}
          {view === 'settings' && (
            <Settings
              income={income}
              setIncome={setIncome}
              expenses={expenses}
              userId={userId}
              sync={() => sync()}
              onChangeIdentity={() => {
                setUserId('');
                setPhone('');
                hydrate([]);
              }}
            />
          )}
          {error && (
            <p className="mx-auto mt-5 max-w-3xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-card/95 px-3 py-3 backdrop-blur lg:hidden">
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
}

function CategoryDialog({
  name,
  setName,
  onAdd,
  onClose,
}: {
  name: string;
  setName: (v: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-5">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl ring-1 ring-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Add a category</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your own spending group.
            </p>
          </div>
          <button
            aria-label="Close category dialog"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <label className="mt-6 flex flex-col gap-2 text-sm font-medium">
          Category name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              )
                onAdd();
            }}
            placeholder="For example, Pets"
            className="rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <button
          onClick={onAdd}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          Add category <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function IncomeSetup({
  value,
  setValue,
  onSave,
  error,
}: {
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
  error: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border sm:p-10">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <CircleDollarSign className="size-5" />
        </div>
        <div className="mt-10">
          <p className="text-sm font-medium text-primary">One-time setup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            What is your monthly income?
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We&apos;ll use this to make your spending picture useful. You
            won&apos;t be asked again on another device.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-sm font-medium">
            Monthly income
            <div className="flex items-center rounded-xl border border-input bg-background px-4">
              <span className="text-muted-foreground">₹</span>
              <input
                autoFocus
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  )
                    onSave();
                }}
                className="w-full bg-transparent p-3 outline-none"
              />
            </div>
          </label>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button
            onClick={onSave}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Save income <Check className="size-4" />
          </button>
        </div>
      </section>
    </main>
  );
}

function Login({
  phone,
  setPhone,
  onContinue,
  error,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onContinue: () => void;
  error: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border sm:p-10">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <CircleDollarSign className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Pocket</p>
            <p className="text-xs text-muted-foreground">Spend with clarity</p>
          </div>
        </div>
        <div className="mt-12">
          <p className="text-sm font-medium text-primary">
            Your private money space
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            Start with your mobile number.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We use it as your account ID to restore your expenses on another
            device. No OTP is required for this setup.
          </p>
          <label className="mt-8 flex flex-col gap-2 text-sm font-medium">
            Mobile number
            <input
              autoFocus
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                )
                  onContinue();
              }}
              placeholder="+91 98765 43210"
              className="rounded-xl border border-input bg-background px-4 py-3.5 outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button
            onClick={onContinue}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            Continue <Wifi className="size-4" />
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Use the same number on another device to restore your synced
            expenses.
          </p>
        </div>
      </section>
    </main>
  );
}

const navItems = [
  { id: 'home', label: 'Quick add', icon: Plus },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <CircleDollarSign className="size-5" />
      </div>
      <div>
        <p className="font-semibold tracking-tight">Pocket</p>
        <p className="text-xs text-muted-foreground">Spend with clarity</p>
      </div>
    </div>
  );
}
function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  mobile,
}: {
  id: string;
  label: string;
  icon: typeof Plus;
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'} ${mobile ? 'flex-col gap-1 px-4 py-1 text-[11px]' : 'w-full text-left'}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function Home({
  amount,
  note,
  setNote,
  parseAmount,
  addExpense,
  displayed,
  showAll,
  setShowAll,
  remove,
  undo,
  setUndo,
  categories = builtInCategories,
  onAddCategory,
}: any) {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-sm sm:p-9">
            <p className="text-sm opacity-70">Log a new expense</p>
            <input
              aria-label="Amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => parseAmount(e.target.value)}
              placeholder="₹ 0"
              className="mt-5 w-full bg-transparent text-6xl font-semibold tracking-tight outline-none placeholder:text-primary-foreground/35 sm:text-7xl"
            />
            <input
              aria-label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was it for? (optional)"
              className="mt-5 w-full border-b border-primary-foreground/20 bg-transparent pb-3 text-sm outline-none placeholder:text-primary-foreground/55"
            />
            <p className="mt-5 text-xs opacity-60">
              Type “230 lunch” to capture the note too
            </p>
          </div>
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Choose a category</h2>
              <button
                onClick={onAddCategory}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Plus className="size-3.5" /> Add custom
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map(({ id, label, tone, Icon }) => (
                <button
                  key={id}
                  onClick={() => addExpense(id)}
                  className={`category-${tone} flex min-w-20 flex-col items-center gap-2 rounded-2xl px-3 py-3 text-xs font-medium transition hover:-translate-y-0.5`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Quick re-log</h2>
              <span className="text-xs text-muted-foreground">
                Your frequent picks
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                {
                  label: 'Coffee',
                  amount: 150,
                  category: 'food' as CategoryId,
                  Icon: Utensils,
                },
                {
                  label: 'Metro',
                  amount: 180,
                  category: 'transport' as CategoryId,
                  Icon: Car,
                },
                {
                  label: 'Lunch',
                  amount: 420,
                  category: 'food' as CategoryId,
                  Icon: Utensils,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() =>
                    addExpense(item.category, {
                      amount: item.amount,
                      note: item.label,
                    })
                  }
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:border-primary/40"
                >
                  <item.Icon className="size-4 text-primary" />
                  {item.label}
                  <span className="text-muted-foreground">
                    {money(item.amount)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {showAll ? 'All activity' : 'Today'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {money(
                  displayed.reduce((s: number, e: Expense) => s + e.amount, 0)
                )}
              </h2>
            </div>
            <button
              onClick={() => setShowAll(!showAll)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium"
            >
              {showAll ? 'Today only' : 'See all'}
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {displayed.slice(0, 6).map((expense: Expense) => (
              <ExpenseRow key={expense.id} expense={expense} remove={remove} />
            ))}
            {!displayed.length && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Your saved expenses will appear here.
              </div>
            )}
          </div>
          {undo && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-accent px-4 py-3 text-sm">
              <span>Expense added.</span>
              <button
                onClick={() => {
                  remove(undo.id);
                  setUndo(null);
                }}
                className="font-medium text-primary"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ExpenseRow({
  expense,
  remove,
  categories = builtInCategories,
}: {
  expense: Expense;
  remove: (id: string) => void;
  categories?: Category[];
}) {
  const c = categoryFor(
    expense.category,
    categories.filter((item) => item.custom)
  );
  return (
    <div className="group flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 transition hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`category-${c.tone} grid size-10 shrink-0 place-items-center rounded-xl`}
        >
          <c.Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {expense.note || c.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.label} ·{' '}
            {new Date(expense.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold">{money(expense.amount)}</span>
        <button
          aria-label="Delete expense"
          onClick={() => remove(expense.id)}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  expenses,
  income,
  monthSpend,
  byCategory,
}: {
  expenses: Expense[];
  income: number;
  monthSpend: number;
  byCategory: any[];
}) {
  const percent = Math.min(100, Math.round((monthSpend / income) * 100));
  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">August 2026</p>
              <h2 className="mt-2 text-3xl font-semibold">
                You&apos;re doing well.
              </h2>
            </div>
            <div className="rounded-full bg-accent p-3 text-primary">
              <BarChart3 className="size-5" />
            </div>
          </div>
          <div className="mt-10 flex items-center gap-7">
            <div
              className="relative grid size-32 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--primary) ${percent}%, var(--muted) 0)`,
              }}
            >
              <div className="grid size-24 place-items-center rounded-full bg-card">
                <span className="text-2xl font-semibold">{percent}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spent this month</p>
              <p className="mt-1 text-3xl font-semibold">{money(monthSpend)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                of {money(income)} income ·{' '}
                <span className="text-primary">
                  {money(income - monthSpend)} left
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-accent p-6 sm:p-8">
          <Sparkles className="size-5 text-primary" />
          <h3 className="mt-5 text-xl font-semibold">A gentle insight</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {byCategory[0]?.label ?? 'Your first'} is your biggest category this
            month. Small, mindful choices can keep your spending pace
            comfortable.
          </p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            You&apos;re on track for a calm month
          </p>
        </div>
      </div>
      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-border">
        <h3 className="font-semibold">Category breakdown</h3>
        <div className="mt-5 flex flex-col gap-4">
          {byCategory.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <c.Icon className="size-4 text-primary" />
              <span className="w-24 text-sm">{c.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (c.total / Math.max(monthSpend, 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-20 text-right text-sm font-medium">
                {money(c.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Expenses({
  expenses,
  remove,
}: {
  expenses: Expense[];
  remove: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = expenses.filter((e) =>
    `${e.note} ${categoryFor(e.category).label}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <input
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => downloadCsv(filtered)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {filtered.map((e) => (
          <ExpenseRow key={e.id} expense={e} remove={remove} />
        ))}
      </div>
    </section>
  );
}

function Settings({
  income,
  setIncome,
  expenses,
  userId,
  sync,
  onChangeIdentity,
}: {
  income: number;
  setIncome: (n: number) => void;
  expenses: Expense[];
  userId: string;
  sync: () => void;
  onChangeIdentity: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
        <h2 className="text-lg font-semibold">Your money profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your mobile number identifies your private expense space.
        </p>
        <label className="mt-8 flex flex-col gap-2 text-sm font-medium">
          Mobile account ID
          <input
            readOnly
            value={userId}
            className="rounded-xl border border-input bg-muted px-4 py-3"
          />
        </label>
        <div className="mt-3 flex gap-3">
          <button
            onClick={sync}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Sync data
          </button>
          <button
            onClick={onChangeIdentity}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium"
          >
            Change number
          </button>
        </div>
        <label className="mt-8 flex flex-col gap-2 text-sm font-medium">
          Monthly income
          <div className="flex items-center rounded-xl border border-border px-4">
            <span className="text-muted-foreground">₹</span>
            <input
              inputMode="decimal"
              value={income}
              onChange={(e) => {
                const next = Number(e.target.value);
                setIncome(next);
                if (next > 0) {
                  set(`pocket-income-${userId}`, next);
                  sync(userId, expenses, next);
                }
              }}
              className="w-full bg-transparent p-3 outline-none"
            />
          </div>
        </label>
        <div className="mt-8 flex items-center justify-between rounded-2xl bg-accent p-4">
          <div>
            <p className="text-sm font-medium">Offline-first storage</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {expenses.length} expenses stored locally for this account.
            </p>
          </div>
          <Check className="size-5 text-primary" />
        </div>
      </div>
      <button
        onClick={() => downloadCsv(expenses)}
        className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
      >
        <Download className="size-4" /> Export all expenses
      </button>
    </section>
  );
}

function downloadCsv(expenses: Expense[]) {
  const rows = [
    ['Date', 'Category', 'Amount', 'Note', 'Payment'],
    ...expenses.map((e) => [
      new Date(e.date).toISOString(),
      categoryFor(e.category).label,
      String(e.amount),
      e.note ?? '',
      e.paymentMethod ?? '',
    ]),
  ];
  const blob = new Blob(
    [
      rows
        .map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(','))
        .join('\n'),
    ],
    { type: 'text/csv' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pocket-expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
}
