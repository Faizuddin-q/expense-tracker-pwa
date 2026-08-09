'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { get, set } from 'idb-keyval';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import {
  getCategoryIcon,
  normalizePhone,
  parseRawNumber,
  formatIndianNumber,
} from '@/lib/utils';
import { useExpenses } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppContextValue {
  // Auth
  userId: string;
  phone: string;
  setPhone: (v: string) => void;
  initializing: boolean;
  needsIncome: boolean;
  continueWithPhone: () => Promise<void>;

  // Expenses
  expenses: Expense[];
  add: (expense: Expense) => void;
  handleDeleteExpense: (id: string) => void;
  addExpense: (category: CategoryId, preset?: Partial<Expense>) => void;
  amount: string;
  setAmount: (v: string) => void;
  parseAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  undo: Expense | null;
  setUndo: (e: Expense | null) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;

  // Income
  income: number;
  setIncome: (v: number) => void;
  incomeDraft: string;
  setIncomeDraft: (v: string) => void;
  saveIncome: () => Promise<void>;

  // Monthly spend budget (analytics only — does not cap logging)
  budget: number;
  setBudget: (v: number) => void;
  budgetDraft: string;
  setBudgetDraft: (v: string) => void;
  saveBudget: () => Promise<void>;

  // Categories
  allCategories: Category[];
  customCategories: Category[];
  categoryDialog: boolean;
  setCategoryDialog: (v: boolean) => void;
  categoryName: string;
  setCategoryName: (v: string) => void;
  selectedTone: string;
  setSelectedTone: (v: string) => void;
  selectedIconName: string;
  setSelectedIconName: (v: string) => void;
  addCategory: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateCategoryColor: (id: string, tone: string) => Promise<void>;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;

  // Sync / network
  online: boolean;
  syncing: boolean;
  error: string;
  sync: (
    id?: string,
    local?: Expense[],
    profileIncome?: number,
    profileCategories?: Category[],
    deletedIds?: string[],
    profileBudget?: number
  ) => Promise<void>;

  // Derived
  monthSpend: number;
  byCategory: (Category & { total: number })[];
  today: Expense[];

  // Identity reset
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const { expenses, add, remove, hydrated, hydrate } = useExpenses();

  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [needsIncome, setNeedsIncome] = useState(false);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<Expense | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [income, setIncome] = useState(60000);
  const [incomeDraft, setIncomeDraft] = useState('60000');
  const [budget, setBudget] = useState(0);
  const [budgetDraft, setBudgetDraft] = useState('');

  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [selectedTone, setSelectedTone] = useState('mint');
  const [selectedIconName, setSelectedIconName] = useState('plus');
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string>
  >({});

  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);
  const initialSyncDoneFor = useRef<string | null>(null);

  // ── Theme ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('pocket-theme') as
      'dark' | 'light' | null;
    setThemeState(saved === 'light' ? 'light' : 'dark');
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

  const setTheme = (t: 'dark' | 'light') => setThemeState(t);

  // ── Init from IndexedDB ───────────────────────────────────────────────────

  useEffect(() => {
    get<string>('pocket-user-id').then((saved) => {
      if (saved) setUserId(saved);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    get<Expense[]>(`pocket-expenses-${userId}`).then((saved) =>
      hydrate(saved ?? [])
    );
    get<Category[]>(`pocket-categories-${userId}`).then((saved) => {
      if (Array.isArray(saved)) {
        setCustomCategories(
          saved.map((c) => ({ ...c, Icon: getCategoryIcon(c), custom: true }))
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
    get<number>(`pocket-budget-${userId}`).then((saved) => {
      if (typeof saved === 'number' && saved > 0) {
        setBudget(saved);
        setBudgetDraft(String(saved));
      }
    });
    get<Record<string, string>>(`pocket-cat-overrides-${userId}`).then(
      (saved) => setCategoryOverrides(saved ?? {})
    );
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

  // ── Sync ─────────────────────────────────────────────────────────────────

  const sync = useCallback(
    async (
      id = userId,
      local = expenses,
      profileIncome = income,
      profileCategories = customCategories,
      deletedIds = pendingDeletedIds,
      profileBudget = budget
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
            monthlyBudget: profileBudget,
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
        if (
          typeof data.profile?.monthlyBudget === 'number' &&
          data.profile.monthlyBudget > 0
        ) {
          setBudget(data.profile.monthlyBudget);
          setBudgetDraft(String(data.profile.monthlyBudget));
          await set(`pocket-budget-${id}`, data.profile.monthlyBudget);
        }
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
    },
    [
      userId,
      expenses,
      income,
      budget,
      customCategories,
      pendingDeletedIds,
      hydrate,
    ]
  );

  // Pull/push cloud data when a saved session finishes loading locally.
  // Without this, returning visits only show IndexedDB and never merge.
  useEffect(() => {
    if (!userId || !hydrated || !online) return;
    if (initialSyncDoneFor.current === userId) return;
    initialSyncDoneFor.current = userId;
    void sync(userId);
  }, [userId, hydrated, online, sync]);

  // ── Auth ──────────────────────────────────────────────────────────────────

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
    const savedBudget = await get<number>(`pocket-budget-${normalized}`);
    hydrate(saved ?? []);
    if (typeof savedBudget === 'number' && savedBudget > 0) {
      setBudget(savedBudget);
      setBudgetDraft(String(savedBudget));
    }
    if (typeof savedIncome === 'number' && savedIncome > 0) {
      setIncome(savedIncome);
      setIncomeDraft(String(savedIncome));
      setNeedsIncome(false);
      sync(
        normalized,
        saved,
        savedIncome,
        undefined,
        undefined,
        typeof savedBudget === 'number' && savedBudget > 0 ? savedBudget : 0
      );
    } else {
      setNeedsIncome(false);
      sync(
        normalized,
        saved,
        0,
        undefined,
        undefined,
        typeof savedBudget === 'number' && savedBudget > 0 ? savedBudget : 0
      );
    }
  };

  const logout = () => {
    initialSyncDoneFor.current = null;
    setUserId('');
    setPhone('');
    hydrate([]);
  };

  // ── Income ────────────────────────────────────────────────────────────────

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

  const saveBudget = async () => {
    const parsed = Number(budgetDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a monthly budget greater than zero.');
      return;
    }
    setBudget(parsed);
    await set(`pocket-budget-${userId}`, parsed);
    sync(
      userId,
      expenses,
      income,
      customCategories,
      pendingDeletedIds,
      parsed
    );
  };

  // ── Categories ────────────────────────────────────────────────────────────

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
    if (userId) await set(`pocket-cat-overrides-${userId}`, nextOverrides);
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

  // ── Expenses ──────────────────────────────────────────────────────────────

  const handleDeleteExpense = (id: string) => {
    remove(id);
    if (undo?.id === id) setUndo(null);
    const nextDeleted = Array.from(new Set([...pendingDeletedIds, id]));
    setPendingDeletedIds(nextDeleted);
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    sync(userId, updatedExpenses, income, customCategories, nextDeleted);
  };

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

  // ── Derived ───────────────────────────────────────────────────────────────

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

  // ── Value ─────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    userId,
    phone,
    setPhone,
    initializing,
    needsIncome,
    continueWithPhone,
    expenses,
    add,
    handleDeleteExpense,
    addExpense,
    amount,
    setAmount,
    parseAmount,
    note,
    setNote,
    undo,
    setUndo,
    showAll,
    setShowAll,
    income,
    setIncome,
    incomeDraft,
    setIncomeDraft,
    saveIncome,
    budget,
    setBudget,
    budgetDraft,
    setBudgetDraft,
    saveBudget,
    allCategories,
    customCategories,
    categoryDialog,
    setCategoryDialog,
    categoryName,
    setCategoryName,
    selectedTone,
    setSelectedTone,
    selectedIconName,
    setSelectedIconName,
    addCategory,
    deleteCategory,
    updateCategoryColor,
    theme,
    setTheme,
    online,
    syncing,
    error,
    sync,
    monthSpend,
    byCategory,
    today,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
