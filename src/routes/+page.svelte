<script>
  import { onMount } from 'svelte';
  import TimerBanner from '$lib/components/TimerBanner.svelte';
  import HabitList from '$lib/components/HabitList.svelte';
  import WeekSummary from '$lib/components/WeekSummary.svelte';
  import AddHabitDialog from '$lib/components/AddHabitDialog.svelte';
  import { base } from '$app/paths';
  import { habitsStore } from '$lib/stores/timer.js';

  let showAddDialog = false;
  let editingHabit = null;

  async function loadHabits() {
    const res = await fetch(`${base}/api/habits`);
    const habits = await res.json();
    habitsStore.set(habits);
  }

  async function afterAddHabit() {
    showAddDialog = false;
    await loadHabits();
  }

  async function afterDeleteHabit() {
    await loadHabits();
  }

  onMount(loadHabits);
</script>

<div class="app-container">
  <TimerBanner {habitsStore} />
  <WeekSummary {habitsStore} />
  <HabitList {habitsStore} onAdd={() => { editingHabit = null; showAddDialog = true; }} onEdit={(habit) => { editingHabit = habit; showAddDialog = true; }} onDelete={(habit) => { if (confirm(`Delete ${habit.description}?`)) { fetch(`${base}/api/habits/${habit.id}`, { method: 'DELETE' }).then(() => afterDeleteHabit()); } }} />
  {#if showAddDialog}
    <AddHabitDialog {editingHabit} on:close={() => showAddDialog = false} on:added={afterAddHabit} />
  {/if}
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 8px;
    box-sizing: border-box;
    overflow: hidden;
    overflow-x: hidden;
    min-width: 0;
  }
</style>
