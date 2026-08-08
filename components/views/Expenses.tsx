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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <input
            aria-label="Search expenses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => downloadCsv(filtered, categories)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {filtered.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            remove={remove}
            categories={categories}
          />
        ))}
      </div>
    </section>
  );
};
