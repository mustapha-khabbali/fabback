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

test('approving a contact request shares coordinates and notifies the requester', async () => {
  // stagiaire requests peer's contact; peer approves.
  const approve = await api(baseUrl, '/users/contact-approval', {
    method: 'POST',
    token: tokenFor(USERS.peer),
    body: { requesterId: USERS.stagiaire.id, approve: true }
  });
  assert.equal(approve.status, 200);
  // A private profile is bumped to personalised so the allow-list takes effect.
  assert.equal(approve.body.user.privacyMode, 'personalised');
  assert.ok(approve.body.user.allowedUsers.includes(USERS.stagiaire.id));

  // The requester received a contact_approved notification.
  const inbox = await api(baseUrl, '/notifications', { token: tokenFor(USERS.stagiaire) });
  assert.equal(inbox.status, 200);
  assert.ok(inbox.body.notifications.some((n) => n.type === 'contact_approved' && String(n.targetId) === String(USERS.peer.id)));

  // Peer now exposes the stagiaire in its allow-list via the public user object.
  const peerView = await api(baseUrl, `/users/${USERS.peer.id}`, { token: tokenFor(USERS.stagiaire) });
  assert.equal(peerView.body.user.privacyMode, 'personalised');
  assert.ok(peerView.body.user.allowedUsers.map(String).includes(String(USERS.stagiaire.id)));
});

test('declining a contact request does not share coordinates', async () => {
  // admin is an untouched approver here (peer was already approved above).
  const decline = await api(baseUrl, '/users/contact-approval', {
    method: 'POST',
    token: tokenFor(USERS.admin),
    body: { requesterId: USERS.peer.id, approve: false }
  });
  assert.equal(decline.status, 200);
  assert.equal(decline.body.user.privacyMode, 'private');
  assert.ok(!decline.body.user.allowedUsers.includes(USERS.peer.id));
});

test('contact approval derives requester from the original notification sender', async () => {
  const created = await api(baseUrl, '/notifications', {
    method: 'POST',
    token: tokenFor(USERS.peer),
    body: {
      type: 'CONTACT_REQUEST',
      targetId: USERS.admin.id,
      title: 'Demande de contact',
      message: 'Peer Test souhaite voir vos coordonnées.'
    }
  });
  assert.equal(created.status, 201);
  const requestNotification = created.body.notifications[0];
  assert.equal(requestNotification.recipientId, USERS.admin.id);
  assert.equal(requestNotification.senderId, USERS.peer.id);

  const approve = await api(baseUrl, '/users/contact-approval', {
    method: 'POST',
    token: tokenFor(USERS.admin),
    body: { notificationId: requestNotification.id, approve: true }
  });
  assert.equal(approve.status, 200);
  assert.ok(approve.body.user.allowedUsers.includes(USERS.peer.id));

  const requesterInbox = await api(baseUrl, '/notifications', { token: tokenFor(USERS.peer) });
  assert.equal(requesterInbox.status, 200);
  assert.ok(requesterInbox.body.notifications.some((n) => (
    n.type === 'contact_approved' && String(n.targetId) === String(USERS.admin.id)
  )));
});
