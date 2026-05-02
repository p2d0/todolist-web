<script>
  import { base } from '$app/paths';
  import { send } from '$lib/stores/sync.js';

  export let habitId;
  export let date;
  export let description;
  export let value; // current value from server (can be null)
  export let onSaved;
  export let onClosed;

  let newVal = value !== null && value !== undefined ? value.toString() : '';
  let hasData = value !== null && value !== undefined;

  async function save() {
    if (newVal === '') {
      remove();
      return;
    }

    await fetch(`${base}/api/sessions?type=value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, date, value: Number(newVal) }),
    });
    send({ type: 'sessions:update' });

    onSaved();
    onClosed();
  }

  async function remove() {
    await fetch(`${base}/api/sessions?date=${date}&habitId=${habitId}`, { method: 'DELETE' });
    send({ type: 'sessions:update' });
    onSaved();
    onClosed();
  }
</script>

<div class="overlay" on:click={onClosed} on:keydown={(e) => { if (e.key === 'Escape') onClosed(); }}>
  <div class="dialog" on:click|stopPropagation>
    <div class="title">{description} — {date}</div>
    {#if hasData}
      <div class="current">Current: {value}</div>
    {/if}
    <div class="inputs">
      <label>
        Value
        <input type="number" aria-label="Value" bind:value={newVal} min="0" autofocus on:focus={(e) => e.target.scrollIntoView({ block: 'center' })} />
      </label>
    </div>
    <div class="buttons">
      {#if hasData}
        <button class="btn-remove" on:click={remove}>Clear</button>
      {/if}
      <button class="btn-save" on:click={save}>Save</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  @media (max-width: 768px) {
    .overlay {
      align-items: flex-start;
      padding-top: 15vh;
    }
  }

  .dialog {
    background: #2a2e3f;
    border-radius: 12px;
    padding: 20px;
    min-width: 280px;
    border: 1px solid #363a4f;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: #cdd6f4;
    margin-bottom: 12px;
  }

  .current {
    font-size: 12px;
    color: #a6adc8;
    margin-bottom: 12px;
  }

  .inputs {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: #6c7086;
    flex: 1;
  }

  input {
    background: #363a4f;
    border: 1px solid #454a60;
    border-radius: 6px;
    padding: 8px;
    color: #cdd6f4;
    font-size: 14px;
    width: 100%;
  }

  input:focus {
    outline: none;
    border-color: #b4befe;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .btn-save {
    flex: 1;
    background: #a6e3a1;
    color: #1e1e2e;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-remove {
    background: #f38ba8;
    color: #1e1e2e;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 600;
    cursor: pointer;
  }
</style>