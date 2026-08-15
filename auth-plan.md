# Auth Plan

## Current state (why this is needed)

- "Sign in" = type a 10-digit phone number → it becomes `userId`, stored client-side in IndexedDB. No password, no server-side verification at all.
- `/api/expenses/sync` accepts **any** `userId` string in the POST body and reads/writes that user's expenses + profile with no check that the caller actually owns that phone number. Anyone who guesses/knows a 10-digit number can read or overwrite that person's data.
- Admin panel (`/api/admin/*`) already has real auth (hardcoded credentials, HMAC-signed session cookie via `lib/admin-auth.ts`) — that stays as-is, not in scope.

## Design decisions

- **Identity stays phone number** (`userId`), we're layering a password + session on top, not replacing the identity model.
- **Password hashing:** Node's built-in `crypto.scrypt` (async, random salt per user) — matches the project's existing zero-dependency style in `lib/admin-auth.ts`, avoids adding `bcrypt`.
- **Sessions:** httpOnly, signed cookie (`HMAC-SHA256`, same pattern as `ADMIN_SESSION_COOKIE`), 30-day TTL. Shares one `SESSION_SECRET` env var with the admin panel (falls back to a dev secret if unset).
- **Existing users (legacy, no password on record):** on first login attempt, if the phone number has an existing `profiles` doc but no `users` doc, and the submitted password equals their own phone number digits, we provision `passwordHash = hash(phone)`, flag `passwordIsDefault: true`, and log them in. They're nudged (toast + settings) to set a real password. **This is an intentional, requested tradeoff:** until a legacy user sets a real password, anyone who knows their phone number can sign in as them — same exposure as today, just no longer true once they change it once in Settings.
- **Brand-new phone numbers** (no `profiles` doc, no `users` doc): this *is* registration. Password must be ≥ 6 characters; whatever they type becomes their real password immediately (`passwordIsDefault: false`).
- **One combined form**, not a separate signup screen — matches current single-field UX, just phone + password together.
- **Rate limiting:** simple in-memory fixed-window limiter per IP+phone on `/api/auth/login` and `/api/auth/change-password`. Documented limitation: this is best-effort on serverless (per-instance, resets on cold start) — acceptable for a personal-use app, not a substitute for a real store like Redis if this ever needs to scale.
- **`/api/expenses/sync` becomes session-gated:** requires a valid session cookie, and the `userId` in the payload must match the session's userId (403 otherwise). This is the actual security fix — no more trust-the-client-provided-id.
- Deliberately **out of scope**: self-serve forgot-password (no email/SMS infra to reset via), 2FA, OAuth. **Forgot-password is instead handled by an admin action** (added in section 7 below): clears the user's `passwordHash`, which drops them back into the same legacy phone-as-password path a pre-password account already has. Note this doesn't revoke a session already active on another device, only the ability to start a new one with the old password.

## Checklist

### 1. Shared backend infra
- [x] `lib/db.ts` — single shared Mongo client/db getter (dedupe the 3 copy-pasted connectors in `admin-db.ts` / `sync/route.ts`)
- [x] `lib/auth.ts` — `hashPassword` / `verifyPassword` (scrypt), `createSessionToken` / `verifySessionToken` (HMAC), `getSessionUserId()` (reads cookie server-side), cookie name/TTL constants
- [x] `lib/rate-limit.ts` — in-memory fixed-window limiter helper

### 2. Auth API routes
- [x] `POST /api/auth/login` — combined login/register/legacy-migrate (logic above), sets session cookie
- [x] `POST /api/auth/logout` — clears session cookie
- [x] `GET /api/auth/session` — `{ authenticated, userId? }` for client-side session verification
- [x] `POST /api/auth/change-password` — requires session, verifies current password, sets new one, clears `passwordIsDefault`

### 3. Lock down existing data API
- [x] `/api/expenses/sync` — require valid session; reject if `payload.userId !== session.userId`
- [x] `admin-db.ts` / sync route refactored onto shared `lib/db.ts`

