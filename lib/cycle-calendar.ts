import type { CycleKey } from './cycle.ts';
import { getCycleRange, toDateInputValue } from './cycle.ts';

/** Local calendar date as YYYY-MM-DD (same as toDateInputValue). */
export const toLocalDateKey = toDateInputValue;

export interface CalendarDay {
  date: Date;
  dateKey: string;
  inCycle: boolean;
}

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return startOfDay(next);
};

/** Bucket dated items by local YYYY-MM-DD key. */
export function groupExpensesByDateKey<T>(
  items: T[],
  getDate: (item: T) => Date
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const d = getDate(item);
    if (isNaN(d.getTime())) continue;
    const key = toLocalDateKey(d);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

/** Sum amounts for a list of expenses (or any item with an amount field). */
export function sumByAmount<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** Build a Mon–Sun week grid covering one billing cycle, padded like Google Calendar. */
export function buildCycleCalendarWeeks(
  cycleKey: CycleKey,
  cycleStartDay: number,
  weekStartsOn: 0 | 1 = 1
): CalendarDay[][] {
  const { start, end } = getCycleRange(cycleKey, cycleStartDay);
  const cycleStart = startOfDay(start);
  const cycleEnd = startOfDay(end);

  const days: CalendarDay[] = [];
  for (let d = cycleStart; d <= cycleEnd; d = addDays(d, 1)) {
    days.push({
      date: d,
      dateKey: toLocalDateKey(d),
      inCycle: true,
    });
  }

  if (days.length === 0) return [];

  const leadPad = (days[0].date.getDay() - weekStartsOn + 7) % 7;
  for (let i = leadPad; i > 0; i--) {
    const d = addDays(days[0].date, -i);
    days.unshift({ date: d, dateKey: toLocalDateKey(d), inCycle: false });
  }

  const lastDow = days[days.length - 1].date.getDay();
  const trailPad = (weekStartsOn + 6 - lastDow + 7) % 7;
  for (let i = 1; i <= trailPad; i++) {
    const d = addDays(days[days.length - 1].date, i);
    days.push({ date: d, dateKey: toLocalDateKey(d), inCycle: false });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** All in-cycle date keys for a billing cycle. */
export function getCycleDateKeys(
  cycleKey: CycleKey,
  cycleStartDay: number
): string[] {
  const { start, end } = getCycleRange(cycleKey, cycleStartDay);
  const keys: string[] = [];
  for (let d = startOfDay(start); d <= startOfDay(end); d = addDays(d, 1)) {
    keys.push(toLocalDateKey(d));
  }
  return keys;
}
