# Horquva Operational Continuity Platform — Implementation Status & Next Steps Plan

> **Document Type:** Implementation Assessment & Next Phases Plan  
> **Date:** October 1, 2026  
> **Active Git Branch:** `mvp/v1-continuity` (tracked to `origin/mvp/v1-continuity`, commit `666ff7c`)  
> **Baselines Evaluated:**  
> - Software Requirements Specification (SRS v0–v2): `docs/horquva-strategy-session/extracted_SRS_v0_v1.txt`  
> - Deep Feasibility & Engineering Study: `deep_feasibility_and_engineering_study.md`  
> - Work Breakdown Structure: `WORK_BREAKDOWN_STRUCTURE_NEW_MVP.md`  
> - Master Expanded Implementation Plan: `expanded_implementation_plan_new_mvp.md`  
> - Memory MCP Audit Log & Decision Ledger  

---

## 1. Goal Description

This plan audits our exact current state of implementation on `mvp/v1-continuity`, evaluates what has been delivered across backend, frontend, connectors, security, and tests against the Work Breakdown Structure (WBS) and SRS, and details exactly **what is needed from you (the user)** and **what technical steps are next to complete the platform**.

---

## 2. Executive Implementation Status Audit

We have completed the **complete architectural reset and baseline platform implementation** of the new Horquva Operational Continuity Platform ("When someone leaves, nothing breaks"), with 100% green tests and zero legacy code remaining.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             HORQUVA CONTINUITY PLATFORM: STATUS MATRIX                           │
├───────────────────────────────┬────────────┬─────────────────────────────────────────────────────┤
│ Component / Workstream        │ Status     │ Verification & Capabilities Delivered               │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 1. Git & Codebase Isolation   │ COMPLETE   │ Clean greenfield branch `mvp/v1-continuity` pushed. │
│                               │            │ Zero legacy code; clean working tree.               │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 2. Shared Canonical Types     │ COMPLETE   │ `@horquva/types` package with CanonicalEntity,      │
│                               │            │ CanonicalEdge, SCD2 Fact, Checks, Simulations.      │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 3. Database Schema & Security │ COMPLETE   │ 12 PostgreSQL tables in `001_initial_schema.sql`   │
│                               │            │ with AES-256 `pgcrypto` functions.                  │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 4. Read-Only Connector SDK    │ COMPLETE   │ ReadOnlyHttpGuard enforcing GET-only; n8n, Entra ID,│
│                               │            │ Google Directory, OpenAI/Anthropic, CSV connectors. │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 5. Graphology & Checks Engine │ COMPLETE   │ In-memory DirectedMultiGraph, Checks C1–C4,         │
│                               │            │ headline metrics ("X of Y critical assets covered").│
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 6. What-If Simulations (S1-S3)│ COMPLETE   │ S1 (Leaver), S2 (Outage), S3 (Succession handover   │
│                               │            │ test with concentration overload warning).          │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 7. A/B Testing Engine         │ COMPLETE   │ PostgreSQL SHA256 deterministic hashing allocator.  │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 8. Confirmation Attestation   │ COMPLETE   │ Campaign creation, 256-bit token generation,        │
│                               │            │ Nodemailer SMTP mailer, SCD2 Fact Store reconciliation. │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 9. Grounded Gemini Assistant  │ COMPLETE   │ Google Gemini 2.0 Flash integration with strict     │
│                               │            │ evidence citation constraints (zero hallucination). │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 10. Free v0 n8n Check         │ COMPLETE   │ Stateless ephemeral API route + audit dashboard.    │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 11. Next.js 16 Frontend       │ COMPLETE   │ 7 core screens + contracts, 0 lint errors,          │
│     (Contracts & Routes)      │            │ 0 warnings, clean production build (9 routes).      │
├───────────────────────────────┼────────────┼─────────────────────────────────────────────────────┤
│ 12. 5-Tier Test Suite Baseline│ COMPLETE   │ 21/21 Vitest tests green, handCheckableTruth fixture,│
│                               │            │ Playwright E2E configuration and mobile emulation.  │
└───────────────────────────────┴────────────┴─────────────────────────────────────────────────────┘
```

---

## 3. What We Need From You (User Decisions & Inputs)

To progress smoothly through the next stages of delivery without blockers, we need your input on the following 3 items:

### 3.1 Item 1: Frontend Design Document & Aesthetic Specification
> [!IMPORTANT]
> **Awaiting User Design Document**:  
> In our `/grill-me` alignment, you specified that you will provide a **dedicated Design Document for the UI aesthetic and visual styling**.  
> - **Current State:** The 7 frontend screens have clean typography, robust layout containers, responsive mobile-friendly tables, and strict TypeScript contracts (`frontend/types/contracts.ts`), but use baseline Tailwind classes.  
> - **What is needed from you:** Provide the Design Document (or design guidelines: color tokens, typography, dark/light mode preference, spacing rhythm, component styling rules) so we can skin and polish the UI into a stunning, executive-ready interface.

### 3.2 Item 2: Live Sandbox Credentials & Environment Config
> [!WARNING]
> **Live Integration Testing Credentials**:  
> In our architectural decisions, you mandated **Live Sandbox Developer Accounts** making real network requests to external APIs with test tokens.  
> - **Current State:** The test suites run against mock connectors and the 10-person `handCheckableTruth.json` fixture.  
> - **What is needed from you:** When you are ready for live sync verification, provide/configure in `.env`:
>   1. `DATABASE_URL` (if connecting to a live PostgreSQL 16+ instance rather than local testing).
>   2. `MASTER_ENCRYPTION_KEY` (32+ character key for AES-256 pgcrypto).
>   3. `GEMINI_API_KEY` (for live Ask Horquva Gemini 2.0 calls).
>   4. Sandbox credentials for connectors you wish to test live: `N8N_BASE_URL` + `N8N_API_KEY`, Microsoft Entra ID tenant/client credentials, or Google Workspace service account credentials.

### 3.3 Item 3: Priority Sequencing for Phase 2 Workstreams
> [!NOTE]
> Please confirm which of the remaining advanced modules you would like us to prioritize next:
> - **Track A (UI Skinning):** Apply the incoming Design Document across all 7 frontend screens.
> - **Track B (Handover Packs & 72h Deletion Watcher - EPIC 8):** Implement automated Markdown/PDF handover pack manifests and the post-departure 72-hour execution error watcher.
> - **Track C (Identity Queue & Alias Resolver - EPIC 3):** Build the fuzzy email resolver and interactive review queue for unlinked service accounts.
> - **Track D (Expanded Simulations S4–S7 - EPIC 6):** Build compounding loss (S4), agent key revocation (S5), worst single loss ranking (S6), and departure cost calculator (S7).
> - **Track E (Background Jobs with pg-boss - EPIC 4):** Wire up the PostgreSQL `pg-boss` background worker for recurring scheduled connector syncs.

---

## 4. Work Breakdown: What Remains To Be Done (By Epic)

### EPIC 3: Identity Resolution & Review Queue
- [ ] **Task 3.1:** Implement string similarity / fuzzy email alias resolver for legacy accounts and contractors (`backend/src/identity/matcher.ts`).
- [ ] **Task 3.2:** Build admin endpoints for approving/merging identity queue items (`POST /api/identity/link`, `POST /api/identity/mark-service-account`).
- [ ] **Task 3.3:** Add Identity Queue management tab in `/connectors` or `/inventory`.

### EPIC 6: Extended What-If Simulation Scenarios (S4–S7)
- [ ] **Task 6.1 (S4 Compounding Loss):** Multi-person departure simulation (`personIds: string[]`), calculating combinatorial blast radius and multi-owner orphaning.
- [ ] **Task 6.2 (S5 AI Agent Revocation):** Simulate agent key compromise/revocation and calculate dependent workflow shutdowns.
- [ ] **Task 6.3 (S6 Worst Single Loss Ranking):** Graph traversal ranking all employees by the number of critical assets broken and weekly runs lost if they left today.
- [ ] **Task 6.4 (S7 Cost of Departure):** Financial impact estimator combining turnover replacement cost + operational automation downtime cost.

### EPIC 8: Departure Workflow & Handover Pack Generator
- [ ] **Task 8.1:** Handover Pack Manifest Generator (`backend/src/handover/packGenerator.ts`):
  - Compiles an exportable briefing for departing employee: list of owned assets, active credentials, designated successors, runbooks, and open attestations.
- [ ] **Task 8.2:** Successor Sign-Off & Acceptance flow:
  - Magic-link sent to successor to formally accept operational ownership.
- [ ] **Task 8.3:** Post-Departure 72-Hour Verifier (`backend/src/handover/postDepartureVerifier.ts`):
  - Telemetry listener triggered when `employeeLeaveDateTime` passes or account disabled, monitoring n8n error executions to catch unassigned or broken workflows.

### EPIC 10: Frontend Aesthetic Skinning (Upon User Design Document)
- [ ] **Task 10.1:** Define design tokens (colors, gradients, typography, shadows, card borders) in `frontend/app/globals.css`.
- [ ] **Task 10.2:** Style Overview Dashboard (`/`) with polished KPI cards, alert feeds, and quick actions.
- [ ] **Task 10.3:** Style Asset Inventory (`/inventory`) with rich filtering, search, and evidence grade badges.
- [ ] **Task 10.4:** Style What-If Simulation (`/simulation`) with interactive blast radius visualization and concentration warnings.
- [ ] **Task 10.5:** Style Confirmation Campaigns (`/campaigns`) and Attestation Form (`/review/[token]`) with mobile-first polish.
- [ ] **Task 10.6:** Style Free v0 n8n Check (`/n8n-check`) as a high-converting public audit tool.
- [ ] **Task 10.7:** Style Connectors & Identity Queue (`/connectors`).

### EPIC 11: Scheduled Services & pg-boss Background Jobs
- [ ] **Task 11.1:** Initialize `pg-boss` job queue connecting to the greenfield Postgres database.
- [ ] **Task 11.2:** Schedule recurring hourly connector sync jobs (`cron: '0 * * * *'`).
- [ ] **Task 11.3:** Build weekly briefing email generator aggregating weekly fact changes and dispatching via Nodemailer SMTP.

### EPIC 12: Comprehensive E2E Playwright Suite
- [ ] **Task 12.1:** Expand Playwright E2E tests to cover:
  - Full desktop flow: Overview -> Inventory filter -> Run What-If Leaver simulation -> Verify results.
  - Mobile viewport flow: Magic link email -> Open `/review/[token]` on iPhone viewport -> Submit answers -> Verify fact changes to `confirmed`.
  - v0 scan flow: Submit n8n credentials -> Verify instantaneous report generation.

---

## 5. Verification Plan

### Automated Gating
Before merging any phase into `main`:
1. **Vitest Unit & Module Suite**:
   ```bash
   npm test --prefix backend
   ```
2. **TypeScript Compilation**:
   ```bash
   npm run build --prefix packages/types
   npm run build --prefix backend
   ```
3. **Frontend Linter & Build**:
   ```bash
   npm run lint --prefix frontend
   npm run build --prefix frontend
   ```
4. **Playwright E2E Tests**:
   ```bash
   npx playwright test --config e2e/playwright.config.ts
   ```

### Manual Verification Gating
- Verify secret encryption in Postgres (`pgcrypto` columns cannot be read without master key).
- Verify mobile viewport usability of attestation review form.
- Verify deterministic tri-state logic (`unknown` never conflated with `false` or `low`).
