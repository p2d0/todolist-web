import { json } from "@sveltejs/kit";
import {
	addGroup,
	getGroups,
	updateGroupOrder,
} from "$lib/server/db";

export function GET() {
	const groups = getGroups();
	return json(groups);
}

export async function POST({ request }) {
	const body = await request.json();
	const { name, icon, color } = body;
	if (!name?.trim()) {
		return json({ error: "Name required" }, { status: 400 });
	}
	try {
		const id = addGroup(name.trim(), icon ?? null, color ?? null);
		return json({ id });
	} catch (e) {
		if (e.message?.includes("UNIQUE constraint failed")) {
			return json({ error: "Group name already exists" }, { status: 409 });
		}
		throw e;
	}
}

export async function PUT({ request }) {
	const body = await request.json();
	const { orderedIds } = body;
	for (const [i, id] of orderedIds.entries()) {
		updateGroupOrder(id, i);
	}
	return json({ ok: true });
}
