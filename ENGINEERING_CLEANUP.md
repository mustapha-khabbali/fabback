# FabLab Engineering Cleanup — The Plan I Stand Behind

**Version:** 2.0 — 2026-07-09
**Replaces:** v1.0 (12-priority merge of Codex plan + Claude audit)
**Why v2:** 12-priority plans have a known failure mode — items 6–12 never happen. This version is weighted by what actually kills or saves the project, not by what is nice engineering. Everything here was verified against this repo on 2026-07-09.

---

## Execution Log — 2026-07-09

* ✅ **0.2** Burned credential stripped from `dashboard.html` (legacy login disabled; grep-verified clean).
* ✅ **0.3** Secrets audit: key never committed; `.gitignore` hardened; verified with `git check-ignore`.
* ✅ **0.4** Firestore rules set to deny-all and **deployed live** to `fablab-bmk` (frontends verified auth-only).
* ✅ **1.3** 18 tests green (`fablab-api && npm test`): attendance rules + auth boundary. Added server-side 409 guard against double check-in (frontend already blocked it in UI). `LAB_CLOSE_TIME` env introduced (default `18:30`, production behavior unchanged) so tests control the clock.
* ✅ **1.4** Index migration shipped — 2 indexes, not 7: partial open-attendance index + notifications composite. The rest of the plan's list already existed or was covered by primary keys.
* ✅ **1.5** Request logs with ids, production error logging (was: prod errors silently swallowed), WS connect/reject/close logs.
* ✅ **1.6** `RUNBOOK.md` written — school-IT contact line intentionally blank; filling it is part of the exit criteria.
* ✅ **0.1** Stale copy `/Users/mac/fablab` deleted (423 MB, user-approved).
* 🟡 **1.1 / 1.2** Server-side execution blocked on school access, but **fully prepared**: `DEPLOYMENT_DAY.md` checklist, nginx templates fixed (WebSocket upgrade blocks were missing from all 4 — realtime would have died in production), TLS bootstrap procedure, `deploy/scripts/preflight.sh` gate (check + tests + builds, verified passing), `.env.example` with secret-generation commands, backup cron + restore rehearsal steps. Remaining: a server, a DNS record, ports 80/443.
* ✅ Committed admin password removed from `DEPLOY_CHEATSHEET.md`; the credential itself rotates automatically when the server is seeded with new `ADMIN_SEED_*` values (DEPLOYMENT_DAY step 2).

**Known issue discovered by the tests:** after `LAB_CLOSE_TIME` (18:30), an open attendance is instantly "expired" — a Gate-OUT scan at 18:45 auto-closes the session, **discards the rating**, and reports "no open attendance". If the lab is ever open past 18:30, this is a data-loss path; decide whether the cutoff should be later or checkout-after-cutoff should keep the rating.

---

## The One-Paragraph Truth

The code is already good enough to be useful. It is not yet **dependable** enough to be trusted, and trust is the only currency an attendance system runs on. Adoption dies from one bad week: the tunnel drops on a busy morning, check-ins fail, staff goes back to the paper sheet, and the app becomes a soutenance slide. Therefore this plan optimizes for exactly one thing: **the system keeps working when nobody heroic is watching.** Elegant code is Phase 2.

---

## Strict Rules (unchanged, non-negotiable)

* Do **not** redesign the user app or the admin dashboard. UI/UX is out of scope.
* Do **not** touch parked/commented code unless explicitly requested.
* Do **not** remove disabled future features.
* Do **not** introduce Prisma now.
* Keep the three-part architecture: `fablab-api`, `fabweb0-master`, `admin-main`.
* Every refactor preserves behavior: same screens, same flows, same class names.
* Nothing on the Do-Not-Touch list is deleted without explicit approval.

---

## Architecture (verified, for reference)

