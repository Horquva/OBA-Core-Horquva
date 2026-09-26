# PHASE 4 — Ingestion Staging for External Connectors

> **Objective**: Build everything a connector needs *except* the connectors themselves: staging storage, identity resolution, authenticated+idempotent mutation APIs, a hardened webhook receiver, a CSV roster importer, and the agent prompt-caching fix. After this phase, connector work (Jira/GitHub/Slack/Zapier/n8n/Agentforce/HR) is adapter-writing only.
> **Exit criteria**: staging tables live; HMAC-verified receiver stores raw payloads; identity bridge resolves external IDs; full CRUD with RBAC + idempotency + audit; prompt caching active.

## 4.1 Ingestion Schema (`backend/sql/29_ingestion_staging.sql`)

```sql
create table raw_vendor_payloads (
  id uuid pk default gen_random_uuid(), org_id uuid not null,
  source text not null check (source in ('jira','slack','github','zapier','n8n','agentforce','hr_csv','generic')),
  external_event_id text, payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processed','failed','skipped')),
  error_message text, received_at timestamptz default now(), processed_at timestamptz);

create table identity_bridge (
  id uuid pk default gen_random_uuid(), org_id uuid not null,
  external_system text not null, external_user_id text not null,
  employee_id uuid references employees(id),
  verified_email text, match_method text check (match_method in ('exact_email','exact_sso','probabilistic','manual')),
  match_confidence numeric, created_at timestamptz default now(),
  unique (org_id, external_system, external_user_id));
```
+ `(org_id, status, received_at)` index; RLS policies per 1.2; append-only discipline on `raw_vendor_payloads` (no update of `payload`, only `status`).

## 4.2 Core Entity Mutation Endpoints (CRUD + RBAC + Idempotency)

The audit's census: 58 routes, exactly 1 write. Connectors need writes for the entities they observe.

