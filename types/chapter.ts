import { CategoryId, Payment } from '@/types/expense';

/** A one-off spend you track outside your regular monthly budget — a trip, a big purchase, anything. */
export type Chapter = {
  id: string;
  name: string;
  budget?: number;
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type ChapterEntry = {
  id: string;
  localId?: string;
  chapterId: string;
  amount: number;
  category: CategoryId;
  note?: string;
  paymentMethod?: Payment;
  date: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};
