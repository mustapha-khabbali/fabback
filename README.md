# FabLab Deployment

This repository contains the FabLab user app, admin dashboard, and self-hosted API.

Primary production mode is now:

- User app: `https://fablab-bmk.web.app`
- Admin app: `https://fablab-cmc.web.app`
- API: `https://API_DOMAIN/api`, where `API_DOMAIN` is a free DuckDNS subdomain
  such as `fablab-bmk-api.duckdns.org` pointing to the school server.

The Firebase live channels already host old versions. Do not replace them until
go-live is explicitly approved.

## Mode B: Firebase Frontends + Datacenter API

Use this mode first.

### Firebase Hosting Targets

Firebase project: `fablab-bmk`

Existing hosting sites:

- target `user` -> site `fablab-bmk`
- target `admin` -> site `fablab-cmc`

Preview deploys are safe and do not replace the old live versions:

```bash
cd fabweb0-master
VITE_API_URL=https://API_DOMAIN/api npm run build
cd ..
firebase hosting:channel:deploy step10-user --only user

cd admin-main
VITE_API_URL=https://API_DOMAIN/api npm run build
cd ..
firebase hosting:channel:deploy step10-admin --only admin
```

Live deploys are go-live only:

```bash
npm --prefix fabweb0-master run deploy:user
npm --prefix admin-main run deploy:admin
```

### DuckDNS API Domain

1. Create a DuckDNS subdomain, for example `fablab-bmk-api.duckdns.org`.
2. Point it to the public IP of the API server.
3. Open inbound TCP ports `80` and `443` on that server.
4. Put the value in `/opt/fablab/.env`:

```env
API_DOMAIN=fablab-bmk-api.duckdns.org
USER_HOSTING_DOMAIN=fablab-bmk.web.app
ADMIN_HOSTING_DOMAIN=fablab-cmc.web.app
POSTGRES_DB=fablab
POSTGRES_USER=fablab
POSTGRES_PASSWORD=change-this-postgres-password
JWT_SECRET=change-this-long-random-secret
ADMIN_SEED_EMAIL=sara.admin@fablab.local
ADMIN_SEED_PASSWORD=change-this-admin-password
FIREBASE_SERVICE_ACCOUNT=/run/secrets/firebase-service-account.json
VITE_API_URL=https://fablab-bmk-api.duckdns.org/api
```

Never commit `.env`.

### API Server Setup

```bash
cd /opt/fablab
mkdir -p fablab-api/secrets backups
cp .env.example .env
```

The Admin SDK service-account key is expected at:

```text
/opt/fablab/fablab-api/secrets/service-account.json
```

It is gitignored and must never be committed. Docker mounts it read-only into the API
container at `/run/secrets/firebase-service-account.json`.

Build and start the API-only stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml build
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d postgres fablab-api
docker compose -f docker-compose.yml -f docker-compose.api.yml run --rm fablab-api npm run migrate
docker compose -f docker-compose.yml -f docker-compose.api.yml run --rm fablab-api npm run seed
```

Issue the first Let's Encrypt certificate. Nginx is not started yet, so certbot can
temporarily bind port `80`:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml run --rm -p 80:80 certbot certonly \
  --standalone \
  -d "$API_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email
```

Start nginx and the renewal worker:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d
```

Smoke test:

```bash
curl https://$API_DOMAIN/api/health
```

## Frontend Env

Both apps include `.env.production.example`:

```env
VITE_API_URL=https://API_DOMAIN/api
```

For a real production build, copy the example to `.env.production` and replace
`API_DOMAIN` with the DuckDNS API domain.

## Firebase Console Checklist

Already done for this project, but keep this checklist for future audits:

- Google sign-in provider enabled.
- Authorized domains include:
  - `fablab-bmk.web.app`
  - `fablab-cmc.web.app`
  - `localhost`
- Admin SDK service-account JSON stored only at
  `fablab-api/secrets/service-account.json` locally or
  `/opt/fablab/fablab-api/secrets/service-account.json` on the server.

## Backups

Nightly backup script:

```text
/opt/fablab/deploy/scripts/backup-postgres.sh
```

Cron line:

```cron
15 2 * * * PROJECT_DIR=/opt/fablab BACKUP_DIR=/opt/fablab/backups POSTGRES_DB=fablab POSTGRES_USER=fablab /opt/fablab/deploy/scripts/backup-postgres.sh >> /opt/fablab/backups/backup.log 2>&1
```

Restore example:

```bash
cat /opt/fablab/backups/fablab-YYYYMMDD-HHMMSS.dump | \
  docker compose exec -T postgres pg_restore -U fablab -d fablab --clean --if-exists
```

## Mode A: Full Datacenter Frontends + API

Use this only if you later buy or receive control of a real domain.

Example placeholders:

- User app: `https://app.YOUR_DOMAIN`
- Admin app: `https://admin.YOUR_DOMAIN`
- API: same domains under `/api`

Set these in `/opt/fablab/.env`:

```env
MAIN_DOMAIN=app.YOUR_DOMAIN
ADMIN_DOMAIN=admin.YOUR_DOMAIN
VITE_API_URL=/api
CORS_ORIGINS=https://app.YOUR_DOMAIN,https://admin.YOUR_DOMAIN
```

Then follow the full compose flow:

```bash
docker compose build
docker compose up -d postgres fablab-api
docker compose run --rm fablab-api npm run migrate
docker compose run --rm fablab-api npm run seed
docker compose run --rm -p 80:80 certbot certonly \
  --standalone \
  -d "$MAIN_DOMAIN" \
  -d "$ADMIN_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email
docker compose up -d
```

## Non-Docker Fallback

Use this only if Docker is not allowed on the school server.

```bash
sudo apt update
sudo apt install -y nginx postgresql nodejs npm
sudo npm install -g pm2
```

Create PostgreSQL:

```bash
sudo -u postgres createuser fablab
sudo -u postgres createdb fablab -O fablab
sudo -u postgres psql -c "alter user fablab with password 'change-this-password';"
```

API `.env`:

```env
DATABASE_URL=postgres://fablab:change-this-password@localhost:5432/fablab
JWT_SECRET=change-this-long-random-secret
ADMIN_SEED_EMAIL=sara.admin@fablab.local
ADMIN_SEED_PASSWORD=change-this-admin-password
FIREBASE_SERVICE_ACCOUNT=/opt/fablab/fablab-api/secrets/service-account.json
CORS_ORIGINS=https://fablab-bmk.web.app,https://fablab-cmc.web.app
```

Run API:

```bash
cd /opt/fablab/fablab-api
npm ci --omit=dev
npm run migrate
npm run seed
pm2 start src/server.js --name fablab-api
pm2 save
pm2 startup
```

Native nginx for API-only:

```nginx
server {
  listen 80;
  server_name API_DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 301 https://$host$request_uri; }
}

server {
  listen 443 ssl;
  server_name API_DOMAIN;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

Use certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d API_DOMAIN
```
# fabback
