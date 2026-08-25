import type { Db } from 'mongodb';
import { writeAuditLogs, type AuditLogEntry } from '@/lib/audit-log';

type StoredCategory = {
  id: string;
  label: string;
};

type StoredExpense = {
  localId?: string;
  id?: string;
  deletedAt?: Date | null;
};

const EXPENSE_COMPARE_FIELDS = [
  'amount',
  'category',
  'note',
  'date',
  'paymentMethod',
  'createdAt',
] as const;

const expenseChanged = (
  prev: Record<string, unknown>,
  incoming: Record<string, unknown>
): boolean => {
  for (const key of EXPENSE_COMPARE_FIELDS) {
    const a = prev[key];
    const b = incoming[key];
    if (key === 'amount') {
      if (Number(a) !== Number(b)) return true;
      continue;
    }
    if (a !== b) return true;
  }
  return false;
};

const expenseKey = (e: StoredExpense): string =>
  (typeof e.localId === 'string' && e.localId) ||
  (typeof e.id === 'string' && e.id) ||
  '';

export const buildSyncAuditEntries = async (opts: {
  db: Db;
  userId: string;
  ip?: string;
  pullOnly: boolean;
  deletedIds: string[];
  expenses?: Record<string, unknown>[];
  deletedCategoryIds?: string[];
  incomingCategories?: StoredCategory[];
  profileFields: {
    monthlyIncome?: number;
    monthlyBudget?: number;
    hideAmounts?: boolean;
    onboardingComplete?: boolean;
    name?: string;
    theme?: string;
    cycleStartDay?: number;
  };
}): Promise<Omit<AuditLogEntry, 'createdAt'>[]> => {
  const entries: Omit<AuditLogEntry, 'createdAt'>[] = [];
  const base = { userId: opts.userId, ip: opts.ip, actor: 'user' as const };

  const needsProfile =
    opts.incomingCategories?.length ||
    opts.profileFields.monthlyIncome !== undefined ||
    opts.profileFields.monthlyBudget !== undefined ||
    opts.profileFields.hideAmounts !== undefined ||
    opts.profileFields.onboardingComplete !== undefined ||
    opts.profileFields.name !== undefined ||
    opts.profileFields.theme !== undefined ||
    opts.profileFields.cycleStartDay !== undefined;

  const existingProfile = needsProfile
    ? await opts.db.collection('profiles').findOne({ userId: opts.userId })
    : null;

  if (opts.deletedIds.length > 0) {
    for (const id of opts.deletedIds) {
      entries.push({
        ...base,
        action: 'expense.soft_delete',
        entityType: 'expense',
        entityId: id,
      });
    }
  }

  if (Array.isArray(opts.expenses) && opts.expenses.length > 0) {
    const localIds = opts.expenses
      .map((e) =>
        typeof e.localId === 'string'
          ? e.localId
          : typeof e.id === 'string'
            ? e.id
            : ''
      )
      .filter(Boolean);

    const existing = localIds.length
      ? await opts.db
          .collection('expenses')
          .find({
            userId: opts.userId,
            $or: [{ localId: { $in: localIds } }, { id: { $in: localIds } }],
          })
          .project({
            localId: 1,
            id: 1,
            deletedAt: 1,
            amount: 1,
            category: 1,
            note: 1,
            date: 1,
            paymentMethod: 1,
            createdAt: 1,
          })
          .toArray()
      : [];

    const existingByKey = new Map<string, StoredExpense>();
    for (const row of existing) {
      const key = expenseKey(row as StoredExpense);
      if (key) existingByKey.set(key, row as StoredExpense);
    }

    for (const raw of opts.expenses) {
      const key =
        (typeof raw.localId === 'string' && raw.localId) ||
        (typeof raw.id === 'string' && raw.id) ||
        '';
      if (!key) continue;
      const prev = existingByKey.get(key);
      if (!prev) {
        entries.push({
          ...base,
          action: 'expense.create',
          entityType: 'expense',
          entityId: key,
        });
      } else if (prev.deletedAt) {
        entries.push({
          ...base,
          action: 'expense.restore',
          entityType: 'expense',
          entityId: key,
        });
      } else if (expenseChanged(prev as Record<string, unknown>, raw)) {
        entries.push({
          ...base,
          action: 'expense.update',
          entityType: 'expense',
          entityId: key,
        });
      }
    }
  }

  if (Array.isArray(opts.deletedCategoryIds)) {
    for (const id of opts.deletedCategoryIds) {
      if (typeof id === 'string' && id.length > 0) {
        entries.push({
          ...base,
          action: 'category.delete',
          entityType: 'category',
          entityId: id,
        });
      }
    }
  }

  if (Array.isArray(opts.incomingCategories) && opts.incomingCategories.length) {
    const existingById = new Map<string, StoredCategory>();
    for (const c of (existingProfile?.categories ?? []) as StoredCategory[]) {
      if (typeof c?.id === 'string') existingById.set(c.id, c);
    }
    const deletedSet = new Set(opts.deletedCategoryIds ?? []);
    for (const cat of opts.incomingCategories) {
      if (deletedSet.has(cat.id)) continue;
      const prev = existingById.get(cat.id);
      if (!prev) {
        entries.push({
          ...base,
          action: 'category.create',
          entityType: 'category',
          entityId: cat.id,
          meta: { label: cat.label },
        });
      } else if (prev.label !== cat.label) {
        entries.push({
          ...base,
          action: 'category.rename',
          entityType: 'category',
          entityId: cat.id,
          meta: { from: prev.label, to: cat.label },
        });
      }
    }
  }

  const pf = opts.profileFields;
  if (
    typeof pf.monthlyIncome === 'number' &&
    pf.monthlyIncome > 0 &&
    existingProfile?.monthlyIncome !== pf.monthlyIncome
  ) {
    entries.push({
      ...base,
      action: 'profile.income',
      meta: { monthlyIncome: pf.monthlyIncome },
    });
  }
  if (
    typeof pf.monthlyBudget === 'number' &&
    pf.monthlyBudget > 0 &&
    existingProfile?.monthlyBudget !== pf.monthlyBudget
  ) {
    entries.push({
      ...base,
      action: 'profile.budget',
      meta: { monthlyBudget: pf.monthlyBudget },
    });
  }
  if (
    typeof pf.hideAmounts === 'boolean' &&
    existingProfile?.hideAmounts !== pf.hideAmounts
  ) {
    entries.push({
      ...base,
      action: 'profile.hide_amounts',
      meta: { hideAmounts: pf.hideAmounts },
    });
  }
  if (
    typeof pf.onboardingComplete === 'boolean' &&
    existingProfile?.onboardingComplete !== pf.onboardingComplete
  ) {
    entries.push({
      ...base,
      action: 'profile.onboarding',
      meta: { onboardingComplete: pf.onboardingComplete },
    });
  }
  if (
    typeof pf.name === 'string' &&
    pf.name.length > 0 &&
    existingProfile?.name !== pf.name
  ) {
    entries.push({ ...base, action: 'profile.name', meta: { name: pf.name } });
  }
  if (
    (pf.theme === 'dark' || pf.theme === 'light') &&
    existingProfile?.theme !== pf.theme
  ) {
    entries.push({ ...base, action: 'profile.theme', meta: { theme: pf.theme } });
  }
  if (
    typeof pf.cycleStartDay === 'number' &&
    existingProfile?.cycleStartDay !== pf.cycleStartDay
  ) {
    entries.push({
      ...base,
      action: 'profile.cycle_start_day',
      meta: { cycleStartDay: pf.cycleStartDay },
    });
  }

  if (opts.pullOnly) {
    entries.unshift({ ...base, action: 'sync.pull' });
  } else if (entries.length > 0) {
    entries.unshift({
      ...base,
      action: 'sync.push',
      meta: {
        expenseCount: Array.isArray(opts.expenses) ? opts.expenses.length : 0,
      },
    });
  }

  return entries;
};

export const logSyncAudit = async (
  opts: Parameters<typeof buildSyncAuditEntries>[0]
): Promise<void> => {
  const entries = await buildSyncAuditEntries(opts);
  await writeAuditLogs(opts.db, entries);
};
