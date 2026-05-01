<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import { timerStore } from '$lib/stores/timer.js';
  import { send } from '$lib/stores/sync.js';
  import { get } from 'svelte/store';
  import TimeEditor from './TimeEditor.svelte';
  import NumberEditor from './NumberEditor.svelte';

  export let habit;
  export let onEdit = null;
  export let onDelete = null;

  let circles = [];
  let activeTimer = null;
  let showTimeEditor = false;
  let editingCircle = null;
  let showNumberEditor = false;
  let editingNumber = null;

  const unsub = timerStore.subscribe(v => activeTimer = v);

  onMount(() => {
    buildCircles();
    return unsub;
  });

  function buildCircles() {
    const today = dayjs();
    const dayOfWeek = today.day(); // 0=Sun
    const monday = today.subtract((dayOfWeek + 6) % 7, 'day').startOf('day');

    circles = [];
    for (let i = 0; i < 7; i++) {
      const date = monday.add(i, 'day');
      circles.push({
        date: date.format('YYYY-MM-DD'),
        dayLetter: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        isToday: i === ((dayOfWeek + 6) % 7),
        label: '',
        state: 'empty', // empty | partial | complete | active
      });
    }

    updateCircleData();
  }

  async function updateCircleData() {
    const newCircles = [];
    for (const circle of circles) {
      const data = await getCircleData(habit, circle.date);
      newCircles.push({ ...circle, label: data.label, state: data.state });
    }
    circles = newCircles;
  }

  async function getCircleData(habit, date) {
    if (habit.habit_type === 'timer') {
      const res = await fetch(`${base}/api/sessions?type=minutes&habitId=${habit.id}&date=${date}`);
      const data = await res.json();
      const mins = data.minutes;
      if (mins > 0) {
        return { label: `${mins}m`, state: 'complete' };
      }
      return { label: '', state: 'empty' };
    }

    if (habit.habit_type === 'boolean') {
      const res = await fetch(`${base}/api/sessions?type=has&habitId=${habit.id}&date=${date}`);
      const data = await res.json();
      return { label: data.has ? '✓' : '', state: data.has ? 'complete' : 'empty' };
    }

    if (habit.habit_type === 'number') {
      const res = await fetch(`${base}/api/sessions?type=value&habitId=${habit.id}&date=${date}`);
      const data = await res.json();
      if (data.value !== null && data.value !== undefined) {
        if (habit.min_value !== null && habit.min_value !== undefined && data.value >= habit.min_value) {
          return { label: String(data.value), state: 'complete' };
        }
        return { label: String(data.value), state: 'partial' };
      }
      return { label: '', state: 'empty' };
    }

    return { label: '', state: 'empty' };
  }

  function isCircleActive(circle) {
    return activeTimer && activeTimer.activeHabitId === habit.id && activeTimer.running && circle.isToday && habit.habit_type === 'timer';
  }

  async function handleCircleClick(circle) {
    if (habit.habit_type === 'timer') {
      if (circle.isToday) {
        // Start/stop timer
        if (activeTimer && activeTimer.activeHabitId === habit.id && activeTimer.running) {
          await stopTimer(habit);
        } else {
          startTimer(habit);
        }
      } else {
        openTimeEditor(circle);
      }
    } else if (habit.habit_type === 'boolean') {
      toggleBoolean(habit.id, circle.date);
    } else if (habit.habit_type === 'number') {
      openNumberInput(habit, circle.date);
    }
  }

  function startTimer(habit) {
    timerStore.update(v => ({
      ...v,
      activeHabitId: habit.id,
      elapsed: 0,
      running: true,
      startTime: Date.now(),
      elapsedBefore: 0,
    }));
    send({ type: 'timer:update', data: get(timerStore) });
  }

  async function stopTimer(habit) {
    const elapsed = getElapsed();
    const date = dayjs().format('YYYY-MM-DD');

    await fetch(`${base}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: habit.id,
        date,
        durationSeconds: elapsed,
      }),
    });
    send({ type: 'sessions:update' });

    timerStore.update(v => ({
      ...v,
      activeHabitId: null,
      running: false,
      startTime: null,
      elapsedBefore: 0,
      elapsed: 0,
    }));
    send({ type: 'timer:update', data: get(timerStore) });

    updateCircleData();
  }

  function getElapsed() {
    if (!activeTimer?.startTime) return 0;
    const now = Date.now();
    const elapsed = Math.floor((now - activeTimer.startTime) / 1000) + activeTimer.elapsedBefore;
    return elapsed;
  }

  async function openTimeEditor(circle) {
    const res = await fetch(`${base}/api/sessions?type=minutes&habitId=${habit.id}&date=${circle.date}`);
    const data = await res.json();
    editingCircle = { ...circle, durationSeconds: data.minutes * 60 };
    showTimeEditor = true;
  }

  function closeTimeEditor() {
    showTimeEditor = false;
    editingCircle = null;
  }

  async function toggleBoolean(habitId, date) {
    const res = await fetch(`/api/sessions?type=has&habitId=${habitId}&date=${date}`);
    const data = await res.json();

    if (data.has) {
      await fetch(`${base}/api/sessions?date=${date}&habitId=${habitId}`, { method: 'DELETE' });
    } else {
      await fetch(`${base}/api/sessions?type=value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date, value: 1 }),
      });
    }
    send({ type: 'sessions:update' });

    updateCircleData();
  }

  async function openNumberInput(habit, date) {
    const current = await (await fetch(`${base}/api/sessions?type=value&habitId=${habit.id}&date=${date}`)).json();
    editingNumber = { date, value: current.value };
    showNumberEditor = true;
  }

  function closeNumberEditor() {
    showNumberEditor = false;
    editingNumber = null;
  }

  $: rowClass = habit.habit_type === 'timer' && activeTimer && activeTimer.activeHabitId === habit.id && activeTimer.running
    ? 'habit-row active'
    : 'habit-row';
