# Potential Bugs — Pocket (expense tracker)

Full-codebase review (manual senior-level pass + `react-doctor` static scan) performed 2026-08-15.
App shape: Next.js 16 / React 19 App Router PWA. Auth is a bare phone number (no OTP) stored in
IndexedDB; MongoDB is the sync source of truth; `lib/app-context.tsx` (`AppProvider`) is the single
global state/sync brain consumed by every page via `useApp()`.

Legend: [ ] open · [x] fixed · Priority: 🔴 high · 🟡 medium · 🟢 low/polish · ⚪ reviewed, not a bug (kept for record)

---

## 🔴 High priority — correctness bugs

- [x] **Offline-deleted expenses can resurrect after an app restart.** `pendingDeletedIds` (the list of
      expense ids still waiting to be soft-deleted in Mongo) lives only in React state — it is never
      written to IndexedDB. If a user deletes an expense while offline, then closes/reloads the app
      before reconnecting, the pending id is lost. `bootstrapUser`'s first `sync()` call also hardcodes
      `deletedIds=[]` instead of reusing any pending ref. On the next successful sync, Mongo (which never
      got the delete) is treated as source of truth and `hydrate()` replaces local state — the "deleted"
      expense comes back.
      `lib/app-context.tsx` (`pendingDeletedIds` state, `bootstrapUser`)

- [x] **Login page flashes the sign-in form for already-authenticated users.** `app/login/page.tsx`
      renders `<Login />` whenever `!needsIncome`, even when `userId && profileHydrated` is already true
      and the redirect-home `useEffect` is about to fire. A returning signed-in user briefly sees the
      phone-number form before being bounced to `/`. Matches `react-doctor`'s
      `nextjs-no-client-side-redirect` finding at line 32 exactly.
      `app/login/page.tsx`

- [x] **`no-ref-current-in-render` (react-doctor error, highest severity finding).**
      `bootstrapUserRef.current = bootstrapUser;` mutates a ref directly in the render body. React may
      replay/discard render work, so the mutation can leak from UI that never commits.
      `lib/app-context.tsx:776`

## 🟡 Medium priority — logic / UX correctness

- [x] **`ExpenseDeleteDialog` copy is inaccurate.** It states "You can't undo it later," but
      `handleDeleteExpense` actually offers a 5-second "Undo" action on the toast that follows. Misleads
      users into losing data they could have recovered.
      `components/ExpenseDeleteDialog.tsx`

- [x] **Dashboard month-picker can render a blank period label.** If every expense in the
      currently-selected past month is deleted, that month disappears from `availableMonths`,
      `monthIndex` becomes `-1`, and `periodLabel` falls back to `''` (blank header) instead of a
      friendly placeholder. `Expenses.tsx`'s equivalent picker already guards this case.
      `components/views/Dashboard.tsx`

- [x] **`saveIncome` / `saveBudget` don't clear stale validation errors on their own success path.**
      They rely on `sync()`'s internal `setError('')` to clean up, which works in the common case but
      leaves a window where a stale error banner (rendered globally in the app shell, not just on
      Settings) can persist across page navigation after a validation failure.
      `lib/app-context.tsx` (`saveIncome`, `saveBudget`)

## 🟢 Low priority — accessibility & performance (from `react-doctor`)

- [x] **`prefer-html-dialog` — modals have no focus trap.** Keyboard users can Tab out of an open dialog
      into the page behind it. Added a small reusable focus-trap hook and wired it into the three live
      dialogs (the fourth, `BackTapSetupDialog`, is dead code — see below).
      `components/CategoryDialog.tsx:57`, `components/ExpenseEditDialog.tsx:76`,
      `components/ExpenseDeleteDialog.tsx:46`

- [x] **`no-autofocus` — two full-page forms auto-move focus on load.** Can disorient screen-reader
      users. Removed `autoFocus` from both (dialog-embedded autofocus elsewhere was left alone —
      `react-doctor` doesn't flag it, and moving focus into a just-opened modal is the accepted
      exception).
      `components/Login.tsx:42`, `components/IncomeSetup.tsx:47`

- [x] **`rerender-lazy-state-init` — `formatIndianNumber()` runs on every render and is thrown away.**
      `useState(formatIndianNumber(expense.amount))` → lazy initializer.
      `components/ExpenseEditDialog.tsx:33`

- [x] **`rerender-memo-with-default-value` — `categories = []` default recreates an array every
      render**, breaking memoization for anything downstream that depends on referential stability.
      Hoisted to a module-level constant.
      `components/views/Expenses.tsx:125`

- [x] **`jsx-no-constructed-context-values` — `PwaContext` value object rebuilt every render.**
      Wrapped in `useMemo`.
      `components/PwaProvider.tsx:180`

- [x] **`prefer-module-scope-pure-function` — `expenseAmount` / `pctOf` are pure helpers redefined
      inside the component on every render.** Hoisted both to module scope.
      `components/views/Dashboard.tsx:204,256`

- [x] **`js-combine-iterations` / `js-set-map-lookups` — redundant passes and O(n) `.includes()` lookups
      inside loops.** Combined map+filter into single passes and switched `deletedIds.includes()` to a
      `Set` (this one runs on every sync response, so it's the most meaningful of the batch — up to
      10k records per the Mongo query cap).
      `lib/app-context.tsx:397,402,411,1338`, `components/views/Dashboard.tsx:225`,
      `components/views/MonthlySummary.tsx:79`, `app/api/expenses/sync/route.ts:129`

