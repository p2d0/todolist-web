import { json } from "@sveltejs/kit";
import {
	addHabit,
	getArchivedHabits,
	getHabitsTree,
} from "$lib/server/db";

export function GET({ url }) {
	const archived = url.searchParams.get("archived");
	if (archived === "true") {
		const habits = getArchivedHabits();
		return json(habits);
	}
	const tree = getHabitsTree();
	return json(tree);
}

export async function POST({ request }) {
	const body = await request.json();
	const { description, habitType, minValue, groupId } = body;
	const id = addHabit(
		description,
		habitType ?? "timer",
		minValue ?? null,
		groupId ?? null,
	);
	return json({ id });
}
