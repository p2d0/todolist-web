<script>
  import { onMount } from 'svelte';
  import TimerBanner from '$lib/components/TimerBanner.svelte';
  import HabitList from '$lib/components/HabitList.svelte';
  import WeekSummary from '$lib/components/WeekSummary.svelte';
  import AddHabitDialog from '$lib/components/AddHabitDialog.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import FabButton from '$lib/components/FabButton.svelte';
  import StatsView from '$lib/components/StatsView.svelte';
  import { base } from '$app/paths';
  import { habitsStore } from '$lib/stores/timer.js';
  import { send } from '$lib/stores/sync.js';

  let showAddDialog = false;
  let editingHabit = null;
  let activeTab = 'main';

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
    send({ type: 'habits:update' });
    await loadHabits();
  }

  onMount(() => {
    loadHabits();
    const onHabitsSync = () => loadHabits();
    window.addEventListener('sync:habits', onHabitsSync);
    return () => window.removeEventListener('sync:habits', onHabitsSync);
  });
</script>

<div class="app-container">
  {#if activeTab === 'main'}
    <TimerBanner {habitsStore} />
    <WeekSummary {habitsStore} />
    <HabitList {habitsStore} onAdd={() => { editingHabit = null; showAddDialog = true; }} onEdit={(habit) => { editingHabit = habit; showAddDialog = true; }} onDelete={(habit) => { if (confirm(`Delete ${habit.description}?`)) { fetch(`${base}/api/habits/${habit.id}`, { method: 'DELETE' }).then(() => afterDeleteHabit()); } }} />
  {:else}
    <StatsView />
  {/if}

  {#if showAddDialog}
    <AddHabitDialog {editingHabit} on:close={() => showAddDialog = false} on:added={afterAddHabit} />
  {/if}
</div>

<BottomNav bind:activeTab showFab={activeTab === 'main'}>
  <svelte:fragment slot="fab">
    <FabButton onClick={() => { editingHabit = null; showAddDialog = true; }} />
  </svelte:fragment>
</BottomNav>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    padding: 8px;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 8px);
    box-sizing: border-box;
    overflow: hidden;
    overflow-x: hidden;
    min-width: 0;
  }
</style>
