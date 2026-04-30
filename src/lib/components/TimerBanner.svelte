<script>
  import { timerStore } from '$lib/stores/timer.js';
  export let habitsStore;
  import dayjs from 'dayjs';
  import { onMount } from 'svelte';


  let activeTimer = null;
  let habits = [];
  let displayText = '0.0 pomodoros';
  let btnText = 'Start';
  let modeBtnText = 'S';

  let timerInterval = null;
  let notifInterval = null;

  // Notification
  let notifPermission = 'default';

  function requestNotifPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      notifPermission = 'granted';
      startNotifUpdater();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        notifPermission = perm;
        if (perm === 'granted' && activeTimer?.running) {
          startNotifUpdater();
        }
      });
    }
  }

  function startNotifUpdater() {
    if (notifInterval) return;
    notifInterval = setInterval(updateNotif, 1000);
    updateNotif();
  }

  function updateNotif() {
    if (notifPermission !== 'granted' || !activeTimer?.running) return;
    const habit = habits.find(h => h.id === activeTimer.activeHabitId);
    if (!habit) return;
    const elapsed = getElapsed();
    let timeStr;
    if (activeTimer.mode === 'timed') {
      const remaining = Math.max(0, 1500 - elapsed);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} left`;
    } else {
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      timeStr = `${mins}m ${secs}s elapsed`;
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('PomoTasker', {
        tag: 'timer',
        body: `${habit.description} — ${timeStr}`,
        icon: '/icons/icon-192.png',
      });
    });
  }


  const tUnsub = timerStore.subscribe(v => {
    activeTimer = v;
    if (v.running) {
      btnText = 'Stop';
    } else {
      btnText = 'Start';
    }
    modeBtnText = v.mode === 'timed' ? 'P' : 'S';
  });

  const hUnsub = habitsStore.subscribe(v => habits = v);

  onMount(() => {
    timerInterval = setInterval(updateDisplay, 250);
    return () => {
      clearInterval(timerInterval);
      tUnsub();
      hUnsub();
    };
  });

  function updateDisplay() {
    if (!activeTimer?.running) {
      displayText = '0.0 pomodoros';
      return;
    }

    const habit = habits.find(h => h.id === activeTimer.activeHabitId);
    if (!habit) return;

    const elapsed = getElapsed();

    if (activeTimer.mode === 'timed') {
      const duration = 1500;
      const remaining = Math.max(0, duration - elapsed);
      const pomos = elapsed / duration;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      if (remaining === 0) {
        displayText = `${pomos.toFixed(1)} pomodoros (complete!)`;
        onPomodoroComplete();
      } else {
        displayText = `${pomos.toFixed(1)} pomodoros (${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} left)`;
      }
    } else {
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      displayText = `${mins}m ${secs}s elapsed`;
    }
  }

  function getElapsed() {
    if (!activeTimer?.startTime) return activeTimer?.elapsedBefore || 0;
    return Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.elapsedBefore;
  }

  function handleStartStop() {
    if (activeTimer?.running) {
      stopTimer();
      return;
    }

    // If no active habit, use first timer-type habit
    let habit = habits.find(h => h.id === activeTimer?.activeHabitId);
    if (!habit) {
      habit = habits.find(h => h.habit_type === 'timer');
    }
    if (!habit) return;

    // Request notification permission first (must be in user gesture)
    requestNotifPermission();

    const mode = activeTimer?.mode || habit.mode || 'stopwatch';
    timerStore.update(v => ({
      ...v,
      activeHabitId: habit.id,
      mode,
      running: true,
      startTime: Date.now(),
      elapsedBefore: 0,
    }));
  }

  function stopTimer() {
    if (!activeTimer) return;
    const elapsed = getElapsed();
    const habit = habits.find(h => h.id === activeTimer.activeHabitId);
    const date = dayjs().format('YYYY-MM-DD');

    if (habit) {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: habit.id,
          date,
          durationSeconds: elapsed,
        }),
      });
    }

    timerStore.update(v => ({
      ...v,
      activeHabitId: null,
      running: false,
      startTime: null,
      elapsedBefore: 0,
      elapsed: 0,
    }));

    if (notifInterval) {
      clearInterval(notifInterval);
      notifInterval = null;
    }
  }

  function toggleMode() {
    timerStore.update(v => ({
      ...v,
      mode: v.mode === 'timed' ? 'stopwatch' : 'timed',
    }));
  }

  async function onPomodoroComplete() {
    if (notifPermission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('Pomodoro complete!', {
        tag: 'complete',
        icon: '/icons/icon-192.png',
      });
    });
    }
    await stopTimer();
  }

  $: isActive = activeTimer?.running;
  $: activeHabitName = activeTimer?.activeHabitId
    ? habits.find(h => h.id === activeTimer.activeHabitId)?.description || ''
    : '';
</script>

<div class="timer-banner {isActive ? 'active' : ''}">
  {#if activeHabitName}
    <div class="timer-habit">{activeHabitName}</div>
  {/if}
  <div class="timer-display">
    <span class="timer-text">{displayText}</span>
  </div>
  <div class="timer-controls">
    <button class="mode-btn" on:click={toggleMode}>{modeBtnText}</button>
    <button class="action-btn" class:active={isActive} on:click={handleStartStop}>{btnText}</button>
  </div>
</div>

<style>
  .timer-banner {
    background: #2a2e3f;
    border-radius: 12px;
    padding: 12px;
    margin: 4px 0;
    transition: border-color 150ms;
  }

  .timer-banner.active {
    border: 1px solid #cba6f7;
  }

  .timer-habit {
    font-size: 11px;
    color: #6c7086;
    margin-bottom: 4px;
  }

  .timer-display {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
  }

  .timer-text {
    font-size: 13px;
    font-weight: bold;
    color: #cdd6f4;
  }

  .timer-controls {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .mode-btn {
    background: #363a4f;
    border: 1px solid #454a60;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: bold;
    color: #cdd6f4;
    cursor: pointer;
  }

  .mode-btn:hover {
    background: #454a60;
  }

  .action-btn {
    flex: 1;
    border: none;
    border-radius: 12px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: bold;
    background: #b4befe;
    color: #1e1e2e;
    cursor: pointer;
    transition: background 150ms, box-shadow 150ms;
  }

  .action-btn.active {
    background: #cba6f7;
    box-shadow: 0 0 12px rgba(203, 166, 247, 0.4);
  }

  .action-btn:hover {
    background: #c5cae9;
  }
</style>
