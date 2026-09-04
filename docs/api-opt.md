# API load work — 4 Sep 2026

What shipped **today** to make the mobile loading skeleton shorter, written in simple English, with a before/after example for **every** change that is still in the tree.

Demo account used for all numbers: **+91 12345 67890** (phone and password both `1234567890`), **152 expenses**.

---

## How a load works *right now*

The app still uses **three separate APIs**. Nothing is merged.

```
1. GET /api/auth/session
      ↓  (only after we know who you are)
2. GET /api/expenses   ┐
   GET /api/profile    ┘  at the same time (Promise.all)
      ↓
3. Skeleton goes away, Home / Dashboard / etc. render
```

The UI still waits on the skeleton until **both** expenses and profile come back. There is **no** copy of expenses in `localStorage`. Cloud is the only money data.

Theme still uses `pocket-theme` in localStorage (light/dark only). That was already there. Unrelated to this work.

On first paint of a signed-in session you will still see the skeleton. It should be shorter because the two data APIs themselves got cheaper.

### Example — the three responses (signed in)

Every success body is `{ "data": ... }`. Failures are `{ "error": { "message": "..." } }`.

**1. Session** — cookie only, no Mongo.

```http
GET /api/auth/session
Cookie: pocket_session=1234567890.1772….abc
```

```json
{
  "data": {
    "authenticated": true,
    "userId": "1234567890"
  }
}
```

Not signed in:

```json
{
  "data": {
    "authenticated": false
  }
}
```

**2. Expenses** (trimmed to two rows):

```http
GET /api/expenses
Cookie: pocket_session=…
```

```json
{
  "data": {
    "expenses": [
      {
        "id": "a1b2-c3d4-e5f6",
        "localId": "a1b2-c3d4-e5f6",
        "amount": 240,
        "category": "food",
        "note": "Lunch",
        "paymentMethod": "upi",
        "date": "2026-09-04T08:12:00.000Z",
        "createdAt": "2026-09-04T08:12:00.000Z",
        "updatedAt": "2026-09-04T08:12:00.000Z",
        "deletedAt": null
      },
      {
        "id": "b7c8-d9e0-f1a2",
        "localId": "b7c8-d9e0-f1a2",
        "amount": 90,
        "category": "transport",
        "note": "Metro",
        "paymentMethod": "upi",
        "date": "2026-09-04T07:40:00.000Z",
        "createdAt": "2026-09-04T07:40:00.000Z",
        "updatedAt": "2026-09-04T07:40:00.000Z",
        "deletedAt": null
      }
    ]
  }
}
```

**3. Profile:**

```http
GET /api/profile
Cookie: pocket_session=…
```

```json
{
  "data": {
    "monthlyIncome": 92000,
    "monthlyBudget": 48000,
    "hideAmounts": false,
    "onboardingComplete": true,
    "categories": [
      {
        "id": "food",
        "label": "Food",
        "tone": "mint",
        "iconName": "utensils",
        "custom": true
      }
    ],
    "name": "Aarav Shah",
    "theme": "light",
    "cycleStartDay": 1
  }
}
```

Cookie missing or bad:

```http
GET /api/expenses
```

```json
{ "error": { "message": "Unauthorized" } }
```

Status **401**. The app signs you out.

### Example — time on a warm laptop vs a phone

Laptop (measured today, after connect):

```
session     ████ 5ms
            then
expenses    ████████████████████████████████████ 37ms  ─┐
profile     ██████████ 18ms                              ┘ together
skeleton gone at ~5 + 37 = 42ms
```

Phone with ~180ms network RTT (same server work):

```
session     ████████████████████ 5ms server + 180ms wire
            then
expenses+profile  37ms server + 180ms wire (one shared wait)
skeleton gone at ~5+180 + 37+180 ≈ 400ms
```

The APIs did not merge. Two round trips is the price of keeping them separate.

---

## Change 1 — Lean expense list (`GET /api/expenses`)

**Files:** `lib/user-data.ts` (`listActiveExpenses`, `toClientExpense`), `app/api/expenses/route.ts`

**Before today:** the route asked Mongo for whole documents and sent them straight out.

```js
const records = await db.collection('expenses')
  .find({ userId, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] })
  .sort({ updatedAt: -1 })
  .limit(10000)
  .toArray();

return ok({ expenses: records });
```

