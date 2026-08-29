import { z } from 'zod';

export const profileUpdateSchema = z.object({
  monthlyIncome: z.number().finite().positive().optional(),
  monthlyBudget: z.number().finite().positive().optional(),
  hideAmounts: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  cycleStartDay: z.number().int().min(1).max(31).optional(),
});

export const adminProfilePatchSchema = z.object({
  monthlyIncome: z.number().min(0).optional(),
  monthlyBudget: z.number().min(0).optional(),
  hideAmounts: z.boolean().optional(),
});
