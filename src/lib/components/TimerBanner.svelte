<script>
  import { base } from '$app/paths';
  import { timerStore } from '$lib/stores/timer.js';
  import { send } from '$lib/stores/sync.js';
  import { get } from 'svelte/store';
  export let habitsStore;
  import dayjs from 'dayjs';
  import { onMount } from 'svelte';

  let activeTimer = null;
  let habits = [];
  let displayText = '0.0 pomodoros';
  let btnText = 'Start';
  let modeBtnText = 'S';

  let timerInterval = null;

  // Notification
  let notifPermission = 'default';

  function requestNotifPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        notifPermission = perm;
      });
    }
  }

  async function getServiceWorkerReg() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg;
  }

  async function showNotif(title, opts) {
    if (Notification.permission !== 'granted') return;
    try {
      const reg = await getServiceWorkerReg();
      if (reg) {
        reg.showNotification(title, opts);
      } else {
        new Notification(title, opts);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  function showStartNotif(habit) {
    const mode = activeTimer?.mode || habit.mode || 'stopwatch';
    showNotif('PomoTasker', {
      body: `Timer started: ${habit.description} (${mode} mode)`,
      icon: `${base}/icons/icon-192.png`,
      tag: 'timer-start',
      vibrate: [200],
      data: { type: 'timer-start' },
    });
  }

  function showStopNotif(habit, elapsed) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    showNotif('PomoTasker', {
      body: `Timer stopped: ${habit.description} (${mins}m ${secs}s)`,
      icon: `${base}/icons/icon-192.png`,
      tag: 'timer-stop',
      vibrate: [100, 50, 100],
      data: { type: 'timer-stop' },
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
    if (typeof Notification !== 'undefined') {
      notifPermission = Notification.permission;
    }
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
    send({ type: 'timer:update', data: get(timerStore) });
    showStartNotif(habit);
  }

  function stopTimer() {
    if (!activeTimer) return;
    const elapsed = getElapsed();
    const habit = habits.find(h => h.id === activeTimer.activeHabitId);
    const date = dayjs().format('YYYY-MM-DD');

    if (habit) {
      showStopNotif(habit, elapsed);
      fetch(`${base}/api/sessions`, {
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
    send({ type: 'timer:update', data: get(timerStore) });
  }

  function toggleMode() {
    timerStore.update(v => ({
      ...v,
      mode: v.mode === 'timed' ? 'stopwatch' : 'timed',
    }));
    send({ type: 'timer:update', data: get(timerStore) });
  }

  async function onPomodoroComplete() {
    if (Notification.permission === 'granted') {
      showNotif('Pomodoro complete!', {
        body: 'Pomodoro session finished!',
        icon: `${base}/icons/icon-192.png`,
        tag: 'pomodoro-done',
        vibrate: [200, 100, 200],
        data: { type: 'pomodoro-done' },
      });
    }
    await stopTimer();
  }

  $: notifIcon = notifPermission === 'granted' ? '🔔' : notifPermission === 'denied' ? '🔕' : '🔔?';
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
    <button class="notif-btn" on:click={requestNotifPermission} title="Enable notifications">{notifIcon}</button>
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

  .notif-btn {
    background: #363a4f;
    border: 1px solid #454a60;
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  .notif-btn:hover {
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
