import type { SyncOptions } from './sync-types.ts';

type Row = { id: string; localId?: string };

const mergeDeleted = (
  a: string[] | undefined,
  b: string[] | undefined
): string[] => {
  return [...new Set([...(a ?? []), ...(b ?? [])])];
};

/** Later rows overwrite the same id. An omitted list keeps the earlier one. */
const mergeById = <T extends Row>(
  base: T[] | null | undefined,
  next: T[] | null | undefined
): T[] | undefined => {
  if (next == null) return base ?? undefined;
  if (!base?.length) return next.length ? next : undefined;
  const byId = new Map<string, T>();
  for (const item of base) byId.set(item.id, item);
  for (const item of next) byId.set(item.id, item);
  return [...byId.values()];
};

/**
 * Union queued rows, then drop anything a later call deleted.
 * A row present in the later list is a restore or edit, so it stays.
 */
const mergeRows = <T extends Row>(
  baseRows: T[] | null | undefined,
  nextRows: T[] | null | undefined,
  baseDeleted: string[] | undefined,
  nextDeleted: string[] | undefined
): { rows: T[] | undefined; deleted: string[] | undefined } => {
  const rows = mergeById(baseRows, nextRows);
  const restored = new Set(
    (nextRows ?? []).flatMap((row) =>
      [row.id, row.localId].filter((id): id is string => Boolean(id))
    )
  );
  const deleted = mergeDeleted(baseDeleted, nextDeleted).filter(
    (id) => !restored.has(id)
  );
  const drop = new Set(deleted);
  const kept = rows?.filter(
    (row) => !drop.has(row.id) && !(row.localId && drop.has(row.localId))
  );
  return {
    rows: kept?.length ? kept : undefined,
    deleted: deleted.length ? deleted : undefined,
  };
};

/** Coalesce rapid sync calls into one follow-up with the latest intent. */
export const mergeSyncOptions = (
  base: SyncOptions | undefined,
  next: SyncOptions
): SyncOptions => {
  if (!base) return { ...next };

  const expenses = mergeRows(
    base.local,
    next.local,
    base.deletedIds,
    next.deletedIds
  );
  const chapters = mergeRows(
    base.chapters,
    next.chapters,
    base.deletedChapterIds,
    next.deletedChapterIds
  );
  const entries = mergeRows(
    base.chapterEntries,
    next.chapterEntries,
    base.deletedChapterEntryIds,
    next.deletedChapterEntryIds
  );

  return {
    id: next.id ?? base.id,
    local: expenses.rows,
    income:
      next.income !== undefined && next.income !== null ? next.income : base.income,
    categories:
      next.categories !== undefined && next.categories !== null
        ? next.categories
        : base.categories,
    deletedCategoryIds: (() => {
      const ids = mergeDeleted(base.deletedCategoryIds, next.deletedCategoryIds);
      return ids.length ? ids : undefined;
    })(),
    deletedIds: expenses.deleted,
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
    chapters: chapters.rows,
    deletedChapterIds: chapters.deleted,
    chapterEntries: entries.rows,
    deletedChapterEntryIds: entries.deleted,
  };
};