Example row on the wire:

```json
{
  "_id": "66f0a1b2c3d4e5f678901234",
  "userId": "1234567890",
  "localId": "a1b2-c3d4-e5f6",
  "amount": 240,
  "category": "food",
  "note": "Lunch",
  "paymentMethod": "upi",
  "date": "2026-09-01T08:12:00.000Z",
  "createdAt": "2026-09-01T08:12:00.000Z",
  "updatedAt": "2026-09-01T08:12:00.000Z"
}
```

Problems: `_id` is Mongo’s internal id. `userId` is already in the cookie. Dates/ObjectIds were dumped raw. Extra fields on the document would leak to the phone.

**After today:** the same filter and sort, but:

1. `.project({ ... })` — only fields the UI uses
2. `toClientExpense` — `id` from `localId`, amount as a number, dates as ISO strings, empty notes dropped

```js
.find({ userId, /* not deleted */ })
.project({
  _id: 0,
  localId: 1,
  id: 1,
  amount: 1,
  category: 1,
  note: 1,
  paymentMethod: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: 1,
})
.sort({ updatedAt: -1 })
.limit(10000)
```

Example row now:

```json
{
  "id": "a1b2-c3d4-e5f6",
  "localId": "a1b2-c3d4-e5f6",
  "amount": 240,
  "category": "food",
  "note": "Lunch",
  "paymentMethod": "upi",
  "date": "2026-09-01T08:12:00.000Z",
  "createdAt": "2026-09-01T08:12:00.000Z",
  "updatedAt": "2026-09-01T08:12:00.000Z",
  "deletedAt": null
}
```

### Example — `toClientExpense` step by step

Mongo might hand the helper something messy:

```js
{
  _id: ObjectId("66f0…"),          // dropped by projection
  userId: "1234567890",            // dropped by projection
  localId: "a1b2-c3d4-e5f6",
  amount: "240",                   // string in a bad old row
  category: "food",
  note: "   ",                     // whitespace only
  paymentMethod: "upi",
  date: new Date("2026-09-04T08:12:00.000Z"),
  createdAt: new Date("2026-09-04T08:12:00.000Z"),
  updatedAt: new Date("2026-09-04T08:12:00.000Z"),
  debugFlag: true                  // leftover field — projection never fetches it
}
```

What the phone gets:

```js
{
  id: "a1b2-c3d4-e5f6",            // copied from localId
  localId: "a1b2-c3d4-e5f6",
  amount: 240,                     // Number(...)
  category: "food",
  // note omitted — trim was empty
  paymentMethod: "upi",
  date: "2026-09-04T08:12:00.000Z",
  createdAt: "2026-09-04T08:12:00.000Z",
  updatedAt: "2026-09-04T08:12:00.000Z",
  deletedAt: null
}
```

Home uses `e.id` to edit/delete. Soft-deleted rows never appear (`deletedAt` set in Mongo is filtered in `find`).

On this seed account the JSON size barely moved (see measurements). Time still dropped because Mongo copies less BSON and we emit a flatter object. If rows later grow extra fields, projection stops those fields leaving the server.

The GET handler now only times + calls the helper:

```js
const t0 = performance.now();
const db = await getDb();
const tDb = performance.now();
const expenses = await listActiveExpenses(db, userId);
return stampServerTiming(ok({ expenses }), [
  ['db', tDb - t0],
  ['query', performance.now() - tDb],
]);
```

`POST` / `DELETE` on `/api/expenses` were **not** rewritten. Writes are unchanged.

### Example — what a write still looks like (unchanged)

Add an expense on the phone → `POST /api/expenses`:

```json
{
  "expenses": [
    {
      "id": "a1b2-c3d4-e5f6",
      "localId": "a1b2-c3d4-e5f6",
      "amount": 240,
      "category": "food",
      "note": "Lunch",
      "paymentMethod": "upi",
      "date": "2026-09-04T08:12:00.000Z",
      "createdAt": "2026-09-04T08:12:00.000Z",
      "updatedAt": "2026-09-04T08:12:00.000Z"
    }
  ]
}
```

Then the client **pulls** again with the same two GETs (`/api/expenses` + `/api/profile` in parallel). That pull uses the new lean GET.

