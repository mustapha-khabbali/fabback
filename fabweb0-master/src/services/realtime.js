import { API_BASE_URL, getUserToken } from './api';

const listeners = new Set();
let source = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let stopped = true;
let visibilityListenerAttached = false;

function notify(change) {
  listeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // Realtime is best-effort and must never break the app fallback path.
    }
  });
}

function streamUrl(token) {
  return `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token)}`;
}

function scheduleReconnect() {
  if (stopped || reconnectTimer) return;
  const delay = reconnectDelay;
  reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  console.info(`[realtime] reconnecting in ${delay}ms`);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    openRealtime();
  }, delay);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function reconnectNow() {
  if (stopped) return;
  clearReconnectTimer();
  reconnectDelay = 1000;
  openRealtime();
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  if (!source || source.readyState === EventSource.CLOSED) {
    reconnectNow();
  }
}

function ensureVisibilityListener() {
  if (visibilityListenerAttached || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityListenerAttached = true;
}

function openRealtime() {
  if (stopped || typeof EventSource === 'undefined') return;
  const token = getUserToken();
  if (!token) return;

  if (source) source.close();
  source = new EventSource(streamUrl(token));
  source.addEventListener('open', () => {
    reconnectDelay = 1000;
    console.info('[realtime] connected');
    notify({ entity: 'sync', action: 'reconnect', ts: new Date().toISOString() });
  });
  source.addEventListener('change', (event) => {
    notify(JSON.parse(event.data));
  });
  source.addEventListener('error', () => {
    if (source) {
      source.close();
      source = null;
    }
    scheduleReconnect();
  });
}

export function startRealtime() {
  stopped = false;
  ensureVisibilityListener();
  openRealtime();
}

export function stopRealtime() {
  stopped = true;
  clearReconnectTimer();
  if (source) {
    source.close();
    source = null;
  }
}

export function subscribeRealtime(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
