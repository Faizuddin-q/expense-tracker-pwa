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
    <div className="group flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 transition hover:border-primary/40">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{
            backgroundColor: `${color}18`,
            color: color,
          }}
        >
          <IconComponent className="size-5" />
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
};
