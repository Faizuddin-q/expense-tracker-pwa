import type { Db } from 'mongodb';

export const AUDIT_LOG_COLLECTION = 'audit_logs';

export type AuditAction =
  | 'expense.create'
  | 'expense.update'
  | 'expense.soft_delete'
  | 'expense.restore'
  | 'category.create'
  | 'category.rename'
  | 'category.delete'
  | 'profile.income'
  | 'profile.budget'
  | 'profile.theme'
  | 'profile.name'
  | 'profile.hide_amounts'
  | 'profile.cycle_start_day'
  | 'profile.onboarding'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_change'
  | 'sync.pull'
  | 'sync.push'
  | 'session.read'
  | 'admin.user.read'
  | 'admin.user.update'
  | 'admin.user.delete'
  | 'admin.user.reset_password'
  | 'admin.expense.create'
  | 'admin.expense.update'
  | 'admin.expense.delete';

export type AuditLogEntry = {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  actor?: 'user' | 'admin';
  createdAt: Date;
};

const TTL_DAYS = Number(process.env.AUDIT_LOG_TTL_DAYS ?? 90);

let indexesEnsured = false;

export const ensureAuditLogIndexes = async (db: Db): Promise<void> => {
  if (indexesEnsured) return;
  const col = db.collection(AUDIT_LOG_COLLECTION);
  await col.createIndex({ userId: 1, createdAt: -1 });
  await col.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: Math.max(1, TTL_DAYS) * 24 * 60 * 60 }
  );
  indexesEnsured = true;
};

/** Best-effort — never throw to callers; audit must not break user flows. */
export const writeAuditLog = async (
  db: Db,
  entry: Omit<AuditLogEntry, 'createdAt'> & { createdAt?: Date }
): Promise<void> => {
  try {
    await ensureAuditLogIndexes(db);
    await db.collection(AUDIT_LOG_COLLECTION).insertOne({
      ...entry,
      createdAt: entry.createdAt ?? new Date(),
    });
  } catch (err) {
    console.error('[audit] write failed', entry.action, err);
  }
};

export const writeAuditLogs = async (
  db: Db,
  entries: Array<Omit<AuditLogEntry, 'createdAt'> & { createdAt?: Date }>
): Promise<void> => {
  if (!entries.length) return;
  try {
    await ensureAuditLogIndexes(db);
    const now = new Date();
    await db.collection(AUDIT_LOG_COLLECTION).insertMany(
      entries.map((e) => ({ ...e, createdAt: e.createdAt ?? now }))
    );
  } catch (err) {
    console.error('[audit] batch write failed', err);
  }
};

export const auditFromRequest = (
  request: Request,
  userId: string,
  action: AuditAction,
  extra?: Partial<Omit<AuditLogEntry, 'userId' | 'action' | 'createdAt' | 'ip'>>
): Omit<AuditLogEntry, 'createdAt'> => ({
  userId,
  action,
  ip:
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined,
  actor: extra?.actor ?? 'user',
  entityType: extra?.entityType,
  entityId: extra?.entityId,
  meta: extra?.meta,
});
