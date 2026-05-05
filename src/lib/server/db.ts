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
		migrateGroups(db);
		migrateArchive(db);
	}
	return db;
}

function initSchema(db) {
	db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      collapsed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      timer_duration_seconds INTEGER NOT NULL DEFAULT 1500,
      mode TEXT NOT NULL DEFAULT 'stopwatch',
      habit_type TEXT NOT NULL DEFAULT 'timer',
      min_value INTEGER,
      group_id INTEGER,
      archived_at TEXT
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

function migrateArchive(db) {
	const cols = db.prepare("PRAGMA table_info(habits)").all();
	const hasArchivedAt = cols.some((c) => c.name === "archived_at");
	if (!hasArchivedAt) {
		db.exec("ALTER TABLE habits ADD COLUMN archived_at TEXT");
	}
}

function migrateGroups(db) {
	// Check if groups table exists (it should due to initSchema, but be safe)
	const groupsTable = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='groups'")
		.get();
	if (!groupsTable) {
		db.exec(`
      CREATE TABLE groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        collapsed INTEGER NOT NULL DEFAULT 0
      );
    `);
	}

	// Check if habits.group_id column exists
	const cols = db.prepare("PRAGMA table_info(habits)").all();
	const hasGroupId = cols.some((c) => c.name === "group_id");
	if (!hasGroupId) {
		db.exec("ALTER TABLE habits ADD COLUMN group_id INTEGER");
	}

	// Create default group if none exist
	const defaultGroup = db
		.prepare("SELECT * FROM groups WHERE name = 'General'")
		.get();
	let defaultGroupId;
	if (!defaultGroup) {
		const result = db
			.prepare(
				"INSERT INTO groups (name, order_index, collapsed) VALUES ('General', 0, 0)",
			)
			.run();
		defaultGroupId = result.lastInsertRowid;
	} else {
		defaultGroupId = defaultGroup.id;
	}

	// Assign all ungrouped habits to default group
	const ungrouped = db
		.prepare("SELECT COUNT(*) as cnt FROM habits WHERE group_id IS NULL")
		.get();
	if (ungrouped.cnt > 0) {
		db.prepare("UPDATE habits SET group_id = ? WHERE group_id IS NULL").run(
			defaultGroupId,
		);
	}
}

// --- Groups ---

export function getGroups() {
	const db = getDb();
	return db.prepare("SELECT * FROM groups ORDER BY order_index ASC").all();
}

export function getGroup(id) {
	const db = getDb();
	return db.prepare("SELECT * FROM groups WHERE id = ?").get(id);
}

export function addGroup(name, icon, color) {
	const db = getDb();
	const maxOrder = db
		.prepare("SELECT MAX(order_index) as max FROM groups")
		.get();
	const orderIndex = (maxOrder?.max ?? -1) + 1;
	const result = db
		.prepare(
			"INSERT INTO groups (name, icon, color, order_index, collapsed) VALUES (?, ?, ?, ?, 0)",
		)
		.run(name, icon || null, color || null, orderIndex);
	return result.lastInsertRowid;
}

export function updateGroup(id, name, icon, color) {
	const db = getDb();
	db.prepare(
		"UPDATE groups SET name = ?, icon = ?, color = ? WHERE id = ?",
	).run(name, icon, color, id);
}

export function updateGroupCollapsed(id, collapsed) {
	const db = getDb();
	db.prepare("UPDATE groups SET collapsed = ? WHERE id = ?").run(
		collapsed ? 1 : 0,
		id,
	);
}

export function updateGroupOrder(id, orderIndex) {
	const db = getDb();
	// Shift others to make room
	db.prepare(
		"UPDATE groups SET order_index = order_index + 1 WHERE order_index >= ? AND id != ?",
	).run(orderIndex, id);
	db.prepare("UPDATE groups SET order_index = ? WHERE id = ?").run(
		orderIndex,
		id,
	);
}

export function deleteGroup(id) {
	const db = getDb();
	const defaultGroup = db
		.prepare("SELECT id FROM groups WHERE name = 'General'")
		.get();
	const targetId = defaultGroup?.id ?? id;
	// Move habits to default group
	db.prepare("UPDATE habits SET group_id = ? WHERE group_id = ?").run(
		targetId,
		id,
	);
	db.prepare("DELETE FROM groups WHERE id = ?").run(id);
}

export function getDefaultGroup() {
	const db = getDb();
	return db.prepare("SELECT * FROM groups WHERE name = 'General'").get();
}

// --- Habits ---

export function getAllHabits() {
	const db = getDb();
	return db
		.prepare("SELECT * FROM habits ORDER BY group_id, order_index ASC")
		.all();
}

export function getActiveHabits() {
	const db = getDb();
	return db
		.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY group_id, order_index ASC")
		.all();
}

export function getHabitsTree() {
	const db = getDb();
	const groups = db
		.prepare("SELECT * FROM groups ORDER BY order_index ASC")
		.all();
	const habits = db
		.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY group_id, order_index ASC")
		.all();

	const groupMap = new Map();
	for (const g of groups) {
		groupMap.set(g.id, { ...g, habits: [] });
	}
	for (const h of habits) {
		const g = groupMap.get(h.group_id);
		if (g) {
			g.habits.push(h);
		}
	}
	return Array.from(groupMap.values());
}

export function getArchivedHabits() {
	const db = getDb();
	return db
		.prepare(`
			SELECT h.*, g.name as group_name
			FROM habits h
			LEFT JOIN groups g ON h.group_id = g.id
			WHERE h.archived_at IS NOT NULL
			ORDER BY h.archived_at DESC
		`)
		.all();
}

export function addHabit(description, habitType, minValue, groupId) {
	const db = getDb();
	const gid = groupId ?? getDefaultGroup()?.id ?? null;
	const maxOrder = db
		.prepare("SELECT MAX(order_index) as max FROM habits WHERE group_id = ?")
		.get(gid);
	const orderIndex = (maxOrder?.max ?? -1) + 1;
	const result = db
		.prepare(
			"INSERT INTO habits (description, order_index, habit_type, min_value, group_id) VALUES (?, ?, ?, ?, ?)",
		)
		.run(description, orderIndex, habitType, minValue, gid);
	return result.lastInsertRowid;
}

export function updateHabit(id, description, habitType, minValue, groupId) {
	const db = getDb();
	const existing = db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
	const gid = groupId ?? existing?.group_id ?? getDefaultGroup()?.id ?? null;

	// If group changed, append to end of new group
	if (gid !== existing?.group_id) {
		const maxOrder = db
			.prepare(
				"SELECT MAX(order_index) as max FROM habits WHERE group_id = ?",
			)
			.get(gid);
		const newOrder = (maxOrder?.max ?? -1) + 1;
		db.prepare(
			"UPDATE habits SET description = ?, habit_type = ?, min_value = ?, group_id = ?, order_index = ? WHERE id = ?",
		).run(description, habitType, minValue, gid, newOrder, id);
	} else {
		db.prepare(
			"UPDATE habits SET description = ?, habit_type = ?, min_value = ? WHERE id = ?",
		).run(description, habitType, minValue, id);
	}
}

export function updateHabitOrder(id, groupId, orderIndex) {
	const db = getDb();
	// Shift others in target group to make room
	db.prepare(
		"UPDATE habits SET order_index = order_index + 1 WHERE group_id = ? AND order_index >= ? AND id != ?",
	).run(groupId, orderIndex, id);
	db.prepare("UPDATE habits SET group_id = ?, order_index = ? WHERE id = ?").run(
		groupId,
		orderIndex,
		id,
	);
}

export function deleteHabit(id) {
	const db = getDb();
	db.prepare("DELETE FROM habits WHERE id = ?").run(id);
}

export function archiveHabit(id) {
	const db = getDb();
	const now = new Date().toISOString().replace("T", " ").substring(0, 19);
	db.prepare("UPDATE habits SET archived_at = ? WHERE id = ?").run(now, id);
}

export function unarchiveHabit(id) {
	const db = getDb();
	const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
	if (!habit) return;
	let gid = habit.group_id;
	// If original group no longer exists, fallback to General
	if (gid) {
		const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(gid);
		if (!group) {
			const general = db.prepare("SELECT id FROM groups WHERE name = 'General'").get();
			gid = general?.id ?? null;
		}
	}
	if (!gid) {
		const general = db.prepare("SELECT id FROM groups WHERE name = 'General'").get();
		gid = general?.id ?? null;
	}
	db.prepare("UPDATE habits SET archived_at = NULL, group_id = ? WHERE id = ?").run(gid, id);
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

export function getTotalSeconds(habitId, date) {
	const db = getDb();
	const row = db
		.prepare(
			"SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
		)
		.get(habitId, date);
	return row.total;
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

export function getWeekDataForAllHabits(startDate, endDate) {
	const db = getDb();
	return db
		.prepare(
			"SELECT habit_id, date, COALESCE(SUM(duration_seconds), 0) as duration_seconds, value FROM sessions WHERE date >= ? AND date <= ? GROUP BY habit_id, date ORDER BY habit_id, date",
		)
		.all(startDate, endDate);
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
		switch (habitType) {
			case "timer": {
				const row = db
					.prepare(
						"SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
					)
					.get(habitId, date);
				daily.push(row.total);
				break;
			}
			case "boolean": {
				const row = db
					.prepare(
						"SELECT COUNT(*) as cnt FROM sessions WHERE habit_id = ? AND date = ?",
					)
					.get(habitId, date);
				daily.push(row.cnt > 0 ? 1 : 0);
				break;
			}
			default: {
				const row = db
					.prepare(
						"SELECT COALESCE(SUM(value), 0) as total FROM sessions WHERE habit_id = ? AND date = ?",
					)
					.get(habitId, date);
				daily.push(row.total);
			}
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
		const diff = Math.floor((current - rowDate) / (1000 * 60 * 60 * 24));
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
