# FabLab API

Self-hosted Node.js + Express + PostgreSQL API for the FabLab user app and admin dashboard.

This folder is step 1 only: backend skeleton, migration, and seed.

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
