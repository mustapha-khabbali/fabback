import { API_BASE_URL, getAdminToken } from './api';

const listeners = new Set();
let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let stopped = true;
let visibilityListenerAttached = false;

function notify(change) {
  listeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // Realtime is best-effort; one subscriber must not break the stream.
    }
  });
}

function socketUrl(token) {
  const url = new URL(`${API_BASE_URL}/events/ws`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
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
  if (typeof WebSocket === 'undefined') return;
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    reconnectNow();
  }
}

function ensureVisibilityListener() {
  if (visibilityListenerAttached || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityListenerAttached = true;
}

function openRealtime() {
  if (stopped || typeof WebSocket === 'undefined') return;
  const token = getAdminToken();
  if (!token) return;

  if (socket) socket.close();
  const nextSocket = new WebSocket(socketUrl(token));
  socket = nextSocket;

  nextSocket.addEventListener('open', () => {
    reconnectDelay = 1000;
    console.info('[realtime] connected');
    notify({ entity: 'sync', action: 'reconnect', ts: new Date().toISOString() });
  });

  nextSocket.addEventListener('message', (event) => {
    try {
      notify(JSON.parse(event.data));
    } catch {
      // Ignore malformed realtime messages.
    }
  });

  nextSocket.addEventListener('close', () => {
    if (socket === nextSocket) {
      socket = null;
    }
    scheduleReconnect();
  });

  nextSocket.addEventListener('error', () => {
    nextSocket.close();
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
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function subscribeRealtime(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