- [x] **`async-parallel` — 3 independent IndexedDB writes awaited sequentially.** Switched to
      `Promise.all`.
      `lib/app-context.tsx:439` (offline-fallback branch of `bootstrapUser`)

- [x] **`require-pnpm-hardening` — no `pnpm-workspace.yaml` supply-chain hardening.** Added
      `minimumReleaseAge` (7 days) and `trustPolicy: no-downgrade`.
      `pnpm-workspace.yaml` (new file)

## ⚪ Reviewed — not fixed, with reasoning

- **`no-locale-format-in-render` (6 instances, `toLocaleDateString()` "hydration mismatch").** Not
  applicable here: every page that renders these components is gated behind a client-only
  `initializing`/`profileHydrated` check in `app/(app)/layout.tsx` that returns a blank placeholder
  until IndexedDB resolves, so `Dashboard`/`Expenses`/`MonthlySummary` never actually render during SSR
  with real data. There is no server/client markup to mismatch. Wrapping these in extra `useEffect`
  gating would add complexity for a mismatch that can't occur.

- **`no-transition-all` (8 instances across all dialog components).** These are all the shared
  `animate-in fade-in zoom-in-95 slide-in-from-bottom-4` (tw-animate-css / shadcn-style) utility
  classes applied consistently to every modal's backdrop and panel. They compile to keyframe
  `animation`, not a `transition: all` declaration, so the literal jank concern in the rule doesn't
  apply. Changing this consistent, working pattern across 4 files for a static-analysis false positive
  isn't worth the risk of visual regressions.

- **`no-giant-component` (4 instances: `CategoryDialog`, `Dashboard`, `Expenses`, `AppProvider`).**
  Real, but splitting these is a large, risky refactor with no functional payoff — deferred. Flagging
  for a dedicated follow-up if desired.

- **`context-provider-value-from-unmemoized-local-literal` (`AppContext`'s `value` object,
  `lib/app-context.tsx:1418`).** Real perf issue (every `AppProvider` render — e.g. every keystroke in
  the amount field — creates a new context value, re-rendering all `useApp()` consumers). A correct fix
  requires wrapping ~20 handler functions in `useCallback` with accurate dependency arrays across an
  already-1400-line file; `useMemo`-ing the value object alone would do nothing since its inputs
  wouldn't be stable. High risk of introducing stale-closure bugs for a performance-only issue —
  deferred, recommend as a dedicated follow-up with its own testing pass.

- **`only-export-components` (`ToastHost.tsx`, `components/ui/button.tsx`).** Fast Refresh
  dev-experience nuance only (no production impact). Fixing means relocating `toast`/`buttonVariants`
  into new files and touching ~8 import sites for near-zero benefit — skipped.

- **`unused-file` (`components/BackTapSetupDialog.tsx`, `components/ui/button.tsx`) and `unused-export`
  (`usePwa`).** The back-tap/double-tap shortcut feature is explicitly commented "Deprecated for now"
  at every call site (`Settings.tsx`, `PwaProvider.tsx`) — intentionally paused, not an oversight. Left
  in place rather than deleting someone's paused feature work.

- **`rerender-state-only-in-handlers` (`guideOpen` in `PwaProvider.tsx`).** Part of the same
  deprecated back-tap feature above — not worth touching in isolation.

## ✅ Verification

Re-ran `react-doctor` after fixing the above: error count 1 → 0, warnings 48 → 28 (all 28 remaining are
the `⚪ reviewed` / hygiene items above, deliberately left). `tsc --noEmit` and `next build` both pass
clean; all six routes smoke-tested 200 OK against a live dev server. The re-scan also surfaced two
follow-ups the first pass missed, both fixed:
- A second, distinct `async-parallel` case inside `sync()`'s cold-start fallback (3 sequential
  `get()` reads from IndexedDB) — separate from the one already listed above.
- `js-index-maps` (`Dashboard.tsx`, `MonthlySummary.tsx`) — my `js-combine-iterations` rewrite turned a
  `.map()` callback into a `for` loop, which surfaced `array.find()` calls inside that loop that hadn't
  been flagged in the original scan. Replaced with `Map`-based O(1) lookups built once outside the loop.

## 🧹 Project hygiene (not app bugs, found during the pass — flagged, not auto-fixed)

- **Two lockfiles committed simultaneously**: `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm).
  `package.json` has a `pnpm.overrides` field and the project clearly intends pnpm — the npm lockfile is
  very likely a stray artifact from someone running `npm install` once. Having both risks dependency
  drift depending on which tool a contributor/CI runs. Recommend deleting `package-lock.json`, left for
  you to confirm since it's a repo-hygiene call, not a code bug.
- **`npm run lint` is broken.** The script runs `eslint .`, but `eslint` isn't in `devDependencies` and
  there's no ESLint config in the repo — the command fails immediately with `eslint: command not found`.
  Setting this up properly (picking a config, installing deps) is a larger decision than a bug fix —
  flagged here rather than done silently.
- **Theme flash on first paint for light-theme users.** `app/layout.tsx` hardcodes `className="dark"` on
  `<html>`; the client only swaps to `light` after a `useEffect` reads `localStorage`. Real but
  low-severity FOUC; proper fix is a small blocking inline script in `<head>`. Not fixed in this pass —
  flagging for visibility.
