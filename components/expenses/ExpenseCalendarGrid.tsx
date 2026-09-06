'use client';

import { useMemo } from 'react';
import { Expense } from '@/types/expense';
import { CycleKey } from '@/lib/cycle';
import {
  buildCycleCalendarWeeks,
  groupExpensesByDateKey,
  sumByAmount,
  toLocalDateKey,
} from '@/lib/cycle-calendar';
import { moneyCompact, moneyExact } from '@/lib/utils';
import { ExpenseDateDisplay } from '@/components/expenses/ExpenseDateDisplay';

const WEEKDAYS = [
  { short: 'M', full: 'Mon' },
  { short: 'T', full: 'Tue' },
  { short: 'W', full: 'Wed' },
  { short: 'T', full: 'Thu' },
  { short: 'F', full: 'Fri' },
  { short: 'S', full: 'Sat' },
  { short: 'S', full: 'Sun' },
];

/** Shared sizing — mobile stays compact; desktop cells are wider, slightly shorter. */
const CELL_SIZE =
  'min-h-11 p-0.5 sm:min-h-[4.25rem] sm:p-2 md:min-h-[4.75rem] md:p-2';

interface ExpenseCalendarGridProps {
  expenses: Expense[];
  cycleKey: CycleKey;
  cycleStartDay: number;
  hideAmounts: boolean;
  onDayClick: (dateKey: string) => void;
}

export const ExpenseCalendarGrid = ({
  expenses,
  cycleKey,
  cycleStartDay,
  hideAmounts,
  onDayClick,
}: ExpenseCalendarGridProps) => {
  const todayKey = toLocalDateKey(new Date());

  const weeks = useMemo(
    () => buildCycleCalendarWeeks(cycleKey, cycleStartDay, 1),
    [cycleKey, cycleStartDay]
  );

  const byDate = useMemo(
    () => groupExpensesByDateKey(expenses, (e) => new Date(e.date)),
    [expenses]
  );

  const formatDayLabel = (date: Date) =>
    date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className="mt-3 w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {WEEKDAYS.map(({ short, full }) => (
          <div
            key={full}
            aria-label={full}
            className="px-0 py-2 text-center text-[10px] font-medium tracking-[0.04em] text-muted-foreground uppercase sm:px-1 sm:py-2.5 sm:text-[11px] md:py-3"
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x divide-border">
            {week.map((day) => {
              const dayExpenses = byDate.get(day.dateKey) ?? [];
              const total = sumByAmount(dayExpenses);
              const isToday = day.dateKey === todayKey;
              const count = dayExpenses.length;

              if (!day.inCycle) {
                return (
                  <div
                    key={day.dateKey}
                    className={`flex ${CELL_SIZE} items-start justify-center bg-secondary/20 sm:justify-start`}
                    aria-hidden="true"
                  >
                    <ExpenseDateDisplay date={day.date} dayOnly muted />
                  </div>
                );
              }

              const ariaLabel =
                count > 0
                  ? `${formatDayLabel(day.date)}, ${moneyExact(total, hideAmounts)}, ${count} expense${count === 1 ? '' : 's'}`
                  : `${formatDayLabel(day.date)}, no expenses`;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => onDayClick(day.dateKey)}
                  aria-label={ariaLabel}
                  aria-current={isToday ? 'date' : undefined}
                  className={`press flex w-full min-w-0 cursor-pointer touch-manipulation flex-col items-center justify-between gap-0.5 text-center transition-colors active:bg-primary/10 hover:bg-primary/[0.06] sm:items-start sm:justify-between sm:gap-1.5 sm:text-left ${CELL_SIZE}`}
                >
                  <ExpenseDateDisplay date={day.date} dayOnly />
                  <span
                    className={`mt-auto max-w-full truncate font-mono-numbers text-[9px] leading-tight tabular-nums sm:text-[11px] md:text-[12px] ${
                      total > 0
                        ? 'font-medium text-foreground'
                        : 'text-faint'
                    }`}
                  >
                    <span className="sm:hidden">
                      {total > 0 ? moneyCompact(total, hideAmounts) : '—'}
                    </span>
                    <span className="hidden sm:inline">
                      {total > 0 ? moneyExact(total, hideAmounts) : '—'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
