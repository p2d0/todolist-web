<script>
  import { base } from '$app/paths';
  import HabitRow from './HabitRow.svelte';
  import { onMount } from 'svelte';

  export let habitsStore;
  export let onAdd;
  export let onEdit = null;
  export let onDelete = null;

  let habits = [];
  const unsub = habitsStore.subscribe(v => habits = v);

  onMount(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  });

  async function refresh() {
    const res = await fetch(`${base}/api/habits`);
    const data = await res.json();
    habitsStore.set(data);
  }
</script>

<div class="habit-list">
  <div class="habit-list-inner">
    {#each habits as habit (habit.id)}
      <HabitRow {habit} {onEdit} {onDelete} />
    {/each}
  </div>
</div>

<button class="add-btn" on:click={onAdd}>
  + Add Habit
</button>

<style>
  .habit-list {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 4px;
  }

  .habit-list-inner {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .add-btn {
    width: 100%;
    padding: 14px;
    margin: 8px 0;
    border: none;
    border-radius: 12px;
    background: #363a4f;
    color: #a6adc8;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms;
  }

  .add-btn:hover {
    background: #454a60;
    color: #cdd6f4;
  }
</style>
