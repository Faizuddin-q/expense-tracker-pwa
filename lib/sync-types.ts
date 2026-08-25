import { Category, Expense } from '@/types/expense';

/**
 * All fields optional and independent — pass only what actually changed.
 * `null` (or omitted) means "don't touch this on the server", not "clear it".
 */
export interface SyncOptions {
  id?: string;
  local?: Expense[];
  income?: number | null;
  categories?: Category[] | null;
  /** Explicit category ids to remove from cloud (required for delete under merge-by-id). */
  deletedCategoryIds?: string[];
  deletedIds?: string[];
  budget?: number | null;
  hideAmounts?: boolean | null;
  onboardingComplete?: boolean | null;
  name?: string | null;
  theme?: 'dark' | 'light' | null;
  cycleStartDay?: number | null;
  /** Login/bootstrap: pull cloud truth without uploading local IDB snapshot. */
  pullOnly?: boolean;
}
