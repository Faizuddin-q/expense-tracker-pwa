// Server-safe (no React/Lucide imports) mirror of lib/constants.ts's
// builtInCategories ids/labels/tones/icons. Used once, to seed a brand-new
// account's own category list — after that, they're just this account's
// categories, `custom: true` like anything else, fully editable/deletable.
// Keep in sync with lib/constants.ts if the defaults ever change.
export const defaultCategorySeed = [
  { id: 'food', label: 'Food', tone: 'mint', iconName: 'utensils', custom: true },
  { id: 'transport', label: 'Transport', tone: 'sky', iconName: 'car', custom: true },
  { id: 'shopping', label: 'Shopping', tone: 'lavender', iconName: 'shopping', custom: true },
  { id: 'bills', label: 'Bills', tone: 'peach', iconName: 'receipt', custom: true },
  { id: 'health', label: 'Health', tone: 'blush', iconName: 'health', custom: true },
  { id: 'entertainment', label: 'Fun', tone: 'butter', iconName: 'film', custom: true },
  { id: 'other', label: 'Other', tone: 'gray', iconName: 'plus', custom: true },
] as const;
