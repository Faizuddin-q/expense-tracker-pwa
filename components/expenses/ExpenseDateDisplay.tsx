'use client';

import { toLocalDateKey } from '@/lib/cycle-calendar';

export const isExpenseToday = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;
  return toLocalDateKey(d) === toLocalDateKey(new Date());
};

const monthShort = (d: Date) =>
  d.toLocaleDateString('en-IN', { month: 'short' });

type ExpenseDateDisplayProps = {
  date: string | Date;
  withYear?: boolean;
  /** Calendar cells — day number only (month is in the cycle header). */
  dayOnly?: boolean;
  muted?: boolean;
  className?: string;
};

export const ExpenseDateDisplay = ({
  date,
  withYear = false,
  dayOnly = false,
  muted = false,
  className = '',
}: ExpenseDateDisplayProps) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return <span>—</span>;

  const today = isExpenseToday(d);
  const day = d.getDate();
  const month = monthShort(d);
  const yearSuffix = withYear ? ` ${d.getFullYear()}` : '';

  const dayClass = today
    ? 'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground sm:size-7 sm:text-[12px]'
    : muted
      ? 'text-[11px] text-faint sm:text-[13px]'
      : 'text-[11px] font-medium text-foreground sm:text-[13px] md:text-[14px]';

  const monthClass = muted
    ? 'text-[9px] text-faint capitalize sm:text-[10px]'
    : 'text-[10px] text-muted-foreground capitalize sm:text-[12px]';

  if (dayOnly) {
    return <span className={className}><span className={dayClass}>{day}</span></span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-mono-numbers ${className}`}
    >
      <span className={dayClass}>{day}</span>
      <span className={monthClass}>
        {month}
        {yearSuffix}
      </span>
    </span>
  );
};
