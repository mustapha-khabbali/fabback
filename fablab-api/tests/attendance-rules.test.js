// Attendance business-rule tests: gate-in/out, auto-close at 18:30,
// server-authoritative timestamps. ENGINEERING_CLEANUP.md Phase 1.3.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer,
  stopTestServer,
  resetDb,
  api,
  tokenFor,
  insertAttendance,
  insertEvent,
  getAttendanceRow,
  USERS,
  QR
} from './helpers.js';
import { config } from '../src/config.js';

let baseUrl;
const stagiaire = () => tokenFor(USERS.stagiaire);
const DEFAULT_TEST_LAB_DATE = '2026-07-13'; // Monday

function checkInBody(extra = {}) {
  return { qr: { gate: 'GATE_IN', id: QR.GATE_IN }, objective: 'Projet en cours', ...extra };
}

function checkOutBody(extra = {}) {
  return { qr: { gate: 'GATE_OUT', id: QR.GATE_OUT }, rating: 5, ...extra };
}

before(async () => {
  baseUrl = await startTestServer();
});

beforeEach(async () => {
  config.labDateOverride = DEFAULT_TEST_LAB_DATE;
  await resetDb();
});

after(async () => {
  await stopTestServer();
});

test('valid Gate-IN creates an open attendance with a server-side timestamp', async () => {
  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.attendance.userId, USERS.stagiaire.id);
  assert.equal(res.body.attendance.type, 'in');
  assert.equal(res.body.attendance.timestampOut, null);

  const drift = Math.abs(Date.now() - new Date(res.body.attendance.timestamp).getTime());
  assert.ok(drift < 10_000, `timestamp_in must be server "now", drift was ${drift}ms`);
});

test('client-supplied timestamps are ignored — the server is the authority', async () => {
  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({
      timestamp: '2020-01-01T08:00:00Z',
      timestamp_in: '2020-01-01T08:00:00Z',
      timestampIn: '2020-01-01T08:00:00Z'
    })
  });

  assert.equal(res.status, 201);
  const drift = Math.abs(Date.now() - new Date(res.body.attendance.timestamp).getTime());
  assert.ok(drift < 10_000, `forged timestamp must not be persisted, drift was ${drift}ms`);
});

test('Gate-IN with a wrong QR id is rejected with 403', async () => {
  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({ qr: { gate: 'GATE_IN', id: 'forged-qr-id' } })
  });
  assert.equal(res.status, 403);
});

test('Gate-IN while already inside is rejected with 409 (no second open row)', async () => {
  const first = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });
  assert.equal(first.status, 201);

  const second = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });
  assert.equal(second.status, 409);

  const mine = await api(baseUrl, '/attendance/mine', { token: stagiaire() });
  const open = mine.body.attendance.filter((a) => a.type === 'in');
  assert.equal(open.length, 1, 'exactly one open attendance row must exist');
});

test('Gate-IN with Event objective still opens lab presence and counts as present now', async () => {
  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({ objective: 'Event', eventTitle: 'Demo inside FabLab' })
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.attendance.objective, 'Event');
  assert.equal(res.body.attendance.eventTitle, 'Demo inside FabLab');
  assert.equal(res.body.attendance.type, 'in');
  assert.equal(res.body.attendance.timestampOut, null);

  const open = await api(baseUrl, '/attendance/open', { token: stagiaire() });
  assert.equal(open.status, 200);
  assert.equal(open.body.attendance.id, res.body.attendance.id);
});

test('EVENT scan while already inside records the event without opening lab presence', async () => {
  const first = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });
  assert.equal(first.status, 201);

  const event = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({
      qr: { gate: 'EVENT', id: QR.EVENT },
      objective: 'Event',
      eventTitle: 'Atelier hors FabLab'
    })
  });

  assert.equal(event.status, 201);
  assert.equal(event.body.attendance.eventTitle, 'Atelier hors FabLab');
  assert.ok(event.body.attendance.timestampOut, 'event attendance must be completed immediately');

  const mine = await api(baseUrl, '/attendance/mine', { token: stagiaire() });
  const open = mine.body.attendance.filter((a) => a.type === 'in');
  assert.equal(open.length, 1, 'the original Gate-IN row is the only open lab presence');
});

