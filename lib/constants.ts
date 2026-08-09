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
import { Category } from '@/types/expense';

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
