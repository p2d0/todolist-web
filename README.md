# <img src="static/icons/icon-192.png" width="48" alt="PomoTasker logo"> PomoTasker

A responsive habit tracker with built-in Pomodoro timers. Track daily habits, log timed sessions, and review your week — all synced across devices via WebSocket.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)

## Features

- **Three Habit Types**
  - **Timer** — Countdown or stopwatch sessions with circular progress
  - **Boolean** — Simple yes/no daily check-off
  - **Number** — Quantitative goals (e.g. 30 push-ups)
- **7-Day Weekly Grid** — Visual Mon–Sun circles per habit showing completion, partial progress, or time logged
- **Pomodoro Timer** — Built-in timer banner with elapsed/remaining display and pomodoro count
- **Real-Time Sync** — WebSocket sync keeps multiple browser tabs (and mobile) in sync instantly
- **PWA + Android** — Installable web app with service worker; Capacitor build for Android
- **Catppuccin Mocha Theme** — Soft dark UI with lavender accents

## Tech Stack

- **Frontend:** SvelteKit + Vite
- **Backend:** SvelteKit API routes + Express (preview)
- **Database:** SQLite (`better-sqlite3`)
- **Sync:** WebSocket (`ws`)
- **Mobile:** Capacitor (Android)
- **Testing:** Playwright (Python wrapper using `playwright-cli` + Firefox)

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (Vite on :5173)
npm run dev
```

## Building

```bash
# Production build (web + Android)
npm run build

# Sync Capacitor Android project
npm run build:android
```

## Testing

```bash
# Run all Playwright tests (auto-starts dev server on 5173)
python3 tests/test_pomotask.py

# Run individual test files
python3 tests/test_today.py
python3 tests/test_other_days.py
```

Tests use `playwright-cli` + Firefox (not `@playwright/test`), auto-clean habits before/after, and snapshot YAMLs land in `.playwright-cli/`.

## Project Structure

```
src/
  lib/components/       # Svelte UI components
  lib/server/db.ts      # SQLite schema and queries
  lib/stores/           # Svelte stores (timer, sync, notifications)
  routes/api/           # REST API endpoints
  routes/+page.svelte   # Main app page
static/
  icons/                # App icons (PWA / Android)
  sw/                   # Service worker
  manifest.json         # PWA manifest
tests/                  # Playwright test suite
```

## License

[GPL-3.0](LICENSE)
