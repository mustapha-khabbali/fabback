// Ship-readiness smoke: exercise EVERY mounted endpoint against the disposable
// test DB (same code that runs in production) and assert a sane status for each.
// Read paths, create/update/delete paths, and the multi-step interaction chain.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer,
  stopTestServer,
  api,
  tokenFor,
  USERS,
  QR
} from './helpers.js';
import { query } from '../src/db/pool.js';
import { config } from '../src/config.js';

let baseUrl;
let savedLabDateOverride;
const admin = () => tokenFor(USERS.admin);
const stag = () => tokenFor(USERS.stagiaire);
const peer = () => tokenFor(USERS.peer);

before(async () => {
  baseUrl = await startTestServer();
  // Pin the lab date to a weekday so check-in isn't refused when the suite
  // happens to run on a weekend (the weekend-closed rule is real).
  savedLabDateOverride = config.labDateOverride;
  config.labDateOverride = '2026-07-13'; // Monday
  // Complete the seeded stagiaire/peer profiles so profile-gated reads pass.
  await query(
    `update users set charte_accepted = true, reproduction_accepted = true where id like 'test-%'`
  );
  // Projects attach a default supervisor 'user-sara' (the protected admin that
  // always exists in production); seed it so project creation FKs resolve.
  await query(
    `insert into users (id, role, prenom, nom, email, charte_accepted, reproduction_accepted)
     values ('user-sara', 'administrateur', 'Sara', 'Ladouy', 'sara@test.local', true, true)
     on conflict (id) do nothing`
  );
});
after(async () => {
  config.labDateOverride = savedLabDateOverride;
  await stopTestServer();
});

test('auth endpoints', async () => {
  assert.equal((await api(baseUrl, '/auth/me', { token: stag() })).status, 200);
  // Bad admin credentials must be rejected (route + validation reachable).
  assert.equal((await api(baseUrl, '/auth/admin', { method: 'POST', body: { email: 'nope@x.io', password: 'wrong' } })).status, 401);
  // Invalid Google token rejected (route reachable).
  assert.equal((await api(baseUrl, '/auth/google', { method: 'POST', body: { idToken: 'not-a-real-token' } })).status, 401);
});

