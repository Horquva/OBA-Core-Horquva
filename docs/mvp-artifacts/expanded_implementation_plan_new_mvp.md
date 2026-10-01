# Expanded Master Implementation Plan — Horquva Operational Continuity Platform (New MVP)

> **Document Type:** Production-Grade Technical Design & Implementation Plan (v0 to v2)  
> **Date:** September 30, 2026  
> **Git Isolation Branch:** `mvp/v1-continuity` (branched from current point)  
> **Baseline References:**
> - Software Requirements Specification (v0–v2): `docs/horquva-strategy-session/extracted_SRS_v0_v1.txt`
> - Deep Feasibility & Engineering Study: `deep_feasibility_and_engineering_study.md`
> - Work Breakdown Structure: `WORK_BREAKDOWN_STRUCTURE_NEW_MVP.md`
> - User Directives: 10/10 Architecture & Scope Decisions Locked via `/grill-me`

---

## 1. Goal Description

This implementation plan executes a complete architectural transition of Horquva from an unverified, 17-page "organizational science" demo with 55 abstract brain modules into a focused, deterministic 7-screen **Organizational Continuity Platform: When someone leaves, nothing breaks**.

### Core Objective
The new platform answers four concrete operational questions:
1. **Where are we exposed?** Critical assets with no owner, no backup, or no documentation — with unknown facts explicitly distinguished from "no".
2. **Who or what is a single point of failure?** People, agents, credentials, tools, and vendors whose loss breaks critical things, accompanied by the named list of what breaks and weekly run volume at risk.
3. **What happens if someone leaves or fails?** Deterministic graph reachability walks across people, automations, credentials, and models; succession testing before departure.
4. **What do we do first?** One ranked action list where every remediation item maps 1:1 to a specific failing fact.

### The "Discover + Confirm" Operating Model
Connectors automatically discover ~60% of organizational reality (people, managers, leavers, automations, credentials, models, failures). The remaining 40% (backup owners, business criticality, runbook documentation, and fallback procedures) exist in no API and are populated through structured, lightweight **Access Review Confirmation Campaigns**.

---

## 2. Technical Grounding & Documentation Sources

All implementation tasks are strictly grounded in verified documentation, official SDKs, and peer-reviewed academic literature:

### 2.1 Context7 Fetched Documentation & Verified Libraries
- **Google GenAI Unified SDK (`/googleapis/js-genai`)**: `@google/genai` (v2.0+) for structured JSON output and function declaration/tool-calling (`AI-01`, `AI-02`). Model calls map 1:1 to deterministic backend API endpoints.
- **Nodemailer SMTP Engine (`/nodemailer/nodemailer`)**: Provider-agnostic transactional email transport for magic-link attestation forms without external vendor lock-in or compliance sub-processors.
- **pg-boss (`/websites/deepwiki_timgit_pg-boss`)**: PostgreSQL-backed job queue with built-in cron scheduling, exponential retries, dead-letter queues, and zero Redis overhead.
- **Graphology (`/graphology/graphology`)**: High-performance in-memory `DirectedMultiGraph` supporting downstream/upstream reachability, BFS/DFS walks, cycle detection, and topological sorting in $<5\text{ ms}$ for 20,000 nodes.
- **Playwright TypeScript (`/microsoft/playwright`)**: Multi-browser automation with native mobile viewport emulation (iPhone/Android) for testing the standalone attestation wizard and headless CI runs.

### 2.2 Enterprise API Endpoints & Specifications
- **n8n Public API v1**: `GET /api/v1/workflows` (nodes, credentials, creator, project), `GET /api/v1/workflows/{id}/history` (authors), `GET /api/v1/executions?status=error`, `GET /api/v1/credentials`.
- **Microsoft Graph v1.0 & beta**: `GET /v1.0/users` (`accountEnabled`, `employeeLeaveDateTime` via `User-LifeCycleInfo.Read.All`), `GET /v1.0/applications` + `/owners` (`Application.Read.All`), `GET /v1.0/servicePrincipals`.
- **Google Workspace Admin SDK Directory**: `admin.directory.v1.users.list` (`organizations`, `relations` manager, `suspended` status), `users.watch` push notifications.
- **OpenAI & Anthropic Admin Usage APIs**: `GET /v1/organization/usage/completions` (OpenAI), `GET /v1/organizations/usage_report/messages` (Anthropic).
- **PagerDuty API**: `GET /escalation_policies` (Level 1 = Owner, Level 2+ = Backup).

