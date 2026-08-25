import type { SyncOptions } from './sync-types.ts';

/** Coalesce rapid sync calls into one follow-up with the latest intent. */
export const mergeSyncOptions = (
  base: SyncOptions | undefined,
  next: SyncOptions
): SyncOptions => {
  if (!base) return { ...next };

  const mergeDeleted = (
    a: string[] | undefined,
    b: string[] | undefined
  ): string[] | undefined => {
    const merged = [...new Set([...(a ?? []), ...(b ?? [])])];
    return merged.length ? merged : undefined;
  };

  return {
    id: next.id ?? base.id,
    local: next.local ?? base.local,
    income:
      next.income !== undefined && next.income !== null ? next.income : base.income,
    categories:
      next.categories !== undefined && next.categories !== null
        ? next.categories
        : base.categories,
    deletedCategoryIds: mergeDeleted(
      base.deletedCategoryIds,
      next.deletedCategoryIds
    ),
    deletedIds: mergeDeleted(base.deletedIds, next.deletedIds),
    budget:
      next.budget !== undefined && next.budget !== null ? next.budget : base.budget,
    hideAmounts:
      next.hideAmounts !== undefined && next.hideAmounts !== null
        ? next.hideAmounts
        : base.hideAmounts,
    onboardingComplete:
      next.onboardingComplete !== undefined && next.onboardingComplete !== null
        ? next.onboardingComplete
        : base.onboardingComplete,
    name: next.name !== undefined && next.name !== null ? next.name : base.name,
    theme:
      next.theme !== undefined && next.theme !== null ? next.theme : base.theme,
    cycleStartDay:
      next.cycleStartDay !== undefined && next.cycleStartDay !== null
        ? next.cycleStartDay
        : base.cycleStartDay,
  };
};
