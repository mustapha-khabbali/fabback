# Local Testing

This local setup runs PostgreSQL in Docker, the API on `localhost:4000`, the user app
on `localhost:5173`, and the admin app on `localhost:5174`.

The Firebase web config in `fabweb0-master/src/context/FirebaseContext.jsx` uses
project `fablab-bmk`, so the Google popup on `localhost:5173` uses the real Firebase
project. The service-account JSON must stay at:

```text
fablab-api/secrets/service-account.json
```

Never commit that JSON.

## Start The Local Stack

From the workspace root:

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

Create `fablab-api/.env`:

```bash
cat > fablab-api/.env <<'EOF'
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://fablab:fablab@localhost:55432/fablab_dev
JWT_SECRET=local-dev-secret-change-me
JWT_EXPIRES_IN=7d
ADMIN_SEED_EMAIL=sara.ladouy@fablab.local
ADMIN_SEED_PASSWORD=fablab2026
FIREBASE_SERVICE_ACCOUNT=./secrets/service-account.json
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
GLOBAL_RATE_LIMIT_MAX=2000
AUTH_RATE_LIMIT_MAX=200
EOF
```

Run migrations and seed:

```bash
cd fablab-api
npm run migrate
npm run seed
npm start
```

In another terminal, create the user app dev env and start it:

```bash
cat > fabweb0-master/.env.development <<'EOF'
VITE_API_URL=http://localhost:4000/api
EOF

cd fabweb0-master
npm run dev -- --host localhost --port 5173
```

In another terminal, create the admin app dev env and start it:

```bash
cat > admin-main/.env.development <<'EOF'
VITE_API_URL=http://localhost:4000/api
EOF

cd admin-main
npm run dev -- --host localhost --port 5174
```

Seeded admin login:

```text
Identifiant: sara.ladouy or sara.ladouy@fablab.local
Password: fablab2026
```

Quick checks:

```bash
curl http://localhost:4000/api/health
curl -I http://localhost:5173
curl -I http://localhost:5174
```

## Manual Test Script

1. Admin app at `http://localhost:5174`:
   Log in with the seeded admin account.

2. Admin:
   Create an event.

3. Admin:
   Go to QR Codes, generate Gate-IN. This publishes the gate config. Keep the QR on
   screen.

4. User app at `http://localhost:5173`:
   Click "Continuer avec Google" with a real Google account.

5. User:
   Register as Stagiaire.

6. User:
   Open Scan tab. Scan the on-screen QR with the webcam, or use the development QR scan
   shortcut below.

7. User:
   Choose "Projet en cours" plus an encadrant, then validate.

8. Admin Dashboard:
   Confirm the user appears within about 10 seconds.

9. User:
   Create a project plus a journal.

10. User:
   Use Ask for Help, then Ask for Review.

11. Admin:
   Confirm notifications are received, then submit the 8-criteria review.

12. User:
   Scan out using the SCAN button, then rate the session.

13. Admin:
   Go to PV, generate for today, then export Excel.

14. Admin:
   Open Users, open the test user's profile, edit it, then deactivate the user.

15. User:
   Try the next action in the user app. It must be rejected because the user is
   deactivated.

## Development QR Scan Shortcut

In development only, the user app supports a local QR test shortcut for machines without
a printed Gate-IN or Gate-OUT QR nearby.

- Start the API with `NODE_ENV` not set to `production`.
- Generate the permanent Gate-IN and Gate-OUT QR codes once from the admin QR page.
- In the user app Scan tab, double-click the green `SCAN` button to fetch the permanent
  gate id from `/api/gate/dev/permanent-qr/:gate` and simulate that camera result.

Production builds strip this bypass because it is guarded by `import.meta.env.DEV`, and
the API route returns `404` when `NODE_ENV=production`.
