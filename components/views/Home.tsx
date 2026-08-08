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
  const displayedTotal = displayed.reduce(
    (s: number, e: Expense) => s + e.amount,
    0
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="grid gap-7 xl:grid-cols-[1.15fr_.85fr]">
        <div>
          {/* Modern Fintech Hero Card */}
          <div className="rounded-3xl border border-border/90 bg-card p-7 shadow-xs sm:p-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Log New Expense
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary ring-1 ring-primary/20">
                Quick entry
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                aria-label="Amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => parseAmount(e.target.value)}
                placeholder="₹ 0"
                className="font-mono-numbers w-full bg-transparent text-5xl font-extrabold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 sm:text-6xl"
              />
            </div>

            <div className="mt-5 pt-2">
              <input
                aria-label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was it for? (optional note)"
                className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Category Picker Section - Modern Fintech Card Grid */}
          <div className="mt-7">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Select Category
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tap to record expense immediately
                </p>
              </div>
              <button
                onClick={onAddCategory}
                className="flex cursor-pointer items-center gap-1 text-xs font-bold text-primary transition hover:underline"
              >
                <Plus className="size-3.5" /> Customize / Add
              </button>
            </div>

            {/* Clean Responsive Fintech Grid */}
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {categories.map(({ id, label, tone, Icon }) => {
                const IconComponent = Icon || Plus;
                const color = getCategoryColor(tone);
                return (
                  <button
                    key={id}
                    onClick={() => addExpense(id)}
                    className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-3 text-xs font-bold text-white shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-[0.95]"
                    style={{
                      backgroundColor: color,
                      color: '#ffffff',
                    }}
                  >
                    <div className="grid size-8 place-items-center rounded-xl bg-white/20 transition-transform duration-200 group-hover:scale-110">
                      <IconComponent className="size-4.5 text-white" />
                    </div>
                    <span className="truncate max-w-full text-[11px]">
                      {label}
                    </span>
                  </button>
                );
              })}

              {/* Add Custom Category Card */}
              <button
                onClick={onAddCategory}
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/40 bg-card p-3 text-xs font-bold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 active:scale-[0.95]"
              >
                <div className="grid size-8 place-items-center rounded-xl bg-primary/10">
                  <Plus className="size-4 text-primary" />
                </div>
                <span className="text-[11px]">Add Custom</span>
              </button>
            </div>
          </div>

          {/* Quick Re-log Items */}
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Quick Re-log
              </h2>
              <span className="text-xs font-medium text-muted-foreground">
                Frequent picks
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
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
                    className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-border/80 bg-card px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:border-primary/40 hover:bg-accent/40 active:scale-[0.97]"
                  >
                    <QuickIcon className="size-4 text-primary shrink-0" />
                    <span>{item.label}</span>
                    <span className="font-mono-numbers font-semibold text-muted-foreground">
                      {money(item.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Fintech Activity Feed Card */}
        <div className="rounded-3xl border border-border/90 bg-card p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {showAll ? 'Total Activity' : 'Spent Today'}
              </p>
              <h2 className="font-mono-numbers mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                {money(displayedTotal)}
              </h2>
            </div>
            <button
              onClick={() => setShowAll(!showAll)}
              className="cursor-pointer rounded-xl border border-border/80 bg-background px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted active:scale-[0.97]"
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
              <div className="rounded-2xl border border-dashed border-border/80 p-9 text-center text-sm font-medium text-muted-foreground">
                Your saved expenses will appear here.
              </div>
            )}
          </div>

          {/* Undo Toast */}
          {undo && (
            <div className="mt-4 flex animate-in fade-in slide-in-from-bottom-2 items-center justify-between rounded-2xl border border-border/60 bg-accent/80 px-4.5 py-3.5 text-sm font-semibold shadow-md duration-200">
              <span className="text-foreground">Expense added.</span>
              <button
                onClick={() => {
                  remove(undo.id);
                  setUndo(null);
                }}
                className="cursor-pointer font-bold text-primary transition hover:underline active:scale-95"
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
