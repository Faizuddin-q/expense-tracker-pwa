# Expense reminder notifications (Web Push)

Pockett can nudge users to log expenses on a **daily**, **weekly**, or **monthly** schedule. Delivery uses **Web Push** so notifications arrive on phone, tablet, and desktop (Chrome / Edge / Firefox, including an Android “Add to Home Screen” install) even when the app tab is closed.

iOS Home Screen push was not required for the first ship; the same APIs can cover it later if needed.

## User-facing behavior

Settings → **Reminders**:

| Control | Default | Notes |
|---|---|---|
| On / Off | Off | Enabling asks for notification permission (user gesture only). |
| Frequency | Daily | Daily / Weekly / Monthly (one active cadence). |
| Time | `21:00` | Local wall clock (`HH:mm`). Matching is **by hour** because cron is hourly. |
| Weekday | Monday | Shown Monday-first in the UI. Stored as JS weekday (`0` = Sunday … `6` = Saturday). |
| Day of month | `1` | `1`–`28` only (avoids short-month edge cases). |
| Time zone | Device IANA zone at enable time | Falls back to `Asia/Kolkata`. |

Notification copy:

- Daily: “Time to log today’s expenses”
- Weekly: “Weekly expense check-in”
- Monthly: “Monthly expense check-in”

Tap opens `/` (quick add). Tag: `pockett-expense-reminder`.

**Daily skip:** if the user already has an active expense on that local calendar day, the cron does not send (and stamps `lastSentAt` so it will not retry until the next day).

## Architecture

```
Settings (enable + schedule)
  → request Notification permission
  → PushManager.subscribe(VAPID public key)
  → POST /api/push/subscribe  (store endpoint + keys)
  → PUT  /api/reminders       (store prefs on profiles.reminder)

Hourly Vercel cron
  → GET/POST /api/cron/reminders  (Bearer CRON_SECRET)
  → find profiles with reminder.enabled
  → isReminderDue(prefs, now)
  → optional daily “already logged” check
  → web-push sendNotification → FCM / browser push service
  → service worker push → showNotification
  → notificationclick → focus / openWindow('/')
```

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
| [`app/api/cron/reminders/route.ts`](../app/api/cron/reminders/route.ts) | Hourly sender |
| [`vercel.json`](../vercel.json) | Cron: `0 * * * *` → `/api/cron/reminders` |
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

Generate keys once:

```bash
npx web-push generate-vapid-keys --json
```

Keep the same VAPID pair after users subscribe. Regenerating invalidates existing subscriptions.

On Vercel Production, set all four vars and redeploy. Confirm **Cron Jobs** lists `/api/cron/reminders`.

## Local manual test

1. `.env` has the four vars; `npm run dev`.
2. Chrome → `http://localhost:3000` → sign in.
3. DevTools → Application → Service Workers → Unregister → hard reload (if SW was registered before push handlers shipped).
4. Settings → Reminders → On → Allow. Set Daily + **current local hour** (e.g. `21:00` at 9pm IST).
5. Fire cron:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/reminders
```

Useful response fields: `considered`, `due`, `sent`, `skippedLogged`, `failed`, `removedSubs`.

6. Daily dedupe: after a successful send, the same day returns `due: 0` until `reminder.lastSentAt` is cleared on the profile.
7. If `sent: 1` but no banner: check macOS **System Settings → Notifications → Google Chrome**; re-subscribe (Reminders Off/On); check Notification Center.

Vercel’s hourly cron does **not** run on localhost. Local testing always uses the manual curl (or equivalent).

## Limits and caveats

- Cron is hourly → delivery within about ±60 minutes of the chosen hour; minutes in `timeLocal` are stored but not used for matching.
- Each device must enable Reminders once (each has its own push subscription).
- If the user blocks notifications, only browser / OS settings can re-enable them.
- Dead endpoints (404/410) are deleted from `pushSubscriptions`.
- Do not put VAPID private key or `CRON_SECRET` in git; `.env` stays ignored.
