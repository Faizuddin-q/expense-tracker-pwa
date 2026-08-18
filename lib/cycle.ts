/** A cycle's identity is its actual start date, e.g. "2026-07-05" for a
 *  cycle that runs 5 Jul – 4 Aug 2026 when cycleStartDay = 5. Sorts
 *  chronologically as a plain string, same guarantee the old "YYYY-MM"
 *  keys relied on. When cycleStartDay is 29-31 and the month is shorter
 *  (e.g. Feb), the key holds that month's clamped last-day instead. */
export type CycleKey = string;

export interface CycleRange {
  key: CycleKey;
  start: Date; // local midnight, inclusive
  end: Date; // local 23:59:59.999, inclusive
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m0: number, d: number): CycleKey =>
  `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

/** Clamp defensively even though the UI/API only ever allow 1-31; keeps this
 *  module safe to call with untrusted/legacy data (e.g. absent field → 1). */
const normalize = (cycleStartDay: number | undefined | null): number => {
  const n = Number(cycleStartDay);
  if (!Number.isInteger(n) || n < 1 || n > 31) return 1;
  return n;
};

const daysInMonth = (year: number, month0: number): number =>
  new Date(year, month0 + 1, 0).getDate();

/** The day a cycle actually starts on for a given calendar month — the
 *  requested day, or that month's last day when the month is shorter
 *  (e.g. cycleStartDay=31 starts on the 28th/29th in February). */
const effectiveStartDay = (
  year: number,
  month0: number,
  cycleStartDay: number
): number => Math.min(cycleStartDay, daysInMonth(year, month0));

/** date → key: which cycle does this date fall into? */
export function getCycleKey(date: Date, cycleStartDay: number): CycleKey {
  const day = normalize(cycleStartDay);
  const y = date.getFullYear();
  const m0 = date.getMonth();
  const d = date.getDate();
  const thisMonthStart = effectiveStartDay(y, m0, day);
  // On/after this month's (possibly clamped) start day → cycle began THIS
  // calendar month. Otherwise it began LAST calendar month.
  if (d >= thisMonthStart) return toKey(y, m0, thisMonthStart);
  const prevMonth = new Date(y, m0 - 1, 1); // day=1 avoids overflow; Date's
  // own rollover handles Dec -> Jan of the previous year for free.
  const prevStart = effectiveStartDay(
    prevMonth.getFullYear(),
    prevMonth.getMonth(),
    day
  );
  return toKey(prevMonth.getFullYear(), prevMonth.getMonth(), prevStart);
}

/** key → {start, end}: cycle boundaries, inclusive, local time. Needs the
 *  (unclamped) cycleStartDay to correctly clamp the END boundary too. */
export function getCycleRange(key: CycleKey, cycleStartDay: number): CycleRange {
  const day = normalize(cycleStartDay);
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const nextMonth = new Date(y, m, 1); // m is already 1-based == next month's 0-based index
  const nextStart = effectiveStartDay(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    day
  );
  const end = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextStart);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { key, start, end };
}

/** Current cycle, given "now". */
export function getCurrentCycleKey(
  cycleStartDay: number,
  now: Date = new Date()
): CycleKey {
  return getCycleKey(now, cycleStartDay);
}

/** Display label for a cycle. cycleStartDay=1 reduces to today's format
 *  exactly ("August 2026"). Otherwise spans two months: "5 Jul – 4 Aug 2026". */
export function formatCycleLabel(key: CycleKey, cycleStartDay: number): string {
  const day = normalize(cycleStartDay);
  const { start, end } = getCycleRange(key, day);
  if (day === 1) {
    return start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  const startStr = start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  const endStr = end.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

/** Format a Date as a "YYYY-MM-DD" string suitable for an <input type="date">
 *  value — local calendar date, no timezone conversion. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Bucket a list of dated items into a Map<CycleKey, T[]>, always including
 *  the current cycle even if empty — mirrors the "always show current
 *  month" behavior the Dashboard/Expenses/MonthlySummary views want. */
export function groupByCycle<T>(
  items: T[],
  getDate: (item: T) => Date,
  cycleStartDay: number,
  now: Date = new Date()
): Map<CycleKey, T[]> {
  const groups = new Map<CycleKey, T[]>();
  for (const item of items) {
    const d = getDate(item);
    if (isNaN(d.getTime())) continue;
    const key = getCycleKey(d, cycleStartDay);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const currentKey = getCurrentCycleKey(cycleStartDay, now);
  if (!groups.has(currentKey)) groups.set(currentKey, []);
  return groups;
}
