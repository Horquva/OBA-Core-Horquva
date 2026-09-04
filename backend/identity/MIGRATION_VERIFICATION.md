# Identity & Trust — Migration Verification Evidence (Plan Part 1.3–1.4)

> **Owner:** Areeb Ahmad · **Date:** 2026-08-23 · **Baseline commit:** `9745c3a`
> Migrations run against **both** a clean environment and the existing environment, proving reproducible
> up / status / validate / rollback / re-apply. Runner: `identity/db/migrate.js`. Migrations: `001`, `002`, `003`.

## Commands

```bash
cd backend
node identity/db/migrate.js status     # applied vs pending
node identity/db/migrate.js validate   # checksum drift gate (CI)
node identity/db/migrate.js up         # apply pending
node identity/db/migrate.js down       # roll back latest
node identity/db/seed.js               # 26 perms, 4 roles, 45 mappings, bootstrap admin
```

## 1. Existing environment (`oba_identity`) — no drift

```
$ node identity/db/migrate.js status
Migration status:
  [APPLIED] 001_init.sql
  [APPLIED] 002_identity_schema.sql
  [APPLIED] 003_mfa_recovery_codes.sql

$ node identity/db/migrate.js validate
Validation OK: 3 applied migration(s) match on-disk files.
```

**Result:** applied migrations match on-disk checksums → the drift gate passes; no uncontrolled manual schema changes.

## 2. Clean environment (throwaway `oba_identity_verify`) — full lifecycle

Created a fresh database and pointed the runner at it via `IDENTITY_DATABASE_URL` override
(`dotenv` does not override a shell-provided env var, so the override targets the throwaway DB).

```
# status on a brand-new DB → everything pending
Migration status:
  [pending] 001_init.sql
  [pending] 002_identity_schema.sql
  [pending] 003_mfa_recovery_codes.sql

# up → all apply cleanly
  applying 001_init.sql ... OK
  applying 002_identity_schema.sql ... OK
  applying 003_mfa_recovery_codes.sql ... OK
Applied 3 migration(s).

# validate → checksums match
Validation OK: 3 applied migration(s) match on-disk files.

# up again → idempotent
Already up to date.

# seed → deterministic catalog + bootstrap admin
Bootstrap admin created: admin@horquva.io (org 'horquva')
Seed complete — permissions=26, system_roles=4, role_permissions=45
```

### Schema integrity (clean DB, `identity` schema)

| Object | Count |
|---|---|
| Tables | 16 |
| Primary keys | 16 |
| Foreign keys | 27 |
| Unique constraints | 3 |
| Indexes | 52 |

## 3. Rollback + reproducible re-apply

```
# down × 3 → full rollback
  rolling back 003_mfa_recovery_codes.sql ... OK
  rolling back 002_identity_schema.sql ... OK
  rolling back 001_init.sql ... OK

# status → all pending again
  [pending] 001_init.sql
  [pending] 002_identity_schema.sql
  [pending] 003_mfa_recovery_codes.sql

# identity schema object count after rollback
  identity_objects = 0        # clean teardown, no residue

# up → reproducible re-apply from scratch
  applying 001_init.sql ... OK
  applying 002_identity_schema.sql ... OK
  applying 003_mfa_recovery_codes.sql ... OK
Applied 3 migration(s).
```

Throwaway database dropped after verification (`drop database oba_identity_verify;`).

## 4. Real persistence proof (Part 1.4)

`Create → Persist → Retrieve → Update → Lifecycle Change → Audit` is proven against the **real** database
(no mocks) by `tests/e2e.test.js` and `tests/lifecycle.test.js`, executed inside rolled-back transactions
(`tests/helpers.js › withRollback`) so no residue remains. Run: `npm run identity:test` → **59 passed, 0 failed**.

## Outcome

Identity persistence is **reproducible** — clean-env apply, idempotent re-run, full rollback with zero residue,
reproducible re-apply, existing-env no-drift, and deterministic seed — rather than dependent on manual database changes.
Any Postgres (including production/Supabase) can be brought up by pointing `IDENTITY_DATABASE_URL` at it and running the runner.
