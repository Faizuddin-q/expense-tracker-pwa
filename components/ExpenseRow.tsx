import { Pencil, Trash2 } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { builtInCategories } from '@/lib/constants';

interface ExpenseRowProps {
  expense: Expense;
  onDelete: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  categories?: Category[];
}

export const ExpenseRow = ({
  expense,
  onDelete,
  onEdit,
  categories = builtInCategories,
}: ExpenseRowProps) => {
  const c = categoryFor(expense.category, categories);
  const color = getCategoryColor(c.tone);
  const Icon = getCategoryIcon(c);

  return (
    <div className="group relative -mx-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-1 py-2 transition-colors hover:bg-primary/[0.04]">
      <CategoryIcon color={color} icon={Icon} size="xs" />

      <button
        type="button"
        onClick={() => onEdit?.(expense)}
        disabled={!onEdit}
        className="flex min-w-0 items-baseline gap-2 overflow-hidden text-left outline-none focus-visible:outline-none disabled:cursor-default"
      >
        <span className="truncate text-[13px] font-medium text-foreground">
          {expense.note || c.label}
        </span>
        {expense.note && (
          <span className="min-w-0 shrink truncate text-[11px] text-faint">
            {c.label}
          </span>
        )}
      </button>

      <span className="font-mono-numbers justify-self-end whitespace-nowrap text-[13px] font-medium text-foreground tabular-nums">
        <Money value={expense.amount} />
      </span>

      <div className="absolute top-1/2 right-1 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-card/95 pl-1 sm:flex sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100">
        {onEdit && (
          <button
            type="button"
            aria-label="Edit expense"
            onClick={() => onEdit(expense)}
            className="press grid size-6 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary"
          >
            <Pencil className="size-3.5" strokeWidth={1.9} />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete expense"
          onClick={() => onDelete(expense)}
          className="press grid size-6 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
};
