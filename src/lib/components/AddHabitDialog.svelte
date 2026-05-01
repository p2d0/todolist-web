<script>
  import { base } from '$app/paths';
  import { send } from '$lib/stores/sync.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let editingHabit = null;

  let description = editingHabit?.description || '';
  let habitType = editingHabit?.habit_type || 'timer';
  let minValue = editingHabit?.min_value?.toString() || '';

  async function submit() {
    if (!description.trim()) return;

    const body = {
      description: description.trim(),
      habitType,
      minValue: minValue ? Number(minValue) : null,
    };

    const url = editingHabit ? `${base}/api/habits/${editingHabit.id}` : `${base}/api/habits`;
    const method = editingHabit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      send({ type: 'habits:update' });
      dispatch('added');
    }
  }
</script>

<div class="overlay" on:click={() => dispatch('close')}></div>
<div class="dialog">
  <h2>{editingHabit ? 'Edit Habit' : 'Add Habit'}</h2>

  <label>
    Name
    <input type="text" bind:value={description} placeholder="e.g. Exercise, Read, Code..." />
  </label>

  <label>
    Type
    <select bind:value={habitType}>
      <option value="timer">Timer (Pomodoro)</option>
      <option value="boolean">Yes / No</option>
      <option value="number">Number</option>
    </select>
  </label>

  {#if habitType === 'number'}
    <label>
      Min value (target)
      <input type="number" bind:value={minValue} placeholder="optional" />
    </label>
  {/if}

  <div class="actions">
    <button class="cancel-btn" on:click={() => dispatch('close')}>Cancel</button>
    <button class="submit-btn" on:click={submit}>{editingHabit ? 'Save' : 'Add'}</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 99;
  }

  .dialog {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 420px;
    background: #232636;
    border: 1px solid #363a4f;
    border-bottom: none;
    border-radius: 16px 16px 0 0;
    padding: 20px;
    z-index: 100;
  }

  h2 {
    font-size: 16px;
    color: #cdd6f4;
    margin-bottom: 16px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
  }

  input, select {
    background: #363a4f;
    border: 1px solid #454a60;
    border-radius: 8px;
    padding: 10px 12px;
    color: #cdd6f4;
    font-size: 14px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #b4befe;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .cancel-btn, .submit-btn {
    flex: 1;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .cancel-btn {
    background: #363a4f;
    color: #6c7086;
  }

  .submit-btn {
    background: #b4befe;
    color: #1e1e2e;
  }
</style>