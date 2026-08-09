import {
  Baby,
  Briefcase,
  Camera,
  Car,
  Coffee,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  LucideIcon,
  Music,
  Package,
  Palette,
  Plane,
  Plus,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tv,
  Utensils,
  Wrench,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  shopping: ShoppingBag,
  receipt: Receipt,
  health: HeartPulse,
  film: Film,
  plus: Plus,
  coffee: Coffee,
  sparkles: Sparkles,
  plane: Plane,
  home: Home,
  phone: Smartphone,
  gift: Gift,
  education: GraduationCap,
  fitness: Dumbbell,
  music: Music,
  gaming: Gamepad2,
  work: Briefcase,
  tools: Wrench,
  pets: Dog,
  baby: Baby,
  art: Palette,
  card: CreditCard,
  camera: Camera,
  tv: Tv,
  clothing: Shirt,
  package: Package,
};

export const availableCategoryIcons = Object.entries(iconMap).map(
  ([key, Icon]) => ({
    key,
    Icon,
  })
);

export const getCategoryIcon = (category: Partial<Category>): LucideIcon => {
  if (category.Icon) return category.Icon;
  if (category.iconName && iconMap[category.iconName])
    return iconMap[category.iconName];
  return Plus;
};

export const pastelPalette: string[] = [
  '#059669', // Mint Green
  '#0d9488', // Deep Teal
  '#0284c7', // Cyan Aqua
  '#38bdf8', // Sky Blue
  '#2563eb', // Electric Blue
  '#4338ca', // Royal Indigo
  '#1e3a8a', // Midnight Navy
  '#a855f7', // Lavender
  '#7e22ce', // Royal Purple
  '#581c87', // Plum Violet
  '#c026d3', // Electric Magenta
  '#db2777', // Hot Pink
  '#dc2626', // Crimson Red
  '#f97316', // Coral Orange
  '#ea580c', // Terracotta
  '#d97706', // Sunset Gold
  '#65a30d', // Lime Green
  '#15803d', // Forest Sage
  '#92400e', // Warm Copper
  '#475569', // Cool Slate
];

export const categoryColorMap: Record<string, string> = {
  mint: '#059669',
  teal: '#0d9488',
  cyan: '#0284c7',
  sky: '#38bdf8',
  blue: '#2563eb',
  indigo: '#4338ca',
  navy: '#1e3a8a',
  lavender: '#a855f7',
  purple: '#7e22ce',
  plum: '#581c87',
  magenta: '#c026d3',
  pink: '#db2777',
  rose: '#dc2626',
  coral: '#f97316',
  apricot: '#ea580c',
  amber: '#d97706',
  lime: '#65a30d',
  sage: '#15803d',
  bronze: '#92400e',
  gray: '#475569',
  // Backward compatibility alias keys for built-in categories
  food: '#059669',
  transport: '#0284c7',
  shopping: '#a855f7',
  bills: '#f97316',
  health: '#db2777',
  butter: '#d97706',
  peach: '#ea580c',
  blush: '#db2777',
  violet: '#7e22ce',
};

export const categoryColorOptions = [
  { key: 'mint', color: '#059669', label: 'Mint Green' },
  { key: 'teal', color: '#0d9488', label: 'Deep Teal' },
  { key: 'cyan', color: '#0284c7', label: 'Cyan Aqua' },
  { key: 'sky', color: '#38bdf8', label: 'Sky Blue' },
  { key: 'blue', color: '#2563eb', label: 'Electric Blue' },
  { key: 'indigo', color: '#4338ca', label: 'Royal Indigo' },
  { key: 'navy', color: '#1e3a8a', label: 'Midnight Navy' },
  { key: 'lavender', color: '#a855f7', label: 'Lavender' },
  { key: 'purple', color: '#7e22ce', label: 'Royal Purple' },
  { key: 'plum', color: '#581c87', label: 'Plum Violet' },
  { key: 'magenta', color: '#c026d3', label: 'Electric Magenta' },
  { key: 'pink', color: '#db2777', label: 'Hot Pink' },
  { key: 'rose', color: '#dc2626', label: 'Crimson Red' },
  { key: 'coral', color: '#f97316', label: 'Coral Orange' },
  { key: 'apricot', color: '#ea580c', label: 'Terracotta' },
  { key: 'amber', color: '#d97706', label: 'Sunset Gold' },
  { key: 'lime', color: '#65a30d', label: 'Lime Green' },
  { key: 'sage', color: '#15803d', label: 'Forest Sage' },
  { key: 'bronze', color: '#92400e', label: 'Warm Copper' },
  { key: 'gray', color: '#475569', label: 'Cool Slate' },
];

export const getCategoryColor = (tone: string): string => {
  if (!tone) return pastelPalette[0];
  if (tone.startsWith('#') || tone.startsWith('rgb') || tone.startsWith('hsl'))
    return tone;
  if (categoryColorMap[tone]) return categoryColorMap[tone];
  let hash = 0;
  for (let i = 0; i < tone.length; i++) {
    hash = tone.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % pastelPalette.length;
  return pastelPalette[index];
};

export const categoryFor = (
  id: CategoryId,
  custom: Category[] = []
): Category => {
  const found =
    [...builtInCategories, ...custom].find((c) => c.id === id) ??
    builtInCategories.at(-1)!;
  return {
    ...found,
    Icon: getCategoryIcon(found),
  };
};

export const normalizePhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Treat +91 / 91XXXXXXXXXX as the same Indian mobile account
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits;
};

export const formatIndianNumber = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const numStr = String(val).replace(/,/g, '');
  if (isNaN(Number(numStr))) return String(val);

  const parts = numStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  if (!integerPart) return String(val);
  const parsedInt = Number(integerPart);
  if (!Number.isFinite(parsedInt)) return String(val);

  const formattedInt = parsedInt.toLocaleString('en-IN');
  return decimalPart !== undefined
    ? `${formattedInt}.${decimalPart}`
    : formattedInt;
};

export const parseRawNumber = (val: string): string => {
  return val.replace(/,/g, '');
};

export const money = (n: number): string => {
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const downloadCsv = (
  expenses: Expense[],
  customCategories: Category[] = []
) => {
  const rows = [
    ['Date', 'Category', 'Amount', 'Note', 'Payment'],
    ...expenses.map((e) => [
      new Date(e.date).toISOString(),
      categoryFor(e.category, customCategories).label,
      String(e.amount),
      e.note ?? '',
      e.paymentMethod ?? '',
    ]),
  ];
  const blob = new Blob(
    [
      rows
        .map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(','))
        .join('\n'),
    ],
    { type: 'text/csv' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pocket-expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
};
