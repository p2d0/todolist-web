import { json } from "@sveltejs/kit";
import { addGoal, deletePushSubscription, getGoals, savePushSubscription } from "$lib/server/db";
import { getVapidPublicKey } from "$lib/server/vapid";

export function GET() {
	return json(getGoals());
}

export async function POST({ request }) {
	const body = await request.json();
	if (body.title === undefined) {
		return json({ error: "missing title" }, { status: 400 });
	}
	if (!body.dueDate) {
		return json({ error: "missing due_date" }, { status: 400 });
	}
	const id = addGoal(body.title, body.description ?? "", body.dueDate);
	return json({ id });
}