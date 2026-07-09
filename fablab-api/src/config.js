import dotenv from 'dotenv';

dotenv.config();

const defaultCorsOrigins = [
  'https://fablab-bmk.web.app',
  'https://fablab-cmc.web.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:8080',
  'http://fablab.localhost:8080',
  'http://admin.fablab.localhost:8080'
];

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
  // Lab opening hours (HH:MM, lab timezone). Gate-IN is refused outside
  // [open, close); open attendances auto-close at closing time. Overridable
  // so tests can control the clock.
  labOpenTime: process.env.LAB_OPEN_TIME || '08:30',
  labCloseTime: process.env.LAB_CLOSE_TIME || '18:30',
  corsOrigins: (process.env.CORS_ORIGINS || defaultCorsOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  globalRateLimitWindowMs: Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  globalRateLimitMax: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 1000),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20)
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}
