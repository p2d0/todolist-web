import { json } from "@sveltejs/kit";
import { deleteGoal, getGoal, setGoalStatus, updateGoal } from "$lib/server/db";

export function GET({ params }) {
	const goal = getGoal(params.id);
	if (!goal) return json({ error: "not found" }, { status: 404 });
	return json(goal);
}

export async function PATCH({ params, request }) {
	const body = await request.json();
	const goal = getGoal(params.id);
	if (!goal) return json({ error: "not found" }, { status: 404 });

	if (body.action) {
		switch (body.action) {
			case "complete":
				setGoalStatus(goal.id, "completed");
				break;
			case "archive":
				setGoalStatus(goal.id, "archived");
				break;
			case "reopen":
				setGoalStatus(goal.id, "active");
				break;
			default:
				return json({ error: "unknown action" }, { status: 400 });
		}
		return json({ ok: true });
	}

	if (body.title === undefined && body.dueDate === undefined && body.description === undefined) {
		return json({ error: "nothing to update" }, { status: 400 });
	}
	updateGoal(
		goal.id,
		body.title ?? goal.title,
		body.description ?? goal.description,
		body.dueDate ?? goal.due_date,
	);
	return json({ ok: true });
}

export async function DELETE({ params }) {
	deleteGoal(params.id);
	return json({ ok: true });
}