---

## Change 2 — Lean profile read (`GET /api/profile`)

**Files:** `lib/profile-map.ts` (`toProfileResponse`), `lib/user-data.ts` (`findProfile`), `app/api/profile/route.ts`

**Before:** `findOne({ userId })` with no projection, then a mapper that lived only inside the route file. Mongo `_id` rode along until mapping.

**After:** shared mapper (safe to import from client or server) plus:

```js
db.collection('profiles').findOne(
  { userId },
  { projection: { _id: 0 } }
)
```

Only these fields go to the phone:

| Field | Meaning |
|---|---|
| `monthlyIncome` | number or null |
| `monthlyBudget` | number or null |
| `hideAmounts` | boolean or null |
| `onboardingComplete` | true / false |
| `categories` | array (or `[]`) |
| `name` | string or null |
| `theme` | `'dark'` / `'light'` / null |
| `cycleStartDay` | 1–31 or null |

### Example — Mongo document vs API `data`

What Mongo can store (extra leftovers included):

```json
{
  "_id": "66aa…",
  "userId": "1234567890",
  "monthlyIncome": 92000,
  "monthlyBudget": 48000,
  "hideAmounts": false,
  "onboardingComplete": true,
  "name": "Aarav Shah",
  "theme": "light",
  "cycleStartDay": 1,
  "categories": [
    { "id": "food", "label": "Food", "tone": "mint", "iconName": "utensils", "custom": true }
  ],
  "updatedAt": "2026-09-04T10:00:00.000Z",
  "categoryOverrides": {},
  "categoryIconOverrides": {}
}
```

What GET returns after `toProfileResponse` (no `_id`, no `userId`, no dead override maps, no `updatedAt`):

```json
{
  "monthlyIncome": 92000,
  "monthlyBudget": 48000,
  "hideAmounts": false,
  "onboardingComplete": true,
  "categories": [
    { "id": "food", "label": "Food", "tone": "mint", "iconName": "utensils", "custom": true }
  ],
  "name": "Aarav Shah",
  "theme": "light",
  "cycleStartDay": 1
}
```

Missing profile (brand-new user): `findOne` is `null` → same shape, all nulls / false / `[]`.

```json
{
  "monthlyIncome": null,
  "monthlyBudget": null,
  "hideAmounts": null,
  "onboardingComplete": false,
  "categories": [],
  "name": null,
  "theme": null,
  "cycleStartDay": null
}
```

`PATCH /api/profile` still writes as before. It maps the saved doc with `toProfileResponse` so GET and PATCH return the same shape.

Example PATCH:

```http
PATCH /api/profile
Content-Type: application/json

{ "monthlyBudget": 50000, "theme": "dark" }
```

Response `data` is the full mapped profile again, not just the two fields.

Profile was already a single `findOne`, so it was never the heavy query. This change is consistency + no `_id` on the wire.

---

## Change 3 — Indexes

**File:** `lib/user-data.ts` → `ensureUserDataIndexes`, called from `lib/db.ts` after connect (does not block the first query; it runs in the background).

**Before:** no indexes created by the app. Listing one user’s expenses newest-first could mean a collection scan as data grows.

**After** (safe to run every process start; Mongo no-ops if the index already exists):

```js
expenses.createIndex({ userId: 1, updatedAt: -1 })
profiles.createIndex({ userId: 1 }, { unique: true })
```

- Expenses index: “this person, already newest first”.
- Profiles unique index: one profile per `userId`, fast lookup.

If `createIndex` fails (for example old duplicate profile rows), we log `[db] ensure indexes failed` and keep serving. We do **not** crash every API.

### Example — drawer vs labelled tabs

Imagine 50,000 expense rows from many people.

**No index:** Mongo walks note after note: “yours? no. yours? no…” until it has all of `1234567890`, then sorts by `updatedAt`. Cost grows with **everyone’s** data.

**With `{ userId: 1, updatedAt: -1 }`:** Mongo opens the tab labelled `1234567890`. Those rows are already newest-first. Cost grows with **your** data only.

For **152** demo rows, a scan is still cheap. The bench examined **153** docs for both old and new queries on this small set. The index is for “still fine at many users / 10,000 expenses”.

