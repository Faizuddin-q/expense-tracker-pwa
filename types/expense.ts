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
  syncStatus: 'pending' | 'synced';
};

export type Category = {
  id: CategoryId;
  label: string;
  tone: string;
  Icon: LucideIcon;
  custom?: boolean;
};
