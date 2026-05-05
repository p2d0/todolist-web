import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import {
	deleteHabit,
	getHabit,
	updateHabit,
	updateHabitOrder,
} from "$server/db";

export const PUT = (async ({ request, params }) => {
	const id = Number(params.id);
	const body = await request.json();
	const { description, habitType, minValue, groupId } = body;
	updateHabit(id, description, habitType, minValue, groupId ?? null);
	return json({ success: true });
}) satisfies RequestHandler;

export const PATCH = (async ({ request, params }) => {
	const id = Number(params.id);
	const body = await request.json();
	if (body.group_id !== undefined && body.order_index !== undefined) {
		updateHabitOrder(id, body.group_id, body.order_index);
		return json({ success: true });
	}
	return json({ error: "Invalid patch body" }, { status: 400 });
}) satisfies RequestHandler;

export const DELETE = (async ({ params }) => {
	const id = Number(params.id);
	deleteHabit(id);
	return json({ success: true });
}) satisfies RequestHandler;