---

## Change 4 — Reuse the Mongo client

**File:** `lib/db.ts`

**Before:**

```js
let client = null;
client ??= new MongoClient(process.env.MONGODB_URI);
await client.connect();
return client.db('pocket');
```

In a long-lived Node process that is one client. In Next.js **dev hot reload** and **serverless**, a new module instance can throw that `let` away. Each isolate then pays TLS + auth to Atlas. Two parallel routes (`/api/expenses` and `/api/profile`) can each pay it on a cold start.

**After:**

```js
globalThis.__pockettMongoClient ??= new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 0,
});
await globalThis.__pockettMongoClient.connect();
const db = globalThis.__pockettMongoClient.db('pocket');
void ensureUserDataIndexes(db);
return db;
```

`connect()` on an already-open client is cheap. Pool size 10 is enough for this app; min 0 so idle serverless does not hold sockets.

### Example — cold vs warm (this session, demo account)

**Cold** (first hit after idle, new connection):

```
GET /api/expenses  ~354–397ms   (connect + query)
GET /api/profile   ~500–563ms   (connect + query, in parallel)
```

`Server-Timing` would look like `db` of hundreds of ms if we had measured it then. We did not stamp `db` yet on that first load.

**Warm** (same process, client already on `globalThis`):

```
GET /api/expenses  ~37ms    Server-Timing: db;dur=0.0, query;dur=33.1
GET /api/profile   ~18ms    Server-Timing: db;dur=0.0, query;dur=6.2
```

`db;dur=0.0` means “handle was already there”. That is the reuse working.

This is the main reason **HTTP** went from ~350–500ms (cold) to ~20–40ms (warm). Opening Atlas is often slower than the query.

---

## Change 5 — Shared query helpers

**New files:** `lib/user-data.ts`, `lib/profile-map.ts`

**Before:** expense find + profile find + mapper were copied inside each route.

**After:**

| Helper | Job |
|---|---|
| `listActiveExpenses(db, userId)` | projected, mapped expense list |
| `findProfile(db, userId)` | projected profile as `ProfileResponse` |
| `toProfileResponse(doc)` | shape for GET/PATCH (no Mongo import — client-safe) |
| `toClientExpense(doc)` | one lean expense |
| `ensureUserDataIndexes(db)` | indexes, once per process |

`user-data.ts` imports Mongo types. Do **not** import it from client components. `profile-map.ts` is the client-safe half.

### Example — who calls what

```
GET /api/expenses
  → withUserAuth (cookie, rate limit)
  → listActiveExpenses(db, "1234567890")
  → [ { id, amount, … }, … ]

GET /api/profile
  → withUserAuth
  → findProfile(db, "1234567890")
  → toProfileResponse(doc)
  → { monthlyIncome, categories, … }

PATCH /api/profile
  → writes Mongo
  → toProfileResponse(savedDoc)   // same shape as GET
```

Client `lib/sync-store.ts` after a pull (unchanged idea, leaner GET bodies):

```js
const [expensesResult, profileResult] = await Promise.all([
  fetchJson('/api/expenses'),
  fetchJson('/api/profile'),
]);
```

---

## Change 6 — See which API is slow

Three layers. None of them change the JSON body.

### 6a. Server-Timing header

**Files:** `lib/api/response.ts` (`stampServerTiming`), `lib/api/handler.ts`, expense GET, profile GET

Every wrapped route (user, public, admin) appends:

```
Server-Timing: handler;dur=34.4
```

Expense and profile GETs also add `db` and `query`:

```
Server-Timing: db;dur=0.0, query;dur=33.1, handler;dur=34.4
```

| Name | Meaning |
|---|---|
| `db` | time to call `getDb()` (should be ~0 once connected) |
| `query` | time inside Mongo |
| `handler` | whole route, including auth |

Same-origin `fetch` can read this. DevTools → Network → the request → headers.

The wrapper also logs `[expenses:list] 37ms` so Vercel / `next dev` show the same number.

### Example — reading headers in DevTools

1. Open the app, then DevTools → **Network**.
2. Reload while signed in.
3. Click `expenses`.
4. Headers tab, response headers:

```
content-type: application/json
server-timing: db;dur=0.0, query;dur=33.1, handler;dur=34.4
```

