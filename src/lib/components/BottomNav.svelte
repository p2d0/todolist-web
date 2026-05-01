<script>
  export let activeTab = 'main';

  function setTab(tab) {
    activeTab = tab;
  }
</script>

<nav class="bottom-nav">
  <button
    class="nav-item"
    class:active={activeTab === 'main'}
    on:click={() => setTab('main')}
  >
    <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"></path>
      <path d="M3 12h18"></path>
      <path d="M3 18h18"></path>
    </svg>
    <span class="nav-label">Main</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'stats'}
    on:click={() => setTab('stats')}
  >
    <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20V10"></path>
      <path d="M12 20V4"></path>
      <path d="M6 20v-6"></path>
    </svg>
    <span class="nav-label">Statistics</span>
  </button>
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: #232636;
    border-top: 1px solid #363a4f;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 100;
    max-width: 480px;
    margin: 0 auto;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 64px;
    border: none;
    background: transparent;
    color: #6c7086;
    cursor: pointer;
    transition: color 150ms;
  }

  .nav-item.active {
    color: #b4befe;
  }

  .nav-item:hover:not(.active) {
    color: #a6adc8;
  }

  .nav-icon {
    width: 22px;
    height: 22px;
  }

  .nav-label {
    font-size: 11px;
    font-weight: 500;
  }
</style>
