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
  // Prefer iconName so synced / overridden icons win over baked-in Icon components
  if (category.iconName && iconMap[category.iconName])
    return iconMap[category.iconName];
  if (category.Icon) return category.Icon;
  return Plus;
};

// Chalk-stick palette — dustier, less saturated than screen-native brights,
// Clean, modern tag-style palette — clear and legible on both light and dark surfaces.
export const pastelPalette: string[] = [
  '#10B981', // Mint
  '#0D9488', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#1D4ED8', // Navy
  '#8B5CF6', // Lavender
  '#A855F7', // Purple
  '#7C3AED', // Plum
  '#D946EF', // Magenta
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F97316', // Coral
  '#EA580C', // Apricot
  '#D97706', // Amber
  '#84CC16', // Lime
  '#16A34A', // Sage
  '#B45309', // Bronze
  '#64748B', // Gray
];

export const categoryColorMap: Record<string, string> = {
  mint: '#10B981',
  teal: '#0D9488',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  blue: '#3B82F6',
  indigo: '#6366F1',
  navy: '#1D4ED8',
  lavender: '#8B5CF6',
  purple: '#A855F7',
  plum: '#7C3AED',
  magenta: '#D946EF',
  pink: '#EC4899',
  rose: '#F43F5E',
  coral: '#F97316',
  apricot: '#EA580C',
  amber: '#D97706',
  lime: '#84CC16',
  sage: '#16A34A',
  bronze: '#B45309',
  gray: '#64748B',
  // Backward compatibility alias keys for built-in categories
  food: '#F97316',
  transport: '#0EA5E9',
  shopping: '#8B5CF6',
  bills: '#EA580C',
  health: '#EC4899',
  butter: '#84CC16',
  peach: '#EA580C',
  blush: '#EC4899',
  violet: '#A855F7',
};

export const categoryColorOptions = [
  { key: 'mint', color: '#10B981', label: 'Mint' },
  { key: 'teal', color: '#0D9488', label: 'Teal' },
  { key: 'cyan', color: '#06B6D4', label: 'Cyan' },
  { key: 'sky', color: '#0EA5E9', label: 'Sky' },
  { key: 'blue', color: '#3B82F6', label: 'Blue' },
  { key: 'indigo', color: '#6366F1', label: 'Indigo' },
  { key: 'navy', color: '#1D4ED8', label: 'Navy' },
  { key: 'lavender', color: '#8B5CF6', label: 'Lavender' },
  { key: 'purple', color: '#A855F7', label: 'Purple' },
  { key: 'plum', color: '#7C3AED', label: 'Plum' },
  { key: 'magenta', color: '#D946EF', label: 'Magenta' },
  { key: 'pink', color: '#EC4899', label: 'Pink' },
  { key: 'rose', color: '#F43F5E', label: 'Rose' },
  { key: 'coral', color: '#F97316', label: 'Coral' },
  { key: 'apricot', color: '#EA580C', label: 'Apricot' },
  { key: 'amber', color: '#D97706', label: 'Amber' },
  { key: 'lime', color: '#84CC16', label: 'Lime' },
  { key: 'sage', color: '#16A34A', label: 'Sage' },
  { key: 'bronze', color: '#B45309', label: 'Bronze' },
  { key: 'gray', color: '#64748B', label: 'Gray' },
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

// Disabled: was fabricating "Recovered category N" / "Recovered · <note>"
// placeholder categories for expense category IDs that didn't match any
// known category. Turned off because it was surfacing spurious "Recovered"
// categories/expenses in the UI. Kept here in case the orphan-recovery
// behavior needs to be revisited.
// /** Rebuild custom categories for expense IDs that no longer have a profile entry. */
// export const recoverOrphanCategories = (
//   expenses: Expense[],
//   existingCustom: Category[] = []
// ): { categories: Category[]; added: Category[] } => {
//   const known = new Set([
//     ...builtInCategories.map((c) => c.id),
//     ...existingCustom.map((c) => c.id),
//   ]);
//   const orphanIds = [
//     ...new Set(
//       expenses
//         .map((e) => e.category)
//         .filter((id): id is string => Boolean(id) && !known.has(id))
//     ),
//   ];
//   if (!orphanIds.length) {
//     return { categories: existingCustom, added: [] };
//   }
//
//   let n = 1;
//   const added = orphanIds.map((id) => {
//     const noteHint = expenses
//       .filter((e) => e.category === id && e.note?.trim())
//       .map((e) => e.note!.trim())[0];
//     const label = noteHint
//       ? `Recovered · ${noteHint.slice(0, 28)}`
//       : `Recovered category ${n++}`;
//     return {
//       id,
//       label,
//       tone: 'gray',
//       iconName: 'plus',
//       custom: true,
//       Icon: getCategoryIcon({ iconName: 'plus' }),
//     } satisfies Category;
//   });
//
//   return { categories: [...existingCustom, ...added], added };
// };

/** Merge cloud + local category defs. Prefer non-default local styles, else cloud. */
export const mergeCategoryDefs = (
  cloud: Category,
  local?: Category
): Category => {
  if (!local) {
    return {
      ...cloud,
      Icon: getCategoryIcon(cloud),
      custom: true,
    };
  }
  // Disabled along with recoverOrphanCategories above — was preferring a
  // non-"Recovered" label over a "Recovered ..." one when merging.
  // const cloudRecovered = /^Recovered\b/i.test(cloud.label);
  // const localRecovered = /^Recovered\b/i.test(local.label);
  // const label =
  //   cloudRecovered && !localRecovered
  //     ? local.label
  //     : cloud.label || local.label;
  const label = cloud.label || local.label;

  const pick = (
    localVal: string | undefined,
    cloudVal: string | undefined,
    fallback: string
  ) => {
    if (localVal && localVal !== fallback) return localVal;
    if (cloudVal && cloudVal !== fallback) return cloudVal;
    return localVal || cloudVal || fallback;
  };

  const tone = pick(local.tone, cloud.tone, 'gray');
  const iconName = pick(local.iconName, cloud.iconName, 'plus');
  return {
    id: cloud.id || local.id,
    label,
    tone,
    iconName,
    custom: true,
    Icon: getCategoryIcon({ iconName }),
  };
};

export const normalizePhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Strip country code so +91 / 91XXXXXXXXXX map to the same 10-digit account
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length > 10) digits = digits.slice(-10);
  return digits;
};

/** Indian mobiles: exactly 10 digits, starting with 6–9. */
export const isValidIndianMobile = (value: string): boolean =>
  /^[6-9]\d{9}$/.test(normalizePhone(value));

export const formatIndianMobileDisplay = (value: string): string => {
  const digits = normalizePhone(value);
  if (!digits) return '+91';
  if (digits.length <= 5) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
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

export const MASKED_MONEY = '₹ ••••';

export const money = (n: number, hidden = false): string => {
  if (hidden) return MASKED_MONEY;
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
