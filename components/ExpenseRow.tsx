import { Plus, Trash2 } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, money } from '@/lib/utils';
import { builtInCategories } from '@/lib/constants';

interface ExpenseRowProps {
  expense: Expense;
  remove: (id: string) => void;
  categories?: Category[];
}

export const ExpenseRow = ({
  expense,
  remove,
  categories = builtInCategories,
}: ExpenseRowProps) => {
  const c = categoryFor(expense.category, categories);
  const IconComponent = c.Icon || Plus;
  const color = getCategoryColor(c.tone);

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-3.5 transition-all duration-200 hover:border-primary/30 hover:bg-muted/20 hover:shadow-2xs sm:p-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className="grid size-10.5 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: `${color}18`,
            color: color,
          }}
        >
          <IconComponent className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {expense.note || c.label}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {c.label} ·{' '}
            {new Date(expense.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono-numbers text-sm font-bold tracking-tight text-foreground sm:text-base">
          {money(expense.amount)}
        </span>
        <button
          aria-label="Delete expense"
          onClick={() => remove(expense.id)}
          className="cursor-pointer rounded-xl p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
};
