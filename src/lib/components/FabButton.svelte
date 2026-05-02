<script>
  import { timerStore } from '$lib/stores/timer.js';

  export let onClick;

  $: running = $timerStore.running;
</script>

{#if running}
  <button class="fab stop" on:click={() => { timerStore.stop(); }} aria-label="Stop timer">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  </button>
{:else}
  <button class="fab" on:click={onClick} aria-label="Add habit">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>
{/if}

<style>
  .fab {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    background: #cba6f7;
    color: #1e1e2e;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(203, 166, 247, 0.4);
    transition: transform 150ms, box-shadow 150ms, background 150ms;
    position: relative;
    top: -26px;
  }

  .fab:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 14px rgba(203, 166, 247, 0.5);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab.stop {
    background: #f38ba8;
    box-shadow: 0 2px 10px rgba(243, 139, 168, 0.4);
  }

  .fab.stop:hover {
    box-shadow: 0 4px 14px rgba(243, 139, 168, 0.5);
  }
</style>