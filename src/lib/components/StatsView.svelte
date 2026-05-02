<script>
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let allStats = [];
  let loading = true;

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  onMount(async () => {
    const now = new Date();
    const months = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const results = await Promise.all(
      months.map(m => fetch(`${base}/api/stats?month=${m}`).then(r => r.json()))
    );

    allStats = results;
    loading = false;
  });

  function getHabitDataMap(allStats, habitId) {
    const map = new Map();
    for (const monthStat of allStats) {
      const h = monthStat.habits.find(h => h.id === habitId);
      if (h) map.set(monthStat.month, h.daily);
    }
    return map;
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

  function getIntensity(value, max, habitType) {
    if (!max || value <= 0) return 0;
    if (habitType === 'timer' && value < 1500) return 1;
    if (habitType === 'boolean') return value > 0 ? 4 : 0;
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

  function cellOpacity(value, habitType) {
    if (habitType === 'timer' && value > 0 && value < 1500) return 0.4;
    return 1;
  }

  function buildMultiMonthGrid(monthlyData) {
    const allWeeks = [];
    const monthHeaders = [];

    monthlyData.forEach((data) => {
      const year = parseInt(data.month.split('-')[0]);
      const month = parseInt(data.month.split('-')[1]) - 1;
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstWeekIndex = allWeeks.length;

      let startOffset = firstDay.getDay();
      startOffset = startOffset === 0 ? 6 : startOffset - 1;

      let currentWeek = [];
      for (let i = 0; i < startOffset; i++) currentWeek.push(null);

      for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push({ day, month: data.month });
        if (currentWeek.length === 7) {
          allWeeks.push(currentWeek);
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        allWeeks.push(currentWeek);
      }

      monthHeaders.push({
        weekIndex: firstWeekIndex,
        label: `${MONTH_NAMES[month]} ${year}`
      });
    });

    return { weeks: allWeeks, monthHeaders };
  }
</script>

<div class="stats-view">
  {#if loading}
    <div class="loading">Loading stats...</div>
  {:else if allStats.length > 0}
    {@const gridInfo = buildMultiMonthGrid(allStats)}
    {@const weeks = gridInfo.weeks}
    {@const monthHeaders = gridInfo.monthHeaders}
    {@const monthStarts = new Set(monthHeaders.map(m => m.weekIndex))}
    {@const allHabits = allStats.flatMap(m => m.habits).reduce((acc, h) => { if (!acc.find(x => x.id === h.id)) acc.push(h); return acc; }, [])}
    {@const totalMins = allStats.reduce((s, m) => s + m.summary.totalMinutes, 0)}
    {@const totalComp = allStats.reduce((s, m) => s + m.summary.totalCompletions, 0)}
    {@const bestStreak = Math.max(...allStats.map(m => m.summary.bestStreak), 0)}

    <div class="stats-header">Stats</div>

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

<!-- Table-based calendar for perfect alignment -->
          <div class="calendar-scroll">
            <div class="month-label-row" style="padding-left: {14 + 2}px">
              {#each monthHeaders as header, i}
                {@const endIdx = monthHeaders[i + 1]?.weekIndex ?? weeks.length}
                {@const numGaps = i > 0 ? 1 : 0}
                {@const colWidth = (endIdx - header.weekIndex) * (10 + 2) + numGaps * 4}
                <span class="month-label" style="width: {colWidth}px">{header.label}</span>
              {/each}
            </div>
            <table class="calendar-table">
              <tbody>
                {#each [0,1,2,3,4,5,6] as dayIdx}
                  <tr>
                    <td class="day-label-cell">{dayLabels[dayIdx][0]}</td>
                    {#each weeks as week, wkIdx}
                      {@const cell = week[dayIdx]}
                      {#if cell}
                        {@const daily = habitData.get(cell.month) || []}
                        {@const value = daily[cell.day - 1] || 0}
                        <td
                          class="cal-cell {monthStarts.has(wkIdx) && wkIdx > 0 ? 'month-gap' : ''}"
                          style="background: {intensityColor(getIntensity(value, maxValue, habit.type))}; opacity: {cellOpacity(value, habit.type)}"
                          title="{cell.month}-{String(cell.day).padStart(2, '0')}: {habit.type === 'timer' ? Math.floor(value / 60) + 'm' : value}"
                        ></td>
                      {:else}
                        <td class="cal-cell empty {monthStarts.has(wkIdx) && wkIdx > 0 ? 'month-gap' : ''}"></td>
                      {/if}
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

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
    color: #6c7086;
    font-size: 14px;
    margin: 20px 0;
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

  .summary-icon { font-size: 20px; }
  .summary-value { font-size: 16px; font-weight: 700; color: #cdd6f4; }
  .summary-label { font-size: 9px; color: #6c7086; text-transform: uppercase; letter-spacing: 0.5px; }

  .habit-stats-list { display: flex; flex-direction: column; gap: 12px; }

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

  .habit-stat-total { font-size: 14px; font-weight: 700; color: #b4befe; }
  .habit-stat-streak { font-size: 12px; color: #fab387; }

  /* Table calendar */
  .calendar-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -12px;
    padding: 0 12px;
  }

  .calendar-table {
    border-collapse: separate;
    border-spacing: 2px;
    table-layout: fixed;
    width: max-content;
  }

  .month-label-row {
    display: flex;
    gap: 0;
    margin-bottom: 2px;
  }

  .month-label {
    font-size: 9px;
    color: #6c7086;
    white-space: nowrap;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .day-label-cell {
    width: 14px;
    min-width: 14px;
    max-width: 14px;
    height: 10px;
    padding: 0;
    font-size: 9px;
    color: #a6adc8;
    text-align: right;
    vertical-align: middle;
    line-height: 10px;
    overflow: hidden;
    white-space: nowrap;
  }

  .cal-cell {
    width: 10px;
    min-width: 10px;
    height: 10px;
    padding: 0;
    border-radius: 2px;
  }

  .cal-cell.month-gap {
    padding-left: 4px;
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

  .legend-label { font-size: 10px; color: #6c7086; }
  .legend-box { width: 10px; height: 10px; border-radius: 2px; }
</style>
