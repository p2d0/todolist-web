<script>
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import { base } from '$app/paths';
  import { habitsStore, weekDataStore } from '$lib/stores/timer.js';
  import { send } from '$lib/stores/sync.js';
  import TimerBanner from '$lib/components/TimerBanner.svelte';
  import HabitList from '$lib/components/HabitList.svelte';
  import WeekSummary from '$lib/components/WeekSummary.svelte';
  import AddHabitDialog from '$lib/components/AddHabitDialog.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import FabButton from '$lib/components/FabButton.svelte';
  import StatsView from '$lib/components/StatsView.svelte';

  let showAddDialog = false;
  let editingHabit = null;
  let activeTab = 'main';

  function getWeekRange() {
    const today = dayjs();
    const dayOfWeek = today.day();
    const monday = today.subtract((dayOfWeek + 6) % 7, 'day');
    const sunday = monday.add(6, 'day');
    return { startDate: monday.format('YYYY-MM-DD'), endDate: sunday.format('YYYY-MM-DD') };
  }

  async function loadHabits() {
    const { startDate, endDate } = getWeekRange();
    const [res, data] = await Promise.all([
      fetch(`${base}/api/habits`).then(r => r.json()),
      fetch(`${base}/api/sessions?type=weekdata&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
    ]);
    weekDataStore.set(data.rows);
    habitsStore.set(res);
  }

  function openAddDialog() {
    editingHabit = null;
    showAddDialog = true;
  }

  function openEditDialog(habit) {
    editingHabit = habit;
    showAddDialog = true;
  }

  async function deleteHabit(habit) {
    if (!confirm(`Delete ${habit.description}?`)) return;
    await fetch(`${base}/api/habits/${habit.id}`, { method: 'DELETE' });
    send({ type: 'habits:update' });
    await loadHabits();
  }

  async function afterAddHabit() {
    showAddDialog = false;
    await loadHabits();
  }

  onMount(() => {
    loadHabits();
    const onSync = () => loadHabits();
    window.addEventListener('sync:habits', onSync);
    window.addEventListener('sync:sessions', onSync);
    return () => {
      window.removeEventListener('sync:habits', onSync);
      window.removeEventListener('sync:sessions', onSync);
    };
  });
</script>

<div class="app-container">
  {#if activeTab === 'main'}
    <TimerBanner {habitsStore} />
    <WeekSummary {habitsStore} />
    <HabitList {habitsStore} onAdd={openAddDialog} onEdit={openEditDialog} onDelete={deleteHabit} />
  {:else}
    <StatsView />
  {/if}

  {#if showAddDialog}
    <AddHabitDialog {editingHabit} on:close={() => showAddDialog = false} on:added={afterAddHabit} />
  {/if}
</div>

<BottomNav bind:activeTab showFab={activeTab === 'main'}>
  <svelte:fragment slot="fab">
    <FabButton onClick={openAddDialog} />
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
