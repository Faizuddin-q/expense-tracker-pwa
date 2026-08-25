import { defaultCategorySeed } from './default-categories.ts';

export type StoredCategory = {
  id: string;
  label: string;
  tone: string;
  iconName: string;
  custom: boolean;
};

/** Additively backfill default categories referenced by expenses but missing from profile. */
export const ensureDefaultCategories = (
  categories: StoredCategory[],
  referencedCategoryIds: Iterable<string>
): { categories: StoredCategory[]; added: string[] } => {
  const byId = new Map<string, StoredCategory>();
  for (const c of categories) {
    if (typeof c?.id === 'string') byId.set(c.id, c);
  }

  const added: string[] = [];
  const referenced = new Set(referencedCategoryIds);

  for (const seed of defaultCategorySeed) {
    if (!byId.has(seed.id) && referenced.has(seed.id)) {
      byId.set(seed.id, { ...seed, custom: true });
      added.push(seed.id);
    }
  }

  return { categories: Array.from(byId.values()), added };
};
