# FabLab API

Self-hosted Node.js + Express + PostgreSQL API for the FabLab user app and admin dashboard.

This folder includes the backend skeleton, migrations, seed, and auth endpoints.

## Local Setup

```bash
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

The health checks are:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/health
```

## Auth

- `POST /api/auth/admin` with `{ "email": "...", "password": "..." }`
- `POST /api/auth/google` with `{ "idToken": "..." }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`

`POST /api/auth/google` verifies Firebase tokens with the service account path in
`FIREBASE_SERVICE_ACCOUNT`.

## Frontend Local Caches

`lab_attendance` in the user app is only a local cache used by the profile heatmap.
PostgreSQL is the source of truth for check-in/check-out records.

## Seeded Records

- `user-sara`: Sara Ladouy, administrateur, Responsable Fab Lab, also the seeded admin login.
- `admin-resp-entrepreneuriat`
- `admin-resp-incubateur`
- `gate_config` row `id = 1`

Set the desktop admin credentials with:

```env
ADMIN_SEED_EMAIL=sara.admin@fablab.local
ADMIN_SEED_PASSWORD=change-me-now
```
