import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string(),
  label: z.string(),
  tone: z.string().optional(),
  iconName: z.string().optional(),
  custom: z.boolean().optional(),
});

export const categoriesReplaceSchema = z.object({
  categories: z.array(categorySchema).max(100),
  deletedCategoryIds: z.array(z.string()).optional(),
});
