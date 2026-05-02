import type { RequestHandler } from "@sveltejs/kit";
import { error, json } from "@sveltejs/kit";
import { deleteHabit, getHabit, updateHabit } from "$server/db";

export const PUT = (async ({ request, params }) => {
	const id = Number(params.id);
	const body = await request.json();
	const { description, habitType, minValue } = body;
	updateHabit(id, description, habitType, minValue);
	return json({ success: true });
}) satisfies RequestHandler;

export const DELETE = (async ({ params }) => {
	const id = Number(params.id);
	deleteHabit(id);
	return json({ success: true });
}) satisfies RequestHandler;
