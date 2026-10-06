# Horquva Operational Continuity Platform — MVP Development Plan

> **Document Type:** Authoritative Engineering Development Plan  
> **Date:** October 6, 2026  
> **Deadline:** October 31, 2026 (25 calendar days / ~18 working days)  
> **Team:** 2 Engineers (Engineer A: Backend & Data; Engineer B: Frontend & Product Workflows)  
> **Branch:** `mvp/v1-continuity`  
> **Validated Against:** SRS v0–v2, WBS, Deep Feasibility Study, Master Implementation Plan v2, Live Codebase AST

---

## 1. Executive Assessment: What's Done vs. What Remains

### 1.1 Codebase Verification Matrix (Validated Against Graphify — 1,867 nodes, 2,789 edges)

| Epic/Area | SRS Requirement IDs | Status | Evidence |
|---|---|---|---|
| **Greenfield PostgreSQL Schema** (Epic 1.1) | DATA-01 to DATA-06 | ✅ COMPLETE | `backend/db/migrations/001_initial_schema.sql` — 12 tables + pgcrypto |
| **Shared Types** (`@horquva/types`) (Epic 1.2) | — | ✅ COMPLETE | `packages/types/src/index.ts` — CanonicalEntity, Edge, Fact, Checks, Simulations |
| **Connector SDK + ReadOnlyHttpGuard** (Epic 2.1) | CON-04, SEC-04 | ✅ COMPLETE | `backend/src/connectors/sdk/{base,guard,types}.ts` |
| **n8n Connector** (Epic 2.4) | CON-01 to CON-03, V0-04/05 | ✅ COMPLETE | `backend/src/connectors/n8n/index.ts` + `collector.ts` |
| **Entra ID Connector** (Epic 2.2) | CON-05, CON-06 | ✅ COMPLETE | `backend/src/connectors/entra/index.ts` |
| **Google Workspace Connector** (Epic 2.3) | CON-05, CON-07 | ✅ COMPLETE | `backend/src/connectors/google/index.ts` |
| **OpenAI/Anthropic Admin Connectors** (Epic 2.6) | CON-08 | ✅ COMPLETE | `backend/src/connectors/ai_admin/index.ts` |
| **CSV Ingestion Engine** (Epic 2.7) | CON-09 | ✅ COMPLETE | `backend/src/connectors/csv/index.ts` |
| **Graphology In-Memory Graph** (Epic 5.1) | DATA-01 | ✅ COMPLETE | `backend/src/domain/graph/index.ts` |
| **Deterministic Checks Engine (C1–C4)** (Epic 5.2) | SIM-07 | ✅ COMPLETE | `backend/src/domain/checks/index.ts` |
| **What-If Simulations (S1–S3)** (Epic 6) | SIM-01 to SIM-05 | ✅ COMPLETE | `backend/src/domain/simulation/index.ts` |
| **Attestation Engine + Mailer** (Epic 7) | CHK-01 to CHK-06 | ✅ COMPLETE | `backend/src/attestation/{engine,mailer}.ts` |
| **Ask Horquva (Gemini 2.0 Flash)** (Epic 11.1) | AI-01 to AI-05 | ✅ COMPLETE | `backend/src/ai/gemini.ts` |
| **v0 n8n Check Route** (Epic 9) | V0-01 to V0-08 | ✅ COMPLETE | `backend/src/routes/v0.ts` |
| **A/B Testing Engine** | — | ✅ COMPLETE | `backend/src/domain/ab/index.ts` |
| **API Routes (Overview, Inventory, S1-S3, Ask, Briefing)** | — | ✅ PARTIAL | `backend/src/routes/continuity.ts` — 7 endpoints live |
| **Vitest Test Suite** | NFR-10 | ✅ COMPLETE | 21/21 green — `tests/{ai,api,attestation,domain}` |
| **Frontend Route Structure** (30 pages) | UI-01 to UI-08 | ✅ COMPLETE | All 30 Next.js 16 route files exist |
| **UI Design System** (23 atomic components) | — | ✅ COMPLETE | `frontend/components/ui/*.tsx` (23 files) |
| **Shell Components** (10 files) | — | ✅ COMPLETE | `frontend/components/shell/*.tsx` |
| **Feature Views** (all 7 screens) | — | ✅ COMPLETE | `frontend/features/*/*.tsx` (27 feature files) |
| **Frontend API Clients** (16 modules) | — | ✅ COMPLETE | `frontend/lib/api/*.ts` (16 files) |
| **Foundation Utilities** | — | ✅ COMPLETE | `frontend/lib/{cn,format,theme,permissions,session,useResource}.ts` |

### 1.2 What Is NOT Yet Built (The Remaining ~35% of MVP)

| Gap ID | Missing Module | SRS IDs | Epic | Risk Level |
|---|---|---|---|---|
| **G-01** | Identity Resolution Engine + Review Queue backend service | ID-01, ID-02, ID-03 | Epic 3 | 🔴 HIGH |
| **G-02** | SCD2 Fact Store insertion/versioning logic (backend service) | DATA-02, DATA-03, DATA-04 | Epic 4.1 | 🔴 HIGH |
| **G-03** | Snapshot Diff & Change Event Detection engine | CHG-01, CHG-02 | Epic 4.2 | 🔴 HIGH |
| **G-04** | Departure Workflow lifecycle management | HND-01 to HND-05 | Epic 8.1 | 🔴 HIGH |
| **G-05** | Handover Pack Generator (JSON manifest) | HND-02, RPT-01 | Epic 8.1/8.2 | 🟡 MEDIUM |
| **G-06** | Successor Assignment & Acceptance API | HND-03, HND-04 | Epic 8.1 | 🔴 HIGH |
| **G-07** | Post-Departure 72h Verification Daemon | HND-06 | Epic 8.3 | 🟡 MEDIUM |
| **G-08** | pg-boss Background Job Queue (scheduled syncs, reminders, briefing) | CON-10, CON-11, CHK-04 | Epic 4/7 | 🔴 HIGH |
| **G-09** | Expanded What-If: S4 Combined Scenario | SIM-03 | Epic 6.1.4 | 🟡 MEDIUM |
| **G-10** | Worst Single Loss Ranking (S6) | SIM-06 | Epic 6.1.5 | 🟡 MEDIUM |
| **G-11** | Weekly Briefing Email Dispatch (SMTP auto-send) | CHG-03 | Epic 11.2 | 🟡 MEDIUM |
| **G-12** | PDF Handover Pack & Scan Report Generation | RPT-01, RPT-02, RPT-03 | Epic 8.2 | 🟡 MEDIUM |
| **G-13** | Connector Status/Connections Screen API | CON-10 | Epic 2 | 🟢 LOW |
| **G-14** | RBAC Middleware enforcement on all API routes | SEC-02 | Epic 1.3 | 🔴 HIGH |
| **G-15** | Audit Log Service (write middleware) | SEC-06 | Epic 1.3 | 🟡 MEDIUM |
| **G-16** | SSO Authentication (Entra OAuth / Google OIDC) | SEC-01 | Epic 1.3 | 🔴 HIGH |
| **G-17** | Missing backend REST API endpoints (departures, actions, people/teams, assets detail, graph/neighbourhood, changes, settings, identity-queue) | — | Epic 9 | 🔴 HIGH |
| **G-18** | Database migration runner script | — | Epic 1.1 | 🟢 LOW |
| **G-19** | Frontend ↔ Backend live integration (replace mock data with real API calls) | — | — | 🔴 HIGH |
| **G-20** | Expanded E2E Playwright test suite | NFR-10 | Epic 12 | 🟢 LOW |
| **G-21** | Daily Snapshot Storage (TRD-01) | TRD-01 | — | 🟡 MEDIUM |
| **G-22** | Change Feed API endpoint | CHG-01, CHG-02 | — | 🟡 MEDIUM |

---

## 2. MVP Scope Prioritization (Must-Ship vs. Can-Defer)

