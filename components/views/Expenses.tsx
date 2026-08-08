import { useState } from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { categoryFor, downloadCsv } from '@/lib/utils';
import { ExpenseRow } from '@/components/ExpenseRow';

interface ExpensesProps {
  expenses: Expense[];
  remove: (id: string) => void;
  categories?: Category[];
}

export const Expenses = ({
  expenses,
  remove,
  categories = [],
}: ExpensesProps) => {
  const [query, setQuery] = useState('');
  const filtered = expenses.filter((e) =>
    `${e.note} ${categoryFor(e.category, categories).label}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-input bg-card px-4 py-3 transition focus-within:ring-2 focus-within:ring-ring">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses by note or category..."
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={() => downloadCsv(filtered, categories)}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            remove={remove}
            categories={categories}
          />
        ))}
        {!filtered.length && (
          <div className="rounded-3xl border border-dashed border-border/80 p-10 text-center text-sm font-medium text-muted-foreground">
            No expenses found matching &quot;{query}&quot;.
          </div>
        )}
      </div>
    </section>
  );
};