test('EVENT scan in a configured FabLab space opens lab presence when the user is not already inside', async () => {
  const eventId = await insertEvent({ title: 'FabLab workshop', spaces: ['FabLab', 'Amphithéâtre 1'] });

  const event = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({
      qr: { gate: 'EVENT', id: QR.EVENT },
      objective: 'Event',
      eventId,
      eventTitle: 'FabLab workshop',
      eventSpace: 'FabLab'
    })
  });

  assert.equal(event.status, 201);
  assert.equal(event.body.attendance.eventSpace, 'FabLab');
  assert.equal(event.body.attendance.type, 'in');
  assert.equal(event.body.attendance.timestampOut, null, 'FabLab event space must count as open lab presence');

  const open = await api(baseUrl, '/attendance/open', { token: stagiaire() });
  assert.equal(open.status, 200);
  assert.equal(open.body.attendance.id, event.body.attendance.id);
});

test('EVENT scan in a configured outside space stays completed and does not count present', async () => {
  const eventId = await insertEvent({ title: 'Conference event', spaces: ['Amphithéâtre 1'] });

  const event = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({
      qr: { gate: 'EVENT', id: QR.EVENT },
      objective: 'Event',
      eventId,
      eventTitle: 'Conference event',
      eventSpace: 'Amphithéâtre 1'
    })
  });

  assert.equal(event.status, 201);
  assert.equal(event.body.attendance.eventSpace, 'Amphithéâtre 1');
  assert.ok(event.body.attendance.timestampOut, 'outside event space must complete immediately');

  const open = await api(baseUrl, '/attendance/open', { token: stagiaire() });
  assert.equal(open.status, 200);
  assert.equal(open.body.attendance, null);
});

test('EVENT scan cannot use a space that is not configured on the selected event', async () => {
  const eventId = await insertEvent({ title: 'Outside only event', spaces: ['Espace Coworking'] });

  const event = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({
      qr: { gate: 'EVENT', id: QR.EVENT },
      objective: 'Event',
      eventId,
      eventTitle: 'Outside only event',
      eventSpace: 'FabLab'
    })
  });

  assert.equal(event.status, 400);
  assert.match(event.body.error, /Espace/i);
});

test('Gate-OUT closes the open attendance and stores the rating', async () => {
  await api(baseUrl, '/attendance/check-in', { method: 'POST', token: stagiaire(), body: checkInBody() });

  const res = await api(baseUrl, '/attendance/check-out', {
    method: 'POST',
    token: stagiaire(),
    body: checkOutBody({ rating: 4, feedbackComment: 'Bonne séance' })
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.attendance.type, 'out');
  assert.equal(res.body.attendance.rating, 4);
  assert.equal(res.body.attendance.autoClosed, false);
});

test('Gate-OUT while not inside returns 404 not-inside', async () => {
  const res = await api(baseUrl, '/attendance/check-out', {
    method: 'POST',
    token: stagiaire(),
    body: checkOutBody()
  });
  assert.equal(res.status, 404);
});

test("forgotten check-in auto-closes at 18:30 lab time, without a rating", async () => {
  const yesterdayMorning = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterdayMorning.setHours(10, 0, 0, 0);
  const id = await insertAttendance(USERS.stagiaire.id, { timestampIn: yesterdayMorning });

  // Any authenticated read of open attendance triggers the auto-close sweep.
  const open = await api(baseUrl, '/attendance/open', { token: stagiaire() });
  assert.equal(open.status, 200);
  assert.equal(open.body.attendance, null, 'yesterday must not appear as open today');

  const row = await getAttendanceRow(id);
  assert.equal(row.auto_closed, true);
  assert.equal(row.rating, null);
  assert.ok(row.timestamp_out, 'auto-closed row must have a timestamp_out');
});

test("yesterday's open attendance does not block today's Gate-IN", async () => {
  const yesterdayMorning = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterdayMorning.setHours(10, 0, 0, 0);
  await insertAttendance(USERS.stagiaire.id, { timestampIn: yesterdayMorning });

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });
  assert.equal(res.status, 201, 'stale open attendance must be auto-closed, not block check-in');
});

