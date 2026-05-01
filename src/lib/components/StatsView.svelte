<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let stats = null;
  let loading = true;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  $: monthLabel = stats ? `${monthNames[parseInt(stats.month.split('-')[1]) - 1]} ${stats.month.split('-')[0]}` : '';

  onMount(async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const res = await fetch(`${base}/api/stats?month=${month}`);
    stats = await res.json();
    loading = false;
  });

  function formatTotal(habit) {
    if (habit.type === 'timer') return `${habit.total}m`;
    if (habit.type === 'boolean') return `${habit.total}x`;
    if (habit.type === 'number') return `avg ${habit.total}`;
    return String(habit.total);
  }

  function barHeight(value, max) {
    if (!max) return '4px';
    const pct = (value / max) * 100;
    return `${Math.max(4, pct)}%`;
  }

  function barColor(value) {
    return value > 0 ? '#a6e3a1' : '#454a60';
  }
</script>

<div class="stats-view">
  {#if loading}
    <div class="loading">Loading stats...</div>
  {:else if stats}
    <div class="month-header">{monthLabel}</div>

    <!-- Summary Cards -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-icon">⏱️</div>
        <div class="summary-value">{stats.summary.totalMinutes}m</div>
        <div class="summary-label">Total Time</div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">✅</div>
        <div class="summary-value">{stats.summary.totalCompletions}</div>
        <div class="summary-label">Completions</div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">🔥</div>
        <div class="summary-value">{stats.summary.bestStreak}</div>
        <div class="summary-label">Best Streak</div>
      </div>
    </div>

    <!-- Per-habit cards -->
    <div class="habit-stats-list">
      {#each stats.habits as habit}
        <div class="habit-stat-card">
          <div class="habit-stat-header">
            <div class="habit-stat-info">
              <span class="habit-stat-name">{habit.description}</span>
              <span class="habit-stat-badge">{habit.type}</span>
            </div>
            <div class="habit-stat-meta">
              <span class="habit-stat-total">{formatTotal(habit)}</span>
              {#if habit.streak > 0}
                <span class="habit-stat-streak">🔥 {habit.streak}</span>
              {/if}
            </div>
          </div>

          <!-- 30-day bar chart -->
          <div class="bar-chart">
            {#each habit.daily as day, i}
              <div class="bar-wrapper" title="Day {i + 1}: {day}">
                <div
                  class="bar"
                  style="height: {barHeight(day, Math.max(...habit.daily, 1))}; background: {barColor(day)};"
                ></div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty">No stats available</div>
  {/if}
</div>

<style>
  .stats-view {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px 80px 12px;
    -webkit-overflow-scrolling: touch;
  }

  .loading, .empty {
    text-align: center;
    padding: 40px;
    color: #6c7086;
    font-size: 14px;
  }

  .month-header {
    font-size: 20px;
    font-weight: 700;
    color: #cdd6f4;
    text-align: center;
    margin-bottom: 16px;
    margin-top: 4px;
  }

  .summary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .summary-card {
    flex: 1;
    background: #232636;
    border: 1px solid #363a4f;
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .summary-icon {
    font-size: 20px;
  }

  .summary-value {
    font-size: 18px;
    font-weight: 700;
    color: #cdd6f4;
  }

  .summary-label {
    font-size: 10px;
    color: #6c7086;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .habit-stats-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .habit-stat-card {
    background: #232636;
    border: 1px solid #363a4f;
    border-radius: 12px;
    padding: 12px;
  }

  .habit-stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .habit-stat-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .habit-stat-name {
    font-size: 13px;
    font-weight: 600;
    color: #e0e2e8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .habit-stat-badge {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: #363a4f;
    color: #a6adc8;
    flex-shrink: 0;
  }

  .habit-stat-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .habit-stat-total {
    font-size: 14px;
    font-weight: 700;
    color: #b4befe;
  }

  .habit-stat-streak {
    font-size: 12px;
    color: #fab387;
  }

  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 40px;
    gap: 2px;
  }

  .bar-wrapper {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
    min-width: 0;
  }

  .bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
    min-height: 4px;
    transition: background 150ms;
  }
</style>
