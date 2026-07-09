# School Server — Deployment Day Checklist

**Goal:** `fablab-api` + PostgreSQL running on the school server behind HTTPS, frontends repointed, tunnel retired. This closes ENGINEERING_CLEANUP.md Phase 1.1 and unlocks 1.2.
**Est. time:** 1–2 hours if the prerequisites are ready; days if they're not — check them FIRST.

---

## 0. Prerequisites — verify BEFORE touching anything (ask school IT)

- [ ] A Linux server/VM you can SSH into, with **Docker + docker compose plugin** installed (or permission to install).
- [ ] A **DNS name** pointing at the server's public IP, e.g. `api.cmc-bm.ma` (an A record). Write it down — it's `API_DOMAIN` everywhere below.
- [ ] **Ports 80 and 443 open** from the internet to this server (school firewall!). Required for Let's Encrypt and for students' phones outside the school Wi-Fi.
- [ ] ~2 GB free disk, outbound internet access (Docker pulls, certbot).

**If any box is unchecked, stop — fix that first.** Nothing below works without them.

## 1. Get the code and secrets onto the server

```bash
ssh <user>@<server>
sudo mkdir -p /opt/fablab && sudo chown $USER /opt/fablab
git clone <repo-url> /opt/fablab && cd /opt/fablab
```

Copy the Firebase service account **out of band** (it is gitignored, never in the repo):

```bash
# from the Mac:
scp fablab-api/secrets/service-account.json <user>@<server>:/opt/fablab/fablab-api/secrets/
```

## 2. Configure `.env` (on the server)

```bash
cp .env.example .env && nano .env
```

Set — no placeholders may survive:

| Variable | Value |
|---|---|
| `API_DOMAIN` | the DNS name from step 0 |
| `LETSENCRYPT_EMAIL` | a real mailbox (cert expiry warnings go there) |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | **new** admin credentials — this rotates the old burned ones |

Leave `CORS_ORIGINS` at its default (the two Firebase hosting domains are already correct).

## 3. Start database + API (no nginx yet)

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d postgres fablab-api
docker compose exec fablab-api npx node-pg-migrate up     # apply all migrations
docker compose exec fablab-api npm run seed               # seed admin account
docker compose exec fablab-api wget -qO- http://localhost:4000/health   # {"ok":true,"db":...}
```

## 4. Bootstrap the TLS certificate (one-time)

nginx can't start on 443 without a cert, and certbot normally needs nginx — break the loop with standalone mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml run --rm -p 80:80 \
  certbot certonly --standalone -d "$API_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
```

Then start the proxy (renewals are automatic from here on):

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d nginx certbot
```

## 5. Verify from OUTSIDE the school network (phone on 4G)

```bash
curl -s https://$API_DOMAIN/api/health     # {"ok":true}
curl -s https://$API_DOMAIN/health         # {"ok":true,"db":"..."}

# WebSocket handshake through nginx must answer 101 Switching Protocols:
curl -si -N "https://$API_DOMAIN/api/events/ws" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" | head -1
```

If the WS check does not print `HTTP/1.1 101`, realtime is broken — do not proceed to step 6.

## 6. Repoint the frontends (on the Mac)

```bash
cd /Users/mac/Desktop/fablab
printf 'VITE_API_URL=https://%s/api\n' "$API_DOMAIN" > fabweb0-master/.env.production
printf 'VITE_API_URL=https://%s/api\n' "$API_DOMAIN" > admin-main/.env.production
deploy/scripts/preflight.sh                 # tests + builds; all green or stop
firebase deploy --project fablab-bmk --only hosting:user,hosting:admin
```

Hard-refresh (⌘⇧R), log in on both apps, scan a QR end-to-end, watch it appear on the admin dashboard **without refreshing** (that proves the WebSocket).

## 7. Retire the tunnel & lock in operations

- [ ] Kill cloudflared on the Mac; it's history: `pkill -f "cloudflared tunnel"`
- [ ] Cron the backup on the server (Phase 1.2 starts here):
  ```bash
  crontab -e   # add:
  0 13,18 * * * COMPOSE_FILE=/opt/fablab/docker-compose.yml /opt/fablab/deploy/scripts/backup-postgres.sh >> /var/log/fablab-backup.log 2>&1
  ```
- [ ] **Rehearse one restore** onto a scratch database and time it:
  ```bash
  docker compose exec -T postgres pg_restore -U fablab -d fablab --clean --if-exists < backups/<latest>.dump
  ```
- [ ] Update `RUNBOOK.md`: server address, school IT contact, mark the tunnel sections as legacy.
- [ ] Reboot the server once (`sudo reboot`) and confirm everything comes back **without touching it** — that's the Phase 1.1 exit criterion.

## Rollback (if the day goes sideways)

The old rig still works: start the tunnel on the Mac (RUNBOOK §3 step 4), rebuild both frontends against the tunnel URL, redeploy. You are never more than 15 minutes from a working demo.
