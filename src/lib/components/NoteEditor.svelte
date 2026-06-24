<script>
  import { base } from '$app/paths';
  import { send } from '$lib/stores/sync.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let date = '';
  export let initialContent = '';

  const dispatch = createEventDispatcher();
  let content = initialContent;
  let saving = false;

  onMount(() => {
    window._dialogCount = (window._dialogCount || 0) + 1;
    document.body.classList.add('dialog-open');
  });
  onDestroy(() => {
    window._dialogCount--;
    if (!window._dialogCount) document.body.classList.remove('dialog-open');
  });

  async function save() {
    saving = true;
    try {
      await fetch(`${base}/api/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content }),
      });
      send({ type: 'notes:update', data: { date } });
      dispatch('saved', { date, content });
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      saving = false;
    }
  }

  function cancel() {
    dispatch('close');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      cancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="overlay" role="dialog" aria-modal="true" tabindex="-1" on:click|self={cancel}>
  <div class="dialog">
    <div class="dialog-header">
      <span class="dialog-title">📝 Note for {date}</span>
    </div>
    <textarea
      bind:value={content}
      placeholder="Write something about this day..."
      maxlength="5000"
      rows="8"
    ></textarea>
    <div class="dialog-actions">
      <button class="cancel-btn" on:click={cancel}>Cancel</button>
      <button class="save-btn" on:click={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
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
    z-index: 200;
    padding: 16px;
  }

  .dialog {
    background: #232636;
    border: 1px solid #363a4f;
    border-radius: 12px;
    padding: 16px;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dialog-title {
    font-size: 14px;
    font-weight: 600;
    color: #cdd6f4;
  }

  textarea {
    background: #1e1e2e;
    border: 1px solid #363a4f;
    border-radius: 8px;
    padding: 10px;
    color: #cdd6f4;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #b4befe;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .cancel-btn {
    background: none;
    border: 1px solid #363a4f;
    border-radius: 8px;
    color: #6c7086;
    font-size: 13px;
    padding: 6px 12px;
    cursor: pointer;
    transition: background 150ms, color 150ms;
  }

  .cancel-btn:hover {
    background: #2a2e3f;
    color: #cdd6f4;
  }

  .save-btn {
    background: #a6e3a1;
    border: none;
    border-radius: 8px;
    color: #1e1e2e;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 14px;
    cursor: pointer;
    transition: opacity 150ms;
  }

  .save-btn:hover {
    opacity: 0.9;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
