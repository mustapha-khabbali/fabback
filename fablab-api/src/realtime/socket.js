import { WebSocketServer, WebSocket } from 'ws';
import { query } from '../db/pool.js';
import { REALTIME_EVENT, realtimeBus } from './bus.js';
import { authenticateStreamToken, shouldDeliver } from '../routes/stream.js';

const REALTIME_WS_PATH = '/api/events/ws';
const HEARTBEAT_INTERVAL_MS = 25000;

function closeUnauthorized(ws, reason, code = 1008) {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close(code, reason);
  }
}

function sendChange(ws, change) {
  if (ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(change));
    return true;
  } catch {
    ws.terminate();
    return false;
  }
}

export function attachRealtimeSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname !== REALTIME_WS_PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, url);
    });
  });

  wss.on('connection', async (ws, _request, url) => {
    let user;
    try {
      user = await authenticateStreamToken(url.searchParams.get('token'));
    } catch (error) {
      console.warn(`[ws] connection rejected: ${error.message || 'Unauthorized'}`);
      closeUnauthorized(ws, error.message || 'Unauthorized', error.status === 403 ? 1008 : 1008);
      return;
    }

    console.log(`[ws] connected user=${user.id}`);

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const heartbeat = setInterval(() => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleChange = async (change) => {
      if (change.entity === 'users' && change.action === 'deactivate' && String(change.id) === String(user.id)) {
        sendChange(ws, change);
        ws.close(1008, 'User is deactivated');
        return;
      }

      if (!shouldDeliver(change, user)) return;

      if (change.entity === 'notifications') {
        console.log(`[ws] notif ${change.id} → user=${user.id}`);
      }

      if (change.entity === 'users' && change.action === 'deactivate') {
        const current = await query('select is_deactivated from users where id = $1', [user.id]);
        if (current.rows[0]?.is_deactivated) {
          ws.close(1008, 'User is deactivated');
          return;
        }
      }

      sendChange(ws, change);
    };
    const onChange = (change) => {
      handleChange(change).catch((error) => {
        console.error(`[ws] delivery failed user=${user.id}:`, error.message || error);
        ws.close(1011, 'Realtime delivery failed');
      });
    };

    realtimeBus.on(REALTIME_EVENT, onChange);
    ws.on('close', (code) => {
      console.log(`[ws] closed user=${user.id} code=${code}`);
      clearInterval(heartbeat);
      realtimeBus.off(REALTIME_EVENT, onChange);
    });
  });

  return wss;
}
