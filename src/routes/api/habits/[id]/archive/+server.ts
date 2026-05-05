import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { archiveHabit, getHabit } from "$lib/server/db";

export const POST = (async ({ params }) => {
	const id = Number(params.id);
	const habit = getHabit(id);
	if (!habit) return json({ error: "Not found" }, { status: 404 });
	archiveHabit(id);
	return json({ success: true });
}) satisfies RequestHandler;
