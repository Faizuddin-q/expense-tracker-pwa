import { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
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
}

export const Settings = ({
  income,
  setIncome,
  expenses,
  userId,
  sync,
  onChangeIdentity,
  categories = [],
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
            onClick={() => sync()}
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
        <div className="mt-8 flex flex-col gap-2">
          <label className="text-sm font-medium">Monthly income</label>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center rounded-xl border border-border px-4">
              <span className="text-muted-foreground">₹</span>
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
                className="w-full bg-transparent p-3 outline-none"
              />
            </div>
            <button
              onClick={handleSaveIncome}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Update
            </button>
          </div>
        </div>
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
        onClick={() => downloadCsv(expenses, categories)}
        className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
      >
        <Download className="size-4" /> Export all expenses
      </button>
    </section>
  );
};
