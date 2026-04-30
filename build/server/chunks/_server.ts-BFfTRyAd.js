import { j as json } from './index-DVtGy7I0.js';
import { g as getHabits, a as addHabit } from './db-C8Za6VYo.js';
import 'better-sqlite3';
import 'fs';
import 'path';

function GET() {
  const habits = getHabits();
  return json(habits);
}
async function POST({ request }) {
  const body = await request.json();
  const { description, timerDurationSeconds, mode, habitType, minValue } = body;
  const id = addHabit(description, timerDurationSeconds ?? 1500, mode ?? "stopwatch", habitType ?? "timer", minValue ?? null);
  return json({ id });
}

export { GET, POST };
//# sourceMappingURL=_server.ts-BFfTRyAd.js.map
