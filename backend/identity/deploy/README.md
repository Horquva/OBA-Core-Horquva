# Sentinel Identity & Trust — Deployment Runbook (F3)

> **Owner:** Areeb Ahmad · Completes plan Follow-up **F3** (dev/staging deployment + M2M service credential).
> This makes the identity platform reachable at a stable base URL so AI Security, Infrastructure, and Flutter can
> integrate. It is host-agnostic: any machine/VM with Docker, or any Node host + Postgres.

## What this bundle contains
| File | Purpose |
|---|---|
| `Dockerfile` | Standalone identity service image (runs `identity/server.js` → only `/api/v1`) |
| `docker-compose.yml` | Turnkey stack: identity service + Postgres, auto-migrate + seed |
| `.env.identity.example` | Environment template (copy to `.env.identity`, gitignored) |
| `generate-secrets.js` | Generates RS256 keypair + AES enc key as env lines |
| `provision-ai-security-client.js` | Creates the M2M machine credential for a consumer (step 5) |
| `verify-deployment.js` | Post-deploy HTTP smoke test (gates a pipeline) |

## Deploy — Docker (recommended, self-contained)
From `backend/identity/deploy/`:

```bash
# 1. Secrets
cp .env.identity.example .env.identity
node ../deploy/generate-secrets.js >> .env.identity     # appends RS256 + enc key
#   then edit .env.identity: set POSTGRES_PASSWORD, IDENTITY_DATABASE_URL password, SEED_ADMIN_PASSWORD

# 2. Bring it up (builds image, starts Postgres, migrates, validates, seeds, serves)
docker compose --env-file .env.identity up -d --build

# 3. Verify
BASE_URL=http://localhost:3000/api/v1 \
ADMIN_EMAIL=admin@horquva.io ADMIN_PASSWORD='<your SEED_ADMIN_PASSWORD>' ADMIN_ORG=horquva \
node ../deploy/verify-deployment.js
```

### Managed Postgres (e.g. Supabase) instead of the bundled db
Set `IDENTITY_DATABASE_URL` in `.env.identity` to the managed connection string, delete the `db` service and the
`depends_on` block from `docker-compose.yml`, then `docker compose up`. Migrations create the `identity` schema.

## Deploy — bare Node (no Docker)
On a host with Node 22 + reachable Postgres, from `backend/`:
```bash
npm ci
export $(grep -v '^#' identity/deploy/.env.identity | xargs)   # or set env another way
npm run identity:migrate && npm run identity:migrate:validate && npm run identity:seed
npm run identity:serve      # dedicated identity service on :3000
```

## Step 5 — provision the AI Security M2M credential
Once the service (or just its DB) is reachable, create the machine identity for `agent_identity_service`:
```bash
# run against the deployed DB (set IDENTITY_DATABASE_URL to the deployed Postgres)
node identity/deploy/provision-ai-security-client.js --name agent_identity_service --org horquva
```
It prints `CLIENT_ID` + `CLIENT_SECRET` **once** — hand these to Taimour securely. The service authenticates with
`POST /api/v1/auth/token { clientId, clientSecret }`. Grant it only the roles it needs (`--role <name>`, or assign
later); default is least privilege (no role).

## Hand-off outputs to distribute
- **Base URL** → Flutter (M.Ali & Anas) and AI Security (Taimour): `https://<host>/api/v1`
- **JWKS URL** (RS256) → AI Security: `https://<host>/api/v1/.well-known/jwks.json`
- **M2M CLIENT_ID / CLIENT_SECRET** → AI Security (securely, once)

## Security notes
- `.env.identity` and `deploy/secrets/` are **gitignored** — never commit real secrets.
- Rotate the bootstrap admin password immediately after first deploy.
- Prefer RS256 in shared environments so consumers verify tokens locally via JWKS.
- The service fails closed: it exits at boot if the database is unreachable, and returns `503` on readiness loss.
