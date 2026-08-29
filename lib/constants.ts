import {
  Car,
  CalendarRange,
  Film,
  HeartPulse,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import { Category, Payment } from '@/types/expense';

export const builtInCategories: Category[] = [
  { id: 'food', label: 'Food', tone: 'mint', iconName: 'utensils', Icon: Utensils },
  { id: 'transport', label: 'Transport', tone: 'sky', iconName: 'car', Icon: Car },
  {
    id: 'shopping',
    label: 'Shopping',
    tone: 'lavender',
    iconName: 'shopping',
    Icon: ShoppingBag,
  },
  { id: 'bills', label: 'Bills', tone: 'peach', iconName: 'receipt', Icon: Receipt },
  {
    id: 'health',
    label: 'Health',
    tone: 'blush',
    iconName: 'health',
    Icon: HeartPulse,
  },
  {
    id: 'entertainment',
    label: 'Fun',
    tone: 'butter',
    iconName: 'film',
    Icon: Film,
  },
  { id: 'other', label: 'Other', tone: 'gray', iconName: 'plus', Icon: Plus },
];

/** The 4 payment methods surfaced in the UI (picker, list, CSV export). The
 *  `Payment` type also allows 'wallet' | 'other' for legacy/future data, but
 *  those aren't offered as picker choices. */
export const PAYMENT_METHODS: { id: Payment; label: string }[] = [
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
  { id: 'cash', label: 'Cash' },
  { id: 'netbanking', label: 'Net banking' },
];

export const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((p) => [p.id, p.label])
);

export const navItems = [
  { id: 'home', label: 'Quick add', shortLabel: 'Add', icon: Plus, href: '/' },
  {
    id: 'dashboard',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'summary',
    label: 'Summary',
    shortLabel: 'Summary',
    icon: CalendarRange,
    href: '/summary',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    shortLabel: 'Expenses',
    icon: Receipt,
    href: '/expenses',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: SettingsIcon,
    href: '/settings',
  },
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
