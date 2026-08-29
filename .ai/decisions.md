# Decisions Log

Reference for future me and future LLM sessions: what was decided while editing this codebase, and why. Newest entries at the bottom, format `D<n> - YYYY-MM-DD`.

---

## D1 - 2026-08-29

### Context
Home page skeleton investigation led into a full API restructure, a service worker fix, and a React Strict Mode change. Session covered:

1. Diagnosed the home page loading skeleton.
2. Restructured the entire `/api` layer to follow REST best practices.
3. Fixed the service worker double-fetching every request.
4. Disabled React Strict Mode.

### 1. Home page skeleton — not a bug, no action taken
`HomeSkeleton` in `app/(app)/layout.tsx:66-68` is gated by `profileHydrated` (a Zustand flag in `lib/sync-store.ts`), not by `loading.tsx`/`Suspense`. It's shown while `AppInit.tsx` restores the session (`GET /api/auth/session`) then bootstraps the user (pulls expenses/profile). Confirmed there is **no artificial delay** anywhere in this path — the skeleton duration is 100% real network/DB latency. No code changed here.

### 2. API restructure — full rationale

**Why**: user asked to improve API structure per REST best practices. Verified against Next.js 16.3.0's own bundled docs (`node_modules/next/dist/docs/01-app/`) per this repo's `AGENTS.md` rule (Next version here has training-data-diverging conventions — always read `node_modules/next/dist/docs/` before assuming a Next.js convention from training data). Route file conventions (`route.ts`, `Promise<params>`, named HTTP-verb exports) were already correct — the real issues were code-level, not structural:

- No validation layer (hand-rolled `typeof` checks scattered per route)
- Inconsistent success/error response shapes across routes
- Repeated auth/rate-limit/try-catch boilerplate per handler
- `POST /api/expenses/sync` was one non-RESTful action endpoint doing bulk upsert + soft-delete + profile update + category merge + full-state read-back in a single call

