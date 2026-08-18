import { Category } from '@/types/expense';
import { getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { CategoryIcon } from '@/components/CategoryIcon';

export interface CategoryBreakdown extends Category {
  total: number;
  count: number;
}

interface Slice {
  category: CategoryBreakdown;
  dasharray: string;
  dashoffset: string;
  color: string;
}

interface DashboardBreakdownProps {
  activeByCategory: CategoryBreakdown[];
  activeSpend: number;
  periodLabel: string;
  radius: number;
  slices: Slice[];
  hovered: CategoryBreakdown | null;
  setHovered: (c: CategoryBreakdown | null) => void;
}

export const DashboardBreakdown = ({
  activeByCategory,
  activeSpend,
  periodLabel,
  radius,
  slices,
  hovered,
  setHovered,
}: DashboardBreakdownProps) => (
  <div className="mt-3 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
    <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-6">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="fill-none stroke-muted"
            strokeWidth="10"
          />
          {activeSpend > 0 &&
            slices.map(({ category, dasharray, dashoffset, color }) => (
              <circle
                key={category.id}
                cx="50"
                cy="50"
                r={radius}
                className="cursor-pointer fill-none transition-opacity"
                stroke={color}
                strokeWidth="10"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                opacity={hovered && hovered.id !== category.id ? 0.25 : 1}
                onMouseEnter={() => setHovered(category)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hovered ? (
            <>
              <span className="max-w-[104px] truncate text-[12px] text-muted-foreground">
                {hovered.label}
              </span>
              <span className="font-mono-numbers text-[15px] font-semibold tracking-tight text-foreground">
                <Money value={hovered.total} />
              </span>
              <span className="font-mono-numbers text-[11px] text-primary">
                {Math.round((hovered.total / Math.max(activeSpend, 1)) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="font-mono-numbers text-[17px] font-semibold tracking-tight text-foreground">
                <Money value={activeSpend} />
              </span>
              <span className="text-[11px] text-faint">
                <span className="font-mono-numbers text-primary">
                  {activeByCategory.length}
                </span>{' '}
                {activeByCategory.length === 1 ? 'category' : 'categories'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>

    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-3 py-2.5 sm:px-4">
        <h3 className="label">Breakdown</h3>
        <span className="text-[11px] text-muted-foreground">{periodLabel}</span>
      </div>

      {activeByCategory.length ? (
        <>
          <div className="divide-y divide-border">
            {activeByCategory.map((c) => {
              const color = getCategoryColor(c.tone);
              const pct = Math.round((c.total / Math.max(activeSpend, 1)) * 100);
              const active = hovered?.id === c.id;
              return (
                <div
                  key={c.id}
                  onMouseEnter={() => setHovered(c)}
                  onMouseLeave={() => setHovered(null)}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors sm:px-4 ${
                    active ? 'bg-primary/[0.055]' : 'hover:bg-primary/[0.035]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CategoryIcon color={color} icon={getCategoryIcon(c)} size="xs" />
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {c.label}
                    </span>
                    <span className="font-mono-numbers shrink-0 text-[11px] text-primary">
                      {c.count}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono-numbers w-9 text-right text-[11px] text-faint">
                      {pct}%
                    </span>
                    <span className="font-mono-numbers text-[13px] font-medium text-foreground">
                      <Money value={c.total} />
                    </span>
                  </div>

                  <div className="col-span-2">
                    <Bar value={pct} color={color} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-primary/25 bg-primary/[0.07] px-3 py-2.5 sm:px-4">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
              Total
            </span>
            <span className="font-mono-numbers text-[13px] font-semibold text-foreground">
              <Money value={activeSpend} precise />
            </span>
          </div>
        </>
      ) : (
        <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
          No expenses in this period.
        </p>
      )}
    </div>
  </div>
);
