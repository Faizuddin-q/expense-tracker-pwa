import { z } from 'zod';
import { isValidPhone, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@/lib/auth';

const phoneSchema = z
  .string()
  .trim()
  .refine(isValidPhone, 'Enter a valid 10-digit Indian mobile number.');

const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH);

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Enter your password.').max(MAX_PASSWORD_LENGTH),
});

export const registerSchema = z.object({
  phone: phoneSchema,
  password: newPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: newPasswordSchema,
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Enter a username and password'),
  password: z.string().min(1, 'Enter a username and password'),
});
