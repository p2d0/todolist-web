# TODO

## Goal

Port PomoTasker (Rust/GTK4 desktop habit/pomodoro tracker) to a responsive web app using SvelteKit + Bun + SQLite, with server-side data sync between PC and mobile browsers.

## Tasks

### 1. Project Setup

- [x] Initialize SvelteKit project in /mnt/md127/todolist-bun (use `npx create-svelte@latest`, minimal template, no TypeScript)
- [x] Install dependencies: `better-sqlite3` (or `bun:sqlite`), `@tailwindcss/vite` (or plain CSS), `dayjs`
- [x] Configure Bun as runtime (bun dev / bun run)
- [x] Set up project structure: `src/lib/server/db.ts`, `src/routes/api/`, `src/lib/components/`

### 2. Database Layer (Server)

- [x] Create SQLite schema: `habits` table (id, description, order_index, timer_duration_seconds, mode, habit_type, min_value) and `sessions` table (id, habit_id, date, duration_seconds, completed_at, value)
- [x] Implement DB init and connection in `src/lib/server/db.ts` (auto-init on first access)
- [x] Implement server functions: getHabits, addHabit, updateHabit, deleteHabit, getSessionsForDate, addSession, getWeekSummary

### 3. API Endpoints

- [x] `GET /api/habits` — return all habits
- [x] `POST /api/habits` — create a habit (description, timerDuration, mode, habitType, minValue)
- [x] `PUT /api/habits/:id` — update a habit
- [x] `DELETE /api/habits/:id` — delete a habit + its sessions
- [x] `GET /api/sessions?habitId=&date=` — get sessions for a habit/date range
- [x] `POST /api/sessions` — record a session (habitId, date, durationSeconds, value)
- [x] `DELETE /api/sessions/:id` — delete a session

### 4. UI — Layout & Theme

- [x] Create responsive app layout (vertical habit list, works on narrow mobile and wide desktop)
- [x] Apply Catppuccin Mocha dark theme (background #1e1e2e, cards #232636, text #cdd6f4, accent #b4befe / #cba6f7)
- [x] Mobile: max-width container, larger touch targets. Desktop: centered narrow column (~380px)

### 5. UI — Habit List & Row

- [x] Build HabitList component: scrollable vertical list, shows all habits
- [x] Build HabitRow component: description label + 7-circle grid (Mon–Sun)
- [x] Circle states: empty (gray, show day letter M/T/W/T/F/S/S), complete (green/glow), partial (amber), today (highlighted border)
- [x] Timer-type habit: circle shows "Xm" (minutes) or day letter
- [x] Boolean-type habit: circle shows checkmark or day letter, click toggles
- [x] Number-type habit: circle shows value or day letter, click opens input

### 6. UI — Pomodoro Timer

- [x] Build TimerBanner component: circular clock ring (SVG or CSS), elapsed/remaining display, Start/Stop button
- [x] Timer modes: Timed (countdown from habit duration) and Stopwatch (count up). Toggle button.
- [x] On stop/complete: POST session to server, update circle visually
- [x] Show pomodoro count (total elapsed / duration = X.X pomodoros)
- [x] Use browser `setInterval` for timer tick, store active timer state in Svelte store

### 7. UI — Add/Edit Habit Dialog

- [x] Create modal dialog for adding a habit: description input, habit type selector (Timer/Boolean/Number), timer duration input (for Timer type), min value input (for Number type)
- [x] Create edit dialog: same fields, pre-filled
- [x] +Add Habit button at bottom of list

### 8. UI — Week Summary

- [x] Display week total: total sessions, total time, total pomodoros
- [x] Position below timer banner (or collapsible on mobile)

### 9. UI — Circle Context Actions

- [x] Long-press or right-click on today's circle: edit time, remove time, toggle complete
- [x] On mobile: tap opens the action options; tap non-today circle toggles that day

### 10. Polish & Mobile UX

- [x] Touch-friendly: circles at least 36x36px, buttons 44x44px minimum
- [x] Smooth transitions on circle state changes
- [x] Pull-to-refresh or auto-refresh on visibility change
- [x] Handle offline: if server unreachable, show error toast
- [x] Test on mobile viewport (320px–414px) and desktop viewport

## Notes

- Source of truth: `../todolist` (Rust app). Schema, habit types, circle logic, CSS colors all from there.
- Runtime: Bun (directory name implies this). Use `bun:sqlite` if it has the features, otherwise `better-sqlite3`.
- No auth needed (local server only).
- Timer state is client-side (browser interval). Session is recorded on server when timer stops.
- Catppuccin Mocha palette: bg #1e1e2e, surface #232636, border #363a4f, text #cdd6f4, blue #89b4fa, green #a6e3a1, lavender #b4befe, mauve #cba6f7, red #f38ba8, yellow #f9e2af.
