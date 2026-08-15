import { useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { CategoryIcon } from '@/components/CategoryIcon';

interface MonthlySummaryProps {
  expenses: Expense[];
  income: number;
  budget?: number;
  categories?: Category[];
}

interface MonthSummary {
  key: string;
  label: string;
  total: number;
  count: number;
  byCategory: (Category & { total: number; count: number })[];
  topCategory: (Category & { total: number; count: number }) | null;
  targetPercent: number;
  remaining: number;
  isCurrent: boolean;
}

export const MonthlySummary = ({
  expenses,
  income,
  budget = 0,
  categories = builtInCategories,
}: MonthlySummaryProps) => {
  const hasBudget = budget > 0;
  const target = hasBudget ? budget : income;
  const [expanded, setExpanded] = useState<string | null>(null);

  const months = useMemo<MonthSummary[]>(() => {
    const cats = categories.length ? categories : builtInCategories;
    const catsById = new Map(cats.map((c) => [c.id, c]));
    const builtInById = new Map(builtInCategories.map((c) => [c.id, c]));
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const groups = new Map<string, Expense[]>();
    const amountOf = (e: Expense) => {
      const n = Number(e.amount);
      return Number.isFinite(n) ? n : 0;
    };

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    });

    if (!groups.has(currentKey)) groups.set(currentKey, []);

    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => {
        const [yearStr, monthStr] = key.split('-');
        const label = new Date(
          Number(yearStr),
          Number(monthStr) - 1,
          1
        ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const total = list.reduce((sum, e) => sum + amountOf(e), 0);

        const totals = new Map<string, number>();
        const counts = new Map<string, number>();
        list.forEach((e) => {
          const id = e.category || 'other';
          totals.set(id, (totals.get(id) ?? 0) + amountOf(e));
          counts.set(id, (counts.get(id) ?? 0) + 1);
        });

        const byCategory: (Category & { total: number; count: number })[] =
          [];
        for (const [id, catTotal] of totals.entries()) {
          if (catTotal <= 0) continue;
          const meta =
            catsById.get(id) ??
            builtInById.get(id) ??
            ({
              id,
              label:
                id === 'other'
                  ? 'Other'
                  : id.startsWith('custom-')
                    ? 'Missing category'
                    : id,
              tone: 'gray',
              Icon: Plus,
            } satisfies Category);
          byCategory.push({ ...meta, total: catTotal, count: counts.get(id) ?? 0 });
        }
        byCategory.sort((a, b) => b.total - a.total);

        return {
          key,
          label,
          total,
          count: list.length,
          topCategory: byCategory[0] ?? null,
          byCategory,
          targetPercent: Math.round((total / Math.max(target || 1, 1)) * 100),
          remaining: (target || 0) - total,
          isCurrent: key === currentKey,
        };
      });
  }, [expenses, target, categories]);

  const totals = useMemo(() => {
    const spent = months.reduce((sum, m) => sum + m.total, 0);
    return {
      spent,
      avg: months.length ? spent / months.length : 0,
      months: months.length,
    };
  }, [months]);

  const peak = useMemo(
    () => months.reduce((max, m) => Math.max(max, m.total), 0),
    [months]
  );

  return (
    <section className="mx-auto max-w-6xl">
      {/* Stat strip — same card chrome as Expenses table */}
      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="label">Months</p>
          <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-[17px]">
            <span className="text-primary">{totals.months}</span>
          </p>
        </div>
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="label">Total spent</p>
          <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-[17px]">
            <Money value={totals.spent} />
          </p>
        </div>
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="label">Avg / month</p>
          <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-[17px]">
            <Money value={totals.avg} />
          </p>
        </div>
      </div>

      {/* Month list */}
      {months.length ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {months.map((m) => {
              const isOpen = expanded === m.key;
              const over = m.remaining < 0;

              return (
                <div key={m.key}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : m.key)}
                    aria-expanded={isOpen}
                    className={`group flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-primary/[0.055] focus-visible:bg-primary/[0.055] focus-visible:outline-none sm:px-4 sm:py-3 ${
                      isOpen ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded transition-colors ${
                        isOpen
                          ? 'bg-primary/12 text-primary'
                          : 'text-faint group-hover:text-primary'
                      }`}
                    >
                      <ChevronDown
                        className={`size-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                        strokeWidth={2.2}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {m.label}
                        </span>
                        {m.isCurrent && (
                          <span className="shrink-0 rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-faint">
                        <span
                          className={
                            m.count > 0 ? 'font-mono-numbers text-primary' : ''
                          }
                        >
                          {m.count}
                        </span>{' '}
                        {m.count === 1 ? 'expense' : 'expenses'}
                        {m.topCategory ? ` · ${m.topCategory.label}` : ''}
                        {target > 0 && m.count > 0 ? (
                          <>
                            {' · '}
                            <span
                              className={
                                over ? 'text-destructive' : 'text-muted-foreground'
                              }
                            >
                              {m.targetPercent}% of{' '}
                              {hasBudget ? 'budget' : 'income'}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="hidden w-24 shrink-0 sm:block">
                      <Bar
                        value={peak ? (m.total / peak) * 100 : 0}
                        color={over ? 'var(--destructive)' : 'var(--primary)'}
                      />
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-mono-numbers text-[13px] font-medium text-foreground">
                        <Money value={m.total} />
                      </p>
                      {target > 0 && (
                        <p
                          className={`font-mono-numbers text-[11px] ${
                            over ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {over ? '+' : ''}
                          <Money value={Math.abs(m.remaining)} />
                          {over ? ' over' : ' left'}
                        </p>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-primary/20 bg-primary/[0.03] px-3 py-3 sm:px-4">
                      {m.byCategory.length ? (
                        <div className="space-y-2">
                          {m.byCategory.map((c) => {
                            const pct = Math.round(
                              (c.total / Math.max(m.total, 1)) * 100
                            );
                            const color = getCategoryColor(c.tone);
                            return (
                              <div
                                key={c.id}
                                className="flex items-center gap-3"
                              >
                                <div className="flex w-28 min-w-0 shrink-0 items-center gap-2 sm:w-36">
                                  <CategoryIcon
                                    color={color}
                                    icon={getCategoryIcon(c)}
                                    size="xs"
                                  />
                                  <span className="truncate text-[12px] font-medium text-foreground">
                                    {c.label}
                                  </span>
                                  <span className="font-mono-numbers shrink-0 text-[11px] text-primary">
                                    {c.count}
                                  </span>
                                </div>
                                <Bar
                                  value={pct}
                                  color={color}
                                  className="flex-1"
                                />
                                <span className="font-mono-numbers w-9 shrink-0 text-right text-[11px] text-faint">
                                  {pct}%
                                </span>
                                <span className="font-mono-numbers w-20 shrink-0 text-right text-[12px] font-medium text-foreground">
                                  <Money value={c.total} />
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-2 text-center text-[12px] text-muted-foreground">
                          No expenses this month.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer total — mirrors Expenses table footer */}
          <div className="flex items-center justify-between border-t border-primary/25 bg-primary/[0.07] px-3 py-2.5 sm:px-4">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
              All months
            </span>
            <span className="font-mono-numbers text-[13px] font-semibold text-foreground">
              <Money value={totals.spent} precise />
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-[13px] text-muted-foreground">
            No monthly data yet. Log an expense to start a summary.
          </p>
        </div>
      )}
    </section>
  );
};
