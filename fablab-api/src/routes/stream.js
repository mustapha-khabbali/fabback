import express from 'express';
import { query } from '../db/pool.js';
import { verifyUserToken } from '../auth/jwt.js';
import { toPublicUser } from '../models/user.js';
import { REALTIME_EVENT, realtimeBus } from '../realtime/bus.js';
import { config } from '../config.js';

export const streamRouter = express.Router();

export async function authenticateStreamToken(token) {
  if (!token) {
    const error = new Error('Missing token');
    error.status = 401;
    throw error;
  }

  const payload = verifyUserToken(token);
  const result = await query('select * from users where id = $1', [payload.sub]);
  const user = result.rows[0];
  if (!user || user.is_deactivated) {
    const error = new Error(user?.is_deactivated ? 'User is deactivated' : 'Invalid token');
    error.status = user?.is_deactivated ? 403 : 401;
    throw error;
  }

  return user;
}

export function shouldDeliver(change, user) {
  if (change.entity === 'notifications') {
    return change.recipientId && String(change.recipientId) === String(user.id);
  }
  return true;
}

function writeEvent(res, change) {
  res.write(`event: change\n`);
  res.write(`data: ${JSON.stringify(change)}\n\n`);
}

streamRouter.get('/stream', async (req, res, next) => {
  try {
    const user = await authenticateStreamToken(req.query.token);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(`: connected ${user.id}\n\n`);

    const onChange = async (change) => {
      if (change.entity === 'users' && change.action === 'deactivate' && String(change.id) === String(user.id)) {
        writeEvent(res, change);
        res.end();
        return;
      }

      if (!shouldDeliver(change, user)) return;

      if (change.entity === 'users' && change.action === 'deactivate') {
        const current = await query('select is_deactivated from users where id = $1', [user.id]);
        if (current.rows[0]?.is_deactivated) {
          res.end();
          return;
        }
      }

      writeEvent(res, change);
    };

    realtimeBus.on(REALTIME_EVENT, onChange);
    const ping = setInterval(() => {
      res.write(`: ping ${Date.now()}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      realtimeBus.off(REALTIME_EVENT, onChange);
    });
  } catch (error) {
    next(error);
  }
});

streamRouter.get('/debug/listener-count', async (_req, res) => {
  if (config.nodeEnv === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ count: realtimeBus.listenerCount(REALTIME_EVENT) });
});
