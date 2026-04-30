import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), "data", "pomotasker.db");
let db;
function getDb() {
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
function initSchema(db2) {
  db2.exec(`
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
function getHabits() {
  const db2 = getDb();
  const stmt = db2.prepare("SELECT * FROM habits ORDER BY order_index ASC");
  return stmt.all();
}
function addHabit(description, timerDurationSeconds, mode, habitType, minValue) {
  const db2 = getDb();
  const maxOrder = db2.prepare("SELECT MAX(order_index) as max FROM habits").get();
  const orderIndex = (maxOrder?.max ?? -1) + 1;
  const result = db2.prepare(
    "INSERT INTO habits (description, order_index, timer_duration_seconds, mode, habit_type, min_value) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    description,
    orderIndex,
    timerDurationSeconds,
    mode,
    habitType,
    minValue
  );
  return result.lastInsertRowid;
}
function updateHabit(id, description, timerDurationSeconds, mode, habitType, minValue) {
  const db2 = getDb();
  db2.prepare(
    "UPDATE habits SET description = ?, timer_duration_seconds = ?, mode = ?, habit_type = ?, min_value = ? WHERE id = ?"
  ).run(description, timerDurationSeconds, mode, habitType, minValue, id);
}
function deleteHabit(id) {
  const db2 = getDb();
  db2.prepare("DELETE FROM habits WHERE id = ?").run(id);
}
function getSessionForDate(habitId, date) {
  const db2 = getDb();
  return db2.prepare("SELECT * FROM sessions WHERE habit_id = ? AND date = ?").all(habitId, date);
}
function addSession(habitId, date, durationSeconds, value) {
  const db2 = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
  const result = db2.prepare(
    "INSERT INTO sessions (habit_id, date, duration_seconds, completed_at, value) VALUES (?, ?, ?, ?, ?)"
  ).run(habitId, date, durationSeconds, now, value);
  return result.lastInsertRowid;
}
function deleteSession(id) {
  const db2 = getDb();
  db2.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}
function deleteSessionsForDate(habitId, date) {
  const db2 = getDb();
  db2.prepare("DELETE FROM sessions WHERE habit_id = ? AND date = ?").run(
    habitId,
    date
  );
}
function getTotalMinutes(habitId, date) {
  const db2 = getDb();
  const row = db2.prepare(
    "SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE habit_id = ? AND date = ?"
  ).get(habitId, date);
  return Math.floor(row.total / 60);
}
function hasSession(habitId, date) {
  const db2 = getDb();
  const row = db2.prepare(
    "SELECT COUNT(*) as cnt FROM sessions WHERE habit_id = ? AND date = ?"
  ).get(habitId, date);
  return row.cnt > 0;
}
function setValueForDate(habitId, date, value) {
  const db2 = getDb();
  deleteSessionsForDate(habitId, date);
  const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
  db2.prepare(
    "INSERT INTO sessions (habit_id, date, duration_seconds, completed_at, value) VALUES (?, ?, 0, ?, ?)"
  ).run(habitId, date, now, value);
}
function getValueForDate(habitId, date) {
  const db2 = getDb();
  const row = db2.prepare(
    "SELECT value FROM sessions WHERE habit_id = ? AND date = ? LIMIT 1"
  ).get(habitId, date);
  return row?.value ?? null;
}

export { addHabit as a, deleteSession as b, deleteSessionsForDate as c, deleteHabit as d, getValueForDate as e, getTotalMinutes as f, getHabits as g, hasSession as h, getSessionForDate as i, addSession as j, setValueForDate as s, updateHabit as u };
//# sourceMappingURL=db-C8Za6VYo.js.map
