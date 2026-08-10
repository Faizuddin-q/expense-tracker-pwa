# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single individual tracking their own personal/household spending in India. They use the app on their phone, mostly installed as a PWA, to log expenses in the moment (quick-add flow) and periodically review spending against income and budget.

## Product Purpose

Pocket is an offline-first personal expense tracker. It lets one person quickly log day-to-day spending, categorize it, track it against income/budget, and review it over time — with minimal friction and calm presentation ("spend with clarity"). Success is the user actually logging expenses consistently and being able to see where their money goes without dread or clutter.

## Positioning

Calm, minimal, offline-first PWA for personal spending — distinct from bank-linked/aggregator finance apps (no account linking, no ads, no gamification). Manual, deliberate logging with a fast quick-add path is the core mechanism.

## Operating Context

- Currency: INR (₹), Indian number formatting.
- Installed as a PWA on a phone; works offline (idb-keyval local storage), syncs when online.
- Core flows/pages: Quick add (home), Dashboard (overview), Summary (monthly), Expenses (list), Settings.
- Categories: Food, Transport, Shopping, Bills, Health, Fun, Other — user-customizable icon/label, plus custom categories.
- Login/identity flow exists (`app/login`) alongside the main app shell.

## Capabilities and Constraints

Must-preserve features (non-negotiable, confirmed by user):

- Quick expense entry (amount + category + note, fast path)
- Categories with custom icons, including user-added custom categories and renaming
- Income and budget tracking
- Hide-amounts privacy toggle
- CSV export
- PWA back-tap-to-add-expense gesture (with its own setup guide)
- Dark/light theme toggle (dark is default)
- Offline-first local storage (idb-keyval) with sync

Redesign is free to change the visual system (palette, type, layout, components) but must keep all of the above functioning.

## Brand Commitments

- Name: "Pocket"
- Tagline: "Spend with clarity"
- Current mark: rounded square badge with an ₹ (Indian Rupee) glyph — not a fixed constraint, open to reinterpretation in the redesign.

## Evidence on Hand

No external assets, testimonials, or marketing copy beyond the app itself. App icons exist in `/public` (PWA icons, manifest) — treat as needing regeneration if the mark changes.

## Product Principles

1. Logging an expense must stay fast — never add friction to the quick-add path.
2. Calm over flashy: the everyday act of checking spending should not feel stressful or busy.
3. Privacy-respecting: the hide-amounts toggle and offline-first, no-account-linking model are core trust features, not afterthoughts.
4. One user, one phone, thumb-reachable: design for one-handed mobile use first.
5. Manual entry is deliberate, not a limitation — the design should make manual logging feel worth it (clarity, control) rather than like a chore.

## Accessibility & Inclusion

No standard mandated yet; no specific accessibility requirements confirmed beyond general good practice (contrast, touch target size for one-handed mobile use).
