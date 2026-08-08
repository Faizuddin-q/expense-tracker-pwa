import { useEffect, useState } from 'react';
import { Check, Download, Moon, Sun } from 'lucide-react';
import { set } from 'idb-keyval';
import { Category, Expense } from '@/types/expense';
import { downloadCsv, formatIndianNumber, parseRawNumber } from '@/lib/utils';

interface SettingsProps {
  income: number;
  setIncome: (n: number) => void;
  expenses: Expense[];
  userId: string;
  sync: (profileIncome?: number) => void;
  onChangeIdentity: () => void;
  categories?: Category[];
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export const Settings = ({
  income,
  setIncome,
  expenses,
  userId,
  sync,
  onChangeIdentity,
  categories = [],
  theme,
  setTheme,
}: SettingsProps) => {
  const [incomeDraft, setIncomeDraft] = useState(
    formatIndianNumber(income || '')
  );

  useEffect(() => {
    setIncomeDraft(formatIndianNumber(income || ''));
  }, [income]);

  const handleSaveIncome = async () => {
    const raw = parseRawNumber(incomeDraft);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setIncome(parsed);
    await set(`pocket-income-${userId}`, parsed);
    sync(parsed);
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-3xl bg-card p-7 shadow-sm ring-1 ring-border sm:p-9">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Your money profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your mobile number identifies your private expense space.
        </p>

        {/* Theme / Appearance Selection */}
        <div className="mt-8 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance & Theme
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border p-4 text-sm font-semibold transition-all active:scale-[0.97] ${
                theme === 'dark'
                  ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/40'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Moon className="size-4" /> Dark Mode (Default)
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl border p-4 text-sm font-semibold transition-all active:scale-[0.97] ${
                theme === 'light'
                  ? 'border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/40'
                  : 'border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Sun className="size-4" /> Warm Light Mode
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mobile account ID
          </label>
          <input
            readOnly
            value={userId}
            className="h-12 w-full cursor-not-allowed rounded-xl border border-input bg-muted/60 px-4 text-sm font-medium text-foreground outline-none"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => sync()}
            className="h-11 cursor-pointer rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Sync data
          </button>
          <button
            onClick={onChangeIdentity}
            className="h-11 cursor-pointer rounded-xl border border-border/80 bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
          >
            Change number
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Monthly income
          </label>
          <div className="flex items-center gap-3">
            <div className="flex h-12 flex-1 items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-sm font-semibold text-muted-foreground">
                ₹
              </span>
              <input
                inputMode="decimal"
                value={incomeDraft}
                onChange={(e) =>
                  setIncomeDraft(
                    formatIndianNumber(parseRawNumber(e.target.value))
                  )
                }
                onBlur={handleSaveIncome}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveIncome();
                }}
                className="font-mono-numbers w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
              />
            </div>
            <button
              onClick={handleSaveIncome}
              className="h-12 cursor-pointer rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Update
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl bg-accent/60 p-4.5 ring-1 ring-border/50">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Offline-first storage
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {expenses.length} expenses stored locally for this account.
            </p>
          </div>
          <Check className="size-5 shrink-0 text-primary" />
        </div>
      </div>

      <button
        onClick={() => downloadCsv(expenses, categories)}
        className="mt-6 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-5 text-sm font-semibold text-foreground shadow-2xs transition-all hover:bg-muted active:scale-[0.98]"
      >
        <Download className="size-4" /> Export all expenses
      </button>
    </section>
  );
};
