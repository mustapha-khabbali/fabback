# FabLab — Production Architecture

**Last verified live: 2026-07-11.** Everything in this page was tested against the running system on that date.
Total hosting cost: **0 MAD / 0 USD per month** (see [Cost model](#cost-model)).

```
        Users (any network: school Wi-Fi, 4G, home)
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
  Firebase Hosting                    Cloudflare DNS
  ├─ fablab-bmk.web.app  (user app)   "fablab-api.ofppt.me → 84.8.219.72"
  └─ fablab-cmc.web.app  (admin app)  (DNS only — no proxy, no tunnel)
        │                                    │
        └────────── HTTPS (direct) ──────────┘
                          │
        Oracle Cloud "fablab-server" — Casablanca (af-casablanca-1)
        VM.Standard.A1.Flex · 2 OCPU / 12 GB · Ubuntu 24.04 aarch64 · Always Free
        ┌──────────────────────────────────────────────┐
        │  nginx (443, Let's Encrypt, per-IP rate cage) │
        │    └─> Node/Express API (loopback :4000)      │
        │          └─> PostgreSQL 16                    │
        │  certbot (auto-renew loop)                    │
        │  all containers: restart unless-stopped       │
        └──────────────────────────────────────────────┘
                          │ nightly 03:40
              GitHub private repo mustapha-khabbali/fablab-backups
```

## Who does what

| Provider | Role | Cost |
|---|---|---|
| **Firebase Hosting** | Serves the two React builds (user + admin) | Free (Spark plan) |
| **Cloudflare** | DNS only — answers "what IP is `fablab-api.ofppt.me`?" No proxy, no tunnel. | Free |
| **Oracle Cloud** | The backend server (physical hardware in Casablanca) | Always Free tier |
| **Namecheap** | Registrar for `ofppt.me` | ⚠️ expires **2026-10-15**; renew (~$16/yr) or migrate hostname |
| **GitHub** | Code (`fabback`) + nightly DB backups (`fablab-backups`, private) | Free |

The old architecture (Cloudflare Tunnel → school VM / Mac) is **fully retired**. Nothing depends on the school network or the Mac.

## The server (`ssh ubuntu@84.8.219.72`)

- App lives in `/opt/fablab`, deployed by rsync from the dev machine (see [Deploying](#deploying)).
- Stack: `docker compose -f docker-compose.yml -f docker-compose.api.yml` → `postgres`, `fablab-api`, `nginx`, `certbot`.
- API binds `127.0.0.1:4000` only; nginx is the sole public entry (80 → 301 → 443).
- Production env: `/opt/fablab/.env` (never in git). Firebase service account: `/opt/fablab/fablab-api/secrets/service-account.json` (never in git).
- OS firewall (iptables, persisted) and the Oracle VCN security list both allow only 22/80/443.

### nginx rate cage (`deploy/nginx/templates/api-only.conf.template`)
Per-IP budgets stop any misbehaving client (old cached bundle, reconnect loop, QR spam)
before it reaches the API: **10 r/s + burst 30** on `/api/`, **1 r/s + burst 10** on the
WebSocket/SSE handshakes. Excess gets `429`. Normal humans never hit these numbers.

### Scheduled jobs (`/etc/cron.d/fablab`)
| When | What |
|---|---|
| 03:15 daily | `pg_dump` → `/opt/fablab/backups/` (14-day retention) |
| 03:40 daily | Push newest dump to private GitHub repo `fablab-backups` (30 kept) via a repo-scoped deploy key (`/root/.ssh/fablab_backup_key`, never expires) |
| hourly | 5-minute CPU burn — keeps 95th-percentile CPU above Oracle's Always Free idle-reclaim threshold |

## Cost model

**Why this is 0/month, guaranteed:** the Oracle account is a **Free Tier account that was never upgraded**.
Oracle cannot bill it — when trial credits end, the account is limited to Always Free resources, not charged.
Every resource used carries the Always Free label (A1.Flex ≤ 2 OCPU/12 GB, 100 GB of the 200 GB block-storage
allowance, one ephemeral public IP). The **only** way this setup ever costs money is a human clicking
**Upgrade** in the Oracle console. Don't.

The single real-world cost decision: the `ofppt.me` domain (Namecheap, GitHub Student Pack freebie),
expiring **2026-10-15**. Either renew (~$16/yr — the only money in the whole system) or switch the API
hostname to a free alternative (requires one `VITE_API_URL` change + rebuild of both frontends + new cert).

## Deploying

From the repo root on the dev machine:

```bash
# 1. API change → sync + rebuild on the server (frontends untouched)
rsync -az --exclude node_modules --exclude .git --exclude dist --exclude backups --exclude '*.log' \
  ./ ubuntu@84.8.219.72:/opt/fablab/
ssh ubuntu@84.8.219.72 'cd /opt/fablab && sudo docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --build fablab-api'
# migrations, when a new one exists:
ssh ubuntu@84.8.219.72 'cd /opt/fablab && sudo docker compose -f docker-compose.yml -f docker-compose.api.yml exec fablab-api npm run migrate'

# 2. Frontend change → build + deploy to Firebase (index.html is no-cache: users get it on next load)
(cd fabweb0-master && npm run build) && (cd admin-main && npm run build)
firebase deploy --project fablab-bmk --only hosting

# 3. Prove it
curl -s https://fablab-api.ofppt.me/health          # {"ok":true,"db":"..."}
```

`VITE_API_URL=https://fablab-api.ofppt.me/api` is baked into both `.env.production` files — it never changes
between deploys, so frontends only need rebuilding when their own code changes.

## Disaster recovery

Everything needed to rebuild from zero lives outside the server:
code on GitHub (`fabback`), data on GitHub (`fablab-backups`), DNS on Cloudflare.
Worst case (VM destroyed) loses at most ~24h of data.

1. Create a new Always Free A1 instance (Ubuntu 24.04, ≤ 2 OCPU/12 GB, public subnet + public IP,
   open 80/443 in the VCN security list **and** in iptables).
2. Install Docker (`curl -fsSL https://get.docker.com | sudo sh`), rsync/clone the repo to `/opt/fablab`,
   recreate `/opt/fablab/.env` and the Firebase service-account secret.
3. `docker compose up -d postgres fablab-api` → `npm run migrate` → restore:
   `git clone` the backup repo, `pg_restore -U fablab -d fablab --clean <latest>.dump` inside the postgres container.
4. Point the Cloudflare A record at the new IP (**DNS only / grey cloud** — mandatory for certbot).
5. Issue the cert: `docker compose ... run --rm --entrypoint certbot -p 80:80 certbot certonly --standalone -d fablab-api.ofppt.me --email <you> --agree-tos -n`
   then `docker compose up -d nginx certbot`.
6. Frontends need nothing — same hostname.

## Attendance / scan semantics (server-enforced)

- **Gate-IN** opens lab presence; refused on weekends, Moroccan holidays, outside 08:30–18:30,
  and during any admin-created *fermeture exceptionnelle* (`lab_closures` table). Gate-OUT is never blocked.
- **EVENT QR** is allowed outside hours/weekends by design. With an admin-configured espace:
  - espace **FabLab** → it is a door entry: opens lab presence, counts in "Présents maintenant";
    re-scan is allowed after any checkout (explicit Gate-OUT or implicit).
  - **outside espace** → one attendance row, completed immediately; scanning it while inside the lab
    **closes** the lab presence (implicit Gate-OUT — the user physically left).
  - duplicate rule = **consecutive repeats only**: same event + same espace twice in a row → 409;
    any movement in between (other espace, FabLab, Gate-IN) makes a re-scan legitimate.
- The database keeps every row (full movement trail). The **PV view deduplicates at display time**:
  one row per person per presence type (lab objective, or event+espace) within the selected period, earliest kept.
- Realtime: WebSocket `/api/events/ws` (JWT in query). One `sync/reconnect` per stable authenticated
  connection; invalid/stale tokens are closed with `1008` and clients stop retrying.

## Monitoring in one command

```bash
ssh ubuntu@84.8.219.72 'sudo docker ps --format "{{.Names}} {{.Status}}"; \
  sudo docker logs fablab-fablab-api-1 --since 60m 2>&1 | grep -oE "(GET|POST|PATCH) /api/[a-z/-]*" | sort | uniq -c | sort -rn | head'
```

A traffic storm is unmistakable here (thousands of identical lines). Normal load is a handful per minute.
