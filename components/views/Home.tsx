import { Plus } from 'lucide-react';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories, quickRelogItems } from '@/lib/constants';
import { getCategoryColor, money } from '@/lib/utils';
import { ExpenseRow } from '@/components/ExpenseRow';

interface HomeProps {
  amount: string;
  note: string;
  setNote: (v: string) => void;
  parseAmount: (v: string) => void;
  addExpense: (category: CategoryId, preset?: Partial<Expense>) => void;
  displayed: Expense[];
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  remove: (id: string) => void;
  undo: Expense | null;
  setUndo: (e: Expense | null) => void;
  categories?: Category[];
  onAddCategory: () => void;
}

export const Home = ({
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
}: HomeProps) => {
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
                <Plus className="size-3.5" /> Customize / Add
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map(({ id, label, tone, Icon }) => {
                const IconComponent = Icon || Plus;
                const color = getCategoryColor(tone);
                return (
                  <button
                    key={id}
                    onClick={() => addExpense(id)}
                    className="flex min-w-20 flex-col items-center gap-2 rounded-2xl px-3.5 py-3 text-xs font-medium text-white shadow-xs transition hover:-translate-y-0.5 active:translate-y-0"
                    style={{
                      backgroundColor: color,
                      color: '#ffffff',
                    }}
                  >
                    <IconComponent className="size-5 text-white" />
                    {label}
                  </button>
                );
              })}
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
              {quickRelogItems.map((item) => {
                const QuickIcon = item.Icon || Plus;
                return (
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
                    <QuickIcon className="size-4 text-primary" />
                    {item.label}
                    <span className="text-muted-foreground">
                      {money(item.amount)}
                    </span>
                  </button>
                );
              })}
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
              <ExpenseRow
                key={expense.id}
                expense={expense}
                remove={remove}
                categories={categories}
              />
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
};