> [!IMPORTANT]
> With 18 working days and 2 engineers, we have **36 engineer-days** total. We must ruthlessly prioritize. The following items are scoped as **Must Ship** for the MVP by Oct 31.

### 2.1 MUST SHIP (MVP-Critical — Blocks Demo/First Customer)

| Priority | Gap | Description | Days Est. |
|---|---|---|---|
| P0 | G-16 | SSO Authentication (Entra/Google) | 2 |
| P0 | G-14 | RBAC Middleware on all routes | 1 |
| P0 | G-02 | SCD2 Fact Store service (insert/version/override logic) | 2 |
| P0 | G-01 | Identity Resolution Engine + Review Queue | 2 |
| P0 | G-03 | Snapshot Diff & Change Event Detection | 2 |
| P0 | G-08 | pg-boss Background Job Queue (sync scheduling, reminders) | 2 |
| P0 | G-17 | Remaining REST API endpoints (departures, actions, people/teams, assets, graph, changes, settings, identity-queue) | 4 |
| P0 | G-04 | Departure Workflow lifecycle backend | 2 |
| P0 | G-06 | Successor Assignment & Acceptance flow | 1.5 |
| P0 | G-05 | Handover Pack Generator (JSON manifest) | 1 |
| P0 | G-19 | Frontend ↔ Backend live integration | 4 |
| P0 | G-15 | Audit Log write middleware | 1 |
| P0 | G-22 | Change Feed API | 1 |

### 2.2 SHOULD SHIP (High Value — Complete if Ahead of Schedule)

| Priority | Gap | Description | Days Est. |
|---|---|---|---|
| P1 | G-07 | Post-Departure 72h Verification Daemon | 1 |
| P1 | G-09 | S4 Combined Scenario Simulation | 1 |
| P1 | G-10 | S6 Worst Single Loss Ranking | 0.5 |
| P1 | G-11 | Weekly Briefing Email auto-dispatch | 1 |
| P1 | G-12 | PDF Handover Pack & Scan Report | 2 |
| P1 | G-21 | Daily Snapshot Storage (TRD-01) | 0.5 |
| P1 | G-18 | Migration runner script | 0.5 |

### 2.3 COULD SHIP (Nice-to-Have — Post-MVP Polish)

| Priority | Gap | Description | Days Est. |
|---|---|---|---|
| P2 | G-20 | Expanded E2E Playwright suite | 2 |
| P2 | G-13 | Connector status detail API | 0.5 |

---

## 3. Sprint Plan: 3 Sprints × 6 Working Days

> **Sprint cadence:** 6 working days each  
> **Sprint 1:** Oct 6–13 (Mon–Mon) — Core Backend Services  
> **Sprint 2:** Oct 14–21 (Tue–Tue) — API Layer + Integration  
> **Sprint 3:** Oct 22–29 (Wed–Wed) — Integration, Polish & Hardening  
> **Buffer:** Oct 30–31 (Thu–Fri) — Bug fixes, final verification  

---

### Sprint 1: Core Backend Services & Auth (Oct 6–13)

#### Engineer A (Backend & Data)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| **D1 (Oct 6)** | SCD2 Fact Store Service | G-02 | `backend/src/domain/facts/factStore.ts` — insert, version, override, unknown semantics | DATA-02, DATA-03, DATA-04 |
| **D2 (Oct 7)** | SCD2 Fact Store + unit tests | G-02 | Tests proving unknown ≠ false, confirmed overrides stated, re-confirmation on source change | DATA-03, DATA-04 |
| **D3 (Oct 8)** | Identity Resolution Engine | G-01 | `backend/src/identity/matcher.ts` — email normalization, alias matching, service account detection | ID-01 |
| **D4 (Oct 9)** | Identity Review Queue Service | G-01 | `backend/src/identity/queue.ts` — queue insertion, resolution actions (link, mark_service, mark_departed) | ID-02, ID-03 |
| **D5 (Oct 10)** | Snapshot Diff & Change Engine | G-03 | `backend/src/domain/changes/diffEngine.ts` — detect person_left, owner_changed, workflow_edited, model_swapped, failures_spiked, credential_risk | CHG-01, CHG-02 |
| **D6 (Oct 13)** | pg-boss Job Queue + Scheduled Sync | G-08 | `backend/src/jobs/scheduler.ts` — recurring connector sync (hourly), reminder jobs (D3/D7 escalation), weekly briefing trigger | CON-10, CON-11 |

**Sprint 1 / Engineer A Acceptance Criteria:**
- [ ] `factStore.insert()` correctly creates SCD2 versioned facts with grade precedence
- [ ] `unknown` value is never treated as `false` in any code path
- [ ] Identity matcher resolves 95%+ of standard email formats
- [ ] Unmatched accounts land in identity_queue with `status='pending'`
- [ ] Change events are correctly categorized and impact_summary populated
- [ ] pg-boss runs sync jobs on schedule and handles failures gracefully

---

#### Engineer B (Frontend & Product Workflows)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| ✅ **D1 (Oct 6)** | SSO Authentication — Entra ID OAuth 2.0 | G-16 | `backend/src/auth/entra.ts` — MSAL token validation, user session creation | SEC-01 |
| ✅ **D2 (Oct 7)** | SSO Authentication — Google OIDC | G-16 | `backend/src/auth/google.ts` — ID token validation, combined auth middleware | SEC-01 |
| ✅ **D3 (Oct 8)** | RBAC Middleware + Audit Log middleware | G-14, G-15 | `backend/src/middleware/{rbac,auditLog}.ts` — role enforcement on every route, append-only audit writes | SEC-02, SEC-06 |
| ✅ **D4 (Oct 9)** | Departure Workflow Backend — Initiation + Pack Compilation | G-04, G-05 | `backend/src/handover/departureService.ts` — POST /api/departures, auto-generate handover pack JSON from S1 simulation | HND-01, HND-02 |
| ✅ **D5 (Oct 10)** | Departure Workflow Backend — Successor Assignment + Acceptance | G-06 | `backend/src/handover/successionService.ts` — successor naming, acceptance API, stage tracking (Initiated→Named→Accepted→Disabled→Verified) | HND-03, HND-04, HND-05 |
| ✅ **D6 (Oct 13)** | Departure Workflow Backend — Integration & Tests | G-04/G-05/G-06 | Integration tests: departure creation → pack generation → successor flow → stage transitions | HND-01 to HND-05 |

