import type { CategoryId, Expense } from '../types/expense.ts';
import { getCycleKey, getCurrentCycleKey } from './cycle.ts';

export type FrequentRelogItem = {
  key: string;
  /** Original note text when present; empty when the expense had no note. */
  label: string;
  amount: number;
  category: CategoryId;
  count: number;
};

type GroupAcc = {
  category: CategoryId;
  amount: number;
  noteKey: string;
  label: string;
  count: number;
  lastAt: number;
};

const normalizeNote = (note?: string): string =>
  (note ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Rank recurring expense patterns in the user's current billing cycle
 * (amount + category + note) and return the top matches for quick re-log.
 */
export function getFrequentRelogItems(
  expenses: Expense[],
  cycleStartDay: number,
  options?: {
    limit?: number;
    minCount?: number;
    now?: Date;
  }
): FrequentRelogItem[] {
  const limit = options?.limit ?? 4;
  const minCount = options?.minCount ?? 2;
  const now = options?.now ?? new Date();
  const cycleKey = getCurrentCycleKey(cycleStartDay, now);
  const groups = new Map<string, GroupAcc>();

  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    const date = new Date(expense.date);
    if (isNaN(date.getTime())) continue;
    if (getCycleKey(date, cycleStartDay) !== cycleKey) continue;

    const noteKey = normalizeNote(expense.note);
    const groupKey = `${expense.category}\0${expense.amount}\0${noteKey}`;
    const rawLabel = (expense.note ?? '').trim();
    const lastAt =
      new Date(expense.createdAt ?? expense.date).getTime() || date.getTime();
    const existing = groups.get(groupKey);

    if (existing) {
      existing.count += 1;
      if (lastAt >= existing.lastAt) {
        existing.lastAt = lastAt;
        if (rawLabel) existing.label = rawLabel;
      }
    } else {
      groups.set(groupKey, {
        category: expense.category,
        amount: expense.amount,
        noteKey,
        label: rawLabel,
        count: 1,
        lastAt,
      });
    }
  }

  return [...groups.values()]
    .filter((group) => group.count >= minCount)
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, limit)
    .map((group) => ({
      key: `${group.category}:${group.amount}:${group.noteKey}`,
      label: group.label,
      amount: group.amount,
      category: group.category,
      count: group.count,
    }));
}
