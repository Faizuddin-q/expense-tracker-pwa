import { useEffect, useState } from 'react';
import { Check, Download, LogOut, Moon, Sun } from 'lucide-react';
import { set } from 'idb-keyval';
import { Category, Expense } from '@/types/expense';
import { downloadCsv, formatIndianMobileDisplay, formatIndianNumber, parseRawNumber } from '@/lib/utils';

interface SettingsProps {
  income: number;
  setIncome: (n: number) => void;
  budget: number;
  setBudget: (n: number) => void;
  expenses: Expense[];
  userId: string;
  sync: (profileIncome?: number, profileBudget?: number) => void;
  onChangeIdentity: () => void;
  onLogout: () => void;
  categories?: Category[];
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export const Settings = ({
  income,
  setIncome,
  budget,
  setBudget,
  expenses,
  userId,
  sync,
  onChangeIdentity,
  onLogout,
  categories = [],
  theme,
  setTheme,
}: SettingsProps) => {
  const [incomeDraft, setIncomeDraft] = useState(
    formatIndianNumber(income || '')
  );
  const [budgetDraft, setBudgetDraft] = useState(
    formatIndianNumber(budget || '')
  );

  useEffect(() => {
    setIncomeDraft(formatIndianNumber(income || ''));
  }, [income]);

  useEffect(() => {
    setBudgetDraft(formatIndianNumber(budget || ''));
  }, [budget]);

  const handleSaveIncome = async () => {
    const raw = parseRawNumber(incomeDraft);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setIncome(parsed);
    await set(`pocket-income-${userId}`, parsed);
    sync(parsed);
  };

  const handleSaveBudget = async () => {
    const raw = parseRawNumber(budgetDraft);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setBudget(parsed);
    await set(`pocket-budget-${userId}`, parsed);
    sync(undefined, parsed);
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs sm:rounded-3xl sm:p-8 md:p-9">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Your money profile
        </h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Your mobile number identifies your private expense space.
        </p>

        {/* Theme / Appearance Selection */}
        <div className="mt-6 sm:mt-8 flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
            Appearance & Theme
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border p-3.5 text-xs font-bold transition-all active:scale-[0.97] sm:p-4 sm:text-sm ${
                theme === 'dark'
                  ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/40'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Moon className="size-4 shrink-0" /> Dark Mode (Default)
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border p-3.5 text-xs font-bold transition-all active:scale-[0.97] sm:p-4 sm:text-sm ${
                theme === 'light'
                  ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/40'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Sun className="size-4 shrink-0" /> Warm Light Mode
            </button>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
            Mobile account ID
          </label>
          <div className="flex h-11 overflow-hidden rounded-xl border border-input bg-muted/60 sm:h-12">
            <span className="flex shrink-0 items-center border-r border-input px-3 text-xs font-bold text-muted-foreground sm:text-sm">
              +91
            </span>
            <input
              readOnly
              value={userId}
              className="font-mono-numbers h-full w-full cursor-not-allowed bg-transparent px-3 text-xs font-semibold tracking-wide text-foreground outline-none sm:text-sm"
              aria-label={formatIndianMobileDisplay(userId)}
            />
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2.5 sm:mt-4 sm:gap-3">
          <button
            onClick={() => sync()}
            className="h-10.5 cursor-pointer rounded-xl bg-primary px-4.5 text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98] sm:h-11 sm:px-5 sm:text-sm"
          >
            Sync data
          </button>
          <button
            onClick={onChangeIdentity}
            className="h-10.5 cursor-pointer rounded-xl border border-border/80 bg-card px-4.5 text-xs font-bold text-foreground transition hover:bg-muted active:scale-[0.98] sm:h-11 sm:px-5 sm:text-sm"
          >
            Change number
          </button>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
            Monthly income
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-11 flex-1 items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring sm:h-12">
              <span className="text-xs font-bold text-muted-foreground sm:text-sm">
                ₹
              </span>
              <input
                aria-label="Monthly income"
                inputMode="decimal"
                value={incomeDraft}
                onChange={(e) =>
                  setIncomeDraft(formatIndianNumber(e.target.value))
                }
                placeholder="e.g. 50,000"
                className="font-mono-numbers w-full bg-transparent px-3 text-xs font-bold text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-sm"
              />
            </div>
            <button
              onClick={handleSaveIncome}
              className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98] sm:h-12 sm:text-sm"
            >
              <Check className="size-4" /> Save Income
            </button>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
            Monthly spend budget
          </label>
          <p className="text-xs text-muted-foreground">
            Target for analytics only — you can still log expenses past this
            amount.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-11 flex-1 items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring sm:h-12">
              <span className="text-xs font-bold text-muted-foreground sm:text-sm">
                ₹
              </span>
              <input
                aria-label="Monthly spend budget"
                inputMode="decimal"
                value={budgetDraft}
                onChange={(e) =>
                  setBudgetDraft(formatIndianNumber(e.target.value))
                }
                placeholder="e.g. 30,000"
                className="font-mono-numbers w-full bg-transparent px-3 text-xs font-bold text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-sm"
              />
            </div>
            <button
              onClick={handleSaveBudget}
              className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98] sm:h-12 sm:text-sm"
            >
              <Check className="size-4" /> Save Budget
            </button>
          </div>
        </div>

        {/* Export Data */}
        <div className="mt-6 border-t border-border/60 pt-6 sm:mt-8 sm:pt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
            Export Data
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Download your full expense history as a CSV file.
          </p>
          <button
            onClick={() => downloadCsv(expenses, categories)}
            className="mt-3.5 flex h-10.5 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-4.5 text-xs font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98] sm:h-11 sm:px-5 sm:text-sm"
          >
            <Download className="size-4" /> Download CSV ({expenses.length})
          </button>
        </div>

        {/* Mobile logout — desktop uses header */}
        <div className="mt-6 border-t border-border/60 pt-6 lg:hidden sm:mt-8 sm:pt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
            Account
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign out on this device. Your synced data stays in the cloud.
          </p>
          <button
            onClick={onLogout}
            className="mt-3.5 flex h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4.5 text-xs font-bold text-destructive transition-all hover:bg-destructive/15 active:scale-[0.98] sm:h-11 sm:text-sm"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </div>
    </section>
  );
};