5. Click `profile`:

```
server-timing: db;dur=0.0, query;dur=6.2, handler;dur=8.1
```

If `query` is 33ms and the **Timing** waterfall says 200ms, the extra 167ms is DNS / TLS / waiting on the phone, not Mongo.

### 6b. Phone-side timer

**File:** `lib/api-client.ts` (`fetchJson`)

Sync and session restore go through `fetchJson` instead of raw `fetch`. Each call records:

- **ms** — time on the phone (includes network)
- **serverMs** — parsed from `handler;dur=` (or `total;dur=`)
- url, method, ok/fail

Last 12 calls are kept. Console:

```
[pockett] GET /api/auth/session 5ms (server 1ms)
[pockett] GET /api/expenses 37ms (server 34ms)
[pockett] GET /api/profile 18ms (server 8ms)
```

The in-memory record looks like:

```js
{
  url: "/api/expenses",
  method: "GET",
  ms: 37.2,          // phone clock
  serverMs: 34.4,    // from Server-Timing
  ok: true
}
```

### Example — how to read phone vs server

| What you see | What it means |
|---|---|
| phone 37ms, server 34ms | Almost all time is Mongo + handler. Network is tiny (localhost). |
| phone 400ms, server 34ms | Server is fine. The **wire** is slow (typical mobile). |
| phone 400ms, server 380ms, `query;dur=360` | Mongo/query is the problem (missing index, huge list, cold Atlas). |
| phone 400ms, server 380ms, `db;dur=350` | Connecting to Mongo is the problem (cold instance). |

### 6c. Settings → Sync

**Files:** `app/(app)/settings/page.tsx`, `components/views/Settings.tsx`

After at least one timed call, the Sync row description looks like:

```
Client time includes network. Last calls:
GET /api/auth/session 5ms / server 1ms ·
GET /api/expenses 37ms / server 34ms ·
GET /api/profile 18ms / server 8ms
```

That is how you check timings **on a phone** without a laptop inspector. Tap **Sync now** to run a fresh pull and see new numbers.

---

## Change 7 — One-time leftover key wipe

**File:** `components/AppInit.tsx`

A snapshot in `localStorage` (`pockett:snapshot:v1`) was tried today and **removed the same day**. Expenses, notes, and income must not live on disk.

On boot we still run:

```js
localStorage.removeItem('pockett:snapshot:v1')
```

so a phone that already saved that key drops it. After that, the key should not come back.

### Example — Application tab

**Before the wipe** (if you loaded the app during the short window today):

```
localStorage
  pocket-theme            "light"
  pockett:snapshot:v1     {"v":1,"userId":"1234567890","expenses":[...152 items...], ...}
```

**After a refresh today:**

```
localStorage
  pocket-theme            "light"
```

`pocket-theme` stays. That is only dark/light.

---

## Tried today, then removed (not in the tree)

These are **not** how the app works now. Written down so nobody thinks they are still on.

### Combined `GET /api/bootstrap`

One route that returned session + expenses + profile. Fewer round trips on 4G, but one blob that mixed three resources. You asked it gone. Session, expenses, and profile are separate again.

Example of what that **removed** response looked like (do not add this route back):

```json
{
  "data": {
    "authenticated": true,
    "userId": "1234567890",
    "expenses": [ /* all expenses */ ],
    "profile": { /* full profile */ }
  }
}
```

### `pockett:snapshot:v1` localStorage cache

Showed last expenses before the APIs returned. Faster *feeling* second open, but a full copy of money data in the browser. Removed. Cloud only.

---

## What we still did not do

- Paginate expenses. Limit is still **10,000** active rows. 152 is fine. A huge history would need “this month first”.
- Change POST/DELETE expenses or PATCH profile beyond sharing `toProfileResponse` on PATCH’s return.
- Service-worker caching of API responses (`public/sw.js` still has no fetch handler).
- Store money data in IndexedDB / localStorage.

---

## Files touched today (current tree)

