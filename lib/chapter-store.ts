import { create } from 'zustand';
import { Chapter } from '@/types/chapter';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncStore } from '@/lib/sync-store';
import { toast } from '@/components/ToastHost';

interface ChapterStore {
  chapters: Chapter[];
  add: (chapter: Chapter) => void;
  update: (id: string, patch: Partial<Chapter>) => void;
  remove: (id: string) => void;
  hydrate: (items: Chapter[]) => void;

  addChapter: (name: string, budget?: number) => void;
  updateChapter: (id: string, patch: { name: string; budget?: number }) => void;
  archiveChapter: (id: string, archived: boolean) => void;
  deleteChapter: (id: string) => void;
  resetOnLogout: () => void;
}

export const useChapters = create<ChapterStore>((setState, getState) => ({
  chapters: [],
  add: (chapter) =>
    setState((s) => ({ chapters: [chapter, ...s.chapters] })),
  update: (id, patch) =>
    setState((s) => ({
      chapters: s.chapters.map((c) =>
        c.id === id ? { ...c, ...patch, id: c.id } : c
      ),
    })),
  remove: (id) =>
    setState((s) => ({ chapters: s.chapters.filter((c) => c.id !== id) })),
  hydrate: (items) =>
    setState({
      chapters: items.map((c) => ({ ...c, budget: c.budget || undefined })),
    }),

  addChapter: (name, budget) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Could not add chapter', 'Enter a name first');
      return;
    }
    const userId = useAuthStore.getState().userId;
    const now = new Date().toISOString();
    const chapter: Chapter = {
      id: crypto.randomUUID(),
      name: trimmed,
      budget: budget && budget > 0 ? budget : undefined,
      createdAt: now,
      updatedAt: now,
    };
    getState().add(chapter);
    toast.success('Chapter created', trimmed);
    void useSyncStore.getState().sync({
      id: userId,
      chapters: getState().chapters,
    });
  },

  updateChapter: (id, patch) => {
    const trimmed = patch.name.trim();
    if (!trimmed) return;
    const userId = useAuthStore.getState().userId;
    const now = new Date().toISOString();
    getState().update(id, {
      name: trimmed,
      budget: patch.budget && patch.budget > 0 ? patch.budget : undefined,
      updatedAt: now,
      deletedAt: null,
    });
    toast.success('Chapter updated', trimmed);
    void useSyncStore.getState().sync({
      id: userId,
      chapters: getState().chapters,
    });
  },

  archiveChapter: (id, archived) => {
    const userId = useAuthStore.getState().userId;
    getState().update(id, { archived, updatedAt: new Date().toISOString() });
    void useSyncStore.getState().sync({
      id: userId,
      chapters: getState().chapters,
    });
  },

  deleteChapter: (id) => {
    const target = getState().chapters.find((c) => c.id === id);
    if (!target) return;
    getState().remove(id);
    const userId = useAuthStore.getState().userId;
    void useSyncStore
      .getState()
      .sync({
        id: userId,
        chapters: getState().chapters,
        deletedChapterIds: [id],
      })
      .then((ok) => {
        if (ok) toast.success('Chapter deleted', `"${target.name}" removed`);
      });
  },

  resetOnLogout: () => {
    setState({ chapters: [] });
  },
}));
