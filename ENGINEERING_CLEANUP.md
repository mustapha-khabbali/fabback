# FabLab Engineering Plan — v3 (lean)

**Date:** 2026-07-10 · **Replaces:** v2 (its history lives in git — `73a6cc8` and before)
**Principle:** done work is summarized in one line; every token of this document points forward.

---

## Where the system stands (done — no further action)

* ✅ Phase 0 complete: stale copy deleted, burned credentials stripped, secrets gitignored, Firestore deny-all deployed.
* ✅ **32 automated tests green** (`cd fablab-api && npm test`): attendance rules, auth boundary, comportement math. Required before every deploy (`deploy/scripts/preflight.sh`).
* ✅ Observability: request ids in logs, production errors logged, WS connect/close logs. Indexes shipped.
* ✅ Timezone: all attendance display/filtering pinned to Africa/Casablanca, device-independent.
* ✅ Product shipped on top: Comportement system (Bayesian score from reconnaissances/signalements, admin-only review, **no manual write path — not even admin**), opening-hours gate (08:30–18:30), notification catch-up on tab wake, back-button navigation fix.
* ✅ School VM acquired and health-checked: `vm-fablab@10.34.107.30`, Ubuntu 24.04, 39 GB free, 7.7 GB RAM, SSH key installed. Docker **not yet installed**.
* ✅ `RUNBOOK.md` + `deploy/` bundle exist (nginx templates carry the WebSocket upgrade blocks).

## Owner decisions (logged, closed — do not reopen)

| Decision | Owner |
|---|---|
| VM password stays as provided by IT; SSH password auth stays enabled. Mitigation: SSH is never carried by the tunnel — LAN-only door. | Mustapha, 07-10 |
| Data stays in **one place** — the VM. No off-machine copies. Catastrophic-loss cover = the school's own VM backup (must be confirmed, see §2). | Mustapha, 07-10 |
| App usable from anywhere by everyone (admin is non-technical, zero client setup). | Mustapha, 07-10 |
| **Check-in/out fully public** — the IP gate was built (+tests) but turned OFF: the school Wi-Fi exits via multiple/changeable IPs, and an allowlist breaks silently whenever IT adds an access point — unacceptable for an unattended system. `GATE_ALLOWED_IPS` stays in the code (one env var re-enables it). If QR-photo fraud ever becomes real, the proper fix is **rotating QR codes** (screen at the door, ~60s refresh) — network-independent. | Mustapha, 07-10 |
| Domain: `fablab-api.ofppt.me` (student-pack Namecheap; existing ofppt.me site must survive untouched). | Mustapha, 07-10 |

---

## Final architecture (the reference)

```
Firebase-hosted apps (permanent URLs: fablab-bmk.web.app / fablab-cmc.web.app)
        ↓  HTTPS from anywhere
https://fablab-api.ofppt.me
        ↓  Cloudflare free: TLS, hides school IP, absorbs floods
        ↓  outbound-only NAMED tunnel — no inbound ports, nothing asked of IT
School VM vm-fablab @ 10.34.107.30  (Docker, restart: unless-stopped)
  nginx → fablab-api → PostgreSQL   + cloudflared + backup cron (14-day, local)
        ↑
  Gate check-in/out: accepted only via the school-LAN path — scan from home = 403
```

Public face: every route 401s without a bearer token (test-proven), roles server-side, rate-limited auth, CORS locked to the two hosting origins, Postgres sealed in Docker. Tunnel routing lives **in the Cloudflare dashboard, not on the VM** — a future domain change needs dashboard clicks + one frontend rebuild, zero VM access.

---

# WHAT REMAINS

## 1 · Deployment day (the big one — ~2h, at school)

**Blocked on two owner actions:** a free Cloudflare account · being on school Wi-Fi.

Sequence (I drive, owner watches):
1. Docker on the VM.
2. Project copied **from the Mac** (rsync — commits are ahead of origin), secrets copied out-of-band.
3. Production `.env`: fresh `JWT_SECRET`, Postgres password, **new `ADMIN_SEED_*`** (rotates the admin credential at last).
4. Stack up: Postgres + API + nginx; migrations + seed.
5. `ofppt.me` onboarded to Cloudflare — **verify the existing site's DNS records imported intact before flipping nameservers at Namecheap**. Named tunnel bound to `fablab-api.ofppt.me`, cloudflared as a service.
6. **New code: LAN-gate on check-in/out** (requests via the tunnel are refused, LAN path accepted) — **with tests**, like every business rule.
7. Both apps rebuilt with `VITE_API_URL=https://fablab-api.ofppt.me/api`, preflight gate, Firebase deploy.
8. Mac tunnel retired. Backup cron armed on the VM.

**Done when — every box, no exceptions:**
- [ ] VM reboots; everything returns unattended.
- [ ] `/api/health` answers from a phone on **4G**; login + dashboard work from outside with zero setup.
- [ ] QR check-in **succeeds on school Wi-Fi and is refused from 4G** — both proven.
- [ ] WebSocket survives 10+ min through the tunnel; live dashboard updates confirmed.
- [ ] Existing ofppt.me website unharmed.
- [ ] Mac tunnel off; `DEPLOY_CHEATSHEET.md` + `RUNBOOK.md` rewritten to match reality (incl. the "Changer le domaine" procedure).

## 2 · The one question left for school IT

> « Est-ce que la VM 10.34.107.30 est incluse dans vos sauvegardes ? Fréquence, rétention ? »

Given the one-place data decision, the school's VM backup is the **only** cover against disk death. Yes → rehearse one restore, time it, write it down. No → documented accepted risk, owner-signed. Either way the answer goes in the RUNBOOK. *(Courtesy in the same chat: one sentence about the outbound tunnel for admin remote access.)*

## 3 · Bus factor (unchanged, still the quiet killer)

A **non-author** performs one deploy and one restart using only `RUNBOOK.md` — then fills the still-blank school-IT contact line. Twenty minutes with a classmate. Until then, this system has exactly one operator.

## 4 · Known issues (decided later, on purpose)

* **Post-18:30 checkout discards the rating** (auto-close by design; documented). Revisit only if the lab ever runs evening sessions — `LAB_CLOSE_TIME`/`LAB_OPEN_TIME` are one-line env changes.
* **"Hors du Wi-Fi FabLab" message**: after deployment, home scans get a raw 403 — a friendly French toast would be kinder. Cosmetic, post-deploy.

---

## Phase 2 backlog (opportunistic — never before §1–3)

Service-layer refactor of fat routes · granular replacement of `/projects/sync` · split/memoize the AppContext god-object · break up the 1,100+ line components · dedupe components shared by the two apps · images out of the DB into files · WS-reconnect + notification-routing tests · CI/CD.

## Rules (permanent)

No UI/UX redesign · no touching parked/commented code or disabled features · no Prisma · keep the 3-part architecture · behavior-preserving refactors only · **nothing deleted without explicit owner approval** · every accepted risk carries its owner's name.

---

**Position:** the codebase is tested, observable, and honest about its trade-offs. Everything left is one afternoon at the school plus two conversations — one with Cloudflare's signup form, one with the IT guy. After that, the Mac is just a laptop again and the FabLab runs on its own ground.
