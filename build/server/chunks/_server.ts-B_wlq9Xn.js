import { j as json } from './index-DVtGy7I0.js';
import { b as deleteSession, c as deleteSessionsForDate, e as getValueForDate, f as getTotalMinutes, h as hasSession, i as getSessionForDate, s as setValueForDate, j as addSession } from './db-C8Za6VYo.js';
import 'better-sqlite3';
import 'fs';
import 'path';

const GET = async ({ url }) => {
  const habitId = Number(url.searchParams.get("habitId"));
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const date = url.searchParams.get("date");
  const type = url.searchParams.get("type");
  if (type === "value") {
    const val = getValueForDate(habitId, date);
    return json({ value: val });
  }
  if (type === "minutes") {
    const mins = getTotalMinutes(habitId, date);
    return json({ minutes: mins });
  }
  if (type === "has") {
    const has = hasSession(habitId, date);
    return json({ has });
  }
  if (date) {
    const sessions = getSessionForDate(habitId, date);
    return json(sessions);
  }
  if (startDate && endDate) {
    const sessions = getSessionForDate(habitId, startDate);
    return json(sessions);
  }
  return json({});
};
const POST = async ({ url, request }) => {
  const body = await request.json();
  const type = url.searchParams.get("type");
  if (type === "value") {
    setValueForDate(body.habitId, body.date, body.value);
    return json({ success: true });
  }
  const id = addSession(body.habitId, body.date, body.durationSeconds, body.value ?? null);
  return json({ id });
};
const DELETE = async ({ url }) => {
  const date = url.searchParams.get("date");
  const habitId = Number(url.searchParams.get("habitId"));
  const sessionId = Number(url.searchParams.get("sessionId"));
  if (sessionId) {
    deleteSession(sessionId);
  } else if (date) {
    deleteSessionsForDate(habitId, date);
  }
  return json({ success: true });
};

export { DELETE, GET, POST };
//# sourceMappingURL=_server.ts-B_wlq9Xn.js.map
