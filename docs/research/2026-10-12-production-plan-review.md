# Review: Master Production Implementation Plan (v3) + Orchestrator Plan

**Date:** 2026-10-12 · **Reviewer:** Affan (Eng B), with Claude · **Branch checked:** `mvp/v1-continuity` @ `33164268`
**Inputs:** `horquva-master-production-implementation-plan` and `horquva_antigravity_orchestrator_execution_plan.md` (Ibrahim, Antigravity)

## Verdict

The diagnosis is right and the direction is right. Every symptom in §1.1 checks out against the code. But the plan would not build as written. It underestimates the persistence refactor by about an order of magnitude, uses the wrong route paths, needs migrations it doesn't list, and has three design choices that would weaken security or data integrity. Fix the items below before anyone starts work.

Decided on 2026-10-12: the first admin comes from a deploy-time `BOOTSTRAP_ADMIN_EMAIL` (§B2). The work runs inline and in sequence, not as five parallel agents. Tracks 1–4 all touch `dataService.ts`, `settings.ts` and `scheduler.ts`, so parallel agents would collide.

---

## A. What the plan gets right (verified)

| Claim | Evidence |
|---|---|
| `persistSync()` has no callers | `backend/src/connectors/sdk/base.ts:31` is the only occurrence |
| Sync endpoint returns 501 | `backend/src/routes/settings.ts:30` |
| SSO rejects anyone not set up in advance | `backend/src/routes/auth.ts:182` → `not_provisioned` |
| Attestation state is in module Maps | `backend/src/attestation/attestationService.ts:74-76` |
| DataService state is in Maps; fixture-seeded | `dataService.ts:134-138`, `initDefaultState()` at `:172` |
| Scheduler jobs are no-ops | `backend/src/jobs/scheduler.ts:46-58` |
| Postgres adapters already exist, unused | `PostgresFactStoreAdapter` (`factStore.ts:101`), `PostgresIdentityQueueAdapter` (`queue.ts:105`), `engine.ts` (`FOR UPDATE` at `:135`) |
| Target tables exist | migrations 001/002: `connection`, `sync_run`, `raw_payload`, `entity`, `edge`, `fact`, `campaign`, `attestation_task`, `departure`, `departure_handover`, `action_record`, `organization_settings`, `user_account`, `audit_log` |

Most of the work is wiring existing code together, not new design.

---

## B. Must fix before building

### B1. The persistence refactor is much larger than the plan says
Every public `DataService` method is **synchronous**: `getDepartures()`, `getUserByEmail()`, `getOrganization()`, `getAuditLog()`, `addAuditEntry()`, and the rest. There are 60 `DataService.getInstance()` call sites across 20 files, plus 29 direct calls to the getters the plan wants to move behind async repositories. "Swap in repositories" means making every route, view builder (`views/*.ts`), briefing and handover service async.

**Recommendation: a write-through in-memory cache, not async repositories everywhere.**
- At startup, load departures, actions, users, org settings, change events and the audit log from Postgres into the existing Maps.
- Make the mutating methods async: write to Postgres first, then update the Map. Read methods stay synchronous and unchanged.
- This is safe because the MVP runs one instance per org (one process). Callers change only where they mutate (about 15 sites, not about 90).
- The repositories in §4.3 are still the right home for the SQL. They're used by load and write-through, not by every reader.

### B2. First-SSO-user-becomes-admin (AD-ONBOARD-01) → env-pinned admin
SSO is already pinned to the customer's identity provider: the Entra issuer is fixed to `ENTRA_TENANT_ID` (`auth/entra.ts:40-45`), and Google requires `hd === GOOGLE_WORKSPACE_DOMAIN` (`auth/google.ts:28`). So outsiders can't race for admin. But **any employee in the tenant** who opens the URL first becomes admin and HR manager. That gives them every departure record, plus connector credentials and user management.

