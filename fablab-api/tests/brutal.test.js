// Brutal adversarial suite: bad tokens, role escalation, malformed payloads,
// injection strings, and business-logic abuse. Invariants:
//   * every protected route rejects no/forged/expired tokens (401)
//   * admin-only routes reject a stagiaire (403)
//   * garbage input never crashes the server (never 500)
//   * business rules can't be bypassed
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer, stopTestServer, api,
  tokenFor, forgedTokenFor, expiredTokenFor, USERS, QR
} from './helpers.js';
import { query } from '../src/db/pool.js';
import { config } from '../src/config.js';

let baseUrl;
let savedDate;
const stag = () => tokenFor(USERS.stagiaire);
const admin = () => tokenFor(USERS.admin);

before(async () => {
  baseUrl = await startTestServer();
  savedDate = config.labDateOverride;
  config.labDateOverride = '2026-07-13';
  await query(`update users set charte_accepted=true, reproduction_accepted=true where id like 'test-%'`);
  await query(
    `insert into users (id, role, prenom, nom, email, charte_accepted, reproduction_accepted)
     values ('user-sara','administrateur','Sara','Ladouy','sara@test.local',true,true)
     on conflict (id) do nothing`
  );
});
after(async () => { config.labDateOverride = savedDate; await stopTestServer(); });

// ---------------------------------------------------------------------------
// 1. Token boundary: no / forged / expired must all be 401 on a protected route
// ---------------------------------------------------------------------------
const PROTECTED = [
  ['GET', '/users'], ['GET', '/projects'], ['GET', '/notifications'],
  ['GET', '/attendance/mine'], ['POST', '/attendance/check-in'],
  ['GET', '/auth/me'], ['POST', '/reviews'], ['GET', '/gate/config']
];

