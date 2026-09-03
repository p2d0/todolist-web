// Scheduler logic checks: run with `node tests/reminders.test.mjs`
import assert from "node:assert/strict";
import {
	computeReminderJobs,
	computeDigestJobs,
	daysUntil,
	daysText,
} from "../reminders.js";
import {
	perDay,
	progress,
	numberedDigestLine,
	numberedOverdueBody,
} from "../src/lib/goal-math.js";

const goals = [
	{ id: 1, title: "Overdue", due_date: "2026-08-20", status: "active" },
	{ id: 2, title: "Due Today", due_date: "2026-09-02", status: "active" },
	{ id: 3, title: "In 3 days", due_date: "2026-09-05", status: "active" },
	{ id: 4, title: "Completed", due_date: "2026-08-01", status: "completed" },
];
const subs = [
	{ id: 10, endpoint: "utc6", tz_offset_minutes: 360 },
	{ id: 11, endpoint: "utc-4", tz_offset_minutes: -240 },
];

// daysText
assert.equal(daysText(3), "3 days left");
assert.equal(daysText(1), "1 day left");
assert.equal(daysText(0), "Due today");
assert.equal(daysText(-1), "1 day overdue");
assert.equal(daysText(-5), "5 days overdue");
assert.equal(daysUntil("2026-09-02", "2026-09-05"), 3);
assert.equal(daysUntil("2026-09-02", "2026-09-02"), 0);
assert.equal(daysUntil("2026-09-02", "2026-08-30"), -3);

// 2026-09-02 03:00 UTC = 09:00 in UTC+6; 23:00 in UTC-4 → only UTC+6 fires
const morning = Date.parse("2026-09-02T03:00:00Z");
assert.deepEqual(
	computeDigestJobs(goals, subs, morning).map((j) => j.sub.endpoint),
	["utc6"],
);

const digest = computeDigestJobs(goals, [{ ...subs[0] }], morning)[0];
assert.equal(digest.localDate, "2026-09-02");
assert.deepEqual(digest.lines, [
	"Overdue — 13 days overdue",
	"Due Today — Due today",
	"In 3 days — 3 days left",
]);

// Individual action notifications: strictly overdue only (not due-today)
const individual = computeReminderJobs(goals, [{ ...subs[0] }], morning);
assert.deepEqual(
	individual.map((j) => j.goal.id),
	[1],
);

// UTC-4 fires at 13:00 UTC = 09:00 there
const individual2 = computeReminderJobs(goals, [{ ...subs[1] }], Date.parse("2026-09-02T13:00:00Z"));
assert.deepEqual(
	individual2.map((j) => j.goal.id),
	[1],
);

// Noon UTC: nobody at 09:00 → nothing
assert.equal(computeDigestJobs(goals, subs, Date.parse("2026-09-02T12:00:00Z")).length, 0);
assert.equal(computeReminderJobs(goals, subs, Date.parse("2026-09-02T12:00:00Z")).length, 0);

// perDay: inclusive runway, ceil, overdue clamps to 1, at-target → 0
assert.equal(perDay(0, 10, "2026-09-05", "2026-09-02"), 3); // 10 / 4 days = 2.5 → 3
assert.equal(perDay(0, 10, "2026-09-02", "2026-09-02"), 10); // due today → all now
assert.equal(perDay(0, 10, "2026-08-30", "2026-09-02"), 10); // overdue → clamped
assert.equal(perDay(5, 5, "2026-09-05", "2026-09-02"), 0); // at target

// progress: either direction, clamped, start === target → 1
assert.equal(progress(5, 0, 10), 0.5);
assert.equal(progress(5, 10, 0), 0.5);
assert.equal(progress(12, 0, 10), 1);
assert.equal(progress(-3, 0, -5), 0.6);
assert.equal(progress(3, 3, 3), 1);

// numbered digest + overdue copy
const g = { id: 9, title: "Pills", due_date: "2026-09-05", status: "active", type: "numbered", start_value: 10, target_value: 0, current_value: 8 };
assert.equal(numberedDigestLine(g, "2026-09-02"), "Pills — 3 days left · 8 → 0 ↓ · 2/day");
const gu = { ...g, start_value: 0, target_value: 10, current_value: 4 };
assert.equal(numberedDigestLine(gu, "2026-09-02"), "Pills — 3 days left · 4 → 10 ↑ · 2/day");
assert.equal(
	numberedOverdueBody({ ...g, due_date: "2026-08-30", current_value: 3 }),
	"Overdue since 2026-08-30 — 3 left, do 3 today",
);
assert.equal(
	numberedOverdueBody({ ...g, due_date: "2026-08-30", start_value: 5, target_value: 5, current_value: 5 }),
	"Overdue since 2026-08-30 — at target, mark it complete",
);

// digest mixes numbered and text goals
const mixed = [
	g,
	{ id: 6, title: "Plain", due_date: "2026-09-05", status: "active" },
];
const mixedDigest = computeDigestJobs(mixed, [{ ...subs[0] }], morning)[0];
assert.deepEqual(mixedDigest.lines, [
	"Pills — 3 days left · 8 → 0 ↓ · 2/day",
	"Plain — 3 days left",
]);

console.log("reminder logic OK");