**Decided:** `BOOTSTRAP_ADMIN_EMAIL` is set at deploy time. Only that address is auto-provisioned as `admin` + `isHrManager`, and only while `user_account` holds no admin. That check runs in a transaction (`SELECT ... FOR UPDATE` or a unique partial index) so two concurrent callbacks can't both win. Log `FIRST_ADMIN_BOOTSTRAP` to the audit log.

Drop the plan's "lock organization domain" step. The tenant/`hd` pin in the IdP config already does this, and a second allow-list in `organization_settings` can drift from it.

### B3. JIT-provisioning everyone as `viewer` exposes departure data
The RBAC default for any `GET` is `read`, which every role has (`middleware/rbac.ts:82, 88-90`). `GET /api/departures` therefore has no stricter rule. Today that's harmless because only hand-provisioned users exist. With the plan's JIT step, **every employee in the tenant could list who is leaving**. That's an HR-confidentiality breach, and it also cuts against the SEC-07 posture.

**Options (needs a decision):**
- (a) No JIT. Admins invite users (insert a `user_account` row); SSO then only authenticates.
- (b) Keep JIT, but first gate `GET /departures*`, `/handovers*` and departure-derived views behind the `departure` permission.

Recommend (a) for the pilot.

### B4. Hardcoded fallback encryption key (§4.1)
`process.env.HORQUVA_SECRET_KEY || 'horquva-default-dev-secret-key-32b!'` means a production deploy without the env var encrypts every connector secret with a key that's in the repo. Follow the existing pattern in `auth/session.ts:19-27` (`SESSION_SECRET` throws in production). Also:
- Require the key to be 32 random bytes, base64-encoded. Don't SHA-256 a passphrase; SHA-256 isn't a key-derivation function, and a low-entropy passphrase stays low-entropy after hashing.
- `version: 1` without a key ring isn't rotation. Either support `HORQUVA_SECRET_KEY_<n>` lookup by version or drop the field.
- Pass the connection id as AES-GCM additional authenticated data (AAD), so a ciphertext copied from one connection row can't be decrypted as another.

### B5. Wrong route paths
`connectionsRouter` is mounted at **`/api/connections`** (`server.ts:72`), not `/api/settings/connections`. RBAC already gates `/connections(/.*)?` as admin-only (`rbac.ts:44`). If the new endpoints went under `/api/settings/connections`, the `GET` listing would fall through to `read`, and **every user could list connections**. Use `/api/connections`, `/api/connections/:id/sync` and `/api/connections/csv`.

### B6. Missing migrations
The plan lists no migration, but it needs at least:
- `organization_settings.onboarding_dismissed_at` (the table has no onboarding column).
- **Attestation link model.** The product issues *one link per reviewer per campaign covering all their assets* (`attestationService.ts:8`), but `attestation_task.token` is `UNIQUE` per task. That needs an `attestation_link (token, campaign_id, reviewer_person_id, expires_at)` table, or the per-task token dropped.
- `attestation_task.reviewer_person_id` / `asset_entity_id` have a foreign key to `entity(id)`. Campaigns can't be written until entities are in Postgres, so Track 3 depends on hydration and seeding being finished, not only on the repositories.
- Tables for state the plan forgets (see B9).

### B7. Problems inside `persistSync()` that Track 2 inherits
- **`sync_run` is created inside the transaction** (`base.ts:34`). A failed sync rolls it back and leaves no record of the failure, and the 202 response can't return a `sync_run` id that exists yet. Fix: insert `sync_run` (`queued`) outside the transaction when dispatching, and pass its id in.
- **Nothing ever closes edges or facts that vanished at the source.** If someone leaves Entra or an n8n workflow loses an owner, the old `valid_to IS NULL` row stays active forever. For a product about departures, this is the core bug. It needs a per-connection, per-source "close what this sync didn't see" step.
- **One query per row.** Each edge and fact costs a SELECT plus an INSERT, sometimes an UPDATE too. At 20k nodes that's on the order of 100k round trips inside one transaction, so the NFR targets aren't reachable. Batch with `unnest()` / `INSERT ... SELECT`.
- **No concurrency guard.** The hourly cron and a manual "Sync Now" can run together. Claim the work with `UPDATE connection SET status='syncing' WHERE id=$1 AND status <> 'syncing' RETURNING id`, or a pg-boss `singletonKey`.

