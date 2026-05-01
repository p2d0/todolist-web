<script>
  import { onMount } from 'svelte';
  import { weekDataStore } from '$lib/stores/timer.js';
  import { get } from 'svelte/store';

  export let habitsStore;

  let summary = '';

  $: { if ($habitsStore.length > 0) computeSummary(); }

  function computeSummary() {
    const allRows = get(weekDataStore);
    let totalSessions = 0;
    let totalSeconds = 0;
    for (const row of allRows) {
      totalSessions++;
      totalSeconds += row.duration_seconds || 0;
    }
    const pomos = totalSeconds / 1500;
    summary = `${totalSessions} sessions, ${Math.floor(totalSeconds / 60)}m total, ${pomos.toFixed(1)} pomodoros`;
  }

  onMount(() => {
    const unsub = weekDataStore.subscribe(() => {
      if ($habitsStore.length > 0) computeSummary();
    });
    return unsub;
  });
</script>

{#if summary}
  <div class="week-summary">{summary}</div>
{/if}

<style>
  .week-summary {
    font-size: 11px;
    color: #6c7086;
    padding: 6px 12px;
    text-align: center;
  }
</style>
