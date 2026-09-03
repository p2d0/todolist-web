// Pure goal-counter math. Plain JS on purpose: imported by the SvelteKit app
// AND the standalone reminders.js worker (which cannot import $lib TS).
// Dates are YYYY-MM-DD strings parsed as UTC — consistent on both sides.

export function daysUntil(today, due) {
	return Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
}

export function daysText(days) {
	if (days > 0) return days === 1 ? "1 day left" : `${days} days left`;
	if (days === 0) return "Due today";
	const n = -days;
	return n === 1 ? "1 day overdue" : `${n} days overdue`;
}

// Live pace: units per day to reach target by the due date.
// Runway counts today..due inclusive; overdue clamps to 1 ("do all now").
export function perDay(current, target, dueDate, today) {
	const remaining = Math.abs(target - current);
	if (remaining === 0) return 0;
	const runway = Math.max(1, daysUntil(today, dueDate) + 1);
	return Math.ceil(remaining / runway);
}

// Journey progress 0..1; works either direction.
export function progress(current, start, target) {
	if (start === target) return 1;
	const p = (current - start) / (target - start);
	return Math.min(1, Math.max(0, p));
}

export function arrowFor(goal) {
	if (goal.target_value > goal.start_value) return "↑";
	if (goal.target_value < goal.start_value) return "↓";
	return "•";
}

// "Pills — 3 days left · 12 → 0 ↓ · 4/day"
export function numberedDigestLine(goal, today) {
	const per = perDay(goal.current_value, goal.target_value, goal.due_date, today);
	return `${goal.title} — ${daysText(daysUntil(today, goal.due_date))} · ${goal.current_value} → ${goal.target_value} ${arrowFor(goal)} · ${per}/day`;
}

// "Overdue since 2026-08-20 — 12 left, do 12 today"
export function numberedOverdueBody(goal) {
	const remaining = Math.abs(goal.target_value - goal.current_value);
	if (remaining === 0)
		return `Overdue since ${goal.due_date} — at target, mark it complete`;
	return `Overdue since ${goal.due_date} — ${remaining} left, do ${remaining} today`;
}