**Surface** (all flowing through Phase 3's `mutations.js` — no route touches Supabase directly):
- `routes/workflows/`: `POST /api/workflows`, `PUT /api/workflows/:id`, `DELETE /api/workflows/:id`, runbook create/update.
- `routes/dependencies.js`: `POST /api/dependencies`, `DELETE /api/dependencies/:id`.
- `routes/tools.js` (+ platforms): `POST/PUT/DELETE` for platforms, tool ownership, backups.
- `routes/employees.js`: `POST/PUT` (create/update; delete soft-only).
- `routes/agents.js`: existing owner PATCH migrates onto `mutations.js` (gains idempotency for free).

**Security (Gate 2 from the Blueprint)**: `requireRole(['ADMIN','OPERATOR'])` on all writes; `Idempotency-Key` header honored (unique index via the change log); every write → `audit_log` with actor, before/after, org; `ApiError` contract; request bodies validated (schema validation helper, e.g. zod — small dep, big win; alternative: hand-rolled validators matching existing route style).

**Tests**: `crudRoutes.test.js` — RBAC denials (VIEWER 403), idempotent retry replays, validation errors, audit rows written, org scoping (cross-org 404), per-entity happy paths.

## 4.3 Generic Webhook Receiver (`routes/ingest/webhook.js`)

**Research grounding**: Standard Webhooks specification (standardwebhooks.com — the svix-led convention: `webhook-id`/`webhook-timestamp`/`webhook-signature` headers, HMAC-SHA256 over `${id}.${timestamp}.${body}`); GitHub's `x-hub-signature-256` (HMAC-SHA256 of raw body) and Slack's `x-slack-signature` (HMAC over `version:timestamp:body`) — all implementable natively with Node `crypto` in ~40 lines; no new dependency. `express.raw({ limit })` on this router so signatures verify against exact bytes.

**Design** — `POST /api/ingest/webhook/:source`:
1. **Authenticate**: per-source HMAC verification (GitHub/Slack native schemes; Standard Webhooks scheme for Zapier/n8n/custom); constant-time compare; replay window (timestamp tolerance 5 min); `4xx` + audit row on failure.
2. **Stage**: write raw payload verbatim to `raw_vendor_payloads` (replayability + schema-drift isolation — Stage 1 of the Blueprint's 4-stage pipeline). Respond `202 {stagingId}` immediately.
3. **Process (async)**: processor reads staged rows → per-source adapter translates primitives (Stage 3) → resolves identities via `identity_bridge` (Stage 2) → calls `mutations.js` (Stage 4, which fires Feature 3). In-process queue first (single instance); **pg-boss** (4k★, Postgres-backed job queue — no Redis) is the drop-in upgrade when volume demands it.
4. **Rate limiting**: per-source sliding window via **node-rate-limiter-flexible** (3.6k★) with its Postgres/insurance store (works on one instance, ready for many).
5. **CSV roster importer**: `POST /api/ingest/roster/csv` (HR/Workday path, Blueprint §7 matrix) — `csv-parse` (Node-stream, battle-tested), column-mapping preview (dry-run returns proposed entities + issues), then import through `mutations.js`.

**Identity resolution — exact path + probabilistic path**:
- Exact: `verified_email` or SSO subject match → `match_method='exact_*'`, confidence 1.0. In JS, synchronous.
- Probabilistic (offline, Python sidecar — same pattern as `backend/risk_engine/`): **Splink** (moj-analytical-services/splink, 2.4k★ — Fellegi–Sunter probabilistic linkage, DuckDB backend, no server) batches unresolved identities → proposes `employee_id` + `match_confidence`; below threshold → queued for manual confirmation (never auto-linked — the Ironclad rule applies to identity too). Grounding: arXiv:1911.01874 (*Revisiting the probabilistic method of record linkage*).

**Tests**: `ingestWebhook.test.js` — signature verify/reject (tampered body, stale timestamp, wrong secret), staging fidelity (bytes→JSONB), processor translation per source fixture, rate-limit engagement, identity exact/probabilistic/manual paths; `identityBridge.unit.test.js` for the matcher contract.

## 4.4 Agent Prompt Caching (`backend/agent/loop.js`)

**Problem**: `loop.js:105–142` appends `volatileBlock` (per-turn timestamps) **inside** `systemInstruction`, so the prefix never repeats and no provider cache can hit. Every turn re-processes ~10.4k tokens (constitution + 13 tool schemas + entity summaries) — the audit's 650%-inflation estimate.

**Fix**:
- Split: **static prefix** (constitution, tool schemas, stable entity summaries — changes only on graph reload) vs **dynamic suffix** (per-turn snapshot timestamps, volatileBlock) moved into the per-turn message content.
- Provider enablement: Gemini **explicit context caching** (`cachedContent`, cache the static prefix with a TTL) and Anthropic **prompt caching** (`cache_control: {type:'ephemeral'}` on the prefix blocks) — per provider docs; the classifier/router already picks the tier, caching applies per provider client in `backend/agent/providers/`.
- Instrument: log `usage.cached_input_tokens` per turn so the ~90% prefix-cost reduction is *observable*, not assumed.
- The 13 tool schemas already come from static definitions — ideal cache content.

**Tests**: `agentLoop.unit.test.js` extension — static prefix byte-stable across turns (cache-able), dynamic data lands outside the prefix, provider request snapshots include cache directives, cached-token accounting recorded.

## 4.5 Master Test Suite & Regression Pass

- New suites registered in `backend/tests/run-all.js`: uuidMigration, multiTenancy, replaceability, concentration, scoreHistory, mutations, changeImpact, volatility, crudRoutes, ingestWebhook, identityBridge, agentLoop (extended).
- **Property tests** (math monotonicity — see master plan §5) run as a dedicated suite.
- Python: `test_risk_engines.py` unchanged green + new Splink-matcher contract test (`backend/risk_engine/identity_matcher.py` + test).
- Full `npm test` + frontend build; graphify re-run: expect zero import cycles, mutation flow visible as `routes → mutations.js → changeImpact` hub.

---

## Phase 4 execution order
4.1 (schema) → 4.2 (CRUD on mutations.js) → 4.3 (receiver + identity + importer) → 4.4 (caching, independent) → 4.5 (full pass).
