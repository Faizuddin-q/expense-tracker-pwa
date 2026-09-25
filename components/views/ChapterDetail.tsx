'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Archive, Pencil, Plus, Trash2 } from 'lucide-react';
import { Chapter, ChapterEntry } from '@/types/chapter';
import { useChapters } from '@/lib/chapter-store';
import {
  useChapterByCategory,
  useChapterEntries,
  useChapterEntriesFor,
  useChapterTotal,
} from '@/lib/chapter-entry-store';
import { useAllCategories } from '@/lib/category-store';
import { useProfileStore } from '@/lib/profile-store';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ExpenseEditDialog } from '@/components/ExpenseEditDialog';
import { ExpenseDeleteDialog } from '@/components/ExpenseDeleteDialog';
import { ChapterFormDialog } from '@/components/ChapterFormDialog';
import { ChapterAddEntryDialog } from '@/components/ChapterAddEntryDialog';
import {
  ExpenseTableHeader,
  ExpenseTableRow,
  LIST_INNER,
  SortDir,
  SortKey,
} from '@/components/expenses/expense-table';

export const ChapterDetail = ({ chapter }: { chapter: Chapter }) => {
  const router = useRouter();
  const categories = useAllCategories();
  const total = useChapterTotal(chapter.id);
  const entries = useChapterEntriesFor(chapter.id);
  const byCategory = useChapterByCategory(chapter.id);
  const updateChapter = useChapters((s) => s.updateChapter);
  const archiveChapter = useChapters((s) => s.archiveChapter);
  const deleteChapter = useChapters((s) => s.deleteChapter);
  const addEntry = useChapterEntries((s) => s.addEntry);
  const updateEntry = useChapterEntries((s) => s.updateEntry);
  const deleteEntry = useChapterEntries((s) => s.deleteEntry);

  const hideAmounts = useProfileStore((s) => s.hideAmounts);

  const [editingChapter, setEditingChapter] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChapterEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ChapterEntry | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortedEntries = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const time = (v?: string) => new Date(v ?? 0).getTime();
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (a.amount - b.amount) * dir;
        case 'category':
          return (
            categoryFor(a.category, categories).label.localeCompare(
              categoryFor(b.category, categories).label
            ) * dir
          );
        case 'createdAt':
          return (time(a.createdAt) - time(b.createdAt)) * dir;
        case 'updatedAt':
          return (
            (time(a.updatedAt ?? a.createdAt) -
              time(b.updatedAt ?? b.createdAt)) *
            dir
          );
        case 'date':
        default:
          return (time(a.date) - time(b.date)) * dir;
      }
    });
  }, [entries, sortBy, sortDir, categories]);

  const sortedByCategory = useMemo(
    () => [...byCategory].sort((a, b) => b.total - a.total),
    [byCategory]
  );

  const overBudget = Boolean(chapter.budget) && total > (chapter.budget ?? 0);
  const pct = chapter.budget
    ? Math.min(100, Math.round((total / chapter.budget) * 100))
    : null;

  return (
    <section className="mx-auto max-w-3xl lg:max-w-6xl">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-foreground">
              {chapter.name}
            </p>
            <p className="font-mono-numbers mt-1 text-[24px] font-semibold text-foreground">
              <Money value={total} />
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditingChapter(true)}
              aria-label="Edit chapter"
              className="press grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="size-3.5" strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={() => archiveChapter(chapter.id, !chapter.archived)}
              aria-label={chapter.archived ? 'Unarchive chapter' : 'Archive chapter'}
              className="press grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
            >
              {chapter.archived ? (
                <ArchiveRestore className="size-3.5" strokeWidth={1.9} />
              ) : (
                <Archive className="size-3.5" strokeWidth={1.9} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${chapter.name}" and all its expenses?`)) {
                  deleteChapter(chapter.id);
                  router.push('/chapters');
                }
              }}
              aria-label="Delete chapter"
              className="press grid size-7 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" strokeWidth={1.9} />
            </button>
          </div>
        </div>

        {chapter.budget ? (
          <div className="mt-3">
            <Bar
              value={pct ?? 0}
              color={overBudget ? 'var(--destructive)' : 'var(--primary)'}
            />
            <p
              className={`mt-1.5 text-[11px] ${overBudget ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {overBudget ? 'Over' : 'Of'} <Money value={chapter.budget} /> budget
            </p>
          </div>
        ) : (
          <button
            onClick={() => setEditingChapter(true)}
            className="mt-3 cursor-pointer text-[11px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            Set a budget
          </button>
        )}
      </div>

      {/* By category - same row shape as MonthlySummary's per-category breakdown */}
      {sortedByCategory.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <p className="mb-2.5 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            By category
          </p>
          <div className="space-y-2">
            {sortedByCategory.map((c) => {
              const catPct = Math.round((c.total / Math.max(total, 1)) * 100);
              const color = getCategoryColor(c.tone);
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex w-28 min-w-0 shrink-0 items-center gap-2 sm:w-36">
                    <CategoryIcon color={color} icon={getCategoryIcon(c)} size="xs" />
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {c.label}
                    </span>
                  </div>
                  <Bar value={catPct} color={color} className="flex-1" />
                  <span className="font-mono-numbers w-9 shrink-0 text-right text-[11px] text-faint">
                    {catPct}%
                  </span>
                  <span className="font-mono-numbers w-20 shrink-0 text-right text-[12px] font-medium text-foreground">
                    <Money value={c.total} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Expenses
        </p>
        <button
          type="button"
          onClick={() => setAddingEntry(true)}
          className="press flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          Add expense
        </button>
      </div>

      {sortedEntries.length ? (
        <div className="mt-2 max-w-full overflow-hidden rounded-xl border border-border bg-card [contain:layout]">
          <div className="max-w-full overflow-x-auto overscroll-x-contain sm:overflow-x-auto">
            <div className={LIST_INNER}>
              <ExpenseTableHeader sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />

              {sortedEntries.map((entry) => (
                <ExpenseTableRow
                  key={entry.id}
                  expense={entry}
                  categories={categories}
                  hideAmounts={hideAmounts}
                  onEdit={setEditingEntry}
                  onDelete={setDeletingEntry}
                />
              ))}

              <div className="flex items-center justify-between gap-3 border-t border-primary/25 bg-primary/[0.07] px-2.5 py-2.5 sm:px-3">
                <span className="text-[11px] font-semibold tracking-[0.04em] text-primary uppercase">
                  Total
                </span>
                <span className="font-mono-numbers text-right text-[13px] font-semibold whitespace-nowrap tabular-nums text-foreground">
                  <Money value={total} precise />
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-[13px] text-muted-foreground">
            No expenses in this chapter yet.
          </p>
        </div>
      )}

      {editingChapter && (
        <ChapterFormDialog
          chapter={chapter}
          onSave={(input) => {
            updateChapter(chapter.id, input);
            setEditingChapter(false);
          }}
          onClose={() => setEditingChapter(false)}
        />
      )}

      {addingEntry && (
        <ChapterAddEntryDialog
          categories={categories}
          onSave={(input) => {
            addEntry(chapter.id, input);
            setAddingEntry(false);
          }}
          onClose={() => setAddingEntry(false)}
        />
      )}

      {editingEntry && (
        <ExpenseEditDialog
          expense={editingEntry}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSave={(patch) => {
            updateEntry(editingEntry.id, patch);
            setEditingEntry(null);
          }}
        />
      )}

      {deletingEntry && (
        <ExpenseDeleteDialog
          expense={deletingEntry}
          categories={categories}
          onClose={() => setDeletingEntry(null)}
          onConfirm={() => {
            deleteEntry(deletingEntry.id);
            setDeletingEntry(null);
          }}
        />
      )}
    </section>
  );
};
