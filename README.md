# FabLab Deployment

This repository contains the FabLab user app, admin dashboard, and API. The school
datacenter deployment is Docker-first, with a native fallback for teams that cannot
run Docker.

## Production Domains

Defaults:

- User app: `fablab.cmc.ma`
- Admin app: `admin.fablab.cmc.ma`
- API: same domains under `/api`

Create DNS `A` records for both domains pointing to the public IP of the school
server. Open inbound TCP ports `80` and `443`.

## Docker Deployment

1. Copy the repository to the server, for example `/opt/fablab`.

2. Create runtime folders and secrets:

```bash
cd /opt/fablab
mkdir -p secrets backups
cp .env.example .env
```

3. Edit `.env`. Use strong production values for:

```env
POSTGRES_PASSWORD=...
JWT_SECRET=...
ADMIN_SEED_PASSWORD=...
MAIN_DOMAIN=fablab.cmc.ma
ADMIN_DOMAIN=admin.fablab.cmc.ma
LETSENCRYPT_EMAIL=it@cmc.ma
```

Never commit `.env` or files inside `secrets/`.

4. Put the Firebase service-account JSON here:

```text
/opt/fablab/secrets/firebase-service-account.json
```

The compose file exposes it inside the API container as
`/run/secrets/firebase-service-account.json`.

5. Build the images:

```bash
docker compose build
```

The user and admin app builds use `VITE_API_URL=/api` by default. To change it,
set `VITE_API_URL` in `.env` before `docker compose build`.

6. Start Postgres and the API:

```bash
docker compose up -d postgres fablab-api
```

7. Run migrations and seed inside the API container:

```bash
docker compose run --rm fablab-api npm run migrate
docker compose run --rm fablab-api npm run seed
```

8. Issue the first Let's Encrypt certificates. Nginx is not started yet, so certbot
can temporarily bind port `80`:

```bash
docker compose run --rm -p 80:80 certbot certonly \
  --standalone \
  -d fablab.cmc.ma \
  -d admin.fablab.cmc.ma \
  --email it@cmc.ma \
  --agree-tos \
  --no-eff-email
```

9. Start nginx and the renewal worker:

```bash
docker compose up -d
```

10. Smoke test:

```bash
curl -I https://fablab.cmc.ma
curl -I https://admin.fablab.cmc.ma
curl https://fablab.cmc.ma/api/health
```

## Frontend Production Env

Both apps include `.env.production.example`:

```env
VITE_API_URL=/api
```

For manual builds, copy it to `.env.production` in each app before building:

```bash
cp fabweb0-master/.env.production.example fabweb0-master/.env.production
cp admin-main/.env.production.example admin-main/.env.production
npm --prefix fabweb0-master run build
npm --prefix admin-main run build
```

## Backups

Nightly backup script:

```text
/opt/fablab/deploy/scripts/backup-postgres.sh
```

Cron line for root or the deployment user:

```cron
15 2 * * * PROJECT_DIR=/opt/fablab BACKUP_DIR=/opt/fablab/backups POSTGRES_DB=fablab POSTGRES_USER=fablab /opt/fablab/deploy/scripts/backup-postgres.sh >> /opt/fablab/backups/backup.log 2>&1
```

Backups are `pg_dump -F c` files in `/opt/fablab/backups`. The script keeps 14 days
by default; override with `KEEP_DAYS=30` if needed.

Restore example:

```bash
cat /opt/fablab/backups/fablab-YYYYMMDD-HHMMSS.dump | \
  docker compose exec -T postgres pg_restore -U fablab -d fablab --clean --if-exists
```

## Firebase Console Checklist

In Firebase Console:

- Enable Authentication -> Sign-in method -> Google provider.
- Add authorized domains:
  - `fablab.cmc.ma`
  - `admin.fablab.cmc.ma`
- Generate a service-account JSON for the API and place it at
  `/opt/fablab/secrets/firebase-service-account.json`.

## Non-Docker Fallback

Use this only if Docker is not allowed on the school server.

1. Install system packages:

```bash
sudo apt update
sudo apt install -y nginx postgresql nodejs npm
sudo npm install -g pm2
```

2. Create the database and user:

```bash
sudo -u postgres createuser fablab
sudo -u postgres createdb fablab -O fablab
sudo -u postgres psql -c "alter user fablab with password 'change-this-password';"
```

3. Configure API secrets in `/opt/fablab/fablab-api/.env`:

```env
DATABASE_URL=postgres://fablab:change-this-password@localhost:5432/fablab
JWT_SECRET=change-this-long-random-secret
ADMIN_SEED_EMAIL=sara.admin@fablab.local
ADMIN_SEED_PASSWORD=change-this-admin-password
FIREBASE_SERVICE_ACCOUNT=/opt/fablab/secrets/firebase-service-account.json
CORS_ORIGINS=https://fablab.cmc.ma,https://admin.fablab.cmc.ma
```

4. Install, migrate, seed, and run the API with PM2:

```bash
cd /opt/fablab/fablab-api
npm ci --omit=dev
npm run migrate
npm run seed
pm2 start src/server.js --name fablab-api
pm2 save
pm2 startup
```

5. Build both frontends:

```bash
cd /opt/fablab/fabweb0-master
cp .env.production.example .env.production
npm ci
npm run build

cd /opt/fablab/admin-main
cp .env.production.example .env.production
npm ci
npm run build
```

6. Configure native nginx:

```nginx
server {
  listen 80;
  server_name fablab.cmc.ma admin.fablab.cmc.ma;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name fablab.cmc.ma;
  root /opt/fablab/fabweb0-master/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 443 ssl;
  server_name admin.fablab.cmc.ma;
  root /opt/fablab/admin-main/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

7. Use certbot native nginx integration:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d fablab.cmc.ma -d admin.fablab.cmc.ma
```