### 2.3 Academic Literature & Algorithmic Foundations
- **Truck Factor / Bus Factor Estimation**: Avelino et al., ICPC 2016 ([arXiv:1604.06766](https://arxiv.org/abs/1604.06766)) Degree of Authorship (DOA) + greedy removal, adapted with Wheeler 2026 ([arXiv:2606.20882](https://arxiv.org/abs/2606.20882)) AI-authorship caveat (labelled strictly as `inferred`).
- **Retirement of eIRWR**: Khan & Farea ([arXiv:2608.08073](https://arxiv.org/abs/2608.08073)) proven to be a root-cause algorithm with backward edges, retired from forward blast radius.
- **Retirement of Authored BBN**: Aquaro et al. ([arXiv:0906.3968](https://arxiv.org/abs/0906.3968)) and Kumar et al. ([arXiv:2505.06281](https://arxiv.org/abs/2505.06281)) require empirical loss data; authored logit tables retired.
- **Prediction Ledger & Calibration**: Brier Score $\text{BS} = \frac{1}{N} \sum (f_t - o_t)^2$ tracking empirical base rates.

---

## 3. User Review Required & Locked Directives (From `/grill-me`)

> [!IMPORTANT]
> **Branch & Codebase Isolation**:
> All work will be developed and committed on the new dedicated branch **`mvp/v1-continuity`**, preserving commit history while isolating the new MVP from legacy code.

> [!IMPORTANT]
> **Dual Directory Ingestion in v1**:
> Both Microsoft Entra ID and Google Workspace directory connectors are built in parallel in v1 to establish an authoritative person spine for any enterprise stack.

> [!IMPORTANT]
> **Physical Database Isolation**:
> The new MVP runs against a completely separate greenfield PostgreSQL database instance, 100% physically isolated from legacy OBA tables.

> [!WARNING]
> **PostgreSQL `pgcrypto` Secret Encryption**:
> All connector credentials (n8n keys, OpenAI/Anthropic admin keys, Entra secrets) are encrypted and decrypted directly in database functions using PostgreSQL `pgcrypto` AES-256 (`horquva_encrypt_secret` / `horquva_decrypt_secret`).

> [!WARNING]
> **Live Sandbox Testing Directive**:
> Connector and integration tests will execute against **Live Sandbox Developer Accounts** making real network requests with test tokens, guaranteeing zero divergence from live API behavior.

> [!CAUTION]
> **Strict Legal & Regulatory Boundary (EU AI Act Annex III)**:
> Horquva strictly prohibits scoring, ranking, or predicting individual employee attrition. All measures are strictly asset-, credential-, role-, and team-level.

---

## 4. Open Questions

**NONE.** All 10 design and architectural branches were systematically interviewed and resolved during the `/grill-me` session.

---

## 5. Modular Implementation Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MODULAR IMPLEMENTATION PHASES                         │
├───────────┬─────────────────────────────────────────────────────────────────┤
│ Phase 0   │ Git Branch Isolation (`mvp/v1-continuity`) & Workspace Setup   │
│ Phase 1   │ Greenfield Database (`pgcrypto`), Shared Types & Security Core │
│ Phase 2   │ Connector SDK, Ingestion Pipelines (Dual Directory, n8n, AI)    │
│ Phase 3   │ Identity Resolution Engine & Review Queue                       │
│ Phase 4   │ Fact Store (SCD Type 2), Snapshot Diff & Graph Checks Engine    │
│ Phase 5   │ What-If Simulation Engine & Succession Testing                 │
│ Phase 6   │ Attestation Campaigns (Nodemailer Magic-Link) & Handover Packs │
│ Phase 7   │ v0 Free n8n Ownership Check (Stateless Server-Side Route)      │
│ Phase 8   │ 7 Next.js Screens (Integrating User's Incoming Design Doc)     │
│ Phase 9   │ Ask Horquva Assistant (Gemini) & Weekly Briefing Service       │
│ Phase 10  │ 5-Tier Testing: Unit, Module, Integration, A/B, and E2E Tests  │
└───────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 6. Proposed Changes & File-by-File Breakdown

### Component 1: Workspace & Git Isolation (`packages/types`, Root Configuration)

#### [NEW] `git branch mvp/v1-continuity`
- Create and switch to branch `mvp/v1-continuity` from current commit.

#### [NEW] `package.json` (Root)
- Configure npm workspaces:
  ```json
  {
    "name": "horquva-workspace",
    "private": true,
    "workspaces": [
      "backend",
      "frontend",
      "packages/*"
    ]
  }
  ```

#### [NEW] `packages/types/src/index.ts`
- Canonical domain interfaces:
  - `CanonicalEntity`: `id`, `kind` (`person | automation | credential | model | vendor | group | app`), `name`, `description`, `externalRefs`.
  - `CanonicalEdge`: `fromId`, `toId`, `type` (`owns | backs_up | depends_on | calls_model | runs_on_credentials_of | member_of`), `grade`, `source`, `sourceRef`, `validFrom`, `validTo`.
  - `CanonicalFact`: `entityId`, `attribute` (`criticality | documented | fallback_exists | run_volume_weekly | status`), `value`, `grade` (`stated | inferred | confirmed | unknown`), `source`, `attestedBy`, `validFrom`, `validTo`.
  - `CheckResult`: `checkId`, `entityId`, `status` (`PASS | FAIL | UNKNOWN`), `evidenceFactIds`, `reason`.
  - `SimulationScenario`: `type`, `targetEntityIds`, `orphanedCriticalAssets`, `brokenCredentialAutomations`, `runsPerWeekAffected`, `downstreamImpact`.

---

### Component 2: Greenfield Database & Security Layer (`backend/db/`)

#### [NEW] `backend/db/migrations/001_initial_schema.sql`
- Complete DDL using `uuid-ossp` and `pgcrypto`.
- Implements `connection`, `sync_run`, `raw_payload`, `entity`, `edge`, `fact`, `change_event`, `campaign`, `attestation_task`, `identity_queue`, `prediction_ledger`, `audit_log`, `ab_experiment`, `ab_assignment`.
- Defines `horquva_encrypt_secret(text, text)` and `horquva_decrypt_secret(bytea, text)`.

#### [NEW] `backend/src/db/client.ts`
- Typed PostgreSQL pool using `pg` connecting to the separate greenfield database.
- Helper wrapper for parameterized queries and automatic `pgcrypto` secret decryption.

---

### Component 3: Connector SDK & Ingestion Pipelines (`backend/connectors/`)

#### [NEW] `backend/src/connectors/sdk/interface.ts`
- Standard `Connector` interface with `validateConnection()`, `sync()`, `mapToCanonical()`, and `rateLimits()`.

#### [NEW] `backend/src/connectors/sdk/readOnlyGuard.ts`
- Enforces strict read-only execution (`GET` allowlist) on outgoing connector requests (`CON-04`, `SEC-04`).

#### [NEW] `backend/src/connectors/entra/index.ts`
- Microsoft Graph client using client credentials grant.
- Ingests users (`displayName`, `mail`, `department`, `jobTitle`, `accountEnabled`, `employeeLeaveDateTime`), managers, application registrations (`GET /applications` + `/owners`), and service principals.

#### [NEW] `backend/src/connectors/google/index.ts`
- Google Workspace Directory client using service account domain-wide delegation.
- Ingests users (`primaryEmail`, `organizations`, `relations` manager, `suspended`), groups, and managers.

#### [NEW] `backend/src/connectors/n8n/index.ts`
- REST API client using `X-N8N-API-KEY`.
- Ingests workflows, nodes, connections, credentials used, and project/creator links.
- Maps node types to AI vendors (`OpenAI`, `Anthropic`, etc.) and models.
- Captures version history authors (`GET /workflows/{id}/history`).
- Ingests error executions and saves daily run/failure counts.
- Flags personal-credential automations (`V0-05`).

#### [NEW] `backend/src/connectors/n8n/collector/Dockerfile` & `collector.ts`
- Lightweight Docker collector script for air-gapped on-premise n8n deployments. Runs locally in VPC, fetches n8n data, encrypts, and pushes outbound to Horquva sync endpoint.

#### [NEW] `backend/src/connectors/ai_admin/index.ts`
- OpenAI & Anthropic Admin API clients ingesting completion token usage and costs per model and project.

#### [NEW] `backend/src/connectors/csv/index.ts`
- Streaming CSV parser with row-level validation against template headers.

---

### Component 4: Identity Resolution & Review Queue (`backend/identity/`)

#### [NEW] `backend/src/identity/matcher.ts`
- Directory-anchored matching on lower-case work email.
- Alias resolution and service account detection heuristics.

#### [NEW] `backend/src/identity/queueService.ts`
- Routes unmatched accounts to `identity_queue`.
- Admin resolution endpoints (`link`, `mark_service_account`, `mark_departed`).

---

### Component 5: Fact Store (SCD Type 2), Graphology & Checks Engine (`backend/domain/`)

#### [NEW] `backend/src/domain/facts/factManager.ts`
- SCD Type 2 insertion and closing logic (`valid_from`, `valid_to`).
- Fact precedence: `confirmed` overrides `stated` and `inferred`.
- Strict tri-state handling (`unknown` is never treated as `false`).

#### [NEW] `backend/src/domain/graph/graphEngine.ts`
- In-memory `DirectedMultiGraph` powered by `graphology`.
- Fast graph traversal: downstream dependents, cycle detection, transitive run volume calculation.

#### [NEW] `backend/src/domain/checks/checkRegistry.ts`
- Core check rules returning `PASS`, `FAIL`, or `UNKNOWN` with exact evidence facts:
  - `critical-asset-has-owner`
  - `critical-asset-has-backup`
  - `critical-asset-documented`
  - `critical-asset-has-fallback`
  - `automation-not-on-personal-credential`
  - `asset-owner-is-active`
- Computes headline coverage count: "X of Y critical assets fully covered".

#### [NEW] `backend/src/domain/metrics/truckFactor.ts`
- Implementation of Avelino et al. (ICPC 2016) Degree of Authorship algorithm for inferred bus factor.

---

### Component 6: What-If Simulation & Succession Engine (`backend/simulations/`)

#### [NEW] `backend/src/simulations/whatIfEngine.ts`
- S1 (Person Leaves): Identifies orphaned critical assets, broken personal-credential automations, downstream workflows hit, and runs per week affected.
- S2 (Automation Fails): Blast radius traversal.
- S3 (Vendor/Model Down): Evaluates automations calling model and checks `fallback_exists`.
- S4 (Combined Scenarios): Compounding loss evaluation.
- S6 (Worst Single Losses): Ranks all leaver/vendor scenarios by critical loss and run volume.

#### [NEW] `backend/src/simulations/successionTester.ts`
- Simulates assigning departing person's assets to a successor.
- Calculates post-handover coverage and successor's new concentration load.

---

### Component 7: Attestation Campaigns & Handover Service (`backend/campaigns/`, `backend/handover/`)

#### [NEW] `backend/src/campaigns/campaignService.ts`
- Scoped campaign creation and reviewer assignment.
- Cryptographic 256-bit token generation.

#### [NEW] `backend/src/campaigns/delivery/smtpMailer.ts`
- Nodemailer transport using customer-configured corporate SMTP server (`SEC-03`).
- Sends magic-link email notifications to asset owners.

#### [NEW] `backend/src/campaigns/reconcile/attestationHandler.ts`
- Processes submitted form answers, updates Fact Store to `confirmed`, and creates audit log entries.

#### [NEW] `backend/src/handover/packGenerator.ts`
- Automatic handover pack manifest generation upon departure initiation.
- Tracks successor acceptance and departure milestones.

#### [NEW] `backend/src/handover/postDepartureVerifier.ts`
- Listens for directory account deactivation and monitors n8n execution errors over 72 hours to detect stopped automations.

---

### Component 8: Free Entry Wedge: v0 n8n Ownership Check (`backend/routes/v0/`, `frontend/app/n8n-check/`)

#### [NEW] `backend/src/routes/v0/n8nCheck.ts`
- Stateless server-side scan route. Accepts base URL and API key in memory, executes single-owner, credential risk, and error audits, and returns report without database persistence.

#### [NEW] `frontend/app/n8n-check/page.tsx`
- Self-serve audit page with security disclosure, live progress stepper, and interactive audit card.

---

### Component 9: Next.js Frontend (7 Screens + Presentation Contracts)

#### [NEW] `frontend/types/uiContracts.ts`
- Decoupled presentation interfaces for all 7 screens ready to receive the user's Design Document.

#### [NEW] `frontend/app/overview/page.tsx` (Screen 1)
- Headline coverage count ("38 of 52 covered · 9 exposed · 5 unknown"), upcoming departures, top credential risks, top 5 actions.

#### [NEW] `frontend/app/departures/page.tsx` (Screen 2)
- Departure tracker, handover pack completion states, post-departure execution alerts.

#### [NEW] `frontend/app/people/page.tsx` (Screen 3)
- Who holds what, unbacked holdings, team concentration. Strictly zero individual risk scores.

#### [NEW] `frontend/app/assets/page.tsx` (Screen 4)
- Comprehensive inventory with filter by type and fact evidence state badges (`stated`, `inferred`, `confirmed`, `unknown`).

#### [NEW] `frontend/app/map/page.tsx` (Screen 5)
- Interactive dependency graph showing links between people, automations, credentials, models, and vendors.

#### [NEW] `frontend/app/what-if/page.tsx` (Screen 6)
- Scenario builder and real-time succession testing interface.

#### [NEW] `frontend/app/actions/page.tsx` (Screen 7)
- Ranked remediation actions mapped 1:1 to specific failing checks.

#### [NEW] `frontend/app/attest/[token]/page.tsx`
- Mobile-friendly standalone attestation wizard for reviewers.

---

### Component 10: Ask Horquva Assistant & Weekly Briefing (`backend/agent/`, `backend/briefing/`)

#### [NEW] `backend/src/agent/geminiAssistant.ts`
- Uses `@google/genai` (Gemini 2.0 / latest models).
- Function declarations mapping 1:1 to backend APIs; strict prompt constraint requiring evidence citations.

#### [NEW] `backend/src/briefing/briefingService.ts`
- Aggregates weekly change events and uses Gemini to draft executive prose summary dispatched via SMTP.

---

## 7. Exhaustive 5-Tier Verification & Testing Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          5-TIER TESTING PYRAMID                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Tier 5: End-to-End (E2E) Browser & Mobile Tests (Playwright TypeScript)    │
│  Tier 4: A/B Testing Framework (PostgreSQL Deterministic SHA256 Hashing)    │
│  Tier 3: Integration Tests (Greenfield Postgres, pgcrypto, Live Sandbox)    │
│  Tier 2: Module Tests (Connectors, SCD2 Facts, Graphology Walks)            │
│  Tier 1: Unit & Contract Tests (Vitest, 10-Entity Hand-Checkable Fixture)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Tier 1: Unit & Contract Tests (Vitest)
- **Hand-Checkable Fixture Tests (`backend/tests/unit/handCheckable.test.ts`)**:
  - Tests a verified 10-person, 15-asset paper organization (`handCheckableTruth.json`).
  - Proves: Covered count is exactly 9 of 15; top SPOF is Omar; reassigning Omar's assets to Yuki covers 3, leaves 1 unbacked, and raises Yuki's load to 6.
- **Invariant & Tri-State Tests (`backend/tests/unit/invariants.test.ts`)**:
  - Verifies that missing facts return `UNKNOWN`, never `false` or `low`.
  - Verifies that adding a confirmed backup strictly preserves or improves coverage.
- **Check Rule Tests (`backend/tests/unit/checks.test.ts`)**:
  - Evaluates each of the core check definitions against synthetic pass/fail/unknown edge cases.

### 7.2 Tier 2: Module Tests (Vitest)
- **Graphology Walk Tests (`backend/tests/module/graphEngine.test.ts`)**:
  - Tests downstream and upstream traversals, cycle detection, and run-volume summation.
- **Truck Factor Math Tests (`backend/tests/module/truckFactor.test.ts`)**:
  - Validates Degree of Authorship calculation against known commit/edit histories.
- **SCD2 Fact Transition Tests (`backend/tests/module/factManager.test.ts`)**:
  - Verifies that updating a fact closes the old record (`valid_to = NOW()`) and creates a new one with correct evidence grade.
- **ReadOnly Guard Tests (`backend/tests/module/readOnlyGuard.test.ts`)**:
  - Validates that non-`GET` HTTP methods are rejected with fatal security exceptions.

### 7.3 Tier 3: Integration Tests (PostgreSQL, pgcrypto & Live Sandbox Accounts)
- **Database & Encryption Integration (`backend/tests/integration/pgcrypto.test.ts`)**:
  - Tests table migrations on greenfield PostgreSQL.
  - Verifies `horquva_encrypt_secret` and `horquva_decrypt_secret` roundtrips; verifies raw secrets never appear in plaintext column dumps.
- **pg-boss Worker Integration (`backend/tests/integration/jobs.test.ts`)**:
  - Tests job creation, cron scheduling, exponential retries, and dead-letter queues.
- **Live Sandbox Developer Account Tests (`backend/tests/integration/liveSandbox.test.ts`)**:
  - Executes real network calls with test credentials against:
    - n8n instance (fetching workflows and executions)
    - Microsoft Graph (fetching test users and app registrations)
    - Google Admin SDK (fetching directory users and managers)
    - OpenAI/Anthropic Admin APIs (fetching token usage)
  - Validates that live response shapes match canonical mapping expectations.

### 7.4 Tier 4: A/B Testing Framework (Deterministic PostgreSQL Hashing)
- **A/B Testing Engine (`backend/src/ab/experimentManager.ts`)**:
  - Computes variant assignment via deterministic hashing:
    $$\text{hash} = \text{SHA256}(\text{experiment\_id} + \text{user\_id}) \pmod{100}$$
  - Zero external third-party telemetry; 100% self-contained for single-tenant enterprise privacy.
- **Experiment 1: Attestation Email Copy**:
  - Variant A: Loss-Aversion messaging ("Critical workflows at risk when people leave").
  - Variant B: Governance compliance messaging ("Quarterly ownership review").
  - Metric: Attestation completion rate and median time-to-attest.
- **Experiment 2: v0 n8n Ownership Check Conversion Gate**:
  - Variant A: Soft gate (instant report; email required for PDF download).
  - Variant B: Hard gate (email required before scan).
  - Metric: Scan completion rate and lead capture rate.
- **Experiment 3: Successor Suggestion Ranking**:
  - Variant A: Degree of Authorship (DOA) history ranking.
  - Variant B: Org-chart / Manager-tree proximity.
  - Metric: Acceptance rate of suggested successor by managers.
- **A/B Test Verification Suite (`backend/tests/ab/experiments.test.ts`)**:
  - Verifies deterministic consistency (same user always gets same variant) and accurate metric logging.

### 7.5 Tier 5: End-to-End (E2E) Browser Tests (Playwright TypeScript)
- **E2E Test Suite (`frontend/tests/e2e/`)**:
  - `overview.spec.ts`: Loads Overview screen, verifies headline count drills down to named assets.
  - `whatIf.spec.ts`: Executes leaver simulation, verifies orphaned assets and runs/week update dynamically, tests successor reassignment.
  - `attestMobile.spec.ts`: Emulates mobile viewport (iPhone 14 / Pixel 7), loads magic-link attestation form, submits answers, verifies form confirmation and database update from `unknown` to `confirmed`.
  - `n8nCheck.spec.ts`: Submits test n8n URL and API key, verifies progress stepper, validates instant audit report rendering.
  - `departureWorkflow.spec.ts`: Creates departure, verifies handover pack compilation, tests successor acceptance flow.

---

## 8. Exact Automated Test Execution Commands

```bash
# 1. Run Unit & Contract Tests (Vitest)
npm run test:unit --prefix backend

# 2. Run Module & Graphology Tests (Vitest)
npm run test:module --prefix backend

# 3. Run Greenfield Database & pgcrypto Integration Tests
npm run test:integration:db --prefix backend

# 4. Run Live Sandbox External API Tests (requires test credentials)
npm run test:integration:sandbox --prefix backend

# 5. Run A/B Testing Deterministic Hashing Tests
npm run test:ab --prefix backend

# 6. Run Full Backend Test Suite
npm run test --prefix backend

# 7. Run Playwright E2E Tests (Desktop & Mobile Viewports)
npx playwright test --config frontend/playwright.config.ts

# 8. Run All Tests Across Entire Workspace
npm run test:all
```

---

## 9. Manual Verification Checklist

1. **Git Isolation Verification**:
   - Run `git branch` -> Confirm active branch is `mvp/v1-continuity`.
   - Verify zero modification to legacy OBA Core files.
2. **Database Physical Isolation**:
   - Connect to greenfield database via `psql`.
   - Verify `connection`, `raw_payload`, `entity`, `edge`, `fact` tables exist; verify legacy tables (`employees`, `agents`, `brain_modules`) are absent.
3. **Pgcrypto Secret Verification**:
   - Query `SELECT config_encrypted FROM connection;` -> Confirm credentials are encrypted byte strings.
   - Run decrypt function -> Confirm correct decryption with master key.
4. **v0 Free n8n Check Manual Run**:
   - Navigate to `http://localhost:3000/n8n-check`.
   - Paste test n8n credentials -> Observe progress stepper -> Verify audit report card renders in $<5\text{ s}$.
5. **Attestation Mobile Experience**:
   - Trigger test campaign -> Open generated magic link on a physical mobile device or devtools mobile emulator.
   - Complete 5-question wizard -> Verify completion confirmation and database fact transition to `confirmed`.
6. **Departure & What-If Flow**:
   - Select an employee with personal-credential workflows on the Departures screen.
   - Run What-If simulation -> Verify personal workflows turn red with affected weekly run volume displayed.
