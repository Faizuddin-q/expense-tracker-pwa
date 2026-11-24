import { getDb } from '@/lib/db';
import { ok, fail } from '@/lib/api/response';
import {
  isReminderDue,
  localDateKey,
  normalizeReminder,
  reminderCopy,
  type ReminderPrefs,
} from '@/lib/reminder';
import { sendWebPush } from '@/lib/push';
import { activeUserFilter } from '@/lib/user-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const authorizeCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const header = request.headers.get('x-cron-secret');
  return header === secret;
};

/**
 * GET/POST /api/cron/reminders
 * Invoked every 15 minutes by GitHub Actions (see .github/workflows/reminders-cron.yml).
 */
const run = async (request: Request) => {
  if (!authorizeCron(request)) {
    return fail('Unauthorized', 401);
  }

  const db = await getDb();
  const now = new Date();

  const profiles = await db
    .collection('profiles')
    .find({ 'reminder.enabled': true })
    .project({ userId: 1, reminder: 1 })
    .toArray();

  let considered = 0;
  let due = 0;
  let sent = 0;
  let skippedLogged = 0;
  let failed = 0;
  let removedSubs = 0;

  for (const doc of profiles) {
    const userId = typeof doc.userId === 'string' ? doc.userId : '';
    if (!userId) continue;
    considered += 1;

    const prefs: ReminderPrefs = normalizeReminder(doc.reminder);
    if (!isReminderDue(prefs, now)) continue;
    due += 1;

    if (prefs.frequency === 'daily') {
      const dayKey = localDateKey(now, prefs.timeZone);
      const recent = await db
        .collection('expenses')
        .find(activeUserFilter(userId))
        .project({ date: 1 })
        .sort({ date: -1 })
        .limit(40)
        .toArray();

      const alreadyLogged = recent.some((row) => {
        const raw = row.date;
        const d =
          raw instanceof Date
            ? raw
            : typeof raw === 'string' || typeof raw === 'number'
              ? new Date(raw)
              : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        return localDateKey(d, prefs.timeZone) === dayKey;
      });

      if (alreadyLogged) {
        skippedLogged += 1;
        await db.collection('profiles').updateOne(
          { userId },
          { $set: { 'reminder.lastSentAt': now, updatedAt: now } }
        );
        continue;
      }
    }

    const subscriptions = await db
      .collection('pushSubscriptions')
      .find({ userId })
      .project({ endpoint: 1, keys: 1 })
      .toArray();

    if (!subscriptions.length) continue;

    const copy = reminderCopy(prefs.frequency);
    let anySent = false;

    for (const sub of subscriptions) {
      const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint : '';
      const keys = sub.keys as { p256dh?: string; auth?: string } | undefined;
      if (!endpoint || !keys?.p256dh || !keys?.auth) continue;

      const result = await sendWebPush(
        { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
        { ...copy, url: '/' }
      );

      if (result.ok) {
        anySent = true;
        sent += 1;
      } else {
        failed += 1;
        if (result.gone) {
          await db.collection('pushSubscriptions').deleteOne({ endpoint });
          removedSubs += 1;
        }
      }
    }

    if (anySent) {
      await db.collection('profiles').updateOne(
        { userId },
        { $set: { 'reminder.lastSentAt': now, updatedAt: now } }
      );
    }
  }

  return ok({
    considered,
    due,
    sent,
    skippedLogged,
    failed,
    removedSubs,
    at: now.toISOString(),
  });
};

export const GET = (request: Request) => run(request);
export const POST = (request: Request) => run(request);
