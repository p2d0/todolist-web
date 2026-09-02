// Daily goal reminders: checks every 15min, web-pushes overdue goals at 09:00
// in each subscriber's timezone, once per goal per day.
//
// Standalone module (like ws-server.js): runs outside the SvelteKit bundle,
// opens its own sqlite connection. Keeps its own minimal queries instead of
// importing $lib/server/db.ts (that's TS, compiled into the build). Schema
// must stay in sync with db.ts by hand.
import Database from "better-sqlite3";
import webpush from "web-push";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "pomotasker.db");
const vapidPath = path.join(process.cwd(), "data", "vapid.json");
const VAPID_SUBJECT = "mailto:admin@ug.kyrgyzstan.kg";
const REMIND_HOUR = 9;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

let db;
let timer = null;

function getDb() {
	if (!db) {
		const dir = path.dirname(dbPath);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		db = new Database(dbPath);
		db.pragma("journal_mode = WAL");
		db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL UNIQUE,
        keys_json TEXT NOT NULL,
        tz_offset_minutes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goal_reminders (
        goal_id INTEGER NOT NULL,
        sent_on TEXT NOT NULL,
        PRIMARY KEY (goal_id, sent_on)
      );
    `);
	}
	return db;
}

function getVapidKeys() {
	if (existsSync(vapidPath)) {
		return JSON.parse(readFileSync(vapidPath, "utf8"));
	}
	const keys = webpush.generateVAPIDKeys();
	const dir = path.dirname(vapidPath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(vapidPath, JSON.stringify(keys, null, 2), { mode: 0o600 });
	return keys;
}

/**
 * Pure scheduling logic: which (subscription, goal) pairs should be nudged
 * right now. Exported for testing.
 */
export function computeReminderJobs(goals, subscriptions, nowMs) {
	const jobs = [];
	for (const sub of subscriptions) {
		const offset = sub.tz_offset_minutes || 0;
		const local = new Date(nowMs + offset * 60000);
		const localHour = local.getUTCHours();
		if (localHour !== REMIND_HOUR) continue;
		const localDate = local.toISOString().slice(0, 10);
		for (const goal of goals) {
			if (goal.status === "active" && goal.due_date <= localDate) {
				jobs.push({ sub, goal, localDate });
			}
		}
	}
	return jobs;
}

export function runGoalReminderTick(nowMs = Date.now()) {
	const d = getDb();
	const goals = d.prepare("SELECT * FROM goals WHERE status = 'active'").all();
	const subs = d.prepare("SELECT * FROM push_subscriptions").all();
	const jobs = computeReminderJobs(goals, subs, nowMs);

	const sent = [];
	for (const job of jobs) {
		const already = d
			.prepare("SELECT 1 FROM goal_reminders WHERE goal_id = ? AND sent_on = ?")
			.get(job.goal.id, job.localDate);
		if (already) continue;

		const { publicKey, privateKey } = getVapidKeys();
		const payload = JSON.stringify({
			title: job.goal.title,
			body: `Overdue since ${job.goal.due_date} — act on it today`,
			goalId: job.goal.id,
		});
		const subscription = {
			endpoint: job.sub.endpoint,
			keys: JSON.parse(job.sub.keys_json),
		};
		try {
			webpush.sendNotification(subscription, payload, {
				vapidDetails: {
					subject: VAPID_SUBJECT,
					publicKey,
					privateKey,
				},
			});
			d.prepare(
				"INSERT OR IGNORE INTO goal_reminders (goal_id, sent_on) VALUES (?, ?)",
			).run(job.goal.id, job.localDate);
			sent.push(job);
		} catch (e) {
			console.error("Push send failed:", e.message);
		}
	}
	return sent;
}

export function initGoalReminders() {
	if (timer) return;
	// Run once on startup in case we missed the window, then on interval.
	runGoalReminderTick();
	timer = setInterval(() => runGoalReminderTick(), CHECK_INTERVAL_MS);
	timer.unref?.();
}