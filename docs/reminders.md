# Expense reminder notifications (Web Push)

Pockett can nudge users to log expenses on a **daily**, **weekly**, or **monthly** schedule at a **chosen local time**. Delivery uses **Web Push** so notifications arrive on phone, tablet, and desktop (Chrome / Edge / Firefox, including an Android “Add to Home Screen” install) even when the app tab is closed.

iOS Home Screen push was not required for the first ship; the same APIs can cover it later if needed.

## User-facing behavior

Settings → **Reminders**:

| Control | Default | Notes |
|---|---|---|
| On / Off | Off | Enabling asks for notification permission (user gesture only). |
| Frequency | Daily | Daily / Weekly / Monthly (one active cadence). |
| Time | `21:00` | Local wall clock (`HH:mm`). Matched by **local hour**. |
| Weekday | Monday | Shown Monday-first in the UI. Stored as JS weekday (`0` = Sunday … `6` = Saturday). |
| Day of month | `1` | `1`–`28` only (avoids short-month edge cases). |
| Time zone | Device IANA zone at enable time | Falls back to `Asia/Kolkata`. |

Notification copy:

- Daily: “Time to log today’s expenses”
- Weekly: “Weekly expense check-in”
- Monthly: “Monthly expense check-in”

Tap opens `/` (quick add). Tag: `pockett-expense-reminder`.

**Daily skip:** if the user already has an active expense on that local calendar day, the cron does not send (and stamps `lastSentAt` so it will not retry until the next day).

### Example: daily at 10:00 PM IST

1. User enables Reminders, frequency Daily, time `22:00`, zone `Asia/Kolkata`.
2. Hobby cannot run one `0 * * * *` job, so we register **24 once-daily crons** (`0 0 * * *` … `0 23 * * *`) all hitting `/api/cron/reminders`.
3. Around **16:00–17:00 UTC** (maps to the 10 PM IST hour window, allowing for UTC+5:30), a cron tick runs when the user’s **local hour is 22**.
4. Cron checks: enabled, daily, local hour `22`, not already sent today, no expense logged today → Web Push.
5. Device shows the notification; `lastSentAt` is set so later hours that day do not double-send.

Hobby may invoke anywhere **within** the scheduled UTC hour (± up to ~59 minutes).

## Architecture

```
Settings (enable + schedule)
  → request Notification permission
  → PushManager.subscribe(VAPID public key)
  → POST /api/push/subscribe  (store endpoint + keys)
  → PUT  /api/reminders       (store prefs on profiles.reminder)

24× daily Vercel crons (one per UTC hour; Hobby-compatible)
  → GET/POST /api/cron/reminders  (Bearer CRON_SECRET)
  → find profiles with reminder.enabled
  → isReminderDue(prefs, now)  // frequency + local hour + lastSentAt
  → optional daily “already logged” check
  → web-push sendNotification → FCM / browser push service
  → service worker push → showNotification
  → notificationclick → focus / openWindow('/')
```

### Why 24 daily crons (free Hobby workaround)

| Option | Free? | Honors 10 PM? | Notes |
|---|---|---|---|
| Single hourly `0 * * * *` | No on Hobby | Yes | Deploy fails on Hobby |
| Single daily cron | Yes | No | Everyone gets the same UTC hour |
| **24 daily crons (one per UTC hour)** | **Yes** | **Yes (by local hour)** | Hobby allows 100 jobs; each may run once/day |
| External cron (cron-job.org, etc.) | Yes | Yes | Extra service to maintain |
| GitHub Actions hourly | Mostly* | Yes | Uses Actions minutes on private repos |
| Cloudflare Workers cron | Partial | Limited | Free = 5 triggers / account |

\*Public repos: Actions minutes free. Private: included monthly compute, then billed.

No new paid library is required for push itself (`web-push` + browser Push API stay).

## Key files

| Path | Role |
|---|---|
| [`public/sw.js`](../public/sw.js) | `push` + `notificationclick` (no fetch caching) |
| [`components/ReminderSettings.tsx`](../components/ReminderSettings.tsx) | Settings UI |
| [`lib/push-client.ts`](../lib/push-client.ts) | Subscribe / unsubscribe from the browser |
| [`lib/push.ts`](../lib/push.ts) | Server `web-push` + VAPID setup |
| [`lib/reminder.ts`](../lib/reminder.ts) | Prefs shape, timezone helpers, `isReminderDue` |
| [`lib/validation/reminder.ts`](../lib/validation/reminder.ts) | Zod schemas |
| [`app/api/push/subscribe/route.ts`](../app/api/push/subscribe/route.ts) | POST upsert / DELETE remove subscription |
| [`app/api/reminders/route.ts`](../app/api/reminders/route.ts) | GET / PUT reminder prefs |
| [`app/api/cron/reminders/route.ts`](../app/api/cron/reminders/route.ts) | Sender (invoked each UTC hour via 24 dailies) |
| [`vercel.json`](../vercel.json) | 24 cron entries → `/api/cron/reminders` |
| [`tests/reminder.test.ts`](../tests/reminder.test.ts) | Due-time / timezone unit tests |
| [`.env.example`](../.env.example) | Env var template |

## Data model

**`profiles.reminder`**

```ts
{
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  timeLocal: string        // "HH:mm"
  weekday: number          // 0–6, JS Date.getDay()
  monthDay: number         // 1–28
  timeZone: string         // IANA
  lastSentAt?: string | null
  updatedAt?: string | null
}
```

Also returned on `GET /api/profile` via `toProfileResponse`.

**`pushSubscriptions`**

```ts
{
  userId: string
  endpoint: string         // unique index
  keys: { p256dh: string, auth: string }
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}
```

Indexes (created in `ensureUserDataIndexes`): unique `endpoint`, `userId`, and `profiles.reminder.enabled`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + server | Public half of the VAPID key pair |
| `VAPID_PRIVATE_KEY` | Server only | Signs outgoing Web Push |
| `VAPID_SUBJECT` | Server | Contact URI, e.g. `mailto:you@email.com` |
| `CRON_SECRET` | Server | Cron auth: `Authorization: Bearer <secret>` |
| `REMINDER_MATCH_HOUR` | Server (optional) | Set `0` to ignore preferred hour (debug only) |

Generate keys once:

```bash
npx web-push generate-vapid-keys --json
```

Keep the same VAPID pair after users subscribe. Regenerating invalidates existing subscriptions.

On Vercel Production, set the VAPID + `CRON_SECRET` vars and redeploy. Confirm **Cron Jobs** lists 24 entries for `/api/cron/reminders`.

## Local manual test

1. `.env` has the four vars; `npm run dev`.
2. Chrome → `http://localhost:3000` → sign in.
3. DevTools → Application → Service Workers → Unregister → hard reload (if SW was registered before push handlers shipped).
4. Settings → Reminders → On → Allow. Set Daily + **current local hour** (e.g. `22:00` at 10pm IST).
5. Fire cron:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/reminders
```

Useful response fields: `considered`, `due`, `sent`, `skippedLogged`, `failed`, `removedSubs`.

6. Daily dedupe: after a successful send, the same day returns `due: 0` until `reminder.lastSentAt` is cleared on the profile.
7. If `sent: 1` but no banner: check macOS **System Settings → Notifications → Google Chrome**; re-subscribe (Reminders Off/On); check Notification Center.

Vercel’s cron does **not** run on localhost. Local testing always uses the manual curl (or equivalent).

## Limits and caveats

- Hobby forbids one hourly expression; **24 daily UTC-hour jobs** restore per-hour coverage for free.
- Delivery is within the matched **local hour**, not the exact minute (Hobby jitter within the UTC hour).
- Half-hour offsets (e.g. IST) can land in the previous/next UTC hour window; `lastSentAt` prevents doubles.
- Each device must enable Reminders once (each has its own push subscription).
- If the user blocks notifications, only browser / OS settings can re-enable them.
- Dead endpoints (404/410) are deleted from `pushSubscriptions`.
- Do not put VAPID private key or `CRON_SECRET` in git; `.env` stays ignored.
