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
    <div className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 transition-all duration-200 hover:border-primary/30 hover:bg-muted/20 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:size-10.5"
          style={{
            backgroundColor: `${color}18`,
            color: color,
          }}
        >
          <IconComponent className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
            {expense.note || c.label}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
            {c.label} ·{' '}
            {new Date(expense.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="font-mono-numbers text-xs font-extrabold tracking-tight text-foreground sm:text-base">
          {money(expense.amount)}
        </span>
        <button
          aria-label="Delete expense"
          onClick={() => remove(expense.id)}
          className="cursor-pointer rounded-xl p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5 sm:size-4" />
        </button>
      </div>
    </div>
  );
};