</script>

<div class={rowClass}>
  <div class="habit-header">
    <span class="habit-desc">{habit.description}</span>
    <button class="edit-btn" on:click={() => onEdit && onEdit(habit)} aria-label="Edit habit">✏️</button>
    <button class="edit-btn delete-btn" on:click={() => onDelete && onDelete(habit)} aria-label="Delete habit">🗑</button>
  </div>
  <div class="circles-row">
    {#each circles as circle (circle.date)}
      <button
        class="circle {circle.state ? 'circle-' + circle.state : ''} {circle.isToday ? 'circle-today' : ''}"
        class:circle-active={isCircleActive(circle)}
        on:click={() => handleCircleClick(circle)}
      >
        {circle.label || circle.dayLetter}
      </button>
    {/each}
  </div>
  {#if showTimeEditor && editingCircle}
    <TimeEditor
      habitId={habit.id}
      date={editingCircle.date}
      description={habit.description}
      durationSeconds={editingCircle.durationSeconds}
      onSaved={updateCircleData}
      onClosed={closeTimeEditor}
    />
  {/if}
  {#if showNumberEditor && editingNumber}
    <NumberEditor
      habitId={habit.id}
      date={editingNumber.date}
      description={habit.description}
      value={editingNumber.value}
      onSaved={updateCircleData}
      onClosed={closeNumberEditor}
    />
  {/if}
</div>

  


<style>
  .habit-row {
    padding: 10px 8px;
    margin: 4px 0;
    background: #232636;
    border: 1px solid #363a4f;
    border-radius: 12px;
    transition: background 100ms, box-shadow 100ms;
  }

  .habit-row.active {
    background: #2d2a4a;
    border: 1px solid #6c5c94;
    box-shadow: 0 0 12px rgba(203, 166, 247, 0.15);
  }

  .habit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .habit-desc {
    font-size: 13px;
    font-weight: 600;
    color: #e0e2e8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .edit-btn {
    background: none;
    border: none;
    color: #6c7086;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
  }

  .edit-btn:hover {
    color: #cdd6f4;
  }

  .circles-row {
    display: flex;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  .circle {
    flex: 1 1 0;
    height: 38px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    border: none;
    border-radius: 8px;
    background: #363a4f;
    color: #6c7086;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, box-shadow 150ms;
  }

  .circle:hover {
    background: #454a60;
  }

  .circle-today {
    border: 2px solid #b4befe;
  }

  .circle-complete {
    background: #a6e3a1;
    color: #1e1e2e;
  }

  .circle-partial {
    background: #f9e2af;
    color: #1e1e2e;
  }

  .circle-active {
    background: #cba6f7;
    color: #1e1e2e;
    box-shadow: 0 0 12px rgba(203, 166, 247, 0.4);
  }
</style>
