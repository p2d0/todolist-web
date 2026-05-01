<script>


  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  export let habitsStore;

  let summary = '';

  $: { if ($habitsStore.length > 0) refresh($habitsStore); }

  async function refresh(habits) {
    let totalSessions = 0;
    let totalSeconds = 0;

    for (const habit of habits) {
      const res = await fetch(`${base}/api/sessions?habitId=${habit.id}`);
      const sessions = await res.json();
      if (Array.isArray(sessions)) {
        totalSessions += sessions.length;
        totalSeconds += sessions.reduce((s, sess) => s + (sess.duration_seconds || 0), 0);
      }
    }

    const pomos = totalSeconds / 1500;
    summary = `${totalSessions} sessions, ${Math.floor(totalSeconds / 60)}m total, ${pomos.toFixed(1)} pomodoros`;
  }

  onMount(() => {
    const handleSync = () => {
      if ($habitsStore.length > 0) refresh($habitsStore);
    };
    window.addEventListener('sync:sessions', handleSync);
    return () => window.removeEventListener('sync:sessions', handleSync);
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
