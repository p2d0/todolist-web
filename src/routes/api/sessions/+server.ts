import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import {
	addSession,
	deleteSession,
	deleteSessionsForDate,
	getSessionForDate,
	getSessions,
	getTotalMinutes,
	getValueForDate,
	getWeekDataForAllHabits,
	hasSession,
	setValueForDate,
} from "$lib/server/db";

export const GET = (async ({ url }) => {
	const habitId = Number(url.searchParams.get("habitId"));
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");
	const date = url.searchParams.get("date");
	const type = url.searchParams.get("type");

	if (type === "weekdata") {
		const rows = getWeekDataForAllHabits(startDate, endDate);
		return json({ rows });
	}

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
		const sessions = getSessions(habitId, startDate, endDate);
		return json(sessions);
	}

	// Return all sessions for habit
	const sessions = getSessions(habitId, "0000-01-01", "9999-12-31");
	return json(sessions);
}) satisfies RequestHandler;

export const POST = (async ({ url, request }) => {
	const body = await request.json();
	const type = url.searchParams.get("type");

	if (type === "value") {
		setValueForDate(body.habitId, body.date, body.value);
		return json({ success: true });
	}

	const id = addSession(
		body.habitId,
		body.date,
		body.durationSeconds,
		body.value ?? null,
	);
	return json({ id });
}) satisfies RequestHandler;

export const DELETE = (async ({ url }) => {
	const date = url.searchParams.get("date");
	const habitId = Number(url.searchParams.get("habitId"));
	const sessionId = Number(url.searchParams.get("sessionId"));

	if (sessionId) {
		deleteSession(sessionId);
	} else if (date) {
		deleteSessionsForDate(habitId, date);
	}

	return json({ success: true });
}) satisfies RequestHandler;
