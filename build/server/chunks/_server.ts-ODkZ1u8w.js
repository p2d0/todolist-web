import { j as json } from './index-DVtGy7I0.js';
import { d as deleteHabit, u as updateHabit } from './db-C8Za6VYo.js';
import 'better-sqlite3';
import 'fs';
import 'path';

const PUT = async ({ request, params }) => {
  const id = Number(params.id);
  const body = await request.json();
  const { description, timerDurationSeconds, mode, habitType, minValue } = body;
  updateHabit(id, description, timerDurationSeconds, mode, habitType, minValue);
  return json({ success: true });
};
const DELETE = async ({ params }) => {
  const id = Number(params.id);
  deleteHabit(id);
  return json({ success: true });
};

export { DELETE, PUT };
//# sourceMappingURL=_server.ts-ODkZ1u8w.js.map