### B8. The scheduler never starts
`JobScheduler` isn't imported by `index.ts` or `server.ts`. Wiring handlers into it (Tracks 2 and 3) does nothing until something calls `start()` at boot and `stop()` on SIGTERM. Nothing in the plan says to.

### B9. State the plan doesn't cover
DataService also holds **change events** (`change_event` table exists, unused), **departure watch events**, the **identity queue** (Postgres adapter exists), and the in-memory `FactStoreAdapter`. If any of these stay in memory, "zero data loss on restart" isn't true. The seeded change events and Sarah departure in `initDefaultState()` are hardcoded demo content too, not just `handCheckableTruth.json`.

### B10. `DEMO_MODE` seeding into an empty production database
"Seed the fixture if Postgres is empty" also runs on a real client's first boot, before their first sync, if the flag is set by mistake. Recommend: seed only when `DEMO_MODE=true` **and** `NODE_ENV !== 'production'`, and refuse to start if `DEMO_MODE=true` and `NODE_ENV=production`. Tag seeded rows `source='demo'` so they can be found and removed.

---

## C. Should fix

- **CSV upload stores the whole CSV in `config_encrypted`** (`CsvConnectorConfig.peopleCsvContent`). That's employee PII in the config column, and the hourly cron would re-import the same file every hour. Treat a CSV upload as a one-off sync: write to `raw_payload` and skip the scheduler (`pollingIntervalMinutes: 0` already says this).
- **Hydration rebuilds two sources of truth.** `hydrateGraphFromDatabase()` rebuilds `ContinuityGraph`, but `DataService.factStore` is still the in-memory adapter. Switch it to `PostgresFactStoreAdapter` in the same change, or reads will disagree.
- **Swap the graph atomically.** Build the new `ContinuityGraph` off to the side, then swap the reference. Don't mutate the live one while requests read it.
- **The performance numbers contradict each other** (<30ms in the orchestrator plan, <150ms in the master plan, for the same 20k-node hydration). Pick one and measure it on a seeded 20k dataset before treating it as a gate.
- **The readiness scorecard (4.0 → 9.8) isn't measured against anything.** Replace it with the concrete gate checks in §3, which are good.
- **Gap 5 (A/B allocator).** `domain/ab` is only referenced by its test. Archive it. Wiring subject-line A/B tests into the pilot is scope creep.
- **pg-boss fallback.** When `DATABASE_URL` is unset, the scheduler falls back to in-process intervals. In production that should be a startup error, not a silent fallback.

---

## D. Suggested sequencing (replaces the 5-agent fan-out)

1. **Migration 004** (B6, B9 tables, onboarding column) + **encryption** (B4) + **fail-closed env checks** (B4, B10).
2. **Write-through persistence** (B1). Load at boot; async mutators; Postgres fact store and identity queue adapters; demo seeding (B10).
3. **`persistSync` fixes** (B7) → `ConnectorRunner` → `/api/connections` CRUD + 202 sync + CSV (B5) → scheduler boot (B8) → atomic re-hydration.
4. **Attestation on Postgres** via `engine.ts` + link table (B6). Reminder job.
5. **Auth bootstrap** (B2) + the JIT decision (B3) + onboarding status/dismiss.
6. **Frontend:** setup banner, wizard, AddConnection modal, Sync Now polling.
7. **Verification:** restart-resilience test against a real Postgres, 20k benchmark, Playwright onboarding spec.

Steps 1–3 are the only real blockers for a design-partner pilot. Steps 4–6 can ship after it.

## E. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| E1 | JIT-provision tenant users as `viewer`, or invite-only? (B3) | Invite-only for the pilot |
| E2 | Persistence shape: async repositories everywhere vs. write-through cache (B1) | Write-through cache |
| E3 | Who owns which track? The plan assigns all of it; Eng B normally owns frontend | Split at step 6 |
| E4 | Keep or archive `domain/ab` | Archive |
