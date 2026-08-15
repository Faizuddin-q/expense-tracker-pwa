import { Category, Expense } from '@/types/expense';

export interface AdminUserSummary {
  userId: string;
  monthlyIncome: number;
  monthlyBudget: number;
  hideAmounts: boolean;
  onboardingComplete: boolean;
  expenseCount: number;
  totalSpend: number;
  lastActivity: string | null;
}

export interface AdminSummary {
  totalUsers: number;
  totalExpenses: number;
  totalSpend: number;
  activeLast30Days: number;
}

export interface AdminUserProfile {
  monthlyIncome: number;
  monthlyBudget: number;
  hideAmounts: boolean;
  onboardingComplete: boolean;
  categories: Category[];
  categoryOverrides: Record<string, string>;
  categoryIconOverrides: Record<string, string>;
  updatedAt: string | null;
}

export interface AdminUserDetail {
  userId: string;
  profile: AdminUserProfile;
  expenses: Expense[];
}
