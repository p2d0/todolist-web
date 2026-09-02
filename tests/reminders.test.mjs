// Scheduler logic checks: run with `node tests/reminders.test.mjs`
import assert from "node:assert/strict";
import {
	computeReminderJobs,
	computeDigestJobs,
	daysUntil,
	daysText,
} from "../reminders.js";

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

console.log("reminder logic OK");