import { browser } from '$app/environment';
import { base } from '$app/paths';
import { timerStore } from './timer.js';

let ws = null;
let reconnectTimer = null;
const RECONNECT_DELAY = 3000;
const CLIENT_ID = browser ? Math.random().toString(36).slice(2, 9) : 'server';

export function initSync() {
  if (!browser) return;
  connect();
}

function connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}${base}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.clientId === CLIENT_ID) return; // Ignore own echo
      handleMessage(msg);
    } catch (e) {
      console.error('WS message error:', e);
    }
  };

  ws.onclose = () => {
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  };

  ws.onerror = () => {
    if (ws) ws.close();
  };
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'timer:sync':
    case 'timer:update':
      timerStore.set(msg.data);
      break;
    case 'habits:update':
      window.dispatchEvent(new CustomEvent('sync:habits'));
      break;
    case 'sessions:update':
      window.dispatchEvent(new CustomEvent('sync:sessions'));
      break;
  }
}

export function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ ...msg, clientId: CLIENT_ID }));
  }
}
