export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

export type ReminderPrefs = {
  enabled: boolean;
  frequency: ReminderFrequency;
  /** Local wall-clock "HH:mm" (24h). */
  timeLocal: string;
  /** 0 = Sunday … 6 = Saturday (JS Date.getDay). Weekly default is Monday (1). */
  weekday: number;
  /** 1–28. Used when frequency is monthly. */
  monthDay: number;
  timeZone: string;
  lastSentAt?: string | null;
  updatedAt?: string | null;
};

export const DEFAULT_REMINDER: ReminderPrefs = {
  enabled: false,
  frequency: 'daily',
  timeLocal: '21:00',
  weekday: 1,
  monthDay: 1,
  timeZone: 'Asia/Kolkata',
  lastSentAt: null,
  updatedAt: null,
};

/** Labels indexed by JS weekday (0 = Sunday … 6 = Saturday). */
export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Weekday picker order: Monday first. */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
] as const;

export const isValidTimeLocal = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const normalizeReminder = (raw: unknown): ReminderPrefs => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REMINDER };
  const r = raw as Record<string, unknown>;
  const frequency =
    r.frequency === 'weekly' || r.frequency === 'monthly' || r.frequency === 'daily'
      ? r.frequency
      : DEFAULT_REMINDER.frequency;
  const timeLocal =
    typeof r.timeLocal === 'string' && isValidTimeLocal(r.timeLocal)
      ? r.timeLocal
      : DEFAULT_REMINDER.timeLocal;
  const weekday =
    typeof r.weekday === 'number' &&
    Number.isInteger(r.weekday) &&
    r.weekday >= 0 &&
    r.weekday <= 6
      ? r.weekday
      : DEFAULT_REMINDER.weekday;
  const monthDay =
    typeof r.monthDay === 'number' &&
    Number.isInteger(r.monthDay) &&
    r.monthDay >= 1 &&
    r.monthDay <= 28
      ? r.monthDay
      : DEFAULT_REMINDER.monthDay;
  const timeZone =
    typeof r.timeZone === 'string' && r.timeZone.trim()
      ? r.timeZone.trim()
      : DEFAULT_REMINDER.timeZone;

  return {
    enabled: r.enabled === true,
    frequency,
    timeLocal,
    weekday,
    monthDay,
    timeZone,
    lastSentAt:
      typeof r.lastSentAt === 'string'
        ? r.lastSentAt
        : r.lastSentAt instanceof Date
          ? r.lastSentAt.toISOString()
          : null,
    updatedAt:
      typeof r.updatedAt === 'string'
        ? r.updatedAt
        : r.updatedAt instanceof Date
          ? r.updatedAt.toISOString()
          : null,
  };
};

/** Parts of `now` in the given IANA time zone. */
export const zonedParts = (
  now: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  // Some engines emit "24" for midnight — normalize to 0.
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday ?? ''] ?? 0,
  };
};

export const reminderCopy = (
  frequency: ReminderFrequency
): { title: string; body: string } => {
  if (frequency === 'weekly') {
    return {
      title: 'Weekly expense check-in',
      body: 'Log this week’s spending in Pockett',
    };
  }
  if (frequency === 'monthly') {
    return {
      title: 'Monthly expense check-in',
      body: 'Log this month’s spending in Pockett',
    };
  }
  return {
    title: 'Time to log today’s expenses',
    body: 'Quick-add anything you spent today',
  };
};

/**
 * True when the hourly cron should fire for these prefs at `now`.
 * Matches the preferred local hour; uses lastSentAt to avoid duplicates
 * in the same local calendar day (daily), week (weekly), or month (monthly).
 */
export const isReminderDue = (
  prefs: ReminderPrefs,
  now: Date = new Date()
): boolean => {
  if (!prefs.enabled) return false;
  const local = zonedParts(now, prefs.timeZone);
  const [prefHour] = prefs.timeLocal.split(':').map(Number);
  if (local.hour !== prefHour) return false;

  if (prefs.frequency === 'weekly' && local.weekday !== prefs.weekday) {
    return false;
  }
  if (prefs.frequency === 'monthly' && local.day !== prefs.monthDay) {
    return false;
  }

  if (prefs.lastSentAt) {
    const last = zonedParts(new Date(prefs.lastSentAt), prefs.timeZone);
    if (prefs.frequency === 'daily') {
      if (
        last.year === local.year &&
        last.month === local.month &&
        last.day === local.day
      ) {
        return false;
      }
    } else if (prefs.frequency === 'weekly') {
      // Same local calendar week roughly: skip if last send was < 6 days ago
      // and on the same weekday hour window already covered by day check above.
      const lastMs = new Date(prefs.lastSentAt).getTime();
      if (now.getTime() - lastMs < 6 * 24 * 60 * 60 * 1000) return false;
    } else if (prefs.frequency === 'monthly') {
      if (last.year === local.year && last.month === local.month) return false;
    }
  }

  return true;
};

/** Local YYYY-MM-DD for expense-day skip checks. */
export const localDateKey = (now: Date, timeZone: string): string => {
  const { year, month, day } = zonedParts(now, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
