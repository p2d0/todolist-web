import { json } from "@sveltejs/kit";
import { deleteGoal, getGoal, setGoalStatus, updateGoal, updateGoalValue } from "$lib/server/db";

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
			case "value":
				if (!Number.isInteger(body.value)) {
					return json({ error: "value must be an integer" }, { status: 400 });
				}
				updateGoalValue(goal.id, body.value);
				break;
			default:
				return json({ error: "unknown action" }, { status: 400 });
		}
		return json({ ok: true });
	}

	if (
		body.title === undefined &&
		body.dueDate === undefined &&
		body.description === undefined &&
		body.type === undefined &&
		body.startValue === undefined &&
		body.targetValue === undefined
	) {
		return json({ error: "nothing to update" }, { status: 400 });
	}
	if (body.type !== undefined && body.type !== "text" && body.type !== "numbered") {
		return json({ error: "unknown type" }, { status: 400 });
	}
	if (body.type === "numbered") {
		if (body.startValue !== undefined && !Number.isInteger(body.startValue)) {
			return json({ error: "start must be an integer" }, { status: 400 });
		}
		if (body.targetValue !== undefined && !Number.isInteger(body.targetValue)) {
			return json({ error: "target must be an integer" }, { status: 400 });
		}
	}
	updateGoal(goal.id, {
		title: body.title,
		description: body.description,
		dueDate: body.dueDate,
		type: body.type,
		startValue: body.startValue,
		targetValue: body.targetValue,
	});
	return json({ ok: true });
}

export async function DELETE({ params }) {
	deleteGoal(params.id);
	return json({ ok: true });
}