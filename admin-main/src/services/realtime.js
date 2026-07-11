import { API_BASE_URL, getAdminToken } from './api';

const listeners = new Set();
let socket = null;
let socketToken = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let stableSyncTimer = null;
let stopped = true;
let visibilityListenerAttached = false;

const STABLE_CONNECTION_MS = 2000;

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

function clearStableSyncTimer() {
  if (stableSyncTimer) {
    window.clearTimeout(stableSyncTimer);
    stableSyncTimer = null;
  }
}

function reconnectNow() {
  if (stopped) return;
  clearReconnectTimer();
  openRealtime();
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  if (typeof WebSocket === 'undefined') return;
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    reconnectNow();
    return;
  }
  // After phone sleep / tab backgrounding the socket can be half-open: the
  // client still reports OPEN but server pushes never arrived. Refetch to
  // catch up on anything missed while the tab was hidden.
  notify({ entity: 'sync', action: 'visibility', ts: new Date().toISOString() });
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

  if (
    socketToken === token
    && socket
    && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  if (socket) socket.close();
  const nextSocket = new WebSocket(socketUrl(token));
  socket = nextSocket;
  socketToken = token;

  nextSocket.addEventListener('open', () => {
    console.info('[realtime] connected');
  });

  nextSocket.addEventListener('message', (event) => {
    try {
      const change = JSON.parse(event.data);
      if (change.entity === 'sync' && change.action === 'reconnect') {
        clearStableSyncTimer();
        stableSyncTimer = window.setTimeout(() => {
          if (socket === nextSocket && nextSocket.readyState === WebSocket.OPEN) {
            reconnectDelay = 1000;
            notify(change);
          }
        }, STABLE_CONNECTION_MS);
        return;
      }
      notify(change);
    } catch {
      // Ignore malformed realtime messages.
    }
  });

  nextSocket.addEventListener('close', (event) => {
    if (socket !== nextSocket) return;

    clearStableSyncTimer();
    socket = null;
    socketToken = null;
    if (event.code === 1008) {
      stopped = true;
      clearReconnectTimer();
      return;
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
  clearStableSyncTimer();
  if (socket) {
    socket.close();
    socket = null;
  }
  socketToken = null;
}

export function subscribeRealtime(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
