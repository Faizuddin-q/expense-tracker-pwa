import { z } from 'zod';

export const CHAPTER_ENTRY_UPSERT_FIELDS = [
  'chapterId',
  'amount',
  'category',
  'note',
  'date',
  'paymentMethod',
  'createdAt',
] as const;

export const chapterPayloadSchema = z
  .object({
    localId: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    budget: z.number().nullable().optional(),
    archived: z.boolean().optional(),
    createdAt: z.union([z.string(), z.number()]).optional(),
    updatedAt: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const chaptersUpsertSchema = z.object({
  chapters: z.array(chapterPayloadSchema).max(500),
});

export const chaptersDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
});

export const chapterEntryPayloadSchema = z
  .object({
    localId: z.string().optional(),
    id: z.string().optional(),
    chapterId: z.string().optional(),
    amount: z.number().optional(),
    category: z.string().optional(),
    note: z.string().nullable().optional(),
    date: z.union([z.string(), z.number()]).optional(),
    paymentMethod: z.string().optional(),
    createdAt: z.union([z.string(), z.number()]).optional(),
    updatedAt: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const chapterEntriesUpsertSchema = z.object({
  entries: z.array(chapterEntryPayloadSchema).max(10000),
});

export const chapterEntriesDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(10000),
});
