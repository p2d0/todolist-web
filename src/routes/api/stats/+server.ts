import { json } from "@sveltejs/kit";
import { getHabits } from "$lib/server/db";
import {
	getMonthlyMinutes,
	getMonthlyCompletions,
	getStreak,
	getMonthlyDailyData,
} from "$lib/server/db";

export function GET({ url }) {
	const month = url.searchParams.get("month");
	if (!month) {
		return json({ error: "Missing month" }, { status: 400 });
	}

	const habits = getHabits();
	const daysInMonth = new Date(
		parseInt(month.split("-")[0]),
		parseInt(month.split("-")[1]),
		0,
	).getDate();

	let totalMinutes = 0;
	let totalCompletions = 0;
	let bestStreak = 0;

	const habitStats = habits.map((habit) => {
		const daily = getMonthlyDailyData(habit.id, month, daysInMonth);
		const minutes = getMonthlyMinutes(habit.id, month);
		const completions = getMonthlyCompletions(habit.id, month);
		const streak = getStreak(habit.id);

		if (habit.habit_type === "timer") {
			totalMinutes += minutes;
			totalCompletions += daily.filter((d) => d > 0).length;
		} else {
			totalCompletions += completions;
		}
		bestStreak = Math.max(bestStreak, streak);

		return {
			id: habit.id,
			description: habit.description,
			type: habit.habit_type,
			total:
				habit.habit_type === "timer"
					? minutes
						: habit.habit_type === "boolean"
							? completions
								: parseFloat((completions > 0 ? daily.reduce((a, b) => a + b, 0) / completions : 0).toFixed(1)),
			streak,
			daily,
		};
	});

	return json({
		month,
		summary: {
			totalMinutes,
			totalCompletions,
			bestStreak,
		},
		habits: habitStats,
	});
}
