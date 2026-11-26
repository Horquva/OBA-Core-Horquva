# Phase 2 Handoff Specification for Engineer B (Affan)

**From:** Engineer A (Ibrahim Shaikh — AI & Product / Platform Core)  
**To:** Engineer B (Affan — Connectors & Frontend)  
**Date:** 2026-11-27  
**Branch:** `sync_engineer_repo`  
**Status:** Phase 2 Core Platform Complete (`412b2e08`), 100% Tests Passing (504 tests across 63 suites)

---

## 1. Overview of Platform Core Changes

Engineer A has completed Phase 2 platform core infrastructure (Rounds 0–6) in accordance with [2026-11-23-real-platform-connectors.md](file:///C:/Users/Ibrahim%20Shaikh/.gemini/antigravity/worktrees/OBA-Core-Horqu/sync_engineer_repo/docs/superpowers/plans/2026-11-23-real-platform-connectors.md):

1. **Database Schema (`009_identity_link.sql`):** Added the `identity_link` table with confidence grading (`exact_email`, `prefix_match`, `name_exact`, `name_fuzzy`, `slack_to_github`, `aws_to_email`, `admin_link`, `fallback`), temporal validity (`valid_from`, `valid_to`), soft-deletion, and audit metadata.
2. **Obsolete Symbol Elimination:** Legacy `linked_person_id` / `linkedPersonId` columns and `TOOL_ACCOUNT_REFS` have been completely removed from runtime code, database adapters, and packages.
3. **Graded Auto-Linking & Repository (`LinkRepository` & `autoLink`):** Implemented dual-parity `PostgresLinkRepository` and `InMemoryLinkRepository` alongside all 7 automatic linking heuristic rules.
4. **Structural Account Ingestion (`syncHook.ts` & `runner.ts`):** Sync hook now queues structural `account` entities (`kind === 'account'`) rather than emitting conflicting person records. Supports alias resolution across `externalRefs.emails`.
5. **Graded Finding Attribution & Consumer View Deduplication:** Findings, permissions, and tool audit trails are attributed to canonical `person` entities through active links (`attribution.ts`). Linked-account shadow entities are suppressed in graph views, people views, and orphan scans.
6. **Identity Queue & Concurrency-Safe Bulk Confirmation:** `IdentityQueueService` now supports enriched suggestion payloads on `GET /api/identity-queue` and atomic bulk confirmations on `POST /api/identity-queue/confirm-suggestions` with sorted per-account advisory locks (`lockAccounts`) preventing concurrent deadlocks.

---

## 2. Lane B Implementation Tasks for Engineer B

### Task 2.1 — Frontend Entity Types & Graph Nodes
* **Target Files:**
  - `frontend/components/ui/EntityKindIcon.tsx`
  - `frontend/features/map/nodes.tsx`
* **Requirements:**
  1. Add `'account'`, `'repository'`, and `'project'` to `KIND_ICON` (e.g. `AtSign`/`UserCheck` for account, `GitFork`/`FolderGit2` for repository, `FolderKanban` for project) and `KIND_LABEL` in `EntityKindIcon.tsx`.
  2. Add `'account'` to `nodeTypes` in `frontend/features/map/nodes.tsx` so account nodes render with distinctive styling if displayed in graph views.
* **Type Contract:**
  `export type Kind = 'person' | 'tool' | 'finding' | 'system' | 'account' | 'repository' | 'project';`

---

### Task 2.4 — Directory Connector Email Aliasing
* **Target Connectors:**
  - `backend/src/connectors/entra/`
  - `backend/src/connectors/google/`
  - `backend/src/connectors/csv/`
* **Requirements:**
  1. When emitting `person` entities from directory sources:
     - Set `externalRefs.email` or `primaryEmail` to the user's primary corporate email.
     - When secondary emails or aliases exist (e.g. `proxyAddresses` in Entra, `aliases` in Google Workspace, or alias columns in CSV), populate `externalRefs.emails`.
  2. `externalRefs.emails` may be provided as:
     - A native `string[]`: `['ibrahim@horquva.com', 'm.ibrahim@corp.local']`
     - A JSON array string: `'["ibrahim@horquva.com", "m.ibrahim@corp.local"]'`
     - A comma-separated string: `'ibrahim@horquva.com, m.ibrahim@corp.local'`
* **How It Works:**
  `syncHook.ts` automatically parses and indexes all entries in `externalRefs.emails` into the directory index, allowing accounts using alias addresses to automatically match with high confidence.

---

### Task 2.5 — Tool Connector Account Entities & Credentials
* **Target Connectors:**
  - `backend/src/connectors/n8n/`
  - `backend/src/connectors/ai_admin/`
* **Requirements:**
  1. Emit tool users/service principals as `kind: 'account'` entities rather than `kind: 'person'`:
     - ID Format: `account:<source>:<platformId>` (e.g. `account:n8n:usr_123`, `account:openai:user-456`)
     - `externalRefs.source`: `'n8n'`, `'openai'`, etc.
     - `externalRefs.email` or `primaryEmail`: email associated with the tool account (if available).
     - `externalRefs.isBot`: boolean flag (`true` for service accounts, API tokens, bots; `false` for human accounts).
  2. For `runs_on_credentials_of` edges, reference the corresponding `account` entity ID.
* **Owner Approval Item (§C.5):**
  Engineer A has registered the following rule in `backend/src/connectors/sdk/sourceRules.ts:38`:
  `'connector:n8n|runs_on_credentials_of|account'`
  Please review and confirm owner approval for this rule definition.

---

### Task 2.7 — Identity Queue UI & Bulk Confirmation
* **Target Files:**
  - `frontend/features/settings/IdentityQueueView.tsx`
  - `frontend/lib/api/settings.ts`
  - `frontend/types/view.ts`
* **Endpoints Ready for Integration:**

#### 1. `GET /api/identity-queue`
* **Response Payload:**
  ```json
  {
    "items": [
      {
        "id": "c1f77d85-5fb7-44a0-a7d1-e5d0f8d9b231",
        "accountId": "account:github:octocat",
        "source": "github",
        "displayName": "The Octocat",
        "emailCandidate": "octocat@github.com",
        "suggestion": {
          "linkId": "d2a89e02-4bb3-4311-bf8e-f1b8a9d0e123",
          "person": {
            "id": "person:octocat@github.com",
            "kind": "person",
            "name": "The Octocat"
          },
          "reason": "Exact email match (confidence: 0.95)"
        },
        "suggestions": [
          {
            "linkId": "d2a89e02-4bb3-4311-bf8e-f1b8a9d0e123",
            "person": {
              "id": "person:octocat@github.com",
              "kind": "person",
              "name": "The Octocat"
            },
            "reason": "Exact email match (confidence: 0.95)"
          }
        ]
      }
    ]
  }
  ```
  *(Note: `suggestion.linkId` is non-null for pre-generated `suggested` links from autoLink)*

#### 2. `POST /api/identity-queue/confirm-suggestions`
* **Auth:** Admin only (`rbac.ts` enforces `admin` role; returns `403` for standard users).
* **Request Payload:**
  ```json
  {
    "linkIds": [
      "d2a89e02-4bb3-4311-bf8e-f1b8a9d0e123",
      "e3b90f13-5cc4-4422-cf9f-a2c9b0e1f234"
    ]
  }
  ```
  *(Constraint: 1 to 200 UUID strings)*
* **Response (`200 OK`):**
  ```json
  {
    "confirmed": 2,
    "links": [
      {
        "id": "new-admin-link-uuid-1",
        "accountId": "account:github:octocat",
        "personEntityId": "person:octocat@github.com",
        "grade": "confirmed",
        "method": "admin_link",
        "status": "active"
      }
    ]
  }
  ```
* **Error Handling:**
  - `400 Bad Request`: Empty array, non-UUID elements, or > 200 items.
  - `403 Forbidden`: Authenticated user is not an admin.
  - `404 Not Found`: Any requested `linkId` does not exist.
  - `409 Conflict`: Link is already confirmed, inactive, or duplicate accounts in batch.

#### 3. Single Link Resolution: `POST /api/identity-queue/:id/resolve`
* Used when an admin manually assigns an account to a different person:
  ```json
  {
    "personEntityId": "person:canonical_user@acme.com"
  }
  ```

---

## 3. Running Verification Locally

```bash
# Verify TypeScript build
npx tsc --noEmit -p backend

# Run the 504 Vitest unit & integration tests
npm --prefix backend test

# If local PostgreSQL is provisioned:
PG_TEST_URL="postgres://postgres:password@localhost:5432/oba_test" npm --prefix backend run test:pg
```
