import { json } from "@sveltejs/kit";
import { addHabit, getHabits } from "$lib/server/db";

export function GET() {
	const habits = getHabits();
	return json(habits);
}

export async function POST({ request }) {
	const body = await request.json();
	const { description, habitType, minValue } = body;
	const id = addHabit(
		description,
		habitType ?? "timer",
		minValue ?? null,
	);
	return json({ id });
}
