import { writable } from 'svelte/store';

export const habitsStore = writable([]);

export const weekSummaryStore = writable('');

export const timerStore = writable({
  activeHabitId: null,
  mode: 'stopwatch', // 'timed' or 'stopwatch'
  elapsed: 0,
  running: false,
  startTime: null,
  elapsedBefore: 0,
});