| File | Role |
|---|---|
| `lib/db.ts` | global Mongo client + pool + kick off indexes |
| `lib/user-data.ts` | list expenses, find profile, indexes |
| `lib/profile-map.ts` | profile JSON shape |
| `lib/api/response.ts` | `stampServerTiming` |
| `lib/api/handler.ts` | `handler;dur=` on every route + `[logTag] Nms` |
| `lib/api-client.ts` | timed `fetchJson` |
| `app/api/expenses/route.ts` | GET uses `listActiveExpenses` + query timing |
| `app/api/profile/route.ts` | GET uses `findProfile` + query timing |
| `lib/sync-store.ts` | still `Promise.all` expenses + profile after writes / pull |
| `lib/auth-store.ts` | `restoreSession` uses `fetchJson('/api/auth/session')` |
| `app/(app)/settings/page.tsx` | passes last timings into Settings |
| `components/views/Settings.tsx` | shows last 3 calls under Sync |
| `components/AppInit.tsx` | deletes leftover snapshot key |
| `scripts/bench-api-opt.mjs` | old query vs new query on Mongo |
| `docs/api-opt.md` | this file |

---

## Before vs after (measured 4 Sep 2026)

`npm test` passed. Then `node --env-file=.env scripts/bench-api-opt.mjs` on **+91 12345 67890**, 152 expenses, 8 timed runs after 2 warmups. That script runs the **old Mongo query** (full documents) and the **new query** (projection + `toClientExpense`) on the same database. It does not log in over HTTP.

### Mongo query (warm connection)

| | Previous code | Optimized code (today) |
|---|---|---|
| Expenses query | **53.1 ms** | **37.0 ms** |
| Profile query | **11.0 ms** | **10.1 ms** |
| Expenses JSON | 44.4 KB | 45.3 KB |
| Profile JSON | 1.3 KB | 1.2 KB |
| Docs examined | 153 | 153 |

Expenses query ≈ **30% faster** (53 → 37 ms). Profile barely moved (already one `findOne`).

JSON size is almost the same on this seed: we drop `_id` + `userId`, add `id` + `deletedAt`. Little fat on these rows. Time still dropped from less BSON work.

Previous expense keys: `_id`, `amount`, `category`, `createdAt`, `date`, `localId`, `note`, `paymentMethod`, `updatedAt`, `userId`.

Today’s expense keys: `amount`, `category`, `createdAt`, `date`, `deletedAt`, `id`, `localId`, `note`, `paymentMethod`, `updatedAt`.

### Example — same two keys, one row

```
Before:  _id + userId + localId + amount + …
After:   id  + localId + amount + … + deletedAt
```

152 × a few extra/missing short fields ≈ the **44.4 KB vs 45.3 KB** you see. Not a payload win on this seed. Still a shape win for the client.

### Live HTTP through Next.js (localhost)

Real route handlers, not only Mongo.

**Before this work** — first load this session, connection still cold:

| API | Time |
|---|---|
| `GET /api/auth/session` | 2–33 ms |
| `GET /api/expenses` | **354–397 ms** |
| `GET /api/profile` | **500–563 ms** |
| Startup wait (session, then the two together) | **~500–600 ms** |

**After today** — warm, same account, 6 runs, still three APIs:

| API | Avg | Payload | Server-Timing |
|---|---|---|---|
| `GET /api/auth/session` | 5 ms | 0.1 KB | handler 1.4 ms |
| `GET /api/expenses` | **37 ms** | 45.3 KB | query 33.1 ms |
| `GET /api/profile` | 18 ms | 1.2 KB | query 6.2 ms |
| Startup wait (session, then the two together) | **42 ms** | 46.5 KB | |

### Example — startup wait formula

```
wait = session_time + max(expenses_time, profile_time)
```

Before (cold): `33 + max(397, 563) ≈ 596ms`  
After (warm):  `5 + max(37, 18) = 42ms`

**~500 ms → ~42 ms** on HTTP is mostly **connection reuse**. **53 ms → 37 ms** is the leaner expense query. The skeleton waits on `max(expenses, profile)` after session, which is now expenses at ~37 ms locally.

On a phone you still pay **two round trips** (session, then the pair). At ~180 ms RTT that is about **+360 ms** of network on top of server time. That is expected without a local money cache.

---

## How to re-run the Mongo before/after

```bash
npm test
node --env-file=.env scripts/bench-api-opt.mjs
```

On a phone: Settings → Sync after a load, and compare “phone ms” vs “server ms”.
