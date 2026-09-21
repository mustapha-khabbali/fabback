import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { attachRealtimeSocket } from './realtime/socket.js';
import { closeDueAttendances } from './routes/attendance.js';

const app = createApp();
const EVENT_ATTENDANCE_TICK_MS = 15_000;

function closeDueEventAttendances() {
  closeDueAttendances().catch((error) => {
    console.error('Automatic event gate-out failed:', error);
  });
}

const server = app.listen(config.port, () => {
  console.log(`fablab-api listening on http://localhost:${config.port}`);
  closeDueEventAttendances();
});
attachRealtimeSocket(server);
const dueAttendanceTimer = setInterval(closeDueEventAttendances, EVENT_ATTENDANCE_TICK_MS);

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  clearInterval(dueAttendanceTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
