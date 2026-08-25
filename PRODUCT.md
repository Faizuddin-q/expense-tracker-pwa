# Pockett — Product overview

Pockett is a cloud-synced personal expense tracker. Users log day-to-day spending, categorize it, track it against income/budget, and review it over time — with minimal friction and calm presentation.

## Architecture

- **MongoDB** is the source of truth for expenses, categories, and profile settings.
- **Session cookie** auth; data loads from `/api/expenses/sync` on sign-in.
- **Zustand** holds in-memory UI state for the active session only.

## Core flows

- Quick-add expenses from the home screen
- Category management (add / rename / delete)
- Monthly income, budget, and cycle start day in Settings
- Admin dashboard for account support (read + limited writes)

## PWA

Installable on mobile via Add to Home Screen. Requires network access to load and save data.
