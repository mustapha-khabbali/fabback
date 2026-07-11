// Shared test harness: boots the real app on an ephemeral port against the
// test database (DATABASE_URL is provided by the npm test script and takes
// precedence over .env — dotenv never overwrites existing env vars).
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { pool, query } from '../src/db/pool.js';
import { signUserToken } from '../src/auth/jwt.js';
import { config } from '../src/config.js';

export const QR = {
  GATE_IN: 'test-gate-in-qr',
  GATE_OUT: 'test-gate-out-qr',
  EVENT: 'test-event-qr'
};

export const USERS = {
  admin: { id: 'test-admin', role: 'administrateur', prenom: 'Admin', nom: 'Test', email: 'admin@test.local' },
  stagiaire: { id: 'test-stagiaire', role: 'stagiaire', prenom: 'Stagiaire', nom: 'Test', email: 'stagiaire@test.local' },
  peer: { id: 'test-peer', role: 'stagiaire', prenom: 'Peer', nom: 'Test', email: 'peer@test.local' },
  deactivated: { id: 'test-deactivated', role: 'stagiaire', prenom: 'Off', nom: 'Test', email: 'off@test.local' }
};

let server;

export async function startTestServer() {
  await resetDb();
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

export async function stopTestServer() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
}

export async function resetDb() {
  await query('truncate attendance restart identity cascade');
  await query('truncate events restart identity cascade');
  await query('truncate recognitions restart identity cascade');
  await query('truncate reports restart identity cascade');
  await query('delete from gate_config');
  await query(`delete from users where id like 'test-%'`);

  for (const user of Object.values(USERS)) {
    await query(
      `insert into users (id, role, prenom, nom, email, is_deactivated)
       values ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.role, user.prenom, user.nom, user.email, user.id === USERS.deactivated.id]
    );
  }

  await query(
    `insert into gate_config (id, config, permanent_gate_in_qr_id, permanent_gate_out_qr_id, permanent_event_qr_id)
     values (1, '{}'::jsonb, $1, $2, $3)`,
    [QR.GATE_IN, QR.GATE_OUT, QR.EVENT]
  );
}

export function tokenFor(user) {
  return signUserToken(user);
}

export function expiredTokenFor(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '-1s' });
}

export function forgedTokenFor(user) {
  return jwt.sign({ sub: user.id, role: user.role }, 'wrong-secret', { expiresIn: '1h' });
}

export async function api(baseUrl, path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response — leave json null
  }
  return { status: res.status, body: json };
}

// Insert an attendance row directly (to simulate past state like a forgotten
// check-in from yesterday). The API itself never accepts client timestamps.
export async function insertAttendance(userId, { timestampIn }) {
  const result = await query(
    `insert into attendance (user_id, objective, timestamp_in)
     values ($1, 'test', $2) returning id`,
    [userId, timestampIn]
  );
  return result.rows[0].id;
}

export async function insertEvent({ title = 'Test event', spaces = ['FabLab'] } = {}) {
  const result = await query(
    `
      insert into events (title, description, date_mode, date, spaces, intervenants, archived)
      values ($1, '', 'single', current_date, $2::jsonb, '[]'::jsonb, false)
      returning id
    `,
    [title, JSON.stringify(spaces)]
  );
  return result.rows[0].id;
}

export async function getAttendanceRow(id) {
  const result = await query('select * from attendance where id = $1', [id]);
  return result.rows[0] || null;
}
