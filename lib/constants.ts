import {
  Car,
  Film,
  HeartPulse,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import { Category } from '@/types/expense';

export const builtInCategories: Category[] = [
  { id: 'food', label: 'Food', tone: 'mint', Icon: Utensils },
  { id: 'transport', label: 'Transport', tone: 'sky', Icon: Car },
  { id: 'shopping', label: 'Shopping', tone: 'lavender', Icon: ShoppingBag },
  { id: 'bills', label: 'Bills', tone: 'peach', Icon: Receipt },
  { id: 'health', label: 'Health', tone: 'blush', Icon: HeartPulse },
  { id: 'entertainment', label: 'Fun', tone: 'butter', Icon: Film },
  { id: 'other', label: 'Other', tone: 'gray', Icon: Plus },
];

export const navItems = [
  { id: 'home', label: 'Quick add', icon: Plus },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

export const quickRelogItems = [
  {
    label: 'Coffee',
    amount: 150,
    category: 'food',
    Icon: Utensils,
  },
  {
    label: 'Metro',
    amount: 180,
    category: 'transport',
    Icon: Car,
  },
  {
    label: 'Lunch',
    amount: 420,
    category: 'food',
    Icon: Utensils,
  },
] as const;