test('no token -> 401 on every protected route', async () => {
  for (const [method, path] of PROTECTED) {
    const r = await api(baseUrl, path, { method, body: method === 'GET' ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${path} without token`);
  }
});

test('forged token (wrong secret) -> 401', async () => {
  for (const [method, path] of PROTECTED) {
    const r = await api(baseUrl, path, { method, token: forgedTokenFor(USERS.admin), body: method === 'GET' ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${path} forged`);
  }
});

test('expired token -> 401', async () => {
  const r = await api(baseUrl, '/users', { token: expiredTokenFor(USERS.admin) });
  assert.equal(r.status, 401);
});

test('malformed Authorization header -> 401', async () => {
  for (const h of ['Bearer', 'Basic xyz', 'garbage', 'Bearer ']) {
    const r = await api(baseUrl, '/users', { headers: { authorization: h } });
    assert.equal(r.status, 401, `header "${h}"`);
  }
});

// ---------------------------------------------------------------------------
// 2. Role escalation: a stagiaire must be forbidden on admin-only routes
// ---------------------------------------------------------------------------
test('stagiaire is forbidden (403) on admin-only routes', async () => {
  const adminOnly = [
    ['GET', '/attendance'],
    ['POST', '/events', { title: 'x' }],
    ['PATCH', '/events/00000000-0000-0000-0000-000000000000', { title: 'x' }],
    ['DELETE', '/events/00000000-0000-0000-0000-000000000000'],
    ['PUT', '/gate/config', { config: {} }],
    ['POST', '/gate/permanent-qr/GATE_IN', {}],
    ['POST', '/lab-closures', { label: 'x', date: '2026-09-01' }],
    ['DELETE', '/lab-closures/00000000-0000-0000-0000-000000000000'],
    ['GET', '/behavior/reports'],
    ['GET', `/behavior/users/${USERS.peer.id}`],
    ['PATCH', '/behavior/reports/00000000-0000-0000-0000-000000000000', { status: 'valide' }],
    ['PATCH', `/users/${USERS.peer.id}/deactivate`, {}],
    ['PATCH', `/users/${USERS.peer.id}/reactivate`, {}],
    ['DELETE', `/users/${USERS.peer.id}`]
  ];
  for (const [method, path, body] of adminOnly) {
    const r = await api(baseUrl, path, { method, token: stag(), body });
    assert.equal(r.status, 403, `stagiaire ${method} ${path} -> expected 403, got ${r.status}`);
  }
});

test('role in token is ignored — DB role is authority', async () => {
  // A stagiaire that forges role:administrateur in the JWT still can't reach admin routes.
  const fakeAdmin = tokenFor({ ...USERS.stagiaire, role: 'administrateur' });
  const r = await api(baseUrl, '/attendance', { token: fakeAdmin });
  assert.equal(r.status, 403);
});

// ---------------------------------------------------------------------------
// 3. Garbage input never 500s (must be a clean 4xx)
// ---------------------------------------------------------------------------
test('malformed bodies never crash the server (never 500)', async () => {
  const garbage = [
    ['POST', '/auth/register', { prenom: 123, role: 'wizard' }, stag()],
    ['POST', '/users', { role: 'hacker', prenom: '' }, admin()],
    ['PATCH', `/users/${USERS.peer.id}`, { tel: 'not-a-phone', email: 'nope' }, admin()],
    ['POST', '/attendance/check-in', { qr: { gate: 'HACK' } }, stag()],
    ['POST', '/attendance/check-in', {}, stag()],
    ['POST', '/attendance/check-out', { rating: 99 }, stag()],
    ['POST', '/reviews', { projectId: 'not-a-uuid', problemSolving: 50 }, admin()],
    ['POST', '/behavior/recognitions', { targetId: USERS.peer.id, rating: 0, comment: '' }, admin()],
    ['POST', '/behavior/reports', { targetId: USERS.peer.id, category: 'invalid', details: '' }, stag()],
    ['POST', '/lab-closures', { label: 'x', date: '2026-13-45' }, admin()],
    ['POST', '/lab-closures', { label: 'x', date: '2026-09-01', timeFrom: '10:00' }, admin()],
    ['POST', '/events', { description: 'no title' }, admin()],
    ['PUT', '/gate/config', { config: 'not-an-object' }, admin()],
    ['POST', '/notifications', { type: 'spam', recipientId: USERS.peer.id }, stag()],
    ['POST', `/projects/00000000-0000-0000-0000-000000000000/invitation`, { action: 'delete-everything' }, stag()],
    ['POST', '/users/contact-approval', { approve: true }, stag()],
    ['PUT', '/projects/sync', { projects: 'nope' }, stag()],
    ['PUT', '/projects/recycle-bin', { recycleBin: 'nope' }, stag()]
  ];
  for (const [method, path, body, token] of garbage) {
    const r = await api(baseUrl, path, { method, token, body });
    assert.ok(r.status >= 400 && r.status < 500, `${method} ${path} -> ${r.status} (expected 4xx)`);
  }
});

test('invalid UUID params return 4xx, never 500', async () => {
  const cases = [
    ['GET', '/users/not-a-uuid', admin()],
    ['POST', '/projects/not-a-uuid/invitation', stag(), { action: 'accept' }],
    ['POST', '/interactions/requests/not-a-uuid/offer', stag(), {}],
    ['POST', '/interactions/offers/not-a-uuid/approve', stag(), {}],
    ['DELETE', '/events/not-a-uuid', admin()],
    ['DELETE', '/lab-closures/not-a-uuid', admin()]
  ];
  for (const [method, path, token, body] of cases) {
    const r = await api(baseUrl, path, { method, token, body });
    assert.ok(r.status < 500, `${method} ${path} -> ${r.status} (must not 500)`);
  }
});

// ---------------------------------------------------------------------------
// 4. Injection safety
// ---------------------------------------------------------------------------
test('SQL-injection strings in search are treated literally (no 500, no dump)', async () => {
  for (const inj of ["' OR 1=1;--", "'; DROP TABLE users;--", "%' UNION SELECT * FROM users--"]) {
    const r = await api(baseUrl, `/users?search=${encodeURIComponent(inj)}`, { token: admin() });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.users));
    // A literal match returns nobody; it must never return the whole table.
    assert.ok(r.body.users.length <= 1, 'injection must not dump all users');
  }
});

