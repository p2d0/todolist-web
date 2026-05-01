<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let allStats = [];
  let loading = true;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  onMount(async () => {
    const months = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const results = await Promise.all(
      months.map(m => fetch(`${base}/api/stats?month=${m}`).then(r => r.json()))
    );

    allStats = results;
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
      case 1: return '#1e4d2b';
      case 2: return '#2d8a3e';
      case 3: return '#4dbf5e';
      case 4: return '#a6e3a1';
      default: return '#2a2e3f';
    }
  }

  function buildMultiMonthGrid(monthlyData) {
    // monthlyData is array of { month: '2026-05', habits: [...] }
    // We need to build a single grid with all weeks across all months
    const allWeeks = [];
    const monthBoundaries = []; // Track which week starts a new month

    monthlyData.forEach((data, monthIdx) => {
      const year = parseInt(data.month.split('-')[0]);
      const month = parseInt(data.month.split('-')[1]) - 1;
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let startOffset = firstDay.getDay();
      startOffset = startOffset === 0 ? 6 : startOffset - 1;

      let currentWeek = [];
      for (let i = 0; i < startOffset; i++) {
        currentWeek.push(null);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push({ day, month: data.month });
        if (currentWeek.length === 7) {
          allWeeks.push(currentWeek);
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        allWeeks.push(currentWeek);
        currentWeek = [];
      }

      // Mark first week of this month for label
      // Find the first week that has a day from this month
      let firstWeekOfMonth = allWeeks.length - Math.ceil((daysInMonth + startOffset) / 7);
      if (firstWeekOfMonth < 0) firstWeekOfMonth = 0;
      monthBoundaries.push({
        weekIndex: firstWeekOfMonth,
        label: `${monthNames[month]} ${year}`
      });
    });

    return { weeks: allWeeks, boundaries: monthBoundaries };
  }

  function getHabitDataMap(allStats, habitId) {
    const map = new Map();
    for (const monthStat of allStats) {
      const h = monthStat.habits.find(h => h.id === habitId);
      if (h) {
        map.set(monthStat.month, h.daily);
      }
    }
    return map;
  }

  function getHabitTotal(allStats, habit) {
    let total = 0;
    for (const monthStat of allStats) {
      const h = monthStat.habits.find(h => h.id === habit.id);
      if (h) {
        total += h.daily.reduce((a, b) => a + b, 0);
      }
    }
    if (habit.type === 'timer') return `${Math.floor(total / 60)}m`;
    if (habit.type === 'boolean') return `${total}x`;
    return `avg ${total}`;
  }

  function getHabitMaxValue(allStats, habitId) {
    let max = 1;
    for (const monthStat of allStats) {
      const h = monthStat.habits.find(h => h.id === habitId);
      if (h) {
        const monthMax = Math.max(...h.daily.filter(v => v > 0), 1);
        if (monthMax > max) max = monthMax;
      }
    }
    return max;
  }
</script>

<div class="stats-view">
  {#if loading}
    <div class="loading">Loading stats...</div>
  {:else if allStats.length > 0}
    {@const gridInfo = buildMultiMonthGrid(allStats)}
    {@const weeks = gridInfo.weeks}
    {@const boundaries = gridInfo.boundaries}
    {@const allHabits = allStats[allStats.length - 1]?.habits || []}
    {@const totalMins = allStats.reduce((s, m) => s + m.summary.totalMinutes, 0)}
    {@const totalComp = allStats.reduce((s, m) => s + m.summary.totalCompletions, 0)}
    {@const bestStreak = Math.max(...allStats.map(m => m.summary.bestStreak), 0)}

    <div class="stats-header">Last 3 Months</div>

    <!-- Summary Cards -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-icon">⏱️</div>
        <div class="summary-value">{totalMins}m</div>
        <div class="summary-label">Total Time</div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">✅</div>
        <div class="summary-value">{totalComp}</div>
        <div class="summary-label">Completions</div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">🔥</div>
        <div class="summary-value">{bestStreak}</div>
        <div class="summary-label">Best Streak</div>
      </div>
    </div>

    <!-- Per-habit calendars -->
    <div class="habit-stats-list">
      {#each allHabits as habit}
        {@const maxValue = getHabitMaxValue(allStats, habit.id)}
        {@const habitData = getHabitDataMap(allStats, habit.id)}
        {@const totalVal = Array.from(habitData.values()).flat().reduce((a, b) => a + b, 0)}

        <div class="habit-stat-card">
          <div class="habit-stat-header">
            <div class="habit-stat-info">
              <span class="habit-stat-name">{habit.description}</span>
              <span class="habit-stat-badge">{habit.type}</span>
            </div>
            <div class="habit-stat-meta">
              <span class="habit-stat-total">
                {habit.type === 'timer' ? `${Math.floor(totalVal / 60)}m` :
                 habit.type === 'boolean' ? `${totalVal}x` :
                 `avg ${totalVal}`}
              </span>
              {#if habit.streak > 0}
                <span class="habit-stat-streak">🔥 {habit.streak}</span>
              {/if}
            </div>
          </div>

          <!-- Multi-month calendar -->
          <div class="calendar-scroll">
            <div class="calendar">
              <!-- Day labels -->
              <div class="calendar-labels">
                {#each dayLabels as label, i}
                  <div class="cal-label" class:dim={i % 2 !== 0}>{label[0]}</div>
                {/each}
              </div>

              <!-- Month labels + grid combined -->
              <div class="calendar-body">
                <!-- Month header row -->
                <div class="month-header-row">
                  {#each weeks as _, wkIdx}
                    {@const boundary = boundaries.find(b => b.weekIndex === wkIdx)}
                    <div class="week-header">
                      {#if boundary}
                        <span class="month-label-small">{boundary.label}</span>
                      {/if}
                    </div>
                  {/each}
                </div>

                <!-- Grid -->
                <div class="calendar-grid">
                  {#each weeks as week}
                    <div class="week-column">
                      {#each week as cell, dayIdx}
                        {#if cell}
                          {@const daily = habitData.get(cell.month) || []}
                          {@const value = daily[cell.day - 1] || 0}
                          <div
                            class="cal-cell"
                            style="background: {intensityColor(getIntensity(value, maxValue))}"
                            title="{cell.month}-{String(cell.day).padStart(2, '0')}: {value}"
                          ></div>
                        {:else}
                          <div class="cal-cell empty"></div>
                        {/if}
                      {/each}
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="legend">
            <span class="legend-label">Less</span>
            {#each [0, 1, 2, 3, 4] as lvl}
              <div class="legend-box" style="background: {intensityColor(lvl)}"></div>
            {/each}
            <span class="legend-label">More</span>
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
    padding: 20px 0;
    color: #6c7086;
    font-size: 14px;
  }

  .stats-header {
    font-size: 18px;
    font-weight: 700;
    color: #cdd6f4;
    text-align: center;
    margin-bottom: 12px;
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
    padding: 12px 4px;
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
    font-size: 16px;
    font-weight: 700;
    color: #cdd6f4;
  }

  .summary-label {
    font-size: 9px;
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

  /* Calendar */
  .calendar-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -12px;
    padding: 0 12px;
  }

  .calendar {
    display: flex;
    gap: 4px;
    min-width: max-content;
  }

  .calendar-labels {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
    padding-top: 14px;
  }

  .cal-label {
    font-size: 9px;
    color: #a6adc8;
    width: 14px;
    height: 10px;
    line-height: 10px;
    text-align: right;
    flex-shrink: 0;
  }

  .cal-label.dim {
    color: #454a60;
  }

  .calendar-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .month-header-row {
    display: flex;
    gap: 2px;
    height: 12px;
  }

  .week-header {
    width: 10px;
    flex-shrink: 0;
    position: relative;
  }

  .month-label-small {
    position: absolute;
    left: 0;
    bottom: 0;
    font-size: 9px;
    color: #6c7086;
    white-space: nowrap;
    line-height: 1;
  }

  .calendar-grid {
    display: flex;
    gap: 2px;
  }

  .week-column {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }

  .cal-cell {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .cal-cell.empty {
    background: #2a2e3f;
    opacity: 0.2;
  }

  /* Legend */
  .legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 8px;
  }

  .legend-label {
    font-size: 10px;
    color: #6c7086;
  }

  .legend-box {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
</style>
