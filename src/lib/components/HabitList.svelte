<script>
  import { base } from '$app/paths';
  import HabitRow from './HabitRow.svelte';
  import { onMount } from 'svelte';
  import { hideCompletedStore, weekDataStore } from '$lib/stores/timer.js';
  import dayjs from 'dayjs';

  export let habitsStore;
  export let onEdit = null;
  export let onDelete = null;

  let habits = [];
  let hideCompleted = false;
  let completedIds = {};
  let completedLoaded = false;
  let mounted = false;
  let draggedHabit = null;
  let dropTarget = null;
  let dropAfter = false;

  onMount(() => {
    mounted = true;
    const unsub = habitsStore.subscribe(v => {
      habits = v;
      checkCompleted();
    });
    const unsubHide = hideCompletedStore.subscribe(v => hideCompleted = v);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const handleSync = () => refresh();
    const handleSessionSync = () => checkCompleted();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('sync:habits', handleSync);
    window.addEventListener('sync:sessions', handleSessionSync);
    return () => {
      unsub();
      unsubHide();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('sync:habits', handleSync);
      window.removeEventListener('sync:sessions', handleSessionSync);
    };
  });

  async function refresh() {
    const res = await fetch(`${base}/api/habits`);
    const data = await res.json();
    habitsStore.set(data);
  }

  async function checkCompleted() {
    const today = dayjs().format('YYYY-MM-DD');
    const { startDate, endDate } = getWeekRange();
    const res = await fetch(`${base}/api/sessions?type=weekdata&startDate=${startDate}&endDate=${endDate}`);
    const data = await res.json();
    const allRows = data.rows || [];
    const results = {};
    for (const h of habits) {
      const row = allRows.find(r => r.habit_id === h.id && r.date === today);
      if (h.habit_type === 'boolean') {
        results[h.id] = row ? true : false;
      } else if (h.habit_type === 'timer') {
        results[h.id] = row ? row.duration_seconds > 0 : false;
      } else if (h.habit_type === 'number') {
        results[h.id] = row ? (row.value ?? 0) >= (h.min_value || 0) : false;
      } else {
        results[h.id] = false;
      }
    }
    completedIds = results;
    completedLoaded = true;
    // Also refresh weekDataStore so HabitRow circles show fresh data
    weekDataStore.set(allRows);
  }

  function getWeekRange() {
    const today = dayjs();
    const dayOfWeek = today.day();
    const monday = today.subtract((dayOfWeek + 6) % 7, 'day');
    const sunday = monday.add(6, 'day');
    return { startDate: monday.format('YYYY-MM-DD'), endDate: sunday.format('YYYY-MM-DD') };
  }

  async function toggleHideCompleted() {
    await checkCompleted();  // refresh completedIds FIRST
    hideCompleted = !hideCompleted;  // then flip - reactive sees fresh data
    hideCompletedStore.set(hideCompleted);
  }

  function handleDragStart(habit, event) {
    draggedHabit = habit;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', habit.id.toString());
  }

  function handleDragOver(habit, event) {
    if (!draggedHabit || draggedHabit.id === habit.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dropTarget = habit;
    const clientY = event.clientY;
    const rect = event.target.getBoundingClientRect();
    dropAfter = clientY > rect.top + rect.height / 2;
  }

  function handleDragEnd() {
    draggedHabit = null;
    dropTarget = null;
  }

  async function handleDrop(habit, event) {
    event.preventDefault();
    if (!draggedHabit || !dropTarget || draggedHabit.id === habit.id) return;
    const oldIndex = visibleHabits.findIndex(h => h.id === draggedHabit.id);
    const newIndex = visibleHabits.findIndex(h => h.id === habit.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Build new order: take all visible habit IDs in new order
    const newOrder = [...visibleHabits];
    const [moved] = newOrder.splice(oldIndex, 1);
    const insertAt = newOrder.findIndex(h => h.id === habit.id) + (dropAfter ? 1 : 0);
    newOrder.splice(insertAt, 0, moved);
    const orderedIds = newOrder.map(h => h.id);
    // Merge: visible habits in new order + hidden ones appended
    const allIds = orderedIds.filter(id => id !== null);
    for (const h of habits) {
      if (!allIds.includes(h.id)) {
        allIds.push(h.id);
      }
    }
    await fetch(`${base}/api/habits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: allIds }),
    });
    draggedHabit = null;
    dropTarget = null;
    await refresh();
  }

  $: visibleHabits = (hideCompleted && completedLoaded)
    ? habits.filter(h => !completedIds[h.id])
    : habits;
</script>

<div class="habit-list">
  {#if mounted}
    <div class="habit-list-header">
      <button class="hide-toggle" class:active={hideCompleted} on:click={toggleHideCompleted}
        aria-label={hideCompleted ? 'Show all' : 'Hide done'}>
        {hideCompleted ? '👁️ Show all' : '🙈 Hide done'}
      </button>
    </div>
  {/if}
  <div class="habit-list-inner">
    {#each visibleHabits as habit (habit.id)}
      <div class="habit-wrapper"
        class:dragging={draggedHabit && draggedHabit.id === habit.id}
        class:drop-target={dropTarget && dropTarget.id === habit.id}
        draggable={true}
        on:dragstart={(e) => handleDragStart(habit, e)}
        on:dragend={handleDragEnd}
        on:dragover={(e) => handleDragOver(habit, e)}
        on:drop={(e) => handleDrop(habit, e)}
        aria-label={`Drag to reorder - ${habit.description}`}>
        <HabitRow {habit} {onEdit} {onDelete} />
        {#if draggedHabit && draggedHabit.id === habit.id}
          <div class="drag-ghost"></div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .habit-list {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 4px;
  }

  .habit-list-header {
    display: flex;
    justify-content: flex-end;
    padding: 0 4px 4px;
  }

  .hide-toggle {
    background: none;
    border: 1px solid #363a4f;
    border-radius: 8px;
    color: #6c7086;
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
    transition: background 150ms, color 150ms, border-color 150ms;
  }

  .hide-toggle:hover {
    background: #2a2e3f;
    color: #cdd6f4;
  }

  .hide-toggle.active {
    background: #363a4f;
    color: #cdd6f4;
    border-color: #b4befe;
  }

  .habit-list-inner {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .habit-wrapper {
    cursor: grab;
    user-select: none;
    position: relative;
    transition: background 200ms ease;
  }

  .habit-wrapper:hover {
    background: rgba(255,255,255,0.02);
  }

  .habit-wrapper:active {
    cursor: grabbing;
  }

  .habit-wrapper.dragging {
    opacity: 0.25;
  }

  .habit-wrapper.drop-target {
    background: rgba(180, 190, 254, 0.08);
  }

  .drag-ghost {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.15;
    background: #b4befe;
    border-radius: 8px;
    border: 1px solid rgba(180, 190, 254, 0.3);
  }
</style>