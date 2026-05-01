<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let stats = null;
  let loading = true;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

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

  function getIntensity(value, max) {
    if (!max || value <= 0) return 0;
    const pct = value / max;
    if (pct > 0.75) return 4;
    if (pct > 0.5) return 3;
    if (pct > 0.25) return 2;
    return 1;
  }

  function intensityColor(level) {
    switch (level) {
      case 0: return '#2a2e3f';
      case 1: return '#2d4a3e';
      case 2: return '#3d7a4e';
      case 3: return '#5da85e';
      case 4: return '#a6e3a1';
      default: return '#2a2e3f';
    }
  }

  function buildCalendarGrid(daily) {
    const grid = [];
    const year = parseInt(stats.month.split('-')[0]);
    const month = parseInt(stats.month.split('-')[1]) - 1;
    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay(); // 0 = Sun
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0

    let currentWeek = new Array(7).fill(null);
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek[i] = null;
    }

    for (let day = 1; day <= daily.length; day++) {
      const idx = (dayOfWeek + day - 1) % 7;
      currentWeek[idx] = { day, value: daily[day - 1] };
      if (idx === 6 || day === daily.length) {
        grid.push([...currentWeek]);
        currentWeek = new Array(7).fill(null);
      }
    }
    return grid;
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

    <!-- Per-habit GitHub-style calendars -->
    <div class="habit-stats-list">
      {#each stats.habits as habit}
        {@const grid = buildCalendarGrid(habit.daily)}
        {@const maxValue = Math.max(...habit.daily.filter(v => v > 0), 1)}
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

          <!-- GitHub-style contribution calendar -->
          <div class="calendar-wrapper">
            <div class="calendar-body">
              <div class="day-labels">
                {#each dayLabels as label}
                  <div class="day-label">{label[0]}</div>
                {/each}
              </div>
              {#each grid as week}
                <div class="week-col">
                  {#each week as cell}
                    {#if cell}
                      <div
                        class="calendar-cell"
                        style="background: {intensityColor(getIntensity(cell.value, maxValue))}"
                        title="{stats.month}-{String(cell.day).padStart(2, '0')}: {cell.value}"
                      ></div>
                    {:else}
                      <div class="calendar-cell empty"></div>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>
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
    gap: 12px;
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

  .calendar-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .calendar-body {
    display: flex;
    gap: 3px;
    padding: 4px 0;
  }

  .day-labels {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-right: 4px;
    padding-top: 0;
  }

  .day-label {
    font-size: 9px;
    color: #6c7086;
    width: 14px;
    height: 12px;
    line-height: 12px;
    text-align: center;
    flex-shrink: 0;
  }

  .week-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .calendar-cell {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .calendar-cell.empty {
    background: transparent;
  }
</style>
