import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { query } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { attendanceRouter } from './routes/attendance.js';
import { eventsRouter } from './routes/events.js';
import { gateRouter } from './routes/gate.js';
import { projectsRouter } from './routes/projects.js';
import { notificationsRouter } from './routes/notifications.js';
import { interactionsRouter } from './routes/interactions.js';
import { reviewsRouter } from './routes/reviews.js';
import { streamRouter } from './routes/stream.js';
import { behaviorRouter } from './routes/behavior.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const globalLimiter = rateLimit({
    windowMs: config.globalRateLimitWindowMs,
    limit: config.globalRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  });
  const authLimiter = rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true
  });

  // Request logging: one line per request with a short id so errors can be
  // correlated (ENGINEERING_CLEANUP.md Phase 1.5). Health checks are skipped
  // to keep supervision pings out of the logs.
  app.use((req, res, next) => {
    req.id = randomUUID().slice(0, 8);
    if (req.path === '/health' || req.path === '/api/health') {
      next();
      return;
    }
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`[req ${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    });
    next();
  });

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error('CORS origin not allowed');
      error.status = 403;
      callback(error);
    },
    credentials: true
  }));
  app.use('/api', (req, res, next) => {
    if (req.path === '/events/stream') {
      next();
      return;
    }
    globalLimiter(req, res, next);
  });
  app.use('/api/auth', authLimiter);
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', async (_req, res, next) => {
    try {
      const result = await query('select now() as now');
      res.json({ ok: true, db: result.rows[0].now });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/gate', gateRouter);
  app.use('/api/events', streamRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/interactions', interactionsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/behavior', behaviorRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  app.use((error, req, res, _next) => {
    if (error.code === '23505') {
      const fieldMatch = error.detail?.match(/\(([^)]+)\)=/);
      const field = fieldMatch?.[1] || 'field';
      const labels = {
        email: 'email',
        google_uid: 'compte Google'
      };
      res.status(409).json({
        error: `Un compte utilise déjà cet ${labels[field] || field}.`
      });
      return;
    }

    const status = error.status || 500;
    // Server errors are always logged (production included) with the request
    // id so they can be matched against the request log line.
    if (status >= 500) {
      console.error(`[req ${req.id || '-'}] ${req.method} ${req.originalUrl} failed:`, error);
    } else if (config.nodeEnv !== 'production') {
      console.error(`[req ${req.id || '-'}]`, error);
    }
    res.status(status).json({
      error: status === 500 ? 'Internal server error' : error.message
    });
  });

  return app;
}