test('users CRUD lifecycle', async () => {
  assert.equal((await api(baseUrl, '/users', { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, `/users/${USERS.stagiaire.id}`, { token: admin() })).status, 200);

  const created = await api(baseUrl, '/users', {
    method: 'POST', token: admin(),
    body: { role: 'formateur', prenom: 'Smoke', nom: 'Formateur', bio: 'Formateur PIE' }
  });
  assert.equal(created.status, 201);
  const id = created.body.user.id;

  assert.equal((await api(baseUrl, `/users/${id}`, { method: 'PATCH', token: admin(), body: { bio: 'Updated bio' } })).status, 200);
  assert.equal((await api(baseUrl, `/users/${id}/deactivate`, { method: 'PATCH', token: admin(), body: {} })).status, 200);
  assert.equal((await api(baseUrl, `/users/${id}/reactivate`, { method: 'PATCH', token: admin(), body: {} })).status, 200);
  assert.equal((await api(baseUrl, `/users/${id}`, { method: 'DELETE', token: admin() })).status, 204);
});

test('contact approval endpoint', async () => {
  const r = await api(baseUrl, '/users/contact-approval', {
    method: 'POST', token: admin(),
    body: { requesterId: USERS.stagiaire.id, approve: true }
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.user.allowedUsers.includes(USERS.stagiaire.id));
});

test('attendance check-in / check-out + reads', async () => {
  const checkIn = await api(baseUrl, '/attendance/check-in', {
    method: 'POST', token: stag(),
    body: { qr: { gate: 'GATE_IN', id: QR.GATE_IN }, objective: 'smoke' }
  });
  assert.equal(checkIn.status, 201);
  assert.equal((await api(baseUrl, '/attendance/open', { token: stag() })).status, 200);
  assert.equal((await api(baseUrl, '/attendance/mine', { token: stag() })).status, 200);
  assert.equal((await api(baseUrl, `/attendance/user/${USERS.stagiaire.id}`, { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, '/attendance', { token: admin() })).status, 200);
  const checkOut = await api(baseUrl, '/attendance/check-out', {
    method: 'POST', token: stag(),
    body: { qr: { gate: 'GATE_OUT', id: QR.GATE_OUT }, rating: 5, feedbackComment: 'smoke' }
  });
  assert.equal(checkOut.status, 200);
});

test('events CRUD', async () => {
  const created = await api(baseUrl, '/events', {
    method: 'POST', token: admin(),
    body: { title: 'Smoke Event', dateMode: 'single', date: '2026-09-01', spaces: ['FabLab'] }
  });
  assert.equal(created.status, 201);
  const id = created.body.event.id;
  assert.equal((await api(baseUrl, '/events', { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, `/events/${id}`, { method: 'PATCH', token: admin(), body: { title: 'Smoke Event 2' } })).status, 200);
  assert.equal((await api(baseUrl, `/events/${id}`, { method: 'DELETE', token: admin() })).status, 204);
});

test('gate config + permanent qr', async () => {
  assert.equal((await api(baseUrl, '/gate/config', { token: stag() })).status, 200);
  const put = await api(baseUrl, '/gate/config', {
    method: 'PUT', token: admin(),
    body: { config: { stagiaire: [{ id: 'project', label: 'Projet en cours', requiresProject: true }] } }
  });
  assert.equal(put.status, 200);
  assert.equal((await api(baseUrl, '/gate/permanent-qr/GATE_IN', { method: 'POST', token: admin(), body: {} })).status, 200);
});

test('projects lifecycle + invitation', async () => {
  const created = await api(baseUrl, '/projects', {
    method: 'POST', token: stag(),
    body: { title: 'Smoke Project', phase: 'MOC' }
  });
  assert.equal(created.status, 201);
  const projectId = created.body.project.id;

  assert.equal((await api(baseUrl, '/projects', { token: stag() })).status, 200);
  assert.equal((await api(baseUrl, '/projects/mine', { token: stag() })).status, 200);
  assert.equal((await api(baseUrl, `/projects/user/${USERS.stagiaire.id}`, { token: peer() })).status, 200);
  assert.equal((await api(baseUrl, '/projects/recycle-bin', { token: stag() })).status, 200);
  assert.equal((await api(baseUrl, '/projects/sync', { method: 'PUT', token: stag(), body: { projects: [created.body.project] } })).status, 200);
  assert.equal((await api(baseUrl, '/projects/recycle-bin', { method: 'PUT', token: stag(), body: { recycleBin: [] } })).status, 200);

  // Seed a pending invitation for peer, then peer accepts.
  await query(
    `insert into project_contributors (project_id, user_id, role, access_level, is_admin, status)
     values ($1, $2, 'Tuteur', 'MEMBER', false, 'PENDING')`,
    [projectId, USERS.peer.id]
  );
  const accept = await api(baseUrl, `/projects/${projectId}/invitation`, {
    method: 'POST', token: peer(), body: { action: 'accept' }
  });
  assert.equal(accept.status, 200);
});

test('notifications create / read / patch', async () => {
  const created = await api(baseUrl, '/notifications', {
    method: 'POST', token: stag(),
    body: { type: 'system', recipientId: USERS.peer.id, title: 'Smoke', message: 'hello' }
  });
  assert.equal(created.status, 201);
  const notifId = created.body.notifications[0].id;
  assert.equal((await api(baseUrl, '/notifications', { token: peer() })).status, 200);
  assert.equal((await api(baseUrl, `/notifications/${notifId}`, { method: 'PATCH', token: peer(), body: { status: 'read' } })).status, 200);

  // The team-invite notification the invited member actually receives.
  const invite = await api(baseUrl, '/notifications', {
    method: 'POST', token: stag(),
    body: { type: 'project_invite', recipientId: USERS.peer.id, title: 'Invitation projet', message: 'Rejoins mon projet', projectId: null }
  });
  assert.equal(invite.status, 201);
  const peerInbox = await api(baseUrl, '/notifications', { token: peer() });
  assert.ok(peerInbox.body.notifications.some((n) => n.type === 'project_invite'));
});

test('interactions full chain (offer -> approve -> complete -> rate) + reject', async () => {
  // Seed an open help request from the stagiaire.
  const reqRow = await query(
    `insert into interaction_requests (type, requester_id, description, status)
     values ('help', $1, 'smoke help', 'open') returning id`,
    [USERS.stagiaire.id]
  );
  const requestId = reqRow.rows[0].id;

  const offer = await api(baseUrl, `/interactions/requests/${requestId}/offer`, { method: 'POST', token: peer(), body: {} });
  assert.equal(offer.status, 201);
  const offerId = offer.body.offer.id;

  assert.equal((await api(baseUrl, `/interactions/offers/${offerId}/approve`, { method: 'POST', token: stag(), body: {} })).status, 200);
  assert.equal((await api(baseUrl, `/interactions/offers/${offerId}/complete-help`, { method: 'POST', token: peer(), body: {} })).status, 200);
  assert.equal((await api(baseUrl, `/interactions/offers/${offerId}/rate`, { method: 'POST', token: stag(), body: { rating: 5, comment: 'great' } })).status, 200);

  // Reject path on a fresh request/offer.
  const reqRow2 = await query(
    `insert into interaction_requests (type, requester_id, description, status)
     values ('help', $1, 'smoke help 2', 'open') returning id`,
    [USERS.stagiaire.id]
  );
  const offer2 = await api(baseUrl, `/interactions/requests/${reqRow2.rows[0].id}/offer`, { method: 'POST', token: peer(), body: {} });
  assert.equal(offer2.status, 201);
  assert.equal((await api(baseUrl, `/interactions/offers/${offer2.body.offer.id}/reject`, { method: 'POST', token: stag(), body: {} })).status, 200);
});

test('project team lifecycle: add co-founder/admin -> accept -> co-founder writes -> role change -> remove', async () => {
  const findProj = async (token, id) => {
    const r = await api(baseUrl, '/projects', { token });
    return (r.body.projects || []).find((p) => p.id === id);
  };

  // Owner (stagiaire) creates the project.
  const created = await api(baseUrl, '/projects', { method: 'POST', token: stag(), body: { title: 'Team Project', phase: 'MOC' } });
  const pid = created.body.project.id;
  const base = created.body.project;

  // Owner adds peer as a CO_FOUNDER + admin, still PENDING (awaiting acceptance).
  const withPeer = { ...base, contributors: [
    { userId: USERS.peer.id, role: 'Co-fondateur', accessLevel: 'CO_FOUNDER', isAdmin: true, status: 'PENDING', approvals: [USERS.stagiaire.id], memberAccepted: false }
  ]};
  assert.equal((await api(baseUrl, '/projects/sync', { method: 'PUT', token: stag(), body: { projects: [withPeer] } })).status, 200);

  // The role/admin flags persisted, and peer can see the project as a contributor.
  const asPeer = await findProj(peer(), pid);
  assert.ok(asPeer, 'peer sees the project');
  const meAsContrib = asPeer.contributors.find((c) => String(c.userId) === String(USERS.peer.id));
  assert.equal(meAsContrib.accessLevel, 'CO_FOUNDER');
  assert.equal(meAsContrib.isAdmin, true);
  assert.equal(meAsContrib.status, 'PENDING');

  // Peer accepts the invitation.
  const accept = await api(baseUrl, `/projects/${pid}/invitation`, { method: 'POST', token: peer(), body: { action: 'accept' } });
  assert.equal(accept.status, 200);
  assert.equal(accept.body.accepted, true);

  // A now-ACCEPTED co-founder can WRITE the project (canWriteProject).
  const peerProj = await findProj(peer(), pid);
  assert.equal((await api(baseUrl, '/projects/sync', { method: 'PUT', token: peer(), body: { projects: [{ ...peerProj, title: 'Renamed by co-founder' }] } })).status, 200);
  assert.equal((await findProj(stag(), pid)).title, 'Renamed by co-founder');

  // Owner submits a role change (pending) for peer, then removes peer entirely.
  const cur = await findProj(stag(), pid);
  const roleChanged = { ...cur, contributors: cur.contributors.map((c) => String(c.userId) === String(USERS.peer.id) ? { ...c, pendingRole: 'Collaborateur', status: 'PENDING', approvals: [USERS.stagiaire.id] } : c) };
  assert.equal((await api(baseUrl, '/projects/sync', { method: 'PUT', token: stag(), body: { projects: [roleChanged] } })).status, 200);
  assert.equal((await findProj(stag(), pid)).contributors.find((c) => String(c.userId) === String(USERS.peer.id)).pendingRole, 'Collaborateur');

  const removed = { ...cur, contributors: [] };
  assert.equal((await api(baseUrl, '/projects/sync', { method: 'PUT', token: stag(), body: { projects: [removed] } })).status, 200);
  assert.equal((await findProj(stag(), pid)).contributors.length, 0);
});

test('reviews create', async () => {
  const project = await api(baseUrl, '/projects', { method: 'POST', token: stag(), body: { title: 'Review Target', phase: 'MOC' } });
  const review = await api(baseUrl, '/reviews', {
    method: 'POST', token: admin(),
    body: {
      projectId: project.body.project.id,
      problemSolving: 4, technicalExecution: 4, functionality: 4, innovation: 4,
      feasibility: 4, safetyCompliance: 4, sdgAlignment: 4, intuitionUsability: 4,
      feedback: 'solid'
    }
  });
  assert.equal(review.status, 201);
});

test('behavior recognitions / reports lifecycle', async () => {
  const rec = await api(baseUrl, '/behavior/recognitions', {
    method: 'POST', token: admin(),
    body: { targetId: USERS.stagiaire.id, rating: 5, comment: 'well done' }
  });
  assert.equal(rec.status, 201);

  const report = await api(baseUrl, '/behavior/reports', {
    method: 'POST', token: stag(),
    body: { targetId: USERS.peer.id, category: 'disrespect', details: 'smoke report' }
  });
  assert.equal(report.status, 201);

  assert.equal((await api(baseUrl, '/behavior/reports', { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, `/behavior/users/${USERS.stagiaire.id}`, { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, `/behavior/reports/${report.body.report.id}`, { method: 'PATCH', token: admin(), body: { status: 'valide' } })).status, 200);
  assert.equal((await api(baseUrl, `/behavior/recognitions/${rec.body.recognition.id}/revoke`, { method: 'PATCH', token: admin() })).status, 200);
});

test('lab-closures create / read / delete', async () => {
  const created = await api(baseUrl, '/lab-closures', {
    method: 'POST', token: admin(),
    body: { label: 'Smoke Closure', date: '2026-09-10', timeFrom: null, timeTo: null }
  });
  assert.equal(created.status, 201);
  // Date round-trip is verified against the UTC production server elsewhere;
  // here we only assert the row exists (local test tz can shift a bare date).
  assert.ok(created.body.closure.id);
  assert.equal((await api(baseUrl, '/lab-closures', { token: admin() })).status, 200);
  assert.equal((await api(baseUrl, `/lab-closures/${created.body.closure.id}`, { method: 'DELETE', token: admin() })).status, 204);
});