### 4. Frontend — login flow
- [x] `components/Login.tsx` — add password field (with show/hide), update copy (drop the "no OTP required" framing, it's no longer accurate)
- [x] `lib/app-context.tsx` — add `password`/`setPassword`; `continueWithPhone` now calls `/api/auth/login`, surfaces server errors, nudges toast when `passwordIsDefault`
- [x] `lib/app-context.tsx` — `logout()` also calls `/api/auth/logout`
- [x] `lib/app-context.tsx` — on boot, verify the restored local session against `GET /api/auth/session`; only force logout on an explicit "not authenticated" response, never on a network error while offline
- [x] `lib/app-context.tsx` — `sync()` treats a 401/403 as "session gone" → clears local identity and sends the user back to login, instead of just showing a generic sync-failed toast

### 5. Frontend — change password
- [x] `components/views/Settings.tsx` — "Change password" form (current, new, confirm) in the Account section
- [x] `app/(app)/settings/page.tsx` — wire it to a new `changePassword` context method

### 6. Verification
- [x] `npx tsc --noEmit` clean (`npm run lint` isn't runnable in this environment — `eslint` isn't installed/configured in `node_modules`, pre-existing to this change, not something I introduced)
- [x] Manual smoke test against the live `MONGODB_URI` (throwaway test phone numbers `9000000001`/`9000000002`, deleted afterward — verified 0 remaining docs): brand-new signup ✓, wrong password rejected ✓, correct re-login ✓, sync accepted for matching session ✓, sync **403** for mismatched `userId` in body ✓, sync **401** with no session cookie ✓, change-password wrong-current rejected ✓, change-password success + old password stops working + new password works ✓, legacy profile + wrong password → migration-hint 401 ✓, legacy profile + phone-as-password → success with `passwordIsDefault: true` ✓, logout clears session ✓

### 7. Admin-assisted password reset
- [x] `POST /api/admin/users/[userId]/reset-password` — admin-gated, deletes the user's `users` doc so their next login falls back to phone-as-password
- [x] `components/admin/AdminUserPanel.tsx` — "Account access" card with a Reset password button

### 8. API audit — every route rate-limited, every route that can require a cookie does
Added `lib/rate-limit.ts`'s `rateLimitOrResponse()` helper and applied it to **every** route handler, with limits tuned to what each one actually is (credential-guessing vs. normal authenticated traffic vs. admin-only). Cookie/session checks were already in place per section 3 above; the only handlers that don't check a cookie are the two login endpoints themselves — a login route can't require the cookie it's the one issuing, by definition. Full table:

| Route | Method | Cookie check | Rate limit |
|---|---|---|---|
| `/api/auth/login` | POST | — (issues the cookie) | 8 / 15 min per IP+phone |
| `/api/admin/login` | POST | — (issues the cookie) | 8 / 15 min per IP |
| `/api/auth/change-password` | POST | session required | 8 / 15 min per IP+user |
| `/api/auth/logout` | POST | none needed (idempotent) | 20 / min per IP |
| `/api/admin/logout` | POST | none needed (idempotent) | 20 / min per IP |
| `/api/auth/session` | GET | reads session (status probe) | 60 / min per IP |
| `/api/admin/session` | GET | reads session (status probe) | 60 / min per IP |
| `/api/expenses/sync` | POST | session required + `userId` must match | 120 / min per session (generous — this is normal app traffic, not credential guessing) |
| `/api/admin/users` | GET | admin required | 60 / min per IP |
| `/api/admin/users/[userId]` | GET | admin required | 60 / min per IP |
| `/api/admin/users/[userId]` | PATCH | admin required | 30 / min per IP |
| `/api/admin/users/[userId]` | DELETE | admin required | 10 / 15 min per IP (irreversible, extra friction) |
| `/api/admin/users/[userId]/expenses` | POST | admin required | 30 / min per IP |
| `/api/admin/users/[userId]/expenses/[expenseId]` | PATCH/DELETE | admin required | 30 / min per IP |
| `/api/admin/users/[userId]/reset-password` | POST | admin required | 10 / 15 min per IP (grants sign-in access, extra friction) |

- [x] Refactored the three existing rate-limit call sites onto the shared helper for consistency
- [x] `npx tsc --noEmit` clean
- [x] Live sanity check: unauthenticated session/logout calls still return correctly (not swallowed by the new rate-limit code), a fresh signup + sync still succeeds under the new sync limiter — throwaway account cleaned up afterward
