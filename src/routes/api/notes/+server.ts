import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { getNote, setNote } from "$lib/server/db";

export const GET = (async ({ url }) => {
	const date = url.searchParams.get("date");
	if (!date) {
		return json({ error: "Missing date" }, { status: 400 });
	}
	const note = getNote(date);
	return json({ note: note || null });
}) satisfies RequestHandler;

export const PUT = (async ({ request }) => {
	const body = await request.json();
	const { date, content } = body;
	if (!date) {
		return json({ error: "Missing date" }, { status: 400 });
	}
	const note = setNote(date, content);
	return json({ note });
}) satisfies RequestHandler;