```
User app:  fabweb0-master  -> React 19 / Vite -> Firebase Hosting (fablab-bmk)
Admin app: admin-main      -> React 19 / Vite             -> Firebase Hosting (fablab-cmc)
Backend:   fablab-api      -> Node/Express, Firebase ID token -> API JWT
Database:  PostgreSQL (node-pg-migrate, seeds)
Realtime:  WebSocket (src/realtime/socket.js + bus.js)
API layer: services/api.js in both frontends
```

Target: same stack, but the API lives on the school server behind a **stable HTTPS domain**, and the demo tunnel is retired.

---

# PHASE 0 — Today. Before anything else. (~1 hour total)

These are not engineering tasks; they are stopping-the-bleeding tasks.

### 0.1 One working copy
Two full copies of the project exist: `/Users/mac/Desktop/fablab` (real, git) and `/Users/mac/fablab` (stale, no git). The stale one has already caused a wrong analysis. Archive or delete it (approval required to delete). **Done when:** exactly one copy exists and it is the git repo.

### 0.2 Rotate the burned credential
`fabweb0-master/dashboard.html` contains hardcoded admin credentials (`SARA-LADOUY` / `saracmc2025`) in client-visible source. If that file was ever deployed, the password is public. Rotate anything that reuses it; strip the credential from the file even if the file itself stays. **Done when:** no live credential exists in any client-served file.

### 0.3 Secrets audit — ✅ DONE 2026-07-09
Verified: `fablab-api/secrets/service-account.json` (real Firebase service-account key) was **never committed** (checked `git log --diff-filter=A` and `git ls-files`), but it also had **no .gitignore protection** — one `git add .` away from a leak. Fixed: root `.gitignore` now ignores `**/secrets/`, `**/service-account*.json`, and real `.env` files (while keeping `.env*.example` templates trackable), verified with `git check-ignore`. **Remaining rule:** if a key ever does land in history, rotate it — deleting the file does not un-leak it.

### 0.4 Lock the dead Firestore
The data plane is PostgreSQL now. Set `firestore.rules` to deny-all (or scope to whatever is genuinely still used). The old open rules are an unlocked door to a room you forgot exists. **Done when:** rules match actual usage.

---

# PHASE 1 — Make It Dependable (~2 focused weeks)

This phase eliminates roughly 80% of the real risk. **Nothing in Phase 2 starts until Phase 1 is done.** That sequencing is the whole point of this document.

### 1.1 Kill the tunnel: stable school-server deployment

The cloudflared tunnel on the Mac was always a test/demo rig — the real deployment target is the school server. That's the right plan. The risk being flagged here is not the plan; it's the gap between plan and reality: **until this item is executed, the demo rig is the only deployment that exists.** Closing that gap is worth more than everything else in this document combined.

* Deploy `fablab-api` on the school server (docker-compose files already exist — reuse them).
* Process supervision: Docker restart policy, `pm2`, or `systemd`. Survives reboot without a human.
* Nginx/Caddy reverse proxy in front, **with WebSocket upgrade configured** (`Upgrade`/`Connection` headers, long idle timeouts — default Nginx silently kills WS at 60s).
* **HTTPS is mandatory, not optional:** the frontends are served over HTTPS by Firebase; browsers block HTTPS→HTTP calls (mixed content). No TLS on the school server = integration fails on day one.
* CORS scoped to exactly the two hosting origins. Not `*`.
* Permanent URL baked into both apps' `.env.production` once, forever:

```
https://api.<school-domain>.ma/api
```

**Done when:** the server reboots and the API comes back alone; `/api/health` answers publicly over HTTPS; a WebSocket stays alive through the proxy for 10+ minutes idle; neither app has been rebuilt for a URL change in a week.

### 1.2 Prove the backup restores

The school server has daily backups by default. A backup that has never been restored is a hope, not a backup.

