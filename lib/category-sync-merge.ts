import type { StoredCategory } from './ensure-default-categories.ts';

export const mergeCategoriesById = (
  existing: StoredCategory[],
  incoming: StoredCategory[],
  deletedCategoryIds?: string[]
): StoredCategory[] => {
  const mergedById = new Map<string, StoredCategory>();
  for (const c of existing) {
    if (typeof c?.id === 'string') mergedById.set(c.id, c);
  }
  for (const c of incoming) mergedById.set(c.id, c);
  if (Array.isArray(deletedCategoryIds)) {
    for (const id of deletedCategoryIds) {
      if (typeof id === 'string' && id.length > 0) mergedById.delete(id);
    }
  }
  return Array.from(mergedById.values()).slice(0, 100);
};

/** Reject accidental full wipes from an empty client payload. */
export const shouldSkipCategoryUpdate = (
  categories: unknown[],
  deletedCategoryIds?: string[]
): boolean =>
  categories.length === 0 &&
  (!Array.isArray(deletedCategoryIds) || deletedCategoryIds.length === 0);
