// Comportement score: Bayesian math, penalties with decay, access rules.
// Mirrors the worked-examples table in the agreed design.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer,
  stopTestServer,
  resetDb,
  api,
  tokenFor,
  USERS
} from './helpers.js';
import { query } from '../src/db/pool.js';

let baseUrl;
const stagiaire = () => tokenFor(USERS.stagiaire);
const peer = () => tokenFor(USERS.peer);
const admin = () => tokenFor(USERS.admin);

const round2 = (value) => (value === null ? null : Math.round(value * 100) / 100);

function recognitionBody(extra = {}) {
  return { targetId: USERS.peer.id, rating: 5, comment: 'Toujours prêt à aider', ...extra };
}

function reportBody(extra = {}) {
  return { targetId: USERS.peer.id, category: 'disrespect', details: 'Comportement déplacé pendant la séance', ...extra };
}

async function scoreOf(userId) {
  const res = await api(baseUrl, `/behavior/users/${userId}`, { token: admin() });
  return round2(res.body.score);
}

before(async () => {
  baseUrl = await startTestServer();
});

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await stopTestServer();
});

test('recognition on yourself is rejected', async () => {
  const res = await api(baseUrl, '/behavior/recognitions', {
    method: 'POST',
    token: peer(),
    body: recognitionBody()
  });
  assert.equal(res.status, 400);
});

test('single 5-star recognition gives the Bayesian 3.75, not a perfect 5', async () => {
  const res = await api(baseUrl, '/behavior/recognitions', {
    method: 'POST',
    token: stagiaire(),
    body: recognitionBody()
  });
  assert.equal(res.status, 201);
  assert.equal(round2(res.body.score), 3.75); // (5*3.5 + 5) / 6
  assert.equal(await scoreOf(USERS.peer.id), 3.75);
});

test('weekly cap: a second recognition from the same sender does not count', async () => {
  await api(baseUrl, '/behavior/recognitions', { method: 'POST', token: stagiaire(), body: recognitionBody() });
  const second = await api(baseUrl, '/behavior/recognitions', {
    method: 'POST',
    token: stagiaire(),
    body: recognitionBody({ rating: 1, comment: 'Tentative de spam' })
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.recognition.counted, false);
  assert.equal(await scoreOf(USERS.peer.id), 3.75, 'score must be unaffected by the uncounted extra');
});

test('a submitted report changes nothing until the admin validates it', async () => {
  const res = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stagiaire(), body: reportBody() });
  assert.equal(res.status, 201);
  assert.equal(await scoreOf(USERS.peer.id), null, 'no validated events yet — still unrated');
});

test('validating a report applies its penalty from the neutral prior', async () => {
  const created = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stagiaire(), body: reportBody() });
  const review = await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH',
    token: admin(),
    body: { status: 'valide' }
  });
  assert.equal(review.status, 200);
  assert.equal(round2(review.body.score), 3.0); // 3.5 prior − 0.5 disrespect
});

test('rejecting the only report returns the user to unrated', async () => {
  const created = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stagiaire(), body: reportBody() });
  await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH', token: admin(), body: { status: 'valide' }
  });
  const rejected = await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH', token: admin(), body: { status: 'rejete' }
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.score, null);
});

test('penalties decay: a 180-day-old validated report weighs half', async () => {
  const created = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stagiaire(), body: reportBody() });
  await query("update reports set created_at = now() - interval '180 days' where id = $1", [created.body.report.id]);
  const review = await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH', token: admin(), body: { status: 'valide' }
  });
  assert.equal(round2(review.body.score), 3.25); // 3.5 − 0.5 × 0.5^(180/180)
});

test('vol d’idée costs double: 3.75 with one 5★ drops to 2.75', async () => {
  await api(baseUrl, '/behavior/recognitions', { method: 'POST', token: stagiaire(), body: recognitionBody() });
  const created = await api(baseUrl, '/behavior/reports', {
    method: 'POST', token: stagiaire(), body: reportBody({ category: 'copy', details: 'A copié le projet' })
  });
  const review = await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH', token: admin(), body: { status: 'valide' }
  });
  assert.equal(round2(review.body.score), 2.75); // 3.75 − 1.0
});

test('admin can revoke a recognition and the score recomputes', async () => {
  const rec = await api(baseUrl, '/behavior/recognitions', { method: 'POST', token: stagiaire(), body: recognitionBody() });
  const revoked = await api(baseUrl, `/behavior/recognitions/${rec.body.recognition.id}/revoke`, {
    method: 'PATCH', token: admin()
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.score, null, 'only event revoked — back to unrated');
});

test('stagiaire cannot read the reports inbox, per-user behavior, or review reports', async () => {
  const inbox = await api(baseUrl, '/behavior/reports', { token: stagiaire() });
  assert.equal(inbox.status, 403);

  const perUser = await api(baseUrl, `/behavior/users/${USERS.peer.id}`, { token: stagiaire() });
  assert.equal(perUser.status, 403);

  const created = await api(baseUrl, '/behavior/reports', { method: 'POST', token: stagiaire(), body: reportBody() });
  const review = await api(baseUrl, `/behavior/reports/${created.body.report.id}`, {
    method: 'PATCH', token: peer(), body: { status: 'valide' }
  });
  assert.equal(review.status, 403, 'the reported user must not be able to review reports');
});

test('comportement rating cannot be set through the user PATCH — not even by admin', async () => {
  const res = await api(baseUrl, `/users/${USERS.peer.id}`, {
    method: 'PATCH',
    token: admin(),
    body: { bio: 'mise à jour normale', comportementRating: 5 }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.comportementRating, null, 'manual rating must be ignored');
});

test('the retired manual behavior-rating endpoint is gone', async () => {
  const res = await api(baseUrl, `/users/${USERS.peer.id}/behavior-rating`, {
    method: 'PATCH',
    token: admin(),
    body: { rating: 5 }
  });
  assert.equal(res.status, 404);
});
