import { json } from "@sveltejs/kit";
import { addHabit, getHabits, reorderHabits } from "$lib/server/db";

export function GET() {
	const habits = getHabits();
	return json(habits);
}

export async function POST({ request }) {
	const body = await request.json();
	const { description, habitType, minValue } = body;
	const id = addHabit(description, habitType ?? "timer", minValue ?? null);
	return json({ id });
}

export async function PUT({ request }) {
	const body = await request.json();
	const { orderedIds } = body;
	reorderHabits(orderedIds);
	return json({ ok: true });
}