* Confirm: frequency, retention, and that **PostgreSQL data is actually included** (a filesystem snapshot of a running Postgres can be inconsistent — confirm `pg_dump` or snapshot+WAL).
* Run **one real restore test** onto a non-production machine. Time it. Write down the steps.
* **The daily-backup gap:** the most valuable data is *today's* attendance — exactly what a daily backup hasn't captured. A disk failure at 16:00 erases the day. Pick one, in writing:
  * intraday `pg_dump` every 2–4 hours (cron, keep 48h), **or**
  * WAL archiving for point-in-time recovery, **or**
  * a signed-off, documented acceptance of the up-to-24h loss window.

**Done when:** a restore has actually happened once, the steps are written where someone else can find them, and the intraday decision is explicit.

### 1.3 Tests on the money paths — attendance and auth only

`fablab-api` has zero tests. Do not write tests for everything; write them for the logic that is the product and the logic that is the security boundary. Nothing else yet.

Attendance rules:
* Valid Gate-IN creates attendance.
* Gate-IN while already inside → rejected correctly.
* Gate-OUT while not inside → not-inside state.
* Forgotten check-in auto-closes after 18:30.
* Yesterday's open attendance does not block today.
* PV/history includes auto-closed rows.

Trust boundary:
* Expired/invalid JWT rejected on every protected route.
* A `stagiaire` token cannot reach any `requireRole('administrateur')` endpoint — test the middleware itself.
* Server assigns attendance timestamps; client-supplied timestamps are ignored. Points/ratings math is server-side only.
* Deactivated user cannot use the API.

**Done when:** `cd fablab-api && npm test` runs green and is a required step before every deploy. (Notification routing and WS-reconnect tests are Phase 2 — valuable, not existential.)

### 1.4 Indexes — one migration, ship it

Cheap, high-value, zero risk. As a `node-pg-migrate` migration like everything else:

```
attendance(user_id, timestamp_in)      notifications(recipient_id, created_at)
attendance(timestamp_out)              projects(owner_id)
project_contributors(project_id, user_id)
interaction_requests(requester_id, created_at)
interaction_offers(responder_id, created_at)
```

**Done when:** the migration is merged and the admin dashboard stays fast with months of data.

### 1.5 Minimum observability

Just enough to answer "where is it broken: frontend, API, DB, or realtime?" in under five minutes:

* Request log: method, path, status, duration.
* Error log with request id.
* Health endpoint that checks API + DB (+ WS if cheap).
* Log WebSocket connection failures.

Sentry/dashboards are Phase 2. **Done when:** the next incident is diagnosed from logs, not from guessing.

### 1.6 The bus-factor document (the one nobody writes)

The bus factor is currently 1. If the author finishes the stage and leaves, nobody can restart this system in November. Write **RUNBOOK.md** — one page, testable by handing it to a stranger:

* How to start/stop/restart the API on the school server.
* How to deploy each frontend (keep `DEPLOY_CHEATSHEET.md` current; link it).
* How to restore the database (from 1.2).
* Where every credential lives (not the credentials themselves — where).
* Who to call, in what order.

**Done when:** someone who is not the author performs a deploy and a restart using only the document. This item is not optional. Infrastructure that only one person can operate is a demo with extra steps.

---

## Phase 1 Exit Criteria — the actual definition of "dependable"

Check every box before touching Phase 2:

- [ ] API on a stable HTTPS domain; tunnel retired; survives reboot unattended.
- [ ] One real restore performed, timed, documented; intraday-loss policy written.
- [ ] `npm test` green on attendance + auth boundary; required before deploy.
- [ ] Indexes migration shipped.
- [ ] Logs answer "where is it broken" in minutes.
- [ ] A non-author has deployed and restarted the system using RUNBOOK.md alone.

---

# PHASE 2 — Make It Maintainable (opportunistic, after Phase 1)

Good hygiene for future maintainers. Do these when touching the relevant area anyway, or in quiet weeks — **not** as a campaign that delays Phase 1.

