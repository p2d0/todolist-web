<script>
  export let onClick;
</script>

<button class="fab" on:click={onClick} aria-label="Add habit">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
</button>

<style>
  .fab {
    position: fixed;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    right: 16px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: #cba6f7;
    color: #1e1e2e;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(203, 166, 247, 0.4), 0 2px 6px rgba(0,0,0,0.2);
    z-index: 90;
    transition: transform 150ms, box-shadow 150ms;
  }

  .fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(203, 166, 247, 0.5), 0 3px 8px rgba(0,0,0,0.25);
  }

  .fab:active {
    transform: translateY(0) scale(0.95);
  }
</style>
