'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, Plus } from 'lucide-react';
import { Chapter } from '@/types/chapter';
import { useChapters } from '@/lib/chapter-store';
import { useChapterEntries, useChapterEntriesFor } from '@/lib/chapter-entry-store';
import { formatRelativeTime, getCategoryColor } from '@/lib/utils';
import { Money } from '@/components/Money';
import { Bar } from '@/components/Bar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ChapterFormDialog } from '@/components/ChapterFormDialog';

const ChapterCard = ({ chapter }: { chapter: Chapter }) => {
  const entries = useChapterEntriesFor(chapter.id);
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const overBudget = Boolean(chapter.budget) && total > (chapter.budget ?? 0);
  const pct = chapter.budget
    ? Math.min(100, Math.round((total / chapter.budget) * 100))
    : null;
  const accent = getCategoryColor(chapter.id);

  return (
    <Link
      href={`/chapters/${chapter.id}`}
      className={`press block rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong ${
        chapter.archived ? 'opacity-70 hover:opacity-100' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon color={accent} icon={BookOpen} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {chapter.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-faint">
              <span className="font-mono-numbers text-primary">
                {entries.length}
              </span>{' '}
              {entries.length === 1 ? 'expense' : 'expenses'}
              {chapter.updatedAt
                ? ` · ${formatRelativeTime(chapter.updatedAt)}`
                : ''}
            </p>
          </div>
        </div>
        {chapter.archived && (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Archived
          </span>
        )}
      </div>

      <p className="font-mono-numbers mt-3 text-[20px] font-semibold text-foreground">
        <Money value={total} />
      </p>

      {chapter.budget ? (
        <div className="mt-2.5">
          <Bar value={pct ?? 0} color={overBudget ? 'var(--destructive)' : 'var(--primary)'} />
          <p
            className={`mt-1.5 text-[11px] ${overBudget ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {overBudget ? 'Over' : 'Of'} <Money value={chapter.budget} /> budget
          </p>
        </div>
      ) : (
        <p className="mt-2.5 text-[11px] text-faint">No budget set</p>
      )}
    </Link>
  );
};

export const Chapters = () => {
  const chapters = useChapters((s) => s.chapters);
  const addChapter = useChapters((s) => s.addChapter);
  const allEntries = useChapterEntries((s) => s.entries);
  const [showForm, setShowForm] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const active = useMemo(() => chapters.filter((c) => !c.archived), [chapters]);
  const archived = useMemo(() => chapters.filter((c) => c.archived), [chapters]);
  const totalTracked = useMemo(
    () => allEntries.reduce((sum, e) => sum + e.amount, 0),
    [allEntries]
  );

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[12px] text-muted-foreground">
          Track spend on trips, big purchases, or anything else - kept
          separate from your monthly totals.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="press flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 sm:h-9 sm:w-auto"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          New chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
            <BookOpen className="size-5" strokeWidth={1.8} />
          </div>
          <p className="mx-auto mt-3 max-w-xs text-[13px] text-muted-foreground">
            No chapters yet - start one for a trip, a big purchase, or
            anything you want to track on its own.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            Create your first chapter
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
            <div className="px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="label">Chapters</p>
              <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-[17px]">
                {active.length}
              </p>
            </div>
            <div className="px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="label">Total tracked</p>
              <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-primary sm:text-[17px]">
                <Money value={totalTracked} />
              </p>
            </div>
            <div className="col-span-2 px-3 py-2.5 sm:col-span-1 sm:px-4 sm:py-3">
              <p className="label">Expenses logged</p>
              <p className="font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight text-foreground sm:text-[17px]">
                {allEntries.length}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </div>

          {active.length === 0 && (
            <p className="mt-4 text-center text-[13px] text-muted-foreground">
              All your chapters are archived - reopen one below, or start a
              new one.
            </p>
          )}

          {archived.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setArchivedOpen((v) => !v)}
                aria-expanded={archivedOpen}
                className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${archivedOpen ? '' : '-rotate-90'}`}
                  strokeWidth={2.2}
                />
                Archived
                <span className="font-mono-numbers text-faint normal-case tracking-normal">
                  ({archived.length})
                </span>
              </button>

              {archivedOpen && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {archived.map((chapter) => (
                    <ChapterCard key={chapter.id} chapter={chapter} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showForm && (
        <ChapterFormDialog
          onSave={(input) => {
            addChapter(input.name, input.budget);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </section>
  );
};
