import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { query } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { attendanceRouter } from './routes/attendance.js';
import { eventsRouter } from './routes/events.js';
import { gateRouter } from './routes/gate.js';
import { projectsRouter } from './routes/projects.js';
import { notificationsRouter } from './routes/notifications.js';
import { reviewsRouter } from './routes/reviews.js';

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
  app.use('/api', globalLimiter);
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
  app.use('/api/events', eventsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/reviews', reviewsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (config.nodeEnv !== 'production') {
      console.error(error);
    }
    res.status(status).json({
      error: status === 500 ? 'Internal server error' : error.message
    });
  });

  return app;
}
