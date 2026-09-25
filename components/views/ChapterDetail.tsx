'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Archive, ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Chapter, ChapterEntry } from '@/types/chapter';
import { useChapters } from '@/lib/chapter-store';
import {
  useChapterByCategory,
  useChapterEntries,
  useChapterEntriesFor,
  useChapterTotal,
} from '@/lib/chapter-entry-store';
import { useAllCategories } from '@/lib/category-store';
import { categoryFor, getCategoryColor, getCategoryIcon } from '@/lib/utils';
import { Money } from '@/components/Money';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ChapterFormDialog } from '@/components/ChapterFormDialog';
import { ChapterEntryFormDialog } from '@/components/ChapterEntryFormDialog';
import { ChapterEntryDeleteDialog } from '@/components/ChapterEntryDeleteDialog';

const EntryRow = ({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ChapterEntry;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const categories = useAllCategories();
  const c = categoryFor(entry.category, categories);
  const color = getCategoryColor(c.tone);
  const Icon = getCategoryIcon(c);
  const date = new Date(entry.date);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <CategoryIcon color={color} icon={Icon} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {entry.note || c.label}
        </p>
        <p className="truncate text-[11px] text-faint">
          {entry.note ? `${c.label} · ` : ''}
          {isNaN(date.getTime())
            ? ''
            : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <span className="font-mono-numbers shrink-0 text-[13px] font-semibold text-foreground">
        <Money value={entry.amount} />
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit expense"
        className="press grid size-7 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="size-3.5" strokeWidth={1.9} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete expense"
        className="press grid size-7 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" strokeWidth={1.9} />
      </button>
    </div>
  );
};

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

  const [editingChapter, setEditingChapter] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChapterEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ChapterEntry | null>(null);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [entries]
  );

  const overBudget = Boolean(chapter.budget) && total > (chapter.budget ?? 0);
  const pct = chapter.budget
    ? Math.min(100, Math.round((total / chapter.budget) * 100))
    : null;

  return (
    <section className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => router.push('/chapters')}
        className="press mb-3 flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
        Chapters
      </button>

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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
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

      {byCategory.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="mb-2.5 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            By category
          </p>
          <div className="space-y-2">
            {byCategory
              .slice()
              .sort((a, b) => b.total - a.total)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <CategoryIcon color={getCategoryColor(c.tone)} icon={getCategoryIcon(c)} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                    {c.label}
                  </span>
                  <span className="font-mono-numbers shrink-0 text-[12px] font-semibold text-foreground">
                    <Money value={c.total} />
                  </span>
                </div>
              ))}
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
        <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sortedEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onEdit={() => setEditingEntry(entry)}
              onDelete={() => setDeletingEntry(entry)}
            />
          ))}
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
        <ChapterEntryFormDialog
          categories={categories}
          onSave={(input) => {
            addEntry(chapter.id, input);
            setAddingEntry(false);
          }}
          onClose={() => setAddingEntry(false)}
        />
      )}

      {editingEntry && (
        <ChapterEntryFormDialog
          entry={editingEntry}
          categories={categories}
          onSave={(patch) => {
            updateEntry(editingEntry.id, patch);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {deletingEntry && (
        <ChapterEntryDeleteDialog
          entry={deletingEntry}
          categories={categories}
          onConfirm={() => {
            deleteEntry(deletingEntry.id);
            setDeletingEntry(null);
          }}
          onClose={() => setDeletingEntry(null)}
        />
      )}
    </section>
  );
};