**Options presented to the user, and what was picked**: four candidate issues were surfaced up front (response shape/errors, validation layer, the sync endpoint's REST violation, shared handler wrapper) — user picked all four rather than a subset. This was a deliberate multi-select, not an assumption.

**Final file inventory** (for orientation in future sessions):

New shared infra:
- `lib/api/response.ts` — `ok()` / `fail()` envelope helpers
- `lib/api/handler.ts` — `withUserAuth`, `withAdminAuth`, `withPublic` wrappers
- `lib/validation/auth.ts` — `loginSchema`, `registerSchema`, `changePasswordSchema`, `adminLoginSchema`
- `lib/validation/expense.ts` — `EXPENSE_UPSERT_FIELDS`, `expensePayloadSchema`, `expensesUpsertSchema`, `expensesDeleteSchema`, `adminExpenseSchema`
- `lib/validation/profile.ts` — `profileUpdateSchema`, `adminProfilePatchSchema`
- `lib/validation/category.ts` — `categorySchema`, `categoriesReplaceSchema`

Full final route list under `app/api/`:
- `auth/login`, `auth/register`, `auth/logout`, `auth/session`, `auth/change-password`
- `admin/login`, `admin/logout`, `admin/session`
- `admin/users` (GET), `admin/users/[userId]` (GET/PATCH/DELETE), `admin/users/[userId]/expenses` (POST), `admin/users/[userId]/expenses/[expenseId]` (PATCH/DELETE), `admin/users/[userId]/reset-password` (POST)
- `expenses` (GET/POST/DELETE) — **new**, replaces the old `expenses/sync`
- `profile` (GET/PATCH) — **new**
- `categories` (PUT) — **new**
- `expenses/sync` — **deleted**, no longer exists anywhere in the codebase

**Decisions made, with the reasoning**:

- **Zod added as the validation layer** (`lib/validation/*.ts`, one file per domain: auth, expense, profile, category). Chosen over continuing hand-rolled checks because schemas centralize the shape/constraints in one place instead of duplicating `typeof`/length logic per route. Existing domain constants (`isValidPhone`, `MIN/MAX_PASSWORD_LENGTH` from `lib/auth.ts`) are reused inside schemas rather than re-declared.

- **Shared response envelope** (`lib/api/response.ts`): success = `{ data: ... }`, error = `{ error: { message, ...extra } }`.
  ```ts
  export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);
  export const fail = (message: string, status: number, extra?: Record<string, unknown>) =>
    NextResponse.json({ error: { message, ...extra } }, { status });
  ```
  This is a **breaking change to every response shape** — before, routes returned an ad-hoc mix of `{ ok: true }`, raw fields (`{ userId, passwordIsDefault }`), or `{ error: string }`. Every client `fetch(...).json()` call site across the app was updated in the same pass to unwrap `body.data` / `body.error?.message` instead of the old flat shape. Exact files touched: `lib/auth-store.ts` (restoreSession, signIn, createAccount, changePassword), `lib/sync-store.ts` (fully rewritten, see below), `app/admin/page.tsx` (session check), `components/admin/AdminLogin.tsx` (login), `components/admin/AdminDashboard.tsx` (users list), `components/admin/AdminUserRow.tsx` (user detail), `components/admin/AdminUserPanel.tsx` (profile save, add/edit/delete expense, reset password, delete account — 6 call sites in this one file). Verified via full-repo grep for `fetch('/api` both before starting and after finishing, so nothing was missed. The plain `void fetch('/api/auth/logout', ...).catch(() => {})` fire-and-forget call in `auth-store.ts` needed no change since it never reads the response body.

- **Shared handler wrappers** (`lib/api/handler.ts`): `withUserAuth<P>`, `withAdminAuth<P>`, `withPublic<P>` — generic over the route's dynamic-segment params type `P` (e.g. `{ userId: string }`), matching Next 16's `RouteContext<P>` typed-params convention. Each wraps: auth check (401 via `getSessionUserId()`/`isAdminAuthenticated()`, or none for `withPublic`) → rate limit (429 via `rateLimitOrResponse`) → call the handler → catch-all try/catch (503, `console.error` tagged with a per-route `logTag` string like `'expenses:upsert'`). Handlers receive `{ request, params, userId? }`. This means a new route literally cannot forget the auth check or the try/catch — they're structural, not opt-in per route.

  Rate-limit `key()` functions receive `(request: Request, extra: Extra)` where `extra` is `string` (the resolved `userId`) for `withUserAuth`, or `undefined` for the other two. The wrapper clones the request (`request.clone()`) before handing it to `key()`, so a key function can `await req.json()` to read the body (e.g. to key on `IP:phone` for login) without consuming the stream the actual handler needs afterward. This preserves the original brute-force protection granularity — the pre-refactor login route keyed on `` `login:${clientIp(request)}:${phone}` ``, not just IP, so a single phone number couldn't be brute-forced by rotating IPs while other users' attempts stayed unaffected. This exact behavior was **almost lost** in an early draft where the key function was written as IP-only with a comment rationalizing it ("body already consumed... IP alone is what the wrapper can cheaply key on") — caught by re-reading the file immediately after writing it, before it was ever run or committed. Fixed by adding the clone-based re-read instead of downgrading the security model. Lesson: don't let implementation convenience quietly change a security-relevant default; if the clean implementation can't preserve it, that's a flag to stop and ask, not to rationalize in a comment.

  Full rate limits carried over unchanged from the original per-route values (all in `lib/rate-limit.ts`'s in-memory fixed-window limiter, still per-server-instance/best-effort as documented there):
  - `auth/login`, `auth/register`: 8 / 15 min, keyed on `IP:phone`
  - `auth/change-password`: 8 / 15 min, keyed on `IP:userId`
  - `auth/logout`, `admin/logout`: 20 / 1 min, keyed on `IP`
  - `auth/session`, `admin/session`: 60 / 1 min, keyed on `IP`
  - `admin/login`: 8 / 15 min, keyed on `IP`
  - `admin/users` list, `admin/users/[userId]` detail: 60 / 1 min, keyed on `IP`
  - `admin/users/[userId]` PATCH, expense create/update/delete: 30 / 1 min, keyed on `IP`
  - `admin/users/[userId]` DELETE, `admin/reset-password`: 10 / 15 min (tighter — irreversible/sensitive actions), keyed on `IP`
  - New resource routes, keyed on session `userId` instead of IP (since they all require auth, userId is a stronger key than IP): `expenses` GET/POST/DELETE: 120/60/60 per min respectively; `profile` GET: 120/min, PATCH: 60/min; `categories` PUT: 60/min

  **A real bug caught during this work, not shipped**: `runRateLimit` was initially called without `await` at all three wrapper call sites (`withUserAuth`, `withPublic`, `withAdminAuth`), which meant `limited` held a `Promise` object — always truthy in an `if (limited) return limited;` check, so every single request would have been rejected as rate-limited regardless of actual count. This was caught immediately by re-reading `lib/api/handler.ts` right after the edit (a TS diagnostic on an unrelated type mismatch prompted the re-read) and fixed by awaiting all three call sites before ever running the dev server. Lesson: after any edit that changes a function from sync to async, explicitly re-check every call site, don't rely on TypeScript alone to catch a Promise-used-as-truthy bug — `if (promise)` type-checks fine since `Promise<T>` is always truthy as an object.

- **`POST /api/expenses/sync` split into resource endpoints** — this was an explicit user decision made via a direct question, chosen deliberately over keeping it as a single action/RPC-style endpoint. The RPC-style endpoint would have been the more conventional REST answer for this kind of offline-sync workload (a real-world operation that doesn't map cleanly to single-resource CRUD), and splitting it does **cost real atomicity**: the old single endpoint's writes (soft-delete → bulk upsert → profile update → category merge → read-back) happened as one unit; the new resource endpoints (`/api/expenses` GET/POST/DELETE, `/api/profile` GET/PATCH, `/api/categories` PUT) are called via `Promise.all` from the client and can partially fail independently. This trade-off was surfaced to the user explicitly before implementing, and accepted. Mitigation: each resource endpoint is independently idempotent, and the client's existing retry-on-next-sync-tick behavior (unchanged, in `useSyncStore`) naturally converges state over time — so a partial failure self-heals on the next sync rather than corrupting state permanently.

  **If sync bugs show up later** (state that doesn't converge, a stuck partial state), the first thing to check is whether this split is the cause — reverting to a single combined endpoint is a legitimate fix if the eventual-consistency model proves too lossy in practice.

- **`lib/sync-store.ts`'s `runSync` fully rewritten**. Exact new sequence per sync call:
  1. Build a `writes[]` array of only the calls actually needed (mirrors the old conditional payload-building): `POST /api/expenses` only if `!pullOnly && local.length`; `DELETE /api/expenses` only if there are `deletedIds`; `PUT /api/categories` only if `categories !== null`; `PATCH /api/profile` only if at least one scalar profile field (income/budget/hideAmounts/onboardingComplete/name/theme/cycleStartDay) is set. On a pure `pullOnly` bootstrap call, `writes[]` ends up empty and nothing is written.
  2. `await Promise.all(writes)` — these are independent resources, so no ordering dependency between them.
  3. Scan all write results for a 401/403 first, before checking for any other failure — if any write hit an expired session, short-circuit into `handleSessionExpired()` + toast immediately, skip the pull entirely.
  4. If no auth failure but some other write failed, throw its message (caught by the outer try/catch → toast + `useAuthStore.setError`).
  5. Only after writes succeed: `await Promise.all([GET /api/expenses, GET /api/profile])` to refresh client state — this is the "pull" half, always done regardless of whether anything was written, matching the old endpoint's always-return-full-state behavior.
  6. Apply the pulled expenses via `hydrate()`, and the pulled profile via a new `applyProfileResponse()` helper (extracted from what was inline profile-field-application logic before) plus a categories hydration block if the profile response includes categories.

  A `fetchJson<T>()` helper was added at the top of the file to avoid repeating the `{ data }` / `{ error: { message } }` unwrapping logic at every one of the ~5 call sites in `runSync`.

  The single-flight/queueing logic in `useSyncStore` (`syncInflight`/`syncQueued`, and `bootstrapUser`'s `bootstrapInflight`/`bootstrapInflightFor`) was deliberately left untouched — orthogonal to the endpoint split, still guards against overlapping sync calls the same way it did before.

- **Migration order used** (to keep the app working at every intermediate step, in case work was interrupted): low-risk routes with no/trivial client parsing first (logout, session-check) → auth routes with auth-store.ts updates → admin CRUD routes with admin panel updates → sync split last, as the highest-risk change.

**Verification performed, in order**:
1. `npx tsc --noEmit` after each migration batch — final state is clean except 4 pre-existing `TS5097` (`.ts`-extension-import) errors in `lib/ensure-default-categories.ts` and `tests/sync-categories.test.ts`, confirmed pre-existing (not introduced by this work) by running the same check against `git stash`'d original code.
2. `npm run build` (production build, Turbopack) — compiled clean, route manifest confirmed: all new routes present (`/api/expenses`, `/api/profile`, `/api/categories`), old `/api/expenses/sync` gone.
3. Live curl smoke test against `npm run dev` on a throwaway test account (phone `9339463635`, created and then deleted via the admin DELETE endpoint at the end so no test data was left behind): register → `GET /api/profile` (confirms default category seed present) → `POST /api/expenses` (upsert one expense) → `GET /api/expenses` (confirms it round-trips) → `PUT /api/categories` → `PATCH /api/profile` (income/budget) → `DELETE /api/expenses` → `GET /api/expenses` (confirms empty after delete) → `POST /api/auth/logout` → `POST /api/auth/login` (confirms re-auth works). Then separately: admin login with wrong creds (401), admin login correct (200), `GET /api/admin/users` (list includes the test user), a deliberately malformed `POST /api/expenses` body (`{"expenses":"not-an-array"}`, confirmed 400 `Invalid payload`), and an unauthenticated `POST /api/auth/change-password` (confirmed 401 `Unauthorized`). All responses matched the expected envelope shape.
4. Checked `/tmp/dev-server.log` for runtime errors during the smoke test — none.
5. Final grep for `expenses/sync` across the repo — zero remaining references, confirming no dangling import/URL anywhere.

**A real bug caught during this work, not shipped**: see the `runRateLimit` await bug described above under the handler wrapper section — full detail preserved there rather than duplicated.

### 3. Service worker was double-hitting every request — fixed

**Symptom**: DevTools Network tab showed every API call twice, e.g.:
```
login    200  fetch  auth-store.ts:91  (ServiceW...)   98 ms
login    200  fetch  sw.js:12          0.5 kB          97 ms
expenses 200  fetch  sync-store.ts:36  (ServiceW...)   81 ms
expenses 200  fetch  sw.js:12          45.4 kB         80 ms
```
One row per request came from the page's actual call site; the other, initiated from `sw.js:12`, was the service worker's own internal fetch used to fulfill the intercepted request.

**Root cause**: `public/sw.js` before the fix:
```js
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
```
This listener had **no URL filtering** — it intercepted literally every fetch the page made, including all `/api/*` calls, static assets, everything. It's a network-first-with-cache-fallback pattern (offline-first flavored), but the project is a PWA that the user confirmed is explicitly **not** offline-first. Also worth noting: the cache-fallback branch was dead code regardless of the offline-first question — nothing anywhere in the codebase ever calls `caches.put()` to populate a cache, so `caches.match(event.request)` could only ever return `undefined`. If the primary `fetch()` failed, the fallback would fail too, silently.

**Fix applied** — `public/sw.js` reduced to just the installability requirements:
```js
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```
No `fetch` listener at all now, so every request goes straight from the page to the network with zero service-worker involvement — no interception, no doubled Network-tab entries, no stale-cache risk. `install`/`activate` alone are sufficient for PWA installability checks (Android "Add to Home Screen" prompt, Lighthouse's PWA audit) — a fetch handler is not required for that.

**Verification**: after a hard refresh, user confirmed the doubled entries were gone — `expenses`/`profile` each appeared once, only `session` still appeared twice (which turned out to be an unrelated, separate cause — see §4 below).

**Note for future reference**: browsers keep the previously-installed service worker controlling the page until the new `sw.js` is fetched, installed, and takes over on a subsequent navigation — so a hard refresh (or manually unregistering the old SW in DevTools → Application → Service Workers) is needed to see any `sw.js` change take effect locally, every time.

**If this project ever does become offline-first later**: don't just re-add a blanket fetch handler. Scope it explicitly — e.g. only intercept navigations/static assets, explicitly `event.respondWith(fetch(event.request))` (no interception) for anything under `/api/`, and actually populate a cache with `caches.put()` during `install` or on successful responses before relying on `caches.match()` as a fallback.

### 4. React Strict Mode disabled

**Symptom**: after the SW fix (§3), one doubled entry remained:
```
session  200  fetch  auth-store.ts:54  0.3 kB  28 ms
session  200  fetch  auth-store.ts:54  0.3 kB  36 ms
```
Both rows initiated from the exact same line (`auth-store.ts:54`, inside `restoreSession`) — unlike the service-worker case, this was not a display artifact of two different initiators for one logical request; it was two genuinely separate `fetch()` calls.

**Investigation**: traced every caller of `restoreSession` — only one call site exists, in `components/AppInit.tsx`:
```tsx
useEffect(() => {
  void useAuthStore.getState().restoreSession();
}, []);
```
A single `useEffect` with an empty dependency array, called exactly once in the component body. So the component itself does not double-call it.

**Root cause**: React 19 (used via Next 16's App Router) Strict Mode intentionally double-invokes effects in development — mount → run cleanup (none here) → mount again — specifically to help catch effects that aren't idempotent or that have missing cleanup. `next.config.mjs` had no explicit `reactStrictMode` setting, so it was on Next's App Router default (`true`). This is dev-only: it does not happen in a production build (`next build && next start`), and it is not a bug introduced by anything in today's session — it would have been present before the API restructure too, just masked/confused by the service-worker doubling until §3 was fixed.

**Options offered to the user**: (a) leave it as-is — dev-only noise, disappears in production, recommended since it costs nothing in reality; or (b) add an in-flight-promise guard to `restoreSession` (the same pattern `bootstrapUser` in `lib/sync-store.ts` already uses via its module-level `bootstrapInflight`/`bootstrapInflightFor` variables) so it can't double-fire even under Strict Mode, and would also be defensively correct if `restoreSession` is ever called from a second place later.

**Decision**: user explicitly chose neither offered option and instead asked to disable Strict Mode outright — `reactStrictMode: false` added to `next.config.mjs`. `restoreSession` itself was **not** modified; it's still not guarded against re-entry.

**Trade-off flagged to the user before making the change, and still true after**: this turns off Strict Mode's double-invoke safety net **project-wide**, not just for this one effect. Any other effect anywhere in the app that silently assumes "this runs exactly once per mount" without actually being idempotent (state set twice, a subscription created twice, a side effect fired twice) will no longer get caught early in development — it'll only surface in production, or not at all if the effect happens to be harmless when doubled. Accepted by the user as a reasonable trade for a small solo project.

**Current state of `next.config.mjs`** after this change — `reactStrictMode: false` sits alongside pre-existing `typescript: { ignoreBuildErrors: true }` (already in the codebase before today, unrelated to this session — worth knowing this project already runs production builds without failing on type errors, so `tsc --noEmit` run manually, as done throughout today's session, is the real type-safety gate, not `next build`).

**If effect-related bugs show up later** (duplicate side effects, state mutated twice, subscriptions/listeners leaking, double network calls reappearing somewhere new) that Strict Mode would normally have caught in dev: temporarily flip `reactStrictMode` back to `true` (or delete the line) as a first diagnostic step to see if the symptom is a double-invoke sensitivity, before assuming it's something else.

### 5. `HomeSkeleton` was showing on every tab, not just Home — split into a shared `AppSkeleton`

**Symptom**: user noticed the loading skeleton appeared not just on `/`, but also when switching to `/expenses`, `/settings`, etc., and on hard refresh of any of those routes.

**Investigation**: traced the gate in `app/(app)/layout.tsx`:
```tsx
if (userId && !profileHydrated) {
  return <HomeSkeleton title={pageTitle} />;
}
```
This lives in the **shared layout** for the `(app)` route group, which wraps every route (`/`, `/dashboard`, `/summary`, `/expenses`, `/settings` — per the `PAGE_TITLES` map in the same file). So `HomeSkeleton` was never home-specific in behavior — it was the app-shell-level loading state, just visually shaped like the Home page's content (category grid, "Frequent" chips, transaction list) regardless of which route triggered it.

**Confirmed via code, not just guess**: grepped every place `profileHydrated` is set to `false` (`lib/sync-store.ts:218` on a 401/403 during a sync write, and `:347` at the start of every `bootstrapUser` call). `bootstrapUser` early-returns if already hydrated for the same `userId` (`sync-store.ts:338`), so a plain client-side tab click does **not** re-trigger it — only a hard refresh (full state reset) or genuine session expiry does. This matched what the user was actually seeing (hard refresh on any tab), not a code bug in the hydration gating itself.

**Decision**: user chose to keep `HomeSkeleton`'s existing UI completely untouched for `/`, and add a **new, separate, generic skeleton** for every other route rather than either (a) restricting the skeleton to `/` only and leaving other routes with no loading state, or (b) removing the blocking gate entirely. Both alternatives were offered and neither was chosen — the ask was specifically "keep Home's skeleton as-is, add a common one for the rest."

**Implementation** — new `components/AppSkeleton.tsx`:
- Copies `HomeSkeleton`'s exact shell chrome verbatim (sidebar with `navItems`, header with title + theme icon, mobile tab bar) so the loading state visually matches the real shell precisely — no shell "jump" when real content swaps in.
- Replaces `HomeSkeleton`'s Home-specific content bones (income card, category grid, frequent chips, transaction list) with **neutral, generic placeholders**: one card with a few text-line bones, a 6-tile stat-card grid, and a 5-row list block — reusable-looking for Dashboard, Summary, Expenses, or Settings without pretending to know that page's actual layout.
- Takes `pathname` (not `title`) to compute which nav item is "active," matching against `navItems[].href` — **not** against `title`, because `navItems[0].label` is `'Quick add'` while `PAGE_TITLES['/']` is `'Add expense'`; matching by title string would have silently produced no active-tab highlight. Caught by reading `lib/constants.ts`'s actual `navItems` shape before wiring this up, rather than assuming the two label sets lined up.

**Wiring** — `app/(app)/layout.tsx`:
```tsx
if (userId && !profileHydrated) {
  return pathname === '/' ? (
    <HomeSkeleton title={pageTitle} />
  ) : (
    <AppSkeleton title={pageTitle} pathname={pathname} />
  );
}
```

**Verification**: `npx tsc --noEmit` clean (aside from the same 4 pre-existing unrelated `TS5097` errors noted in §2). Not yet manually clicked through in a running browser as of this entry — do that before considering this fully done if it matters for this change specifically.

**If skeleton content is later asked to be page-specific again** (e.g. an Expenses-shaped skeleton instead of the generic one): `AppSkeleton`'s content section (inside the `<section className="mx-auto max-w-6xl">` block) is the only part that would need to branch per-route; the shell chrome around it is already shared and shouldn't need touching.
