'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Chapter } from '@/types/chapter';
import { useChapters } from '@/lib/chapter-store';
import { useChapterEntries } from '@/lib/chapter-entry-store';
import { Money } from '@/components/Money';
import { ChapterFormDialog } from '@/components/ChapterFormDialog';

const ChapterCard = ({ chapter }: { chapter: Chapter }) => {
  const total = useChapterEntries((s) =>
    s.entries
      .filter((e) => e.chapterId === chapter.id)
      .reduce((sum, e) => sum + e.amount, 0)
  );
  const overBudget = Boolean(chapter.budget) && total > (chapter.budget ?? 0);
  const pct = chapter.budget
    ? Math.min(100, Math.round((total / chapter.budget) * 100))
    : null;

  return (
    <Link
      href={`/chapters/${chapter.id}`}
      className="press block rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[14px] font-semibold text-foreground">
          {chapter.name}
        </p>
        {chapter.archived && (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Archived
          </span>
        )}
      </div>

      <p className="font-mono-numbers mt-2 text-[20px] font-semibold text-foreground">
        <Money value={total} />
      </p>

      {chapter.budget ? (
        <div className="mt-2.5">
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
        <p className="mt-2.5 text-[11px] text-faint">No budget set</p>
      )}
    </Link>
  );
};

export const Chapters = () => {
  const chapters = useChapters((s) => s.chapters);
  const addChapter = useChapters((s) => s.addChapter);
  const [showForm, setShowForm] = useState(false);

  const active = chapters.filter((c) => !c.archived);
  const archived = chapters.filter((c) => c.archived);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          Track spend on trips, big purchases, or anything else — kept
          separate from your monthly totals.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="press flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          New chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-[13px] text-muted-foreground">
            No chapters yet — start one for a trip, a big purchase, or
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </div>

          {archived.length > 0 && (
            <>
              <p className="mt-6 mb-2 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                Archived
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((chapter) => (
                  <ChapterCard key={chapter.id} chapter={chapter} />
                ))}
              </div>
            </>
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
