import { useState } from 'react';
import { BarChart3, Plus, Sparkles } from 'lucide-react';
import { Category, Expense } from '@/types/expense';
import { getCategoryColor, money } from '@/lib/utils';

interface CategoryBreakdown extends Category {
  total: number;
}

interface DashboardProps {
  expenses: Expense[];
  income: number;
  monthSpend: number;
  byCategory: CategoryBreakdown[];
}

export const Dashboard = ({
  income,
  monthSpend,
  byCategory,
}: DashboardProps) => {
  const [hoveredCategory, setHoveredCategory] =
    useState<CategoryBreakdown | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const percent = Math.min(100, Math.round((monthSpend / income) * 100));

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = byCategory.map((c) => {
    const slicePercent = monthSpend > 0 ? c.total / monthSpend : 0;
    const strokeDasharray = `${(slicePercent * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    const strokeDashoffset = (-accumulatedPercent * circumference).toFixed(2);
    accumulatedPercent += slicePercent;

    return {
      category: c,
      slicePercent,
      strokeDasharray,
      strokeDashoffset,
      color: getCategoryColor(c.tone),
    };
  });

  const handleMouseMove = (
    e: React.MouseEvent<SVGElement>,
    c: CategoryBreakdown
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredCategory(c);
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
    setTooltipPos(null);
  };

  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">August 2026</p>
              <h2 className="mt-2 text-3xl font-semibold">
                You&apos;re doing well.
              </h2>
            </div>
            <div className="rounded-full bg-accent p-3 text-primary">
              <BarChart3 className="size-5" />
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-7 sm:flex-row">
            {/* Interactive SVG Donut Chart */}
            <div
              className="relative flex size-44 shrink-0 items-center justify-center"
              onMouseLeave={handleMouseLeave}
            >
              <svg
                viewBox="0 0 100 100"
                className="size-full -rotate-90 transform"
              >
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="fill-none stroke-muted"
                  strokeWidth="14"
                />

                {/* Slices for each Category */}
                {monthSpend > 0 &&
                  slices.map(
                    ({
                      category,
                      strokeDasharray,
                      strokeDashoffset,
                      color,
                    }) => (
                      <circle
                        key={category.id}
                        cx="50"
                        cy="50"
                        r={radius}
                        className="cursor-pointer fill-none transition-all duration-200 hover:stroke-[16]"
                        stroke={color}
                        strokeWidth="13"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="butt"
                        onMouseEnter={(e) => handleMouseMove(e, category)}
                        onMouseMove={(e) => handleMouseMove(e, category)}
                        onMouseLeave={handleMouseLeave}
                      />
                    )
                  )}
              </svg>

              {/* Center Content inside Donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                {hoveredCategory ? (
                  <>
                    <span className="max-w-[90px] truncate text-xs font-medium text-muted-foreground">
                      {hoveredCategory.label}
                    </span>
                    <span className="text-lg font-bold tracking-tight">
                      {money(hoveredCategory.total)}
                    </span>
                    <span className="text-[11px] font-semibold text-primary">
                      {Math.round(
                        (hoveredCategory.total / Math.max(monthSpend, 1)) * 100
                      )}
                      %
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold tracking-tight">
                      {percent}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      of income
                    </span>
                  </>
                )}
              </div>

              {/* Floating Tooltip */}
              {hoveredCategory && tooltipPos && (
                <div
                  className="pointer-events-none absolute z-30 mb-2 whitespace-nowrap -translate-x-1/2 -translate-y-full transform rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-lg ring-1 ring-border"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(hoveredCategory.tone),
                      }}
                    />
                    <span>{hoveredCategory.label}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-semibold">
                    {money(hoveredCategory.total)}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {Math.round(
                      (hoveredCategory.total / Math.max(monthSpend, 1)) * 100
                    )}
                    % of total spend
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Spent this month</p>
              <p className="mt-1 text-3xl font-semibold">{money(monthSpend)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                of {money(income)} income ·{' '}
                <span className="text-primary">
                  {money(income - monthSpend)} left
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-accent p-6 sm:p-8">
          <Sparkles className="size-5 text-primary" />
          <h3 className="mt-5 text-xl font-semibold">A gentle insight</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {byCategory[0]?.label ?? 'Your first'} is your biggest category this
            month. Small, mindful choices can keep your spending pace
            comfortable.
          </p>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-card">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            You&apos;re on track for a calm month
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-border">
        <h3 className="font-semibold">Category breakdown</h3>
        <div className="mt-5 flex flex-col gap-4">
          {byCategory.map((c) => {
            const catColor = getCategoryColor(c.tone);
            const isHovered = hoveredCategory?.id === c.id;
            const IconComponent = c.Icon || Plus;
            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoveredCategory(c)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors ${isHovered ? 'bg-accent/60' : 'hover:bg-accent/40'}`}
              >
                <div
                  className="grid size-8 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${catColor}20`,
                    color: catColor,
                  }}
                >
                  <IconComponent className="size-4" />
                </div>
                <span className="w-28 text-sm font-medium">{c.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (c.total / Math.max(monthSpend, 1)) * 100)}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>
                <span className="w-24 text-right text-sm font-semibold">
                  {money(c.total)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
