import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories, quickRelogItems } from '@/lib/constants';
import { useProfileStore } from '@/lib/profile-store';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { toast } from '@/components/ToastHost';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils';

interface HomeProps {
  amount: string;
  note: string;
  setNote: (v: string) => void;
  parseAmount: (v: string) => void;
  addExpense: (category: CategoryId, preset?: Partial<Expense>) => void;
  updateExpense: (
    id: string,
    patch: {
      amount: number;
      note?: string;
      category: CategoryId;
      date: string;
    }
  ) => void;
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
  updateExpense,
  displayed,
  showAll,
  setShowAll,
  remove,
  undo,
  setUndo,
  categories = builtInCategories,
  onAddCategory,
}: HomeProps) => {
  const hideAmounts = useProfileStore((s) => s.hideAmounts);
  const name = useProfileStore((s) => s.name);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const displayedTotal = displayed.reduce(
    (s: number, e: Expense) => s + e.amount,
    0
  );
  const hasAmount = Number(amount.replace(/,/g, '')) > 0;

  return (
    <section className="mx-auto max-w-6xl">
      {name && (
        <p className="mb-3 text-[13px] font-medium text-muted-foreground">
          Hi, {name.split(' ')[0]}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="min-w-0">
          {/* Composer */}
          <div
            className={`rounded-xl border bg-card ${
              hasAmount ? 'border-primary/40' : 'border-border'
            }`}
          >
            <div className="field-shell relative z-0 flex items-baseline gap-2 rounded-t-[calc(0.75rem-1px)] border-0 border-b border-border px-4 py-4 focus-within:z-10">
              <span
                className={`font-mono-numbers text-2xl font-medium ${
                  hasAmount ? 'text-primary' : 'text-faint'
                }`}
              >
                ₹
              </span>
              <input
                aria-label="Amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => parseAmount(e.target.value)}
                placeholder="0"
                className="font-mono-numbers w-full min-w-0 bg-transparent px-1 py-0.5 text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-faint/50"
              />
            </div>

            <div className="field-shell relative z-0 rounded-b-[calc(0.75rem-1px)] border-0 px-4 py-3 focus-within:z-10">
              <input
                aria-label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                className="w-full bg-transparent px-1 py-0.5 text-[13px] text-foreground outline-none placeholder:text-faint"
              />
            </div>
          </div>
          <p
            className={`mt-2 min-h-[1.25rem] text-[12px] font-medium text-primary ${
              hasAmount ? '' : 'invisible'
            }`}
            aria-hidden={!hasAmount}
          >
            Pick a category to save this expense.
          </p>

          {/* Categories */}
          <div className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="label">Category</h2>
              <button
                type="button"
                onClick={onAddCategory}
                className="cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
              >
                Manage
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => {
                const color = getCategoryColor(cat.tone);
                const Icon = getCategoryIcon(cat);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => addExpense(cat.id)}
                    style={
                      {
                        '--cat-color': color,
                        borderColor:
                          color.startsWith('#') && color.length === 7
                            ? `${color}8F`
                            : color,
                      } as React.CSSProperties
                    }
                    className="cat-pill flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-card px-2.5 text-left"
                  >
                    <CategoryIcon color={color} icon={Icon} size="xs" />
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {cat.label}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onAddCategory}
                className="press flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-2.5 text-left text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
              >
                <Plus className="size-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate text-[13px] font-medium">New</span>
              </button>
            </div>
          </div>

          {/* Quick re-log */}
          <div className="mt-6">
            <h2 className="label mb-2.5">Frequent</h2>
            <div className="flex flex-wrap gap-1.5">
              {quickRelogItems.map((item) => {
                const cat =
                  categories.find((c) => c.id === item.category) ??
                  builtInCategories.find((c) => c.id === item.category);
                const color = getCategoryColor(cat?.tone ?? 'gray');
                const Icon = getCategoryIcon(cat ?? { iconName: 'plus' });
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() =>
                      addExpense(item.category, {
                        amount: item.amount,
                        note: item.label,
                      })
                    }
                    className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[12px] transition-colors hover:border-primary/50 hover:bg-primary/[0.06]"
                  >
                    <CategoryIcon color={color} icon={Icon} size="xs" />
                    <span className="font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="font-mono-numbers text-muted-foreground">
                      <Money value={item.amount} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <aside className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className={`h-7 cursor-pointer rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                    !showAll
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className={`h-7 cursor-pointer rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                    showAll
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
              </div>
              <span className="font-mono-numbers text-[12px] text-muted-foreground">
                <span
                  className={
                    displayed.length > 0 ? 'text-primary' : 'text-foreground'
                  }
                >
                  {displayed.length}
                </span>
              </span>
            </div>

            <div className="px-3 sm:px-4">
              {displayed.length ? (
                <div className="divide-y divide-border">
                  {displayed.slice(0, 8).map((expense: Expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onDelete={setDeleting}
                      onEdit={hideAmounts ? undefined : setEditing}
                      categories={categories}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  No expenses yet.
                </p>
              )}
            </div>

            {displayed.length > 0 && (
              <div className="flex items-baseline justify-between border-t border-primary/25 bg-primary/[0.07] px-3 py-2.5 sm:px-4">
                <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
                  Total
                </span>
                <span className="font-mono-numbers text-[14px] font-semibold tracking-tight text-foreground">
                  <Money value={displayedTotal} precise />
                </span>
              </div>
            )}
          </div>

          {undo && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Expense added</span>
              <button
                type="button"
                onClick={() => {
                  remove(undo.id);
                  setUndo(null);
                }}
                className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-70"
              >
                Undo
              </button>
            </div>
          )}
        </aside>
      </div>

      {editing && (
        <ExpenseEditDialog
          expense={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (patch.amount <= 0) {
              toast.error(
                'Invalid amount',
                'Enter a valid amount greater than zero'
              );
              return;
            }
            updateExpense(editing.id, patch);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ExpenseDeleteDialog
          expense={deleting}
          categories={categories}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
};