**Sprint 1 / Engineer B Acceptance Criteria:**
- [x] Microsoft Entra SSO and Google OIDC both produce valid session tokens *(verified against fake IdPs in tests; live tenant sign-in pending app registrations)*
- [x] RBAC middleware blocks `viewer` from write operations, blocks `reviewer` from admin routes
- [x] Every API call writes to audit_log *(reads, writes, denials and sign-in/out — reads added Oct 6 at owner's request)*
- [x] `POST /api/departures` creates departure and triggers S1 simulation to build handover pack
- [x] Successor can accept via `POST /api/handover/{id}/accept` *(route is `/api/handovers/{id}/accept`; only the named successor)*
- [x] Departure progresses through all 5 stages correctly

**Sprint 1 / Engineer B Progress Log:**

- **D1 — Entra SSO ✅ (Oct 6, `8fdf3d3b`)**
  - Built: generic OIDC authorization-code + PKCE flow (`backend/src/auth/oidc.ts`), single-tenant Entra provider (`backend/src/auth/entra.ts`), HS256 httpOnly session cookie (`backend/src/auth/session.ts`), routes in `backend/src/routes/auth.ts`.
  - Endpoints: `GET /api/auth/providers`, `GET /api/auth/session`, `POST /api/auth/sign-out`, `GET /api/auth/:provider/start`, `GET /api/auth/:provider/callback`, `POST /api/auth/dev/sign-in` (only with `AUTH_DEV_LOGIN=true`, never in production).
  - Deviation from plan: used `jose` + standard OIDC instead of MSAL, so Google (D2) reuses the same flow. ID tokens verified against tenant JWKS with pinned issuer/audience/nonce.
  - Access rule: SSO proves identity only; the email must match an existing user account (currently `DataService` in-memory users) or sign-in is refused (`not_provisioned`).
  - Tests: `backend/tests/auth/entra.test.ts` (16). Backend suite 112/112.
  - Open: needs a real Entra app registration (`ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, redirect URI `<PUBLIC_API_URL>/api/auth/microsoft/callback`) for a live sign-in. Frontend sign-in button wiring is Sprint 3 D13.
- **D2 — Google OIDC + combined auth middleware ✅ (Oct 6)**
  - Built: `backend/src/auth/google.ts` (reuses the D1 OIDC flow; accepts both Google issuer spellings), `backend/src/auth/middleware.ts` (`resolveUser`, `attachUser`, `requireAuth` → `req.user`, provider-agnostic).
  - Workspace-only: `hd` claim must equal `GOOGLE_WORKSPACE_DOMAIN` and `email_verified` must be true; personal Gmail is refused (`account_rejected`). The `hd` authorize param is only a hint, so the claim is enforced after signature verification.
  - Server now fails at boot if a provider is half-configured, and logs which SSO providers are active.
  - Middleware is not mounted on API routes yet — enforcement is D3 (RBAC).
  - Tests: `backend/tests/auth/google.test.ts` (11). Backend suite 123/123; live boot verified (`/api/auth/providers` 200, `/api/auth/session` 401 when signed out).
  - Open: needs a Google OAuth client (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_WORKSPACE_DOMAIN`, redirect URI `<PUBLIC_API_URL>/api/auth/google/callback`).
- **D3 — RBAC + Audit Log middleware ✅ (Oct 6)**
  - Built: `backend/src/middleware/rbac.ts` (single policy table, mounted once at `/api` in `server.ts`), `backend/src/middleware/auditLog.ts`, `backend/src/middleware/requestContext.ts` (AsyncLocalStorage so deep code knows the actor).
  - Policy (mirrors `frontend/lib/permissions.ts`): **public** — `GET/POST /api/attestation/review/:token` (magic link), `POST /api/v0/n8n-check`; **read** (any signed-in role) — all GETs not listed below, what-if simulation POSTs, Ask, succession-test; **edit** (admin, reviewer) — assign-backup, change acks, handover accept/decline; **departure** (admin or HR manager) — initiate departure, name successors, send acceptance requests; **admin** — connections, users, audit-log, identity-queue, org settings PUT, campaign creation, accept-risk.
  - Fails closed: any route not in the table needs a session for GET and **admin** for every other method, so a new route can't ship unprotected by accident.
  - Roles are re-read per request, so a role change takes effect immediately (no stale cookie privileges).
  - Audit: every write, every 401/403 (`ACCESS_DENIED`, with actor or `anonymous`), `SIGN_IN` / `SIGN_IN_FAILED` / `SIGN_OUT`. DataService domain entries (e.g. `INITIATE_DEPARTURE`) now record the **real** signed-in user instead of the hard-coded `user:admin`; writes with no domain entry get a generic `API_<METHOD>` entry; no double-logging.
  - ~~Deviation: successful reads are not audited~~ — **reversed Oct 6 at the owner's request:** every successful read is now logged as API_GET (actor, path, status, IP); CORS preflights are skipped. In-memory retention raised from 500 to 20,000 entries (AUDIT_LOG_CAPACITY) so page loads don't evict real actions; it should move to the Postgres udit_log table when persistence lands. The Audit Log screen will now show reads too — filter by action to hide them.
  - Tests: `backend/tests/middleware/rbac.test.ts` (17); existing API tests now sign a real session via `backend/tests/helpers/session.ts` (`authedFetch`). Backend suite 140/140; live boot verified (anonymous 401, viewer 200 on reads / 403 on `/api/users`, audit entries carry the right actors).
  - ⚠️ Impact on frontend: the backend now returns 401 to any request without a session. Local frontend development against the real backend needs a signed-in session (`AUTH_DEV_LOGIN=true` + `POST /api/auth/dev/sign-in`) until the sign-in page is wired (Sprint 3 D13). An automatic "act as this user when no session" dev bypass was considered and **not** added.
  - Not done here: successor-only enforcement on handover accept/decline (any reviewer can currently act on any handover) — belongs to D5 (successor acceptance).
  - Requested follow-up (blocked): making "no session → 401" local-dev-optional (enforced only in production / `AUTH_REQUIRED=true`) was attempted at the owner's request but blocked by the agent's auto-mode safety classifier. Owner to apply manually or grant the edit permission.
  - **Resolved differently — dev sign-in (Oct 6):** backend auth stays fully on; local dev signs in automatically instead. `frontend/lib/session.tsx` in dev mode calls `POST /api/auth/dev/sign-in` (backend `AUTH_DEV_LOGIN=true`, ignored in production) and the user-menu role switcher signs in as the matching seeded user — admin → `alex@acme.com`, reviewer → `chen@acme.com`, viewer → `maya@acme.com` — so the backend enforces the same role the UI shows. Screens are held until the first sign-in settles (no 401 race on cold start). Replaced the old fake `usr-dev-admin` session that never reached the backend. Verified live: cold start → session 401 → dev sign-in 200 → all data calls 200; switching to viewer → backend sees `user:maya`, `/api/users` → 403. Production: unchanged (real SSO only).
- **D4 — Departure initiation + handover pack ✅ (Oct 6)**
  - Engineer A's push already had `POST /api/departures` creating a departure with a handover row per owned asset. Gap vs plan: it never ran S1, built no handover pack (HND-02 / G-05), and did no validation.
  - Built: `backend/src/handover/departureService.ts` — `initiateDeparture()` (validation + creation) and `buildHandoverPack()` (runs S1 `simulateDeparture`, freezes a versioned JSON manifest on the departure). Route now goes through the service; new `GET /api/departures/:id/handover-pack`.
  - Pack contents per owned asset: criticality + evidence grade, documented / fallback as `yes | no | unknown` (missing facts are `unknown`, never `no` — DATA-03), `orphanedOnDeparture` from S1, who still covers it (owner/backup), weekly runs. Plus personal-credential automations, downstream impact, summary counts, and the raw S1 result (for the RPT-01 PDF later).
  - Validation: person must exist and be a `person` entity (404); leave date must parse (400, normalized to ISO); **one open departure per person** (409; "open" = any stage before `verified`). `detectedFrom` accepted for Entra/Google-detected leavers.
  - `POST /api/departures` response is backward compatible (`{ id }`) plus `handoverPack` summary.
  - Existing API test fix: the succession-test case silently created a second Omar departure; it now reuses the first one (the old code passed only because `succession-test` ignores the departure id).
  - Tests: `backend/tests/handover/departureService.test.ts` (12, hand-checked against `handCheckableTruth.json`) + 2 new API tests. Backend suite 154/154.
  - ⚠️ Found, not fixed (in `GET /api/departures/:id`, Engineer A's route; fix during D5/D6 or Sprint 2 D8 wiring): (1) `suggestion` falls back to a **hard-coded "Chen Wei"** for every asset with no backup — fabricated data; (2) `currentBackup.grade` is always `'confirmed'` and `observedAt` is "now" regardless of the real edge — misstated evidence; (3) `undocumented` counts assets with **no** `documented` fact as undocumented — unknown shown as "no" (DATA-03); (4) `team` is hard-coded `'Platform Engineering'`.
- **D5 — Successor naming, acceptance + 5-stage lifecycle ✅ (Oct 6)**
  - Gap vs plan: Engineer A's `DataService` methods named successors with no validation, let **any** reviewer accept or decline **anyone's** handover (even unrequested), duplicated ownership edges on repeat accepts, and had **no way** to reach `account_disabled` or `verified`.
  - Built: `backend/src/handover/successionService.ts` (logic moved out of `DataService`; old methods removed). Routes: `PUT /api/departures/:id/successors`, `POST /api/departures/:id/acceptance-requests`, new `POST /api/departures/:id/account-disabled` and `POST /api/departures/:id/verify`, `POST /api/handovers/:id/{accept,decline}`.
  - Stage rules: the first three stages are **derived** from handover rows — `successor_named` only when every asset has a successor, `accepted` only when every asset is accepted; a decline moves the departure back to `initiated` and clears later timestamps. `account_disabled` can be recorded at any point (accounts get disabled on the leave date whether or not handover finished; the audit entry records how many were unaccepted) and from then on the stage only moves forward. `verified` requires `account_disabled` **and** every handover accepted; a verified departure no longer counts as open.
  - Naming (HND-03): asset must belong to the departure; successor must be a real `person`, not the leaver, and not someone with an open departure; validation is atomic (all-or-nothing); re-naming resets a pending request; accepted handovers are locked; no changes after account disable.
  - Responding (HND-04): only when `requested`; **only the named successor** (signed-in user matched to their person record by email) — admins cannot accept on someone's behalf, since acceptance becomes a `confirmed` ownership fact. RBAC for accept/decline is therefore `read` (any role) with the identity check in the service. Accept writes one confirmed `owns` edge + confirmed `status=handed_over` fact (with `sourceRef` = handover id).
  - Tests: `backend/tests/handover/successionService.test.ts` (18). Existing API tests updated to the real flow (name → request → successor accepts); `reviewer.test.ts` previously accepted a handover that had no successor at all. Backend suite 172/172.
  - Open / later: acceptance requests don't send email yet (mailer exists — candidate for Sprint 3 D14 reviewer surfaces); successors without an OBA account (e.g. Priya) cannot respond until magic-link handover acceptance exists (D14); HND-06's 72h verifier (Engineer A, Sprint 3 D13) should call `verifyDeparture` automatically.
- **D6 — Departure workflow integration + detail-view truthfulness ✅ (Oct 6)**
  - Built: `backend/tests/integration/departureLifecycle.test.ts` — one departure driven end to end through the real HTTP server, RBAC and signed sessions (admin, Chen as reviewer, Maya as viewer): initiate → pack checked against the fixture → viewer blocked → successors named → requests sent → non-successors (incl. admin) refused → accept → decline re-opens naming → re-name → accept → S1 re-run shows **no orphaned assets** (ownership really moved, confirmed edges) → verify refused until account disabled → disabled → verified → closed departure refuses changes → the **exact audit trail** (15 entries, real actors, denials included).
  - Fixed the four D4 findings in `GET /api/departures/:id` (they would have made the integration test assert false data): `suggestion` is now the recorded backup or `null` (removed the hard-coded "Chen Wei"); `currentBackup` reports the backup edge's real grade / source / since-date instead of always `confirmed` / "now"; `undocumented` lists only assets with a recorded `documented = false` (missing fact ≠ undocumented, DATA-03); `team` comes from a `member_of` edge or is `null` (removed hard-coded "Platform Engineering"). All four fields were already nullable in the frontend's `DepartureDetail` type.
  - Tests: 10 integration steps. Backend suite 182/182.
  - **Sprint 1 / Engineer B complete** — all six acceptance criteria checked.
  - Note: `tests/ai/gemini.test.ts` and `tests/api/server.test.ts` can time out intermittently — they try the Postgres in `backend/.env` first (legacy Supabase, schema absent) and fall back after 5 s. Pre-existing; passes on re-run.

---

### Sprint 2: API Surface + Live Frontend Integration (Oct 14–21)

#### Engineer A (Backend & Data)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| **D7 (Oct 14)** | REST API: Departures + Handover endpoints | G-17 | `backend/src/routes/departures.ts` — GET /api/departures, GET /api/departures/:id, POST /api/departures, POST /api/handover/:id/accept | HND-01 to HND-05 |
| **D8 (Oct 15)** | REST API: Actions + Change Feed | G-17, G-22 | `backend/src/routes/actions.ts` — GET /api/actions (ranked failing checks), PATCH /api/actions/:id/status. `backend/src/routes/changes.ts` — GET /api/changes (paginated feed), POST /api/changes/:id/acknowledge | CHG-01 |
| **D9 (Oct 16)** | REST API: People/Teams + Assets Detail | G-17 | `backend/src/routes/people.ts` — GET /api/people/teams, GET /api/people/teams/:id, GET /api/people/:id. `backend/src/routes/assets.ts` — GET /api/assets, GET /api/assets/:id (with fact history) | UI-03, UI-04 |
| **D10 (Oct 17)** | REST API: Graph Neighbourhood + Identity Queue | G-17 | `backend/src/routes/graph.ts` — GET /api/graph/neighbourhood/:id (2-hop). `backend/src/routes/identity.ts` — GET /api/identity-queue, POST /api/identity-queue/:id/resolve | UI-05, ID-03 |
| **D11 (Oct 18)** | REST API: Settings, Connections, Reviewer endpoints | G-17, G-13 | `backend/src/routes/settings.ts` — GET /api/connections (status), POST /api/connections/:id/sync. `backend/src/routes/reviewer.ts` — GET /api/me/tasks | CON-10, UI-08 |
| **D12 (Oct 21)** | S4 Combined Scenario + S6 Worst Loss Ranking | G-09, G-10 | Extend `SimulationEngine` with `simulateCombined()` and `rankWorstLosses()`. New route: POST /api/simulations/combined, GET /api/simulations/worst-losses | SIM-03, SIM-06 |

**Sprint 2 / Engineer A Acceptance Criteria:**
- [ ] All 15+ REST API endpoints respond correctly with typed JSON
- [ ] Actions endpoint returns checks ranked by criticality → missing backup → run volume
- [ ] Graph neighbourhood returns 2-hop subgraph with correct node/edge types
- [ ] Identity queue supports all 3 resolution actions with audit logging
- [ ] S4 combined simulation correctly detects compounding failures
- [ ] S6 worst-loss ranks vendors/models, never individual people

---

#### Engineer B (Frontend & Product Workflows)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| ✅ **D7 (Oct 14)** | Wire Overview + Assets screens to live backend | G-19 | `frontend/features/overview/OverviewView.tsx` → real `/api/continuity/overview`. `frontend/features/assets/AssetsView.tsx` → real `/api/assets` | UI-01, UI-04 |
| ✅ **D8 (Oct 15)** | Wire Departures + Handover screens to live backend | G-19 | `frontend/features/departures/*.tsx` → real `/api/departures`. Initiate departure side sheet → POST. Succession panel → live S3 calls | UI-02 |
| ✅ **D9 (Oct 16)** | Wire People/Teams + Actions screens | G-19 | `frontend/features/people/*.tsx` → real `/api/people/teams`. `frontend/features/actions/*.tsx` → real `/api/actions` | UI-03, UI-07 |
| ✅ **D10 (Oct 17)** | Wire Map + What-If screens | G-19 | `frontend/features/map/MapView.tsx` → real `/api/graph/neighbourhood`. `frontend/features/what-if/WhatIfView.tsx` → real S1-S4 + S6 | UI-05, UI-06 |
| **D11 (Oct 18)** | Wire Settings (Connections, Identity Queue, Audit Log) | G-19 | `frontend/features/settings/*.tsx` → real settings APIs. Identity queue interactive resolution | UI-08 |
| **D12 (Oct 21)** | Wire Ask OBA + Attestation Form + Change Feed | G-19 | `frontend/features/ask/AskView.tsx` → real assistant API. `frontend/features/attest/AttestForm.tsx` → real attestation. `frontend/components/shell/BellPopover.tsx` → real `/api/changes` | AI-01, CHK-02 |

**Sprint 2 / Engineer B Acceptance Criteria:**
- [ ] All 7 core screens render real data from backend (no mock data paths remain)
- [x] Overview shows real headline count ("X of Y critical assets fully covered") *(D7; now also separates unknown from exposed)*
- [x] Departures screen shows real departures with correct stage progression *(D8; stages 4–5 recorded from the workbench, 1–3 follow the handover table)*
- [x] What-If screen executes combined scenarios and shows blast radius *(D10; also fixed the impact walk, which ran in the wrong direction)*
- [ ] Attestation form submits answers and facts update to `confirmed`
- [ ] Ask OBA returns grounded answers with entity chip links

**Sprint 2 / Engineer B Progress Log:**

- **D7 — Overview + Assets on the live backend ✅ (Oct 6)**
  - Found: the Overview called three endpoints that didn't exist (`/api/changes/summary`, `/api/continuity/spof-assets`, `/api/nav-counts` → 404) and **hid every failure behind fabricated data** — "No changes since your last visit", "Zero failing checks", empty departure/SPOF lists, sidebar badges of 0. The headline count put *unknown* assets under *exposed* (DATA-03). The Assets catalog stamped every owner/backup `confirmed` with an invented source and "now", defaulted missing criticality to `medium` and missing run volume to `0`, re-ran all checks per row (O(n²)), and its "Automations" tab counted kind `'workflow'`, which the backend never sends (always 0; the tests used the same wrong kind, so they passed).
  - Backend: new `GET /api/changes/summary` ("since your last sign-in", from the audit log's `SIGN_IN` entries; first visit = last 7 days; `backupsLost` / `newlyExposed` return `null` = not tracked until snapshots exist, TRD-01), `GET /api/continuity/spof-assets` (critical/high assets with a sole owner and no backup, or on someone's personal credentials; lists assets, never ranks people — SEC-07), `GET /api/nav-counts` (open departures due ≤30 days, open critical actions, pending identities — `null` for non-admins). Read models in `backend/src/views/overviewViews.ts`.
  - Backend: headline metrics now **covered / exposed (known gap) / unknown (no known gap, something unconfirmed)**, adding `unknownCriticalAssets` to the shared `HeadlineMetrics` type (B-01). Shared evidence helpers `backend/src/views/factViews.ts`: grades/sources/dates come from the real edge or fact; missing owner → `unknown` (ID-02), missing backup → `none` (what C1 checks), missing criticality/docs/fallback/runs → `unknown`. Assets route uses them and evaluates checks once per request.
  - Frontend: removed every `.catch()` fallback on the Overview and the nav-count fallback in `AppShell` — failures now show their error state (badges are hidden, not 0). Hero sentence words real dates ("1 person left in the last 7 days.") and omits untracked kinds instead of claiming "no changes". Briefing preview strips markdown and has an error state. Assets kind tabs map to backend kinds (`automation`; "Systems" = `app` + `process`); the "Unknown Facts" counter matches its filter.
  - Tests: backend `tests/api/overview.test.ts` (12, hand-checked against the fixture); frontend overview failure-path + hero wording tests, assets kind-tab test, briefing preview tests; fixed the asset fixtures' fake `'workflow'` kind. Backend 195/195; frontend 188/189 (the one pre-existing `EmptyState` failure).
  - Verified live (dev sign-in as Alex): every Overview request 200; Overview shows "1 of 4 critical assets fully covered", 3 SPOFs (Billing Sync 500/wk → Omar, Customer Onboarding 350/wk → Sarah, Payroll 120/wk → Omar); Assets shows all 6 automations with real owners/backups/runs and "Automations 6".
  - Not in D7: the bell still shows "All caught up" if `/api/changes` fails (bell wiring is D12); Actions still default missing criticality to `medium` (D9).
- **D8 — Departures + Handover screens on the live backend ✅ (Oct 6)**
  - Found: **both person pickers were empty** (the "Initiate Departure" sheet and the successor picker got neither options nor a search function), so the flow could not be used from the UI at all; the people endpoint (`/api/continuity/inventory`) only read Postgres and failed locally. "Save" re-sent every row, so after the first acceptance the D5 lock rejected every save. No UI for stages 4–5. The acceptance toast claimed "Confirmation emails dispatched" (no email is sent). A failed succession test was swallowed and the old projection stayed on screen. "Request acceptance" only enabled when a *critical* asset had a successor. The overload text said 30% (backend rule: ≥40% and ≥3). No role gating (viewers saw pickers and buttons). List grouping used only the leave date (a verified departure with a future date sat under "Upcoming"). The detail API invented a "watch log" event, and the Overview labelled `hasAlert` as "Post-departure watch alerts detected".
  - Backend: inventory now reads the same graph as every other screen (Postgres snapshot, else DataService); `nameSuccessors` treats an unchanged accepted row as a no-op; grouping = departed (leave date passed, or account disabled/verified) → in_handover (any successor named/asked) → upcoming; watch log is empty until the HND-06 verifier exists.
  - Frontend: pickers load real people (`fetchPeople`; the leaver is excluded from successor options) with a retry on failure; workbench saves only changed rows, locks accepted rows and closed departures, gates editing to HR/admin (viewers see successor names as text); new "Record account disabled" / "Verify & close departure" actions (verify disabled with the reason until every asset is accepted); honest toasts with real counts; succession panel shows a failure state and keeps Save available; overload copy matches the backend rule; "Initiate Departure" hidden from roles that can't use it; empty-state text no longer shown while loading/failed.
  - Tests: backend `tests/api/departuresScreen.test.ts` (4) + no-op re-save unit test; frontend departures suite 2 → 8 (viewer read-only, changed-rows-only save, simulation failure, stage 4, stage 5 gating, honest acceptance toast). Backend 200/200; frontend 194/195 (pre-existing `EmptyState` failure).
  - Verified live as Alex: picked Omar in the side sheet → `POST /api/departures` 201 → workbench → picked Chen as successor → `PUT …/successors` 200 → succession test re-ran → "Request Successor Acceptance" → "1 successor was asked to accept. They respond after signing in to OBA." and the row shows REQUESTED.
  - Still open: successors answer only via the API until the reviewer surface `/my` is wired (Sprint 3 D14); no email is sent with the request.
- **D9 — People & Teams + Actions on the live backend ✅ (Oct 6)**
  - Found (People): team membership was a **hard-coded roster** in the route (`TEAMS_CONFIG`) — invented org structure. Holdings stamped every backup `confirmed` / "attestation" / now, defaulted missing criticality to `medium`, invented job titles ("Software Engineer"), and `pendingConfirmations` was a hard-coded `0`, which the UI turned into **"All assigned assets and backup roles have been verified"**. The concentration sentence named one person ("Omar Farooq holds 67%…"), while the UX spec asks for an aggregate sentence (D-23); teams below the minimum group size still returned per-person data.
  - Found (Actions): the backup picker was **empty** again (no people passed) and both handlers swallowed errors (`// handled`). Assigning a backup wrote a **`confirmed`** edge — an admin's assignment is not the backup's confirmation — with no validation (owner as own backup, leavers, wrong action type). Accept-risk recorded **"Alex Rivera"** for everyone, accepted any expiry (past or years out), and an expired acceptance never reopened. Every role saw Assign/Accept Risk.
  - Teams now come from the directory: `group` entities + `member_of` edges (what the Entra/Google connectors produce, CON-06/07). The two teams moved from route code into the **fixture as data** (2 groups, 10 memberships). Read models in `backend/src/views/peopleViews.ts`: aggregate sentence ("1 person holds 67% of Platform Engineering's critical assets."; the named share bar remains the approved D-23 exception), members alphabetical, holdings via `factViews`, privacy floor (below min group size: no concentration, no member list), titles `null` when unknown, `pendingConfirmations: null` (not counted here yet; UI says so).
  - Actions: new `backend/src/actions/actionService.ts` — assign-backup validates (open C1 action, real person, not an owner, not leaving) and writes a **`stated`** `backs_up` edge (source `manual_assignment`) that the backup must confirm themselves; accept-risk records the real signed-in user, requires a future expiry ≤ 365 days, and lapses back to open after expiry. `buildActions` no longer defaults criticality to `medium` or volume to `0`. Old unchecked `DataService` methods removed.
  - Frontend: backup picker loads real people; success/failure toasts; Assign Backup only for admin/reviewer, Accept Risk only for admin (matches RBAC); "Title not on record" instead of invented titles; pending-confirmations card no longer claims "all verified".
  - Tests: backend `tests/api/peopleActions.test.ts` (9, hand-checked); frontend actions suite wrapped in session/toast providers + role-gating and refused-assignment tests. Backend 209/209; frontend 196/197 (pre-existing `EmptyState` failure).
  - Verified live as Alex: People shows Platform Engineering (1 of 3 covered, "1 person holds 67%…") and Revenue Operations; Actions → Assign Backup → picked Priya Sharma → `POST …/assign-backup` 200 → "Backup assigned" → action "Resolved on Oct 6, 2026".
  - Note: the fixture change (teams as data) affects Engineer A's test fixture; existing tests all pass.
- **D10 — Map + What-If on the live backend ✅ (Oct 6)**
  - Found (engine): **`getDownstreamImpact` walked dependency edges the wrong way.** Edges point from the dependant to what it needs (`105 calls_model GPT-4o`, `105 runs_on_credentials_of David`), and the walk followed them forwards — so it returned what an asset *needs*, not what *breaks*: "GPT-4o going down affects nothing", "AI Ticket Routing failing stops David". This fed the Map's blast radius, S1/S4 "downstream", and the change feed's blast radius (`diffEngine`). No test checked direction, so all passed.
  - Found (Map): opened on a hard-coded root `w-1` that doesn't exist (404 on every visit) with no way to pick another; blast-radius lists showed raw ids for anything beyond 2 hops; node shapes were registered only for mock kinds (`workflow`, `system`), so every real **automation, app, process and group rendered as a blank white box**; the picker's label wasn't tied to its input (no accessible name).
  - Found (What-If): opened with invented selections ("Sarah Connor", "OpenAI Enterprise API", ids `p-1`/`v-openai`) and auto-ran them on load; both pickers were **empty** (no options passed); people-only and single-model scenarios went to the S1/S2 endpoints, whose results were re-labelled with ids as names. S4 listed **low/medium assets under "Orphaned Critical"**, counted missing run volumes as **0** (S4 and S6), and silently simulated "no impact" for unknown ids.
  - Backend: graph walk fixed — `getDownstreamImpact` = what stops if X fails (inbound), new `getDependencies` = what X needs (outbound). `GET /api/graph/blast-radius` returns `{id, kind, name}` refs (downstream = breaks, upstream = needs); neighbourhood rejects hops other than 1/2. S4 rewritten: orphaned = critical/high **plus unknown-criticality** (shown as unknown), run volume `null` when unknown with `runsUnknownCount`, cascade from everything broken, already-listed items not double-counted; route rejects an empty selection, unknown ids and non-people as leavers (400). S6 rows gain `runsUnknownCount`.
  - Frontend: Map reads `/map?root=…` (URL updates as you click around), asks what to centre on when there's no root, has a search picker over all entities, says "not in the graph" on 404, renders real kinds. What-If starts empty, pickers load real people and entities (groups excluded), all scenarios go through S4 (vendors/models/apps "go down", anything else "fails"), unknown run volumes show **Unknown** / "at least N", downstream list links to the Map, "1 person holds…" grammar; opening a picker focuses its search box.
  - Tests: backend `tests/api/mapWhatIf.test.ts` (9, hand-checked: direction, refs, S4 numbers, low-crit exclusion, validation, unknown runs + cascade, S6); frontend map 6 → 10, what-if 3 → 6, contract test updated. Backend 218/218; frontend 203/204 (pre-existing `EmptyState` failure).
  - Verified live as Alex: Map on GPT-4o → blast radius (1) highlights AI Ticket Routing; Map on AI Ticket Routing → needs David Miller + OpenAI GPT-4o, blast radius (0). What-If "Omar Farooq leaves and OpenAI GPT-4o goes down" → 2 orphaned critical (Billing Sync, Payroll), AI Ticket Routing stopped 2,500/wk, 3,120 runs/wk total; S6 ranks GPT-4o (1 halted, 2,500/wk), "1 person holds 2+ unbacked critical assets."
  - Notes: the engine fix touches Engineer A's `domain/graph` and `domain/simulation`; the handover pack and the change feed's blast radius now get the correct direction too. The asset detail's upstream/downstream lists (`routes/assets.ts`) mix ownership and dependency edges — left for whoever owns that screen.

---

### Sprint 3: End-to-End Polish, Hardening & MVP Readiness (Oct 22–29)

#### Engineer A (Backend & Data)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| **D13 (Oct 22)** | Post-Departure 72h Verification Daemon | G-07 | `backend/src/handover/postDepartureVerifier.ts` — pg-boss job triggered on account disable, monitors n8n executions for 72h | HND-06 |
| **D14 (Oct 23)** | Weekly Briefing Email + Daily Snapshot | G-11, G-21 | `backend/src/services/briefing/weeklyBriefing.ts` — Gemini prose generation + Nodemailer dispatch. Daily snapshot cron job writing headline metrics | CHG-03, TRD-01 |
| **D15 (Oct 24)** | PDF Generation Service | G-12 | `backend/src/reports/pdfGenerator.ts` — Handover pack PDF + Executive scan report using @react-pdf/renderer | RPT-01, RPT-02, RPT-03 |
| **D16 (Oct 27)** | Security hardening + performance benchmarks | — | Verify pgcrypto secrets never leak to responses/logs. Synthetic 2,000-person, 5,000-automation stress test. Benchmark: What-If < 500ms, full checks < 1.5s | SEC-03, NFR-01, NFR-02 |
| **D17 (Oct 28)** | Migration runner + Deployment packaging | G-18 | `backend/db/migrate.ts` — idempotent up/down runner. Docker Compose production config. Health check endpoint | — |
| **D18 (Oct 29)** | Final backend integration test pass + bug fixes | — | Full backend test suite (target: 40+ tests), fix any broken paths | NFR-05 |

**Sprint 3 / Engineer A Acceptance Criteria:**
- [ ] 72h verifier detects failed workflows post-departure and emits High-Severity alert
- [ ] Weekly briefing email sends correctly formatted prose with departure/risk summary
- [ ] PDFs render with correct data, evidence grades, and as-of timestamps
- [ ] 20,000-node graph loads in <50ms, What-If executes in <500ms
- [ ] Migration script runs idempotently
- [ ] Zero secret leaks verified by static analysis

---

#### Engineer B (Frontend & Product Workflows)

| Day | Task | Gap | Deliverable | SRS IDs |
|---|---|---|---|---|
| **D13 (Oct 22)** | Sign-in page SSO integration | G-19 | `frontend/app/(bare)/sign-in/page.tsx` — real Entra/Google SSO buttons, redirect flow, session cookie | SEC-01 |
| **D14 (Oct 23)** | Reviewer surfaces integration | G-19 | `frontend/app/(reviewer)/my/page.tsx` → real `/api/me/tasks`. Successor acceptance flow end-to-end | HND-04 |
| **D15 (Oct 24)** | Campaign creation wizard end-to-end | G-19 | `frontend/features/actions/NewCampaignWizard.tsx` → real POST /api/campaigns. Email preview. Progress tracking | CHK-01, CHK-04 |
| **D16 (Oct 27)** | Data states polish: Loading/Error/Empty for all screens | — | Verify every screen implements Skeleton, ErrorState, EmptyState. No fallback/mock data. Unknown shown as gray dashed, never as "No" | DATA-03 |
| **D17 (Oct 28)** | Responsive QA + Accessibility pass | — | Mobile viewport testing for attestation form (iOS/Android). WCAG 2.1 AA compliance check. Fix any axe violations | NFR-09 |
| **D18 (Oct 29)** | E2E Playwright smoke suite + final bug fixes | G-20 | Core flows: Sign-in → Overview → Run What-If → Initiate departure → Mobile attestation. 5 Playwright specs | NFR-10 |

**Sprint 3 / Engineer B Acceptance Criteria:**
- [ ] SSO sign-in works end-to-end with both providers
- [ ] Reviewer can see, accept, and decline successor requests
- [ ] Campaign wizard creates campaign and sends emails
- [ ] Every screen shows honest Loading/Error/Empty states (zero fabricated data)
- [ ] Attestation form works on mobile (iPhone 12 viewport)
- [ ] 5 Playwright E2E specs pass green

---

## 4. Buffer Days: Oct 30–31

| Day | Both Engineers | Focus |
|---|---|---|
| **D19 (Oct 30)** | Integration testing | End-to-end flow testing across real Postgres, real SSO, real n8n sandbox. Bug triage and fixes |
| **D20 (Oct 31)** | Final verification | Deploy to staging. Manual smoke test of all 7 screens. Demo preparation. README update |

---

## 5. Engineer Assignment Matrix

### Engineer A — Backend, Data & Infrastructure

```
Owns: Database, Connectors, Fact Store, Identity Resolution, 
      Change Engine, Simulations, Job Queue, PDF Reports,
      Performance, Security Hardening, Deployment

Core Files:
├── backend/src/domain/facts/factStore.ts          (NEW)
├── backend/src/identity/matcher.ts                (NEW)
├── backend/src/identity/queue.ts                  (NEW)
├── backend/src/domain/changes/diffEngine.ts       (NEW)
├── backend/src/jobs/scheduler.ts                  (NEW - pg-boss)
├── backend/src/routes/departures.ts               (NEW)
├── backend/src/routes/actions.ts                  (NEW)
├── backend/src/routes/people.ts                   (NEW)
├── backend/src/routes/assets.ts                   (NEW)
├── backend/src/routes/graph.ts                    (NEW)
├── backend/src/routes/changes.ts                  (NEW)
├── backend/src/routes/identity.ts                 (NEW)
├── backend/src/routes/settings.ts                 (NEW)
├── backend/src/routes/reviewer.ts                 (NEW)
├── backend/src/handover/postDepartureVerifier.ts   (NEW)
├── backend/src/services/briefing/weeklyBriefing.ts (NEW)
├── backend/src/reports/pdfGenerator.ts            (NEW)
├── backend/src/domain/simulation/index.ts         (EXTEND: S4, S6)
├── backend/db/migrate.ts                          (NEW)
└── backend/tests/                                 (EXTEND)
```

### Engineer B — Frontend, Auth, Product Workflows & UX

```
Owns: SSO Auth, RBAC, Audit, Departure Workflow, Successor Flow,
      Frontend-Backend Integration, Data States, Accessibility,
      E2E Tests

Core Files:
├── backend/src/auth/entra.ts                      (NEW)
├── backend/src/auth/google.ts                     (NEW)
├── backend/src/middleware/rbac.ts                  (NEW)
├── backend/src/middleware/auditLog.ts              (NEW)
├── backend/src/handover/departureService.ts        (NEW)
├── backend/src/handover/successionService.ts       (NEW)
├── frontend/features/*/                           (MODIFY: wire real APIs)
├── frontend/components/shell/                     (MODIFY: real data)
├── frontend/app/(bare)/sign-in/page.tsx           (MODIFY: real SSO)
├── frontend/app/(reviewer)/my/page.tsx            (MODIFY: real tasks)
└── frontend/e2e/                                  (NEW Playwright specs)
```

---

## 6. Risk Register & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SSO integration takes longer than 2 days (Entra admin consent, Google domain delegation) | Medium | High | Use dev-mode JWT bypass initially; swap to real SSO by Sprint 3 |
| Live Postgres not available for integration testing | Medium | High | Keep `handCheckableTruth.json` fixture as fallback; use Docker Compose local Postgres |
| PDF generation library issues (@react-pdf/renderer with server-side) | Low | Medium | Fallback to Puppeteer HTML-to-PDF if @react-pdf has issues |
| Frontend screens need design polish beyond baseline Tailwind | Medium | Medium | Design tokens are defined in `globals.css`; skinning is done. Focus on data accuracy over visual polish |
| n8n API differences across versions break connector | Low | Medium | ReadOnlyHttpGuard + error handling already in place; add version detection |
| Combined S4 simulation has exponential edge cases | Low | Low | Limit to max 5 entities per combined scenario; test with fixture data |

---

## 7. Definition of Done — MVP Checklist

### Backend

- [ ] All 12 PostgreSQL tables created and migrated
- [ ] SCD2 Fact Store correctly versions facts with grade precedence
- [ ] Identity resolution matches accounts by email, routes unmatched to queue
- [ ] Change engine detects all 6 event types on sync completion
- [ ] pg-boss runs scheduled syncs (hourly) and reminders (D3/D7)
- [ ] 15+ REST API endpoints respond with typed JSON
- [ ] What-If supports S1 (Leaver), S2 (Outage), S3 (Succession), S4 (Combined), S6 (Worst Losses)
- [ ] Departure workflow tracks all 5 stages
- [ ] Successor acceptance records confirmed ownership fact
- [ ] SSO authentication works with Entra and Google
- [ ] RBAC enforced on every API route
- [ ] Audit log captures every action
- [ ] 40+ Vitest tests pass green
- [ ] Zero secret leaks in responses or logs
- [ ] What-If execution < 500ms at 20,000 nodes

### Frontend

- [ ] All 7 core screens + settings + attestation render real backend data
- [ ] Zero mock/fallback data in any production code path
- [ ] Overview: "X of Y critical assets fully covered" from real checks
- [ ] Departures: stage stepper tracks real departure lifecycle
- [ ] What-If: sentence builder drives real combined simulations
- [ ] Map: interactive graph from real `/api/graph/neighbourhood`
- [ ] Attestation form: phone-friendly, submits to real API, facts become `confirmed`
- [ ] Ask OBA: grounded Gemini responses with entity chips and evidence links
- [ ] Loading/Error/Empty states on every screen
- [ ] Unknown shown as gray dashed, never as "No" or blank
- [ ] SSO sign-in page functional
- [ ] Mobile responsive (attestation form verified on iPhone viewport)
- [ ] 5 Playwright E2E specs pass
- [ ] 0 ESLint warnings, 0 TypeScript errors, 0 build errors

### Product Invariants (0-Tolerance)

- [ ] **No scores**: Zero 0-100 scores, health indexes, or risk percentages anywhere
- [ ] **Unknown ≠ No**: `DATA-03` enforced — unknown is always visually distinct
- [ ] **No individual ranking**: People never sorted/ranked by risk (`SEC-07`)
- [ ] **AI explains only**: Gemini never computes findings, only explains evidence (`AI-02`)
- [ ] **Read-only access**: Connectors never call POST/PUT/DELETE on customer systems (`SEC-04`)
- [ ] **Deterministic**: Same data → same findings on every screen, PDF, and chat reply (`NFR-05`)

---

## 8. Daily Standup Checkpoint Template

Each morning, both engineers should verify:

```
1. What did I complete yesterday?
2. What am I working on today? (Reference task ID: Sprint X / Day Y)
3. Am I blocked on anything?
4. Are tests still green? (npm test --prefix backend && npm run build --prefix frontend)
```

---

## 9. SRS Traceability Matrix (v1 Must Requirements → Plan Coverage)

| SRS ID | Requirement Summary | Plan Task | Sprint |
|---|---|---|---|
| V0-01 to V0-08 | Free n8n Ownership Check | ✅ Already complete | — |
| CON-01 to CON-03 | n8n connector (workflows, credentials, executions) | ✅ Already complete | — |
| CON-04 | Read-only enforcement | ✅ Already complete (ReadOnlyHttpGuard) | — |
| CON-05 | Directory connector (Entra + Google) | ✅ Already complete | — |
| CON-06 | Entra apps & groups with owners | ✅ Already complete | — |
| CON-07 | Google groups with owners | ✅ Already complete | — |
| CON-08 | OpenAI/Anthropic admin usage | ✅ Already complete | — |
| CON-09 | CSV import with row-level errors | ✅ Already complete | — |
| CON-10 | Connections screen with last sync & re-sync | Eng A: Sprint 2 D11 | S2 |
| CON-11 | Scheduled syncs (daily default) | Eng A: Sprint 1 D6 (pg-boss) | S1 |
| DATA-01 | Graph of people, teams, assets, dependencies | ✅ Already complete (Graphology) | — |
| DATA-02 | Every fact carries evidence state | Eng A: Sprint 1 D1-D2 (Fact Store) | S1 |
| DATA-03 | Unknown never displayed as "no" | Eng A: Sprint 1 D1 + Eng B: Sprint 3 D16 | S1/S3 |
| DATA-04 | Confirmed overrides stated/inferred | Eng A: Sprint 1 D1-D2 | S1 |
| DATA-05 | Fact history for audit | Eng A: Sprint 1 D1-D2 (SCD2) | S1 |
| DATA-06 | Criticality as High/Medium/Low with reason | ✅ Already in types | — |
| ID-01 | Match accounts by email | Eng A: Sprint 1 D3 | S1 |
| ID-02 | Unmatched → review queue, never "no owner" | Eng A: Sprint 1 D4 | S1 |
| ID-03 | Admin resolves queue items | Eng A: Sprint 1 D4 + Sprint 2 D10 | S1/S2 |
| CHK-01 | Launch confirmation campaigns | ✅ Already complete (engine) | — |
| CHK-02 | Per-asset confirmation questions | ✅ Already complete (attestation) | — |
| CHK-03 | Claim ownerless assets | Eng B: Sprint 3 D15 | S3 |
| CHK-04 | Email reminders on schedule | Eng A: Sprint 1 D6 (pg-boss) | S1 |
| CHK-06 | Every answer stored with who/when/prior | ✅ Already complete (SCD2 reconcile) | — |
| CHG-01 | Change feed | Eng A: Sprint 1 D5 + Sprint 2 D8 | S1/S2 |
| CHG-02 | Each change shows what it affects | Eng A: Sprint 1 D5 | S1 |
| CHG-03 | Weekly briefing email | Eng A: Sprint 3 D14 | S3 |
| HND-01 | Departure created by HR/admin or Entra | Eng B: Sprint 1 D4 | S1 |
| HND-02 | Handover pack auto-compiled | Eng B: Sprint 1 D4 | S1 |
| HND-03 | Manager names successor per asset | Eng B: Sprint 1 D5 | S1 |
| HND-04 | Successor accepts, recorded as confirmed fact | Eng B: Sprint 1 D5 | S1 |
| HND-05 | Track handover status per departure/asset | Eng B: Sprint 1 D5 | S1 |
| HND-06 | Post-departure check on automations | Eng A: Sprint 3 D13 | S3 |
| HND-07 | Credential and ownership risk display | ✅ Already in checks engine | — |
| SIM-01 | What-if: person leaves | ✅ Already complete (S1) | — |
| SIM-02 | What-if: automation/vendor/model fails | ✅ Already complete (S2) | — |
| SIM-03 | Combined scenarios | Eng A: Sprint 2 D12 (S4) | S2 |
| SIM-04 | Succession test | ✅ Already complete (S3) | — |
| SIM-05 | Unknown facts reported as unknown | ✅ Already in simulation output | — |
| SIM-06 | Team view: concentration by department | Eng A: Sprint 2 D12 (S6) | S2 |
| SIM-07 | Headline coverage count | ✅ Already complete | — |
| SIM-08 | Ranked actions | Eng A: Sprint 2 D8 | S2 |
| UI-01 to UI-08 | All 7 screens + supporting | Eng B: Sprint 2 D7-D12 (wire to backend) | S2 |
| AI-01 to AI-05 | Ask Horquva assistant | ✅ Already complete (Gemini engine) | — |
| RPT-01 | PDF handover pack | Eng A: Sprint 3 D15 | S3 |
| RPT-02 | PDF scan report | Eng A: Sprint 3 D15 | S3 |
| RPT-03 | PDFs show evidence states | Eng A: Sprint 3 D15 | S3 |
| SEC-01 | SSO only (no local passwords) | Eng B: Sprint 1 D1-D2 | S1 |
| SEC-02 | RBAC enforced on every API | Eng B: Sprint 1 D3 | S1 |
| SEC-03 | Secrets encrypted, never returned/logged | Eng A: Sprint 3 D16 | S3 |
| SEC-04 | Read-only, metadata-only access | ✅ Already complete (HttpGuard) | — |
| SEC-05 | Never read message content | ✅ Connector design enforces this | — |
| SEC-06 | Audit log of every action | Eng B: Sprint 1 D3 | S1 |
| SEC-07 | No individual scoring/ranking | ✅ Enforced in product invariants | — |
| NFR-01 | Scale: 2,000 people, 5,000 automations | Eng A: Sprint 3 D16 (benchmark) | S3 |
| NFR-02 | Screens <2s, What-If <3s | Eng A: Sprint 3 D16 | S3 |
| NFR-05 | Deterministic | ✅ Architecture enforces this | — |
| NFR-10 | Hand-checkable test org | ✅ Already complete (`handCheckableTruth.json`) | — |
| TRD-01 | Daily snapshot storage | Eng A: Sprint 3 D14 | S3 |

---

## 10. Verification & Validation Pass

> [!NOTE]
> This section validates the plan itself against the SRS, WBS, and implementation status documents.

### 10.1 Coverage Verification

| Verification Check | Result |
|---|---|
| All v1 **Must** SRS requirements have a plan task? | ✅ **Yes** — 47/47 Must requirements mapped |
| All v1 **Should** SRS requirements addressed or explicitly deferred? | ✅ **Yes** — CHK-05 (auto re-request on change) is handled by change engine; CON-08 already complete; SEC-10 (hosting region) deferred post-MVP |
| All 12 WBS Epics have coverage? | ✅ **Yes** — Epic 1-12 all addressed |
| No tasks assigned to non-existent files? | ✅ **Yes** — all existing file paths verified against codebase |
| No duplicate work between engineers? | ✅ **Yes** — clear domain boundaries |
| Time budget fits 36 engineer-days? | ✅ **Yes** — P0 tasks total ~28 engineer-days + 4 days buffer + 4 days P1 |

### 10.2 Implementational Accuracy Checks

| Check | Finding |
|---|---|
| **SCD2 Fact Store** references correct schema columns | ✅ `fact` table has `entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to` |
| **Identity queue** references correct schema | ✅ `identity_queue` table has `external_account_id, source, display_name, email_candidate, status, linked_person_id` |
| **Change event** types match `change_event.kind` column | ✅ Schema supports `person_left, owner_changed, workflow_edited, model_swapped, credential_risk, failures_spiked` |
| **Attestation** reconciliation updates SCD2 facts | ✅ `attestation/engine.ts` already implements fact update on submission |
| **Graphology** import is correct | ✅ `domain/graph/index.ts` uses `DirectedMultiGraph` from graphology |
| **pg-boss** is in package.json | ✅ Verified via grep |
| **Express routes** mount correctly | ✅ `server.ts` mounts `continuityRouter` at `/api/continuity` |
| **Frontend API client** paths match backend routes | ✅ `frontend/lib/api/*.ts` modules define typed paths matching planned backend routes |
| **@horquva/types** package exists and is linked | ✅ `packages/types/src/index.ts` verified |

### 10.3 Risk Validation

| Validation | Outcome |
|---|---|
| Plan accounts for SSO complexity? | ✅ 2 full days allocated + dev bypass fallback |
| Plan accounts for frontend integration time? | ✅ 6 full days (Sprint 2 Eng B) dedicated to wiring |
| Plan includes testing at every sprint? | ✅ Tests written alongside each service, E2E in Sprint 3 |
| Plan respects "no individual ranking" invariant? | ✅ S6 ranks vendors/models only; people shown as aggregate count |
| Plan respects "unknown ≠ no" invariant? | ✅ SCD2 Fact Store enforces; frontend data states pass verifies |
| Plan avoids scope creep (v1.1/v2 features)? | ✅ Prediction ledger, Monte Carlo, Make connector, PagerDuty — all excluded |

---

> [!TIP]
> **Recommended next action:** Both engineers should review this plan and confirm task assignments by EOD Oct 6. Then begin Sprint 1 on Oct 7 (or immediately if starting today). Use the `/goal` command for each sprint to track progress end-to-end.