test('XSS payload stored in bio is round-tripped as inert data', async () => {
  const xss = '<script>alert(1)</script>';
  const upd = await api(baseUrl, `/users/${USERS.peer.id}`, { method: 'PATCH', token: admin(), body: { bio: xss } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.user.bio, xss); // stored verbatim; frontend is responsible for escaping on render
});

// ---------------------------------------------------------------------------
// 5. Business-logic abuse
// ---------------------------------------------------------------------------
test('cannot recognise or report yourself', async () => {
  const rec = await api(baseUrl, '/behavior/recognitions', { method: 'POST', token: admin(), body: { targetId: USERS.admin.id, rating: 5, comment: 'me' } });
  assert.equal(rec.status, 400);
  const rep = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stag(), body: { targetId: USERS.stagiaire.id, category: 'disrespect', details: 'me' } });
  assert.equal(rep.status, 400);
});

test('comportement rating cannot be injected via user PATCH', async () => {
  const r = await api(baseUrl, `/users/${USERS.peer.id}`, { method: 'PATCH', token: admin(), body: { comportementRating: 5 } });
  assert.equal(r.status, 200);
  const after = await api(baseUrl, `/users/${USERS.peer.id}`, { token: admin() });
  assert.equal(after.body.user.comportementRating, null); // untouched by the write
});

test('cannot accept an invitation you were never given', async () => {
  const proj = await api(baseUrl, '/projects', { method: 'POST', token: stag(), body: { title: 'Not Yours', phase: 'MOC' } });
  // peer is not a contributor -> accept must 404, not silently succeed.
  const r = await api(baseUrl, `/projects/${proj.body.project.id}/invitation`, { method: 'POST', token: tokenFor(USERS.peer), body: { action: 'accept' } });
  assert.equal(r.status, 404);
});

test('cannot act on an interaction offer that is not yours', async () => {
  const reqRow = await query(
    `insert into interaction_requests (type, requester_id, description, status) values ('help',$1,'x','open') returning id`,
    [USERS.stagiaire.id]
  );
  const offer = await api(baseUrl, `/interactions/requests/${reqRow.rows[0].id}/offer`, { method: 'POST', token: tokenFor(USERS.peer), body: {} });
  const offerId = offer.body.offer.id;
  // admin is neither requester nor responder -> approving is forbidden.
  const r = await api(baseUrl, `/interactions/offers/${offerId}/approve`, { method: 'POST', token: admin(), body: {} });
  assert.equal(r.status, 403);
  // rating before completion is a conflict, not a crash.
  const rate = await api(baseUrl, `/interactions/offers/${offerId}/rate`, { method: 'POST', token: stag(), body: { rating: 5 } });
  assert.ok([403, 409].includes(rate.status), `rate-before-complete -> ${rate.status}`);
});

test('deactivated user is blocked (403) even with a valid token', async () => {
  const r = await api(baseUrl, '/attendance/mine', { token: tokenFor(USERS.deactivated) });
  assert.equal(r.status, 403);
});

test('duplicate name is blocked across case and whitespace', async () => {
  // peer is "Peer Test"
  const r = await api(baseUrl, '/users', { method: 'POST', token: admin(), body: { role: 'formateur', prenom: '  PEER ', nom: 'test' } });
  assert.equal(r.status, 409);
});

test('double check-in is a conflict, not a duplicate row', async () => {
  const body = { qr: { gate: 'GATE_IN', id: QR.GATE_IN }, objective: 'brutal' };
  const first = await api(baseUrl, '/attendance/check-in', { method: 'POST', token: tokenFor(USERS.peer), body });
  assert.equal(first.status, 201);
  const second = await api(baseUrl, '/attendance/check-in', { method: 'POST', token: tokenFor(USERS.peer), body });
  assert.equal(second.status, 409);
});
