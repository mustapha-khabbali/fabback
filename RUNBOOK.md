# FabLab — Operations Runbook

**Audience:** anyone who has to operate this system without its author.
**Test:** if you can't perform a restart and a deploy using only this page, the page is broken — fix the page.
**Last verified:** 2026-07-09

---

## 1. What is running where

| Part | What | Where |
|---|---|---|
| User app | React build | Firebase Hosting → https://fablab-bmk.web.app |
| Admin app | React build | Firebase Hosting → https://fablab-cmc.web.app |
| API | Node/Express (`fablab-api`) | **Demo rig:** this Mac, port 4000, exposed via Cloudflare tunnel. **Target:** school server behind HTTPS (not yet deployed) |
| Database | PostgreSQL 16 | Docker container `fablab-postgres-1`, db `fablab_dev` |
| Realtime | WebSocket `/api/events/ws` | Same process as the API |

Repo: `/Users/mac/Desktop/fablab` (git, branch `main`).
⚠️ `/Users/mac/fablab` is a stale copy — never edit it.

## 2. Is it healthy? (run these first)

```bash
curl -s http://localhost:4000/api/health        # {"ok":true}  → API process up
curl -s http://localhost:4000/health            # {"ok":true,"db":...} → API + DB up
docker ps | grep fablab-postgres                # postgres container running?
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1  # tunnel URL
tail -20 /tmp/fablab-api.log                    # recent request/error log lines
```

Log format: `[req a1b2c3d4] POST /api/attendance/check-in 201 12.3ms`. Errors carry the same `[req ...]` id. WebSocket lines start with `[ws]`.

## 3. Start / restart the backend (demo rig)

```bash
# 1. Database
cd /Users/mac/Desktop/fablab
docker compose -f docker-compose.dev.yml up -d postgres

# 2. Migrations (safe to re-run; applies anything new)
cd fablab-api && npm run migrate && cd ..

# 3. API
pkill -f "npm start"; sleep 1
cd fablab-api && nohup npm start > /tmp/fablab-api.log 2>&1 & cd ..
curl -s http://localhost:4000/api/health   # {"ok":true}

# 4. Tunnel (demo only — the school server will replace this)
pkill -f "cloudflared tunnel"; rm -f /tmp/cloudflared.log
nohup /Users/mac/.local/bin/cloudflared tunnel --protocol http2 --url http://localhost:4000 \
  > /tmp/cloudflared.log 2>&1 &
sleep 6
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1
```

**⚠️ If the tunnel URL changed, both frontends are now pointing at a dead URL** — follow the deploy steps in [DEPLOY_CHEATSHEET.md](DEPLOY_CHEATSHEET.md) for BOTH apps.

## 4. Deploy the frontends

Full steps in [DEPLOY_CHEATSHEET.md](DEPLOY_CHEATSHEET.md). Summary: write `VITE_API_URL` into the app's `.env.production`, `npm run build`, `firebase deploy --project fablab-bmk --only hosting:user` (or `hosting:admin`). Then **hard-refresh** (⌘⇧R) — `index.html` is cached ~1h.

## 5. Tests — run before every deploy

```bash
cd /Users/mac/Desktop/fablab/fablab-api
npm run test:db   # once per machine: starts throwaway postgres on port 5433
npm test          # migrations + 18 tests (attendance rules + auth boundary)
```

All green or you don't deploy. The test DB (`fablab-test-db`, port 5433) is disposable and never touches real data.

## 6. Database backup & restore

```bash
# Backup (do this before risky changes; cron it daily until school backups take over)
docker exec fablab-postgres-1 pg_dump -U fablab fablab_dev > backups/fablab_$(date +%Y%m%d_%H%M).sql

# Restore (DESTRUCTIVE — restores over the current db)
docker exec -i fablab-postgres-1 psql -U fablab -d fablab_dev < backups/<file>.sql
```

A restore has to be **rehearsed once on a non-production copy** — if nobody has done that yet, that's an open Phase 1.2 item, not a formality.

## 7. Where credentials live (never in git)

| Credential | Location |
|---|---|
| API secrets (`JWT_SECRET`, `DATABASE_URL`, admin seed) | `fablab-api/.env` — exists only on the machine running the API |
| Firebase service account | `fablab-api/secrets/service-account.json` — gitignored |
| Firebase deploy access | `firebase login` session of the deploying user |
| Admin app login | Seeded in the database (`ADMIN_SEED_*` in `.env`); rotate by reseeding |

If any of these ever appears in a committed file: rotate it immediately — deleting the file does not un-leak it.

## 8. Common failures

| Symptom | Cause | Fix |
|---|---|---|
| "Identifiants incorrects" / no data on live sites | Tunnel URL changed (Mac slept) | §3 step 4, then redeploy BOTH apps |
| Old page after deploy | 1h `index.html` cache | Hard-refresh ⌘⇧R / incognito |
| API up but DB errors in log | Postgres container stopped | §3 steps 1–3 |
| Stale notifications on phones | WS dropped; check `[ws]` lines in the API log | Usually self-heals on reconnect; restart API if not |
| Check-in refused with 409 | User already has an open attendance today | Expected behavior (double check-in guard) |
| Attendance auto-closed without rating | Check-out attempted after 18:30 lab time | By design (`LAB_CLOSE_TIME`, default 18:30) — see known-issues note in ENGINEERING_CLEANUP.md |

## 9. Escalation

1. **Author / primary operator:** Mustapha Khabali — mustaphakhabali1@gmail.com
2. **School server issues (once migrated):** _fill in the school IT contact before handover — this blank line is a Phase 1.6 exit-criteria failure until filled._
3. Firebase console: https://console.firebase.google.com/project/fablab-bmk/overview
