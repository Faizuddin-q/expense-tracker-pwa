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
// Muted, mid-lightness palette tuned to read as one family rather than a
// rainbow. Every value stays legible as a small dot or bar on both the dark
// and light surfaces, and none of them compete with the primary action color.
export const pastelPalette: string[] = [
  '#4FA97F', // Mint
  '#3F9E96', // Teal
  '#4BA3B8', // Cyan
  '#5A9BD4', // Sky
  '#5B85D6', // Blue
  '#6D75CE', // Indigo
  '#5A6BB0', // Navy
  '#8E7CC8', // Lavender
  '#9B72C4', // Purple
  '#8A63A8', // Plum
  '#B26AAE', // Magenta
  '#C4708F', // Pink
  '#C86B70', // Rose
  '#D07B5E', // Coral
  '#C98A55', // Apricot
  '#B99548', // Amber
  '#8FA84F', // Lime
  '#6D9A63', // Sage
  '#A5824F', // Bronze
  '#7E848F', // Gray
];

export const categoryColorMap: Record<string, string> = {
  mint: '#4FA97F',
  teal: '#3F9E96',
  cyan: '#4BA3B8',
  sky: '#5A9BD4',
  blue: '#5B85D6',
  indigo: '#6D75CE',
  navy: '#5A6BB0',
  lavender: '#8E7CC8',
  purple: '#9B72C4',
  plum: '#8A63A8',
  magenta: '#B26AAE',
  pink: '#C4708F',
  rose: '#C86B70',
  coral: '#D07B5E',
  apricot: '#C98A55',
  amber: '#B99548',
  lime: '#8FA84F',
  sage: '#6D9A63',
  bronze: '#A5824F',
  gray: '#7E848F',
  // Backward compatibility alias keys for built-in categories
  food: '#D07B5E',
  transport: '#5A9BD4',
  shopping: '#8E7CC8',
  bills: '#C98A55',
  health: '#C4708F',
  butter: '#8FA84F',
  peach: '#C98A55',
  blush: '#C4708F',
  violet: '#9B72C4',
};

export const categoryColorOptions = [
  { key: 'mint', color: '#4FA97F', label: 'Mint' },
  { key: 'teal', color: '#3F9E96', label: 'Teal' },
  { key: 'cyan', color: '#4BA3B8', label: 'Cyan' },
  { key: 'sky', color: '#5A9BD4', label: 'Sky' },
  { key: 'blue', color: '#5B85D6', label: 'Blue' },
  { key: 'indigo', color: '#6D75CE', label: 'Indigo' },
  { key: 'navy', color: '#5A6BB0', label: 'Navy' },
  { key: 'lavender', color: '#8E7CC8', label: 'Lavender' },
  { key: 'purple', color: '#9B72C4', label: 'Purple' },
  { key: 'plum', color: '#8A63A8', label: 'Plum' },
  { key: 'magenta', color: '#B26AAE', label: 'Magenta' },
  { key: 'pink', color: '#C4708F', label: 'Pink' },
  { key: 'rose', color: '#C86B70', label: 'Rose' },
  { key: 'coral', color: '#D07B5E', label: 'Coral' },
  { key: 'apricot', color: '#C98A55', label: 'Apricot' },
  { key: 'amber', color: '#B99548', label: 'Amber' },
  { key: 'lime', color: '#8FA84F', label: 'Lime' },
  { key: 'sage', color: '#6D9A63', label: 'Sage' },
  { key: 'bronze', color: '#A5824F', label: 'Bronze' },
  { key: 'gray', color: '#7E848F', label: 'Gray' },
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

/** Always two decimals, so figures line up in a column. Use in tables. */
export const moneyExact = (n: number, hidden = false): string => {
  if (hidden) return MASKED_MONEY;
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** "3h ago" / "5d ago" style label — used for admin "Last active" columns. */
export const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'Never';
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
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
