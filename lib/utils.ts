import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category, CategoryId, Expense } from '@/types/expense';
import { builtInCategories } from '@/lib/constants';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const pastelPalette: string[] = [
  '#34d399', // Mint
  '#38bdf8', // Sky
  '#c084fc', // Lavender
  '#fb923c', // Peach
  '#f472b6', // Blush
  '#facc15', // Butter
  '#94a3b8', // Gray
  '#fda4af', // Rose
  '#a7f3d0', // Sage
  '#fca5a5', // Coral
  '#a78bfa', // Violet
  '#2dd4bf', // Teal
  '#fde047', // Amber
  '#67e8f9', // Cyan
  '#4ade80', // Emerald
  '#818cf8', // Indigo
  '#e879f9', // Fuchsia
  '#fed7aa', // Apricot
  '#93c5fd', // Periwinkle
  '#c4b5fd', // Lilac
];

export const categoryColorMap: Record<string, string> = {
  mint: '#34d399',
  sky: '#38bdf8',
  lavender: '#c084fc',
  peach: '#fb923c',
  blush: '#f472b6',
  butter: '#facc15',
  gray: '#94a3b8',
  rose: '#fda4af',
  sage: '#a7f3d0',
  coral: '#fca5a5',
  violet: '#a78bfa',
  teal: '#2dd4bf',
  amber: '#fde047',
  cyan: '#67e8f9',
  emerald: '#4ade80',
  indigo: '#818cf8',
  fuchsia: '#e879f9',
  apricot: '#fed7aa',
  periwinkle: '#93c5fd',
  lilac: '#c4b5fd',
};

export const categoryColorOptions = Object.entries(categoryColorMap).map(
  ([key, color]) => ({
    key,
    color,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  })
);

export const getCategoryColor = (tone: string): string => {
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
): Category =>
  [...builtInCategories, ...custom].find((c) => c.id === id) ??
  builtInCategories.at(-1)!;

export const normalizePhone = (value: string): string =>
  value.replace(/[^\d+]/g, '').replace(/^00/, '+');

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
