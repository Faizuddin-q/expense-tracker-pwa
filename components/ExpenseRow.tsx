import { Pencil, Trash2 } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
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
  const color = getCategoryColor(c.tone);
  const Icon = getCategoryIcon(c);

  return (
    <div className="group -mx-1 flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-primary/[0.04]">
      <CategoryIcon color={color} icon={Icon} size="xs" />

      <button
        type="button"
        onClick={() => onEdit?.(expense)}
        disabled={!onEdit}
        className="flex min-w-0 flex-1 items-baseline gap-2 text-left outline-none focus-visible:outline-none disabled:cursor-default"
      >
        <span className="truncate text-[13px] font-medium text-foreground">
          {expense.note || c.label}
        </span>
        {expense.note && (
          <span className="shrink-0 truncate text-[11px] text-faint">
            {c.label}
          </span>
        )}
      </button>

      <span className="font-mono-numbers shrink-0 text-[13px] font-medium text-foreground tabular-nums">
        <Money value={expense.amount} />
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        {onEdit && (
          <button
            type="button"
            aria-label="Edit expense"
            onClick={() => onEdit(expense)}
            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-primary/12 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Pencil className="size-3.5" strokeWidth={1.9} />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete expense"
          onClick={() => remove(expense.id)}
          className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <Trash2 className="size-3.5" strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
};
