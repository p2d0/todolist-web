import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "pomotasker.db");
let db;

export function getDb() {
	if (!db) {
		const dbDir = path.dirname(dbPath);
		if (!existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}
		db = new Database(dbPath);
		db.pragma("journal_mode = WAL");
		initSchema(db);
	}
	return db;
}

function initSchema(db) {
	db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      timer_duration_seconds INTEGER NOT NULL DEFAULT 1500,
      mode TEXT NOT NULL DEFAULT 'stopwatch',
      habit_type TEXT NOT NULL DEFAULT 'timer',
      min_value INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL,
      value REAL,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_habit_date ON sessions(habit_id, date);
  `);
}

// --- Habits ---

export function getHabits() {
	const db = getDb();
	const stmt = db.prepare("SELECT * FROM habits ORDER BY order_index ASC");
	return stmt.all();
}

export function addHabit(description, habitType, minValue) {
	const db = getDb();
	const maxOrder = db
		.prepare("SELECT MAX(order_index) as max FROM habits")
		.get();
	const orderIndex = (maxOrder?.max ?? -1) + 1;
	const result = db
		.prepare(
			"INSERT INTO habits (description, order_index, habit_type, min_value) VALUES (?, ?, ?, ?)",
		)
		.run(description, orderIndex, habitType, minValue);
	return result.lastInsertRowid;
}

export function updateHabit(id, description, habitType, minValue) {
	const db = getDb();
	db.prepare(
		"UPDATE habits SET description = ?, habit_type = ?, min_value = ? WHERE id = ?",
	).run(description, habitType, minValue, id);
}

export function deleteHabit(id) {
	const db = getDb();
	db.prepare("DELETE FROM habits WHERE id = ?").run(id);
}

export function getHabit(id) {
	const db = getDb();
	return db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
}

// --- Sessions ---

export function getSessions(habitId, startDate, endDate) {
	const db = getDb();
	return db
		.prepare(
			"SELECT * FROM sessions WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date",
		)
		.all(habitId, startDate, endDate);
}

export function getSessionForDate(habitId, date) {
	const db = getDb();
	return db
		.prepare("SELECT * FROM sessions WHERE habit_id = ? AND date = ?")
		.all(habitId, date);
}

export function addSession(habitId, date, durationSeconds, value) {
	const db = getDb();
	const now = new Date().toISOString().replace("T", " ").substring(0, 19);
	const result = db
		.prepare(
			"INSERT INTO sessions (habit_id, date, duration_seconds, completed_at, value) VALUES (?, ?, ?, ?, ?)",
		)
		.run(habitId, date, durationSeconds, now, value);
	return result.lastInsertRowid;
}

export function deleteSession(id) {
	const db = getDb();
	db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function deleteSessionsForDate(habitId, date) {
	const db = getDb();
	db.prepare("DELETE FROM sessions WHERE habit_id = ? AND date = ?").run(
		habitId,
		date,
	);
}

export function getTotalMinutes(habitId, date) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
		)
		.get(habitId, date);
	return Math.floor(row.total / 60);
}

export function hasSession(habitId, date) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT COUNT(*) as cnt FROM sessions WHERE habit_id = ? AND date = ?",
		)
		.get(habitId, date);
	return row.cnt > 0;
}

export function setValueForDate(habitId, date, value) {
	const db = getDb();
	deleteSessionsForDate(habitId, date);
	const now = new Date().toISOString().replace("T", " ").substring(0, 19);
	db.prepare(
		"INSERT INTO sessions (habit_id, date, duration_seconds, completed_at, value) VALUES (?, ?, 0, ?, ?)",
	).run(habitId, date, now, value);
}

export function getValueForDate(habitId, date) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT value FROM sessions WHERE habit_id = ? AND date = ? LIMIT 1",
		)
		.get(habitId, date);
	return row?.value ?? null;
}

// --- Monthly Stats ---

export function getMonthlyMinutes(habitId, month) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date LIKE ?",
		)
		.get(habitId, `${month}-%`);
	return Math.floor(row.total / 60);
}

export function getMonthlyCompletions(habitId, month) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT COUNT(DISTINCT date) as cnt FROM sessions WHERE habit_id = ? AND date LIKE ?",
		)
		.get(habitId, `${month}-%`);
	return row.cnt;
}

export function getMonthlyDailyData(habitId, month, daysInMonth, habitType) {
	const db = getDb();
	const daily = [];
	for (let day = 1; day <= daysInMonth; day++) {
		const date = `${month}-${String(day).padStart(2, "0")}`;
		if (habitType === "timer") {
			const row = db
				.prepare(
					"SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
				)
				.get(habitId, date);
			daily.push(row.total);
		} else if (habitType === "boolean") {
			const row = db
				.prepare(
					"SELECT COUNT(*) as cnt FROM sessions WHERE habit_id = ? AND date = ?",
				)
				.get(habitId, date);
			daily.push(row.cnt > 0 ? 1 : 0);
		} else {
			const row = db
				.prepare(
					"SELECT COALESCE(SUM(value), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
				)
				.get(habitId, date);
			daily.push(row.total);
		}
	}
	return daily;
}

export function getStreak(habitId) {
	const db = getDb();
	const rows = db
		.prepare(
			"SELECT DISTINCT date FROM sessions WHERE habit_id = ? ORDER BY date DESC",
		)
		.all(habitId);
	if (rows.length === 0) return 0;

	let streak = 0;
	let current = new Date();
	current.setHours(0, 0, 0, 0);

	for (const row of rows) {
		const rowDate = new Date(row.date + "T00:00:00");
		const diff = Math.floor(
			(current - rowDate) / (1000 * 60 * 60 * 24),
		);
		if (diff === streak) {
			streak++;
			current = new Date(rowDate);
			current.setDate(current.getDate() - 1);
		} else if (diff === 0 && streak === 0) {
			streak = 1;
			current = new Date(rowDate);
			current.setDate(current.getDate() - 1);
		} else {
			break;
		}
	}
	return streak;
}

// --- Week Summary ---

export function getWeekSummary(habitId) {
	const db = getDb();
	const day = new Date();
	const dayOfWeek = (day.getDay() + 6) % 7; // Mon=0
	const monday = new Date(day);
	monday.setDate(day.getDate() - dayOfWeek);
	monday.setHours(0, 0, 0, 0);
	const mondayStr = monday.toISOString().substring(0, 10);

	const rows = db
		.prepare(
			"SELECT date, COUNT(*) as sessionCount, SUM(duration_seconds) as totalSeconds, value FROM sessions WHERE habit_id = ? AND date >= ? GROUP BY date ORDER BY date",
		)
		.all(habitId, mondayStr);

	return rows.map((r) => ({
		date: r.date,
		sessions: r.sessionCount,
		totalSeconds: r.totalSeconds || 0,
		value: r.value,
	}));
}
