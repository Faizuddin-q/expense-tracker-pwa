'use client';

import { useEffect } from 'react';
import { useSyncStore } from '@/lib/sync-store';
import { Chapters } from '@/components/views/Chapters';

export default function ChaptersPage() {
  useEffect(() => {
    void useSyncStore.getState().ensureFreshChapters();
  }, []);

  return <Chapters />;
}
