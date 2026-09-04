# Sentinel Identity & Trust Platform

**Owner:** Areeb Ahmad · **Surface:** `/api/v1` · **Datastore:** dedicated PostgreSQL (`oba_identity`)

Production-grade identity, authentication, authorization, and trust for the Horquva
platform. Built inside the OBA backend (Node/Express + `pg`), isolated from the
Supabase-backed OBA data. See [`DECISIONS.md`](./DECISIONS.md) for ownership,
principles, and the locked engineering decisions.

## Layout
```
identity/
├── config.js            # env-driven configuration
├── db/
│   ├── pool.js          # pg pool — the only approved data-access entry point
│   └── migrate.js       # formal migration runner (up/down/status/validate/create)
├── migrations/          # NNN_name.sql  (-- +migrate up / -- +migrate down)
├── api/v1/
│   ├── index.js         # /api/v1 router
│   └── health.js        # /api/v1/health, /api/v1/health/ready
├── domain/              # (Phase 2) models
├── repositories/        # (Phase 3) org-scoped data access
├── services/            # (Phase 4+) authn, authz, sessions, trust
└── tests/               # (Phase 3+) automated + adversarial tests
```

## Setup
1. Create the database (once): `CREATE DATABASE oba_identity OWNER <role>;`
2. Configure `backend/.env` (see `backend/.env.example`, `IDENTITY_*` vars).
3. Apply migrations: `npm run identity:migrate` (from `backend/`).
4. Start the API: `npm start` — identity mounts at `/api/v1`.

## Migration commands (run from `backend/`)
| Command | Purpose |
|---|---|
| `npm run identity:migrate` | apply all pending migrations |
| `npm run identity:migrate:down` | roll back the most recent migration |
| `npm run identity:migrate:status` | show applied vs pending |
| `npm run identity:migrate:validate` | drift check (CI gate) |
| `npm run identity:migrate:create -- <name>` | scaffold a new migration |

## Endpoints (Phase 1)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1` | platform metadata |
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | readiness (DB reachable; fails closed) |

Auth, authz, identity, and trust surfaces are added in later phases.
