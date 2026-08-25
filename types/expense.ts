import { LucideIcon } from 'lucide-react';

export type CategoryId = string;

export type Payment =
  'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other';

export type Expense = {
  id: string;
  localId?: string;
  amount: number;
  category: CategoryId;
  note?: string;
  paymentMethod?: Payment;
  date: string;
  createdAt: string;
  updatedAt?: string;
  /** ISO timestamp when soft-deleted; omitted/null = active */
  deletedAt?: string | null;
};

export type Category = {
  id: CategoryId;
  label: string;
  tone: string;
  Icon?: LucideIcon;
  iconName?: string;
  custom?: boolean;
};
