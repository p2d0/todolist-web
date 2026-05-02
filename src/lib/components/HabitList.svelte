<script>
  import { base } from '$app/paths';
  import HabitRow from './HabitRow.svelte';
  import { onMount } from 'svelte';
  import { hideCompletedStore, weekDataStore } from '$lib/stores/timer.js';
  import dayjs from 'dayjs';
  import { get } from 'svelte/store';

  export let habitsStore;
  export let onEdit = null;
  export let onDelete = null;

  let habits = [];
  let hideCompleted = false;
  let completedIds = {};
  let completedLoaded = false;
  let mounted = false;

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
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('sync:habits', handleSync);
    window.addEventListener('sync:sessions', handleSync);
    return () => {
      unsub();
      unsubHide();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('sync:habits', handleSync);
      window.removeEventListener('sync:sessions', handleSync);
    };
  });

  async function refresh() {
    const res = await fetch(`${base}/api/habits`);
    const data = await res.json();
    habitsStore.set(data);
  }

  function checkCompleted() {
    const today = dayjs().format('YYYY-MM-DD');
    const allRows = get(weekDataStore);
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
  }

  function toggleHideCompleted() {
    hideCompleted = !hideCompleted;
    hideCompletedStore.set(hideCompleted);
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
      <HabitRow {habit} {onEdit} {onDelete} />
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
</style>