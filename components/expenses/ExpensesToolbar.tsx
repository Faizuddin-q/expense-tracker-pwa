import { Download, Search, X } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { downloadCsv } from '@/lib/utils';

interface ExpensesToolbarProps {
  query: string;
  setQuery: (v: string) => void;
  filtered: Expense[];
  categories: Category[];
}

export const ExpensesToolbar = ({
  query,
  setQuery,
  filtered,
  categories,
}: ExpensesToolbarProps) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div className="field-shell group/search flex h-8 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5">
      <Search
        className={`size-3.5 shrink-0 transition-colors group-focus-within/search:text-primary ${
          query ? 'text-primary' : 'text-faint'
        }`}
        strokeWidth={2}
      />
      <input
        aria-label="Search expenses"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search note or category"
        className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          aria-label="Clear search"
          className="grid size-4 cursor-pointer place-items-center rounded text-faint transition-colors hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </div>

    <button
      onClick={() => downloadCsv(filtered, categories)}
      className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary"
    >
      <Download className="size-3.5" strokeWidth={2} />
      Export CSV
    </button>
  </div>
);
