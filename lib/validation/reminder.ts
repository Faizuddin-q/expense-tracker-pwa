import { z } from 'zod';

export const reminderPrefsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  timeLocal: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24-hour)'),
  weekday: z.number().int().min(0).max(6),
  monthDay: z.number().int().min(1).max(28),
  timeZone: z.string().trim().min(1).max(64),
});

export const reminderUpdateSchema = reminderPrefsSchema.partial().extend({
  enabled: z.boolean().optional(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048).optional(),
});
