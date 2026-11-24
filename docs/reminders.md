# Expense reminder notifications (Web Push)

Pockett can nudge users to log expenses on a **daily**, **weekly**, or **monthly** schedule at a **chosen local time** (15-minute steps). Delivery uses **Web Push** so notifications arrive on phone, tablet, and desktop even when the app is closed.

## User-facing behavior

| Control | Default | Notes |
|---|---|---|
| On / Off | Off | Permission asked on enable (user gesture). |
| Frequency | Daily | Daily / Weekly / Monthly. |
| Time | `21:00` | **15-minute steps only** (`:00`, `:15`, `:30`, `:45`). |
| Weekday | Monday | Monday-first UI; stored as JS `0=Sun…6=Sat`. |
| Day of month | `1` | `1`–`28`. |
| Time zone | Device IANA | Fallback `Asia/Kolkata`. |

**Example:** Daily at **10:15 PM IST** → store `22:15` + `Asia/Kolkata`. When the scheduler runs in that 15-minute window, the user is nudged (unless they already logged an expense that day).

## Why GitHub Actions (free) for timing

Vercel **Hobby** cannot run cron more than **once per day per job**, and minute precision is not reliable there. For ~5 users who need `10:15` / `10:30`:

| Approach | Free? | 15-min accuracy? |
|---|---|---|
| Vercel `*/15 * * * *` | No (Hobby) | — |
| 24 Vercel daily hour jobs | Yes | Hour only |
| **GitHub Actions `*/15 * * * *`** | **Yes*** | **Yes** |
| cron-job.org | Yes | Yes (external UI) |

\*Public repos: Actions free. Private: included monthly compute is enough for a tiny curl every 15 minutes.

Workflow: [`.github/workflows/reminders-cron.yml`](../.github/workflows/reminders-cron.yml)  
Secrets: `CRON_SECRET`, `CRON_APP_URL` (e.g. `https://your-app.vercel.app`)

`vercel.json` has **no** crons (avoids Hobby deploy errors and double-fires).

## Architecture

```
Settings → permission → PushManager.subscribe → POST /api/push/subscribe
                      → PUT /api/reminders (prefs)

Every 15 min (GitHub Actions)
  → GET /api/cron/reminders  (Bearer CRON_SECRET)
  → isReminderDue (frequency + 15-min local slot + lastSentAt)
  → skip daily if expense already logged today
  → web-push → service worker showNotification
```

## Key files

| Path | Role |
|---|---|
| `public/sw.js` | `push` + `notificationclick` |
| `components/ReminderSettings.tsx` | 15-minute time select |
| `lib/reminder.ts` | Prefs, snap/validate, `isReminderDue` |
| `lib/push.ts` / `lib/push-client.ts` | Send / subscribe |
| `app/api/cron/reminders/route.ts` | Sender |
| `.github/workflows/reminders-cron.yml` | Free 15-min scheduler |
| `.env.example` | VAPID + cron env template |

## Environment

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel + local |
| `VAPID_PRIVATE_KEY` | Vercel + local |
| `VAPID_SUBJECT` | Vercel + local |
| `CRON_SECRET` | Vercel + GitHub Actions secret |
| `CRON_APP_URL` | GitHub Actions secret only |

Optional: `REMINDER_MATCH_HOUR=0` ignores the clock (debug).

## Local test

```bash
# Prefs: Daily + current 15-min slot (e.g. 22:15)
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/reminders
```

Clear `reminder.lastSentAt` to re-test the same day.

## Caveats

- Delivery is the **15-minute slot**, not the exact second (Actions can be a few minutes late under load).
- Each device must enable Reminders once.
- Do not commit `.env` secrets.
