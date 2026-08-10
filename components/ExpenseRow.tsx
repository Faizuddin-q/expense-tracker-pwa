import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor } from '@/lib/utils';
import { Money } from '@/components/Money';
import { builtInCategories } from '@/lib/constants';

interface ExpenseRowProps {
  expense: Expense;
  remove: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  categories?: Category[];
}

export const ExpenseRow = ({
  expense,
  remove,
  onEdit,
  categories = builtInCategories,
}: ExpenseRowProps) => {
  const c = categoryFor(expense.category, categories);
  const IconComponent = c.Icon || Plus;
  const color = getCategoryColor(c.tone);

  return (
    <div className="group flex items-center justify-between gap-3 py-2.5 transition-colors duration-150 sm:py-3">
      <button
        type="button"
        onClick={() => onEdit?.(expense)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <div
          className="grid size-8 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105 sm:size-9.5"
          style={{
            backgroundColor: `${color}1f`,
            color: color,
          }}
        >
          <IconComponent className="size-4 sm:size-4.5" />
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
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <span className="font-mono-numbers text-xs font-extrabold tracking-tight text-foreground sm:text-base">
          <Money value={expense.amount} />
        </span>
        {onEdit && (
          <button
            aria-label="Edit expense"
            onClick={() => onEdit(expense)}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Pencil className="size-3.5 sm:size-4" />
          </button>
        )}
        <button
          aria-label="Delete expense"
          onClick={() => remove(expense.id)}
          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5 sm:size-4" />
        </button>
      </div>
    </div>
  );
};
