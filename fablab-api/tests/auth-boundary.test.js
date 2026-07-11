// Trust-boundary tests: identity and role enforcement.
// ENGINEERING_CLEANUP.md Phase 1.3.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer,
  stopTestServer,
  api,
  tokenFor,
  expiredTokenFor,
  forgedTokenFor,
  USERS
} from './helpers.js';
import { query } from '../src/db/pool.js';

let baseUrl;

before(async () => {
  baseUrl = await startTestServer();
});

after(async () => {
  await stopTestServer();
});

test('request without token is rejected with 401', async () => {
  const res = await api(baseUrl, '/attendance/mine');
  assert.equal(res.status, 401);
});

test('request with a garbage token is rejected with 401', async () => {
  const res = await api(baseUrl, '/attendance/mine', { token: 'not-a-jwt' });
  assert.equal(res.status, 401);
});

test('expired JWT is rejected with 401', async () => {
  const res = await api(baseUrl, '/attendance/mine', { token: expiredTokenFor(USERS.stagiaire) });
  assert.equal(res.status, 401);
});

test('token signed with the wrong secret is rejected with 401', async () => {
  const res = await api(baseUrl, '/attendance/mine', { token: forgedTokenFor(USERS.stagiaire) });
  assert.equal(res.status, 401);
});

test('deactivated user is rejected with 403 even with a valid token', async () => {
  const res = await api(baseUrl, '/attendance/mine', { token: tokenFor(USERS.deactivated) });
  assert.equal(res.status, 403);
});

test('stagiaire cannot reach admin-only attendance listing (requireRole)', async () => {
  const res = await api(baseUrl, '/attendance', { token: tokenFor(USERS.stagiaire) });
  assert.equal(res.status, 403);
});

test('stagiaire cannot publish permanent gate QR codes (admin-only)', async () => {
  const res = await api(baseUrl, '/gate/permanent-qr/GATE_IN', {
    method: 'POST',
    token: tokenFor(USERS.stagiaire)
  });
  assert.equal(res.status, 403);
});

test('administrateur can reach admin-only attendance listing', async () => {
  const res = await api(baseUrl, '/attendance', { token: tokenFor(USERS.admin) });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.attendance));
});

test('role claim inside the token cannot escalate privileges (DB role wins)', async () => {
  // Token claims administrateur, but the DB row for this user says stagiaire.
  // requireAuth loads the user from the DB, so the DB is the authority.
  const res = await api(baseUrl, '/attendance', {
    token: tokenFor({ ...USERS.stagiaire, role: 'administrateur' })
  });
  assert.equal(res.status, 403);
});

test('incomplete profiles are not rehydrated as logged-in app users', async () => {
  const res = await api(baseUrl, '/auth/me', { token: tokenFor(USERS.stagiaire) });
  assert.equal(res.status, 200);
  assert.equal(res.body.profileComplete, false);
  assert.equal(res.body.user, null);
});

test('complete profiles rehydrate normally', async () => {
  await query(
    `
      update users
      set charte_accepted = true, reproduction_accepted = true
      where id = $1
    `,
    [USERS.stagiaire.id]
  );

  const res = await api(baseUrl, '/auth/me', { token: tokenFor(USERS.stagiaire) });
  assert.equal(res.status, 200);
  assert.equal(res.body.profileComplete, true);
  assert.equal(res.body.user.id, USERS.stagiaire.id);
  assert.equal(res.body.user.role, 'stagiaire');
});

test('registering with an already-taken prenom+nom is rejected', async () => {
  // USERS.peer is "Peer Test" — the stagiaire tries to take the same name
  // (case/whitespace variations included).
  const res = await api(baseUrl, '/auth/register', {
    method: 'POST',
    token: tokenFor(USERS.stagiaire),
    body: {
      prenom: '  peer ',
      nom: 'TEST',
      cin: 'X1',
      tel: '0611111111',
      email: 'dup@test.local',
      role: 'formateur',
      charteAccepted: true,
      reproductionAccepted: true
    }
  });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /existe déjà/);
});

test('registering keeps working when the name is your own (re-register)', async () => {
  const res = await api(baseUrl, '/auth/register', {
    method: 'POST',
    token: tokenFor(USERS.stagiaire),
    body: {
      prenom: USERS.stagiaire.prenom,
      nom: USERS.stagiaire.nom,
      cin: 'X2',
      tel: '0622222222',
      email: USERS.stagiaire.email,
      role: 'stagiaire',
      charteAccepted: true,
      reproductionAccepted: true
    }
  });
  assert.equal(res.status, 200);
});

test('renaming a user onto an existing prenom+nom is rejected', async () => {
  const res = await api(baseUrl, `/users/${USERS.stagiaire.id}`, {
    method: 'PATCH',
    token: tokenFor(USERS.admin),
    body: { prenom: 'Peer', nom: 'Test' }
  });
  assert.equal(res.status, 409);
});
