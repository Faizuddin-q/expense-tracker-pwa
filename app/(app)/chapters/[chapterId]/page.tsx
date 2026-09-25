'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useChapters } from '@/lib/chapter-store';
import { ChapterDetail } from '@/components/views/ChapterDetail';

export default function ChapterDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = use(params);
  const router = useRouter();
  const chapter = useChapters((s) => s.chapters.find((c) => c.id === chapterId));

  if (!chapter) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-[13px] text-muted-foreground">
            This chapter doesn&apos;t exist or was deleted.
          </p>
          <button
            onClick={() => router.push('/chapters')}
            className="mt-2 cursor-pointer text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            Back to Chapters
          </button>
        </div>
      </section>
    );
  }

  return <ChapterDetail chapter={chapter} />;
}