### 2.1 Backend service refactor — behind the tests
Route files (`attendance.js`, `projects.js`, `users.js`, `notifications.js`, `interactions.js`) do too much. Split: routes = HTTP only, services = business logic, repositories = SQL. Same behavior. **Only after 1.3 exists** — refactoring untested business logic is how regressions ship silently. **Done when:** business rules are testable without HTTP mocking.

### 2.2 Retire the risky full-sync
`/projects/sync` is too broad — a full sync can wipe related data. Introduce granular endpoints and migrate the frontends off sync gradually:

```
POST/PATCH/DELETE /projects/:id
POST/PATCH/DELETE /projects/:id/journals/:journalId
POST/PATCH/DELETE /projects/:id/contributors/:userId
```

**Done when:** one user action changes one database area; project edits cannot wipe journals/contributors.

### 2.3 Frontend internal cleanup — no visible change
Verified sizes: `ProjectDetail.jsx` 1,468 · `UsersView.jsx` 1,170 · `MemberProfileTab.jsx` 1,125 · `AdminOverviewView.jsx` 1,114 · `MyProfileTab.jsx` 1,107 · `AppContext.jsx` 594.

* **Cheapest perf win in the app:** the AppContext `value` (~50 fields) is rebuilt unmemoized every render → any state change re-renders every consumer. Memoize and group by change-frequency when splitting.
* Extract hooks (`useAttendance`, `useProjects`, `useNotifications`, `useRealtimeSync`, `useProfileNavigation`); split giants into smaller components. Same class names, same layout.
* **Cross-app duplication** (`RichTextEditor`, project modals/forms, `trainingData.js` copy-pasted between apps): full dedup is a later project. Stop the bleeding now — new shared logic goes in one place; a bug fixed in one copy is fixed in both, enforced by PR checklist.
* Strip leftover `console.log`s from production builds.

**Done when:** same screens, same behavior, smaller files, no full-tree re-render on unrelated state.

### 2.4 Remaining tests
Notification recipient filtering, help/review request routing, WS disconnect/reconnect sync.

### 2.5 Image/file storage
Move images out of large payloads → Firebase Storage / S3 / school file storage; DB keeps only URLs. **Done when:** the DB doesn't grow because of images.

### 2.6 CI/CD
Pre-deploy checks (API tests, both lint/builds), then GitHub Actions. **Done when:** a forgotten lint/build can no longer break a deploy.

---

## Explicitly NOT Doing (so nobody "helpfully" does it)

* No UI redesign, no design-system unification between the apps.
* No Prisma / ORM migration.
* No TypeScript conversion campaign.
* No monorepo restructure.
* No microservices, no Kubernetes, no message queue. It is one lab, one server, one Postgres. Boring is correct at this scale.

## Do Not Touch List

* Commented/parked code · disabled feature flags · hidden points/level/expertise code · old UI comments · existing visual style · existing flows.

**Removal candidates requiring explicit approval first** (dead weight, but rules are rules): `fabweb0-master/fabweb-react/` (abandoned nested duplicate), `fabweb0-master/dashboard.html` (legacy pre-React admin — the credential inside must go regardless, see 0.2), stale copy `/Users/mac/fablab`, stray root files (`New Text Document.txt`, `.DS_Store`, `*_gap.txt`).

---

## Final Position — signed, no hedging

As an MVP this project is an 8/10: real auth, real API, real database, realtime sync — well above the bar for its context. As infrastructure it is a 4/10 today, and **the gap is not made of code — it is made of a school-server deployment that is planned but not yet executed, a backup nobody has restored, business rules nobody has tested, and a system exactly one person knows how to operate.**

Phase 0 takes an hour. Phase 1 takes about two focused weeks and closes ~80% of the real risk. Phase 2 is genuinely optional in a way Phase 1 is not — a system that completes only Phase 1 is a dependable system with messy internals; a system that completes only Phase 2 is a beautifully organized demo still running on the test rig.

The work left isn't clever. It's discipline. Do Phase 0 today, hold the line on Phase 1 before Phase 2, and this outlives the internship.
