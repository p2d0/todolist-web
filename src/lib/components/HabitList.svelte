<script>
  import { base } from '$app/paths';
  import HabitRow from './HabitRow.svelte';
  import { onMount } from 'svelte';

  export let habitsStore;
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
    const handleSync = () => refresh();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('sync:habits', handleSync);
    window.addEventListener('sync:sessions', handleSync);
    return () => {
      unsub();
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
</script>

<div class="habit-list">
  <div class="habit-list-inner">
    {#each habits as habit (habit.id)}
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

  .habit-list-inner {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