test('check-in from outside the school network is refused (403), from inside allowed', async (t) => {
  const saved = [...config.gateAllowedIps];
  t.after(() => { config.gateAllowedIps = saved; });
  config.gateAllowedIps = ['105.158.133.46', '10.34.0.0/16'];

  // No CF-Connecting-IP → treated as outside → refused.
  const outside = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stagiaire(), body: checkInBody()
  });
  assert.equal(outside.status, 403);
  assert.match(outside.body.error, /FabLab|école/i);

  // A home IP → refused.
  const home = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stagiaire(), body: checkInBody(),
    headers: { 'cf-connecting-ip': '41.92.10.10' }
  });
  assert.equal(home.status, 403);

  // The school egress IP → allowed.
  const school = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stagiaire(), body: checkInBody(),
    headers: { 'cf-connecting-ip': '105.158.133.46' }
  });
  assert.equal(school.status, 201);

  // A device inside the school LAN CIDR → allowed.
  await resetDb();
  const lan = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stagiaire(), body: checkInBody(),
    headers: { 'cf-connecting-ip': '10.34.94.15' }
  });
  assert.equal(lan.status, 201);

  // Event QR can be outside the FabLab, so it is not network-gated.
  const event = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: tokenFor(USERS.peer),
    body: checkInBody({ qr: { gate: 'EVENT', id: QR.EVENT }, objective: 'Event', eventTitle: 'Outside demo' }),
    headers: { 'cf-connecting-ip': '41.92.10.10' }
  });
  assert.equal(event.status, 201);
  assert.ok(event.body.attendance.timestampOut, 'outside event attendance must be completed immediately');
});

test('empty allowlist disables enforcement (dev/test default)', async (t) => {
  const saved = [...config.gateAllowedIps];
  t.after(() => { config.gateAllowedIps = saved; });
  config.gateAllowedIps = [];
  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stagiaire(), body: checkInBody()
  });
  assert.equal(res.status, 201);
});

test('Gate-IN while the lab is closed is refused with 403 and a French message', async (t) => {
  const saved = { open: config.labOpenTime, close: config.labCloseTime };
  t.after(() => { config.labOpenTime = saved.open; config.labCloseTime = saved.close; });
  config.labOpenTime = '00:00';
  config.labCloseTime = '00:00'; // [00:00, 00:00) — never open

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /fermé/i);
});

test('Gate-IN is refused on weekends even during opening hours', async (t) => {
  const saved = config.labDateOverride;
  t.after(() => { config.labDateOverride = saved; });
  config.labDateOverride = '2026-07-11'; // Saturday

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /weekend/i);
});

test('Gate-IN is refused on Moroccan holidays', async (t) => {
  const saved = config.labDateOverride;
  t.after(() => { config.labDateOverride = saved; });
  config.labDateOverride = '2026-07-30'; // Fête du Trône

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody()
  });

  assert.equal(res.status, 403);
  assert.match(res.body.error, /Férié|fermé/i);
});

test('EVENT check-in stays allowed outside lab hours (evening events)', async (t) => {
  const saved = { open: config.labOpenTime, close: config.labCloseTime };
  t.after(() => { config.labOpenTime = saved.open; config.labCloseTime = saved.close; });
  config.labOpenTime = '00:00';
  config.labCloseTime = '00:00';

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({ qr: { gate: 'EVENT', id: QR.EVENT }, objective: 'Event', eventTitle: 'Soirée Hackathon' })
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.attendance.timestampOut, 'event attendance must not leave an open lab presence');
});

test('EVENT check-in stays allowed on weekends', async (t) => {
  const saved = config.labDateOverride;
  t.after(() => { config.labDateOverride = saved; });
  config.labDateOverride = '2026-07-11'; // Saturday

  const res = await api(baseUrl, '/attendance/check-in', {
    method: 'POST',
    token: stagiaire(),
    body: checkInBody({ qr: { gate: 'EVENT', id: QR.EVENT }, objective: 'Event', eventTitle: 'Weekend event' })
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.attendance.timestampOut, 'weekend event attendance must not leave an open lab presence');
});

test('admin history includes auto-closed rows flagged as autoClosed', async () => {
  const yesterdayMorning = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterdayMorning.setHours(10, 0, 0, 0);
  const id = await insertAttendance(USERS.stagiaire.id, { timestampIn: yesterdayMorning });

  const res = await api(baseUrl, '/attendance', { token: tokenFor(USERS.admin) });
  assert.equal(res.status, 200);

  const row = res.body.attendance.find((a) => a.id === id);
  assert.ok(row, 'auto-closed row must appear in the admin history');
  assert.equal(row.autoClosed, true);
  assert.equal(row.type, 'out');
  assert.equal(row.rating, null);
});
