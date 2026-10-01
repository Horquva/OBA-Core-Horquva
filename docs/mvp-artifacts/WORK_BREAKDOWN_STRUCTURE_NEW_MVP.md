# Horquva Operational Continuity Platform — Work Breakdown Structure (WBS)

> **Document Type:** Comprehensive Engineering Work Breakdown Structure (v0 to v2)  
> **Date:** September 30, 2026  
> **Baseline References:**
> - Software Requirements Specification (v0–v2): `docs/horquva-strategy-session/extracted_SRS_v0_v1.txt`
> - Deep Feasibility & Engineering Study: `deep_feasibility_and_engineering_study.md`
> - Implementation Plan: `implementation_plan_new_mvp.md`
> - User Design Directives: 10/10 Architecture & Scope Branches Settled via `/grill-me`

---

## Architectural Constants & User Directives (Settled via `/grill-me`)

1. **Dual Directory Spine in v1**: Microsoft Entra ID and Google Workspace directory connectors are developed concurrently in v1.
2. **TypeScript End-to-End**: Strict TypeScript interfaces for all canonical entities, SCD2 facts, edges, checks, and API payloads.
3. **Database Isolation**: Completely separate greenfield PostgreSQL database instance, 100% physically isolated from legacy OBA tables.
4. **Secret Security**: PostgreSQL `pgcrypto` extension for column-level encryption/decryption of connector tokens directly within SQL functions.
5. **n8n Connectivity**: Dual support from v1: Direct REST API for reachable Cloud/exposed instances + a lightweight Docker collector for air-gapped on-premise deployments.
6. **Attestation Delivery**: Email Magic-Link Web Form in v1; Slack/Teams interactive bot integration staged for v1.1.
7. **v0 n8n Check**: Stateless server-side route inside the main Next.js web application (`/n8n-check`), holding API keys in memory only.
8. **LLM Provider**: Google Gemini via `@google/genai` SDK for "Ask Horquva" and weekly briefing prose generation.
9. **Test Runner**: Vitest for native TypeScript/ESM testing with high-speed parallel execution.
10. **UI Design System**: User will provide a dedicated Design Document; frontend modules will define clean presentation contracts.

---

## Summary Work Breakdown Hierarchy

- **EPIC 1: Infrastructure, Greenfield Database & Security Foundation**
- **EPIC 2: Connector Ingestion Layer & ELT Pipeline**
- **EPIC 3: Identity Resolution & Review Queue**
- **EPIC 4: Fact Store (SCD Type 2), Snapshot Diff & Change Engine**
- **EPIC 5: In-Memory Dependency Graph & Deterministic Checks Engine**
- **EPIC 6: What-If Simulation & Succession Engine**
- **EPIC 7: Access Review Campaigns & Attestation Service**
- **EPIC 8: Departure Workflow & Handover Pack Generator**
- **EPIC 9: Free Entry Wedge: v0 n8n Ownership Check**
- **EPIC 10: Web Application Frontend (7 Screens + Presentation Contracts)**
- **EPIC 11: Ask Horquva Assistant & Weekly Briefing Service**
- **EPIC 12: Automated Verification, Hand-Checkable Fixture & Hardening**

---

## Detailed Work Breakdown Structure

### EPIC 1: Infrastructure, Greenfield Database & Security Foundation

#### 1.1 Greenfield PostgreSQL Database & Migration Engine
- **1.1.1** Provision fresh greenfield PostgreSQL 16+ database instance.
- **1.1.2** Initialize database extensions: `uuid-ossp` and `pgcrypto`.
- **1.1.3** Implement `pgcrypto` cryptographic helper functions:
  ```sql
  CREATE OR REPLACE FUNCTION horquva_encrypt_secret(secret text, master_key text) 
  RETURNS bytea AS $$
    SELECT pgp_sym_encrypt(secret, master_key, 'cipher-algo=aes256');
  $$ LANGUAGE SQL IMMUTABLE;

  CREATE OR REPLACE FUNCTION horquva_decrypt_secret(encrypted_secret bytea, master_key text) 
  RETURNS text AS $$
    SELECT pgp_sym_decrypt(encrypted_secret, master_key);
  $$ LANGUAGE SQL IMMUTABLE;
  ```
- **1.1.4** Write initial DDL migration (`001_initial_schema.sql`) for core tables:
  - `connection` (id, type, name, config_encrypted, status, last_sync_at, last_error)
  - `sync_run` (id, connection_id, status, started_at, completed_at, stats, error_message)
  - `raw_payload` (id, sync_run_id, connection_id, resource_type, external_id, payload, ingested_at)
  - `entity` (id, kind, name, description, external_refs, created_at, updated_at)
  - `edge` (id, from_id, to_id, type, grade, source, source_ref, valid_from, valid_to)
  - `fact` (id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to)
  - `change_event` (id, kind, entity_id, before_state, after_state, impact_summary, detected_at, acknowledged_at)
  - `campaign` (id, name, status, scope, created_at, due_date, completed_at)
  - `attestation_task` (id, campaign_id, reviewer_person_id, asset_entity_id, status, token, answers, reminders_sent)
  - `identity_queue` (id, external_account_id, source, display_name, email_candidate, status, linked_person_id)
  - `prediction_ledger` (id, claim_type, target_entity_id, predicted_range, model_version, inputs, evaluation_due_at, actual_outcome, brier_score)
  - `audit_log` (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
- **1.1.5** Build migration runner script (`backend/db/migrate.ts`) supporting idempotent up/down migrations.

#### 1.2 TypeScript Project Scaffolding & Shared Types
- **1.2.1** Scaffold `backend/tsconfig.json` with strict mode enabled, NodeNext module resolution, and path aliases.
- **1.2.2** Define Core Canonical Domain Types (`backend/types/domain.ts`):
  - `EntityKind = 'person' | 'automation' | 'credential' | 'model' | 'vendor' | 'group' | 'app'`
  - `EdgeType = 'owns' | 'backs_up' | 'depends_on' | 'calls_model' | 'runs_on_credentials_of' | 'member_of'`
  - `EvidenceGrade = 'stated' | 'inferred' | 'confirmed' | 'unknown'`
  - `CriticalityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown'`
  - `FactAttribute = 'criticality' | 'documented' | 'fallback_exists' | 'run_volume_weekly' | 'status'`
  - `CanonicalEntity`, `CanonicalEdge`, `CanonicalFact`, `ChangeEvent`, `AttestationAnswers` interfaces.
- **1.2.3** Set up Vitest configuration (`backend/vitest.config.ts`) with coverage reporting.

#### 1.3 Authentication, RBAC & Audit Middleware
- **1.3.1** Implement Microsoft Entra ID OAuth 2.0 / Google Workspace OpenID Connect token validation.
- **1.3.2** Implement RBAC middleware enforcing roles (`admin`, `viewer`, `reviewer`) on all routes (`SEC-02`).
- **1.3.3** Implement tamper-evident append-only Audit Logging service (`backend/services/auditLogger.ts`) recording all config changes, sync runs, and attestation answers (`SEC-06`).

---

### EPIC 2: Connector Ingestion Layer & ELT Pipeline

#### 2.1 Connector Core SDK (`backend/connectors/sdk/`)
- **2.1.1** Define `Connector<T>` abstract interface:
  - `validateConnection(config: ConnectorConfig): Promise<ConnectionHealth>`
  - `sync(runContext: SyncContext): AsyncGenerator<RawResourceBatch>`
  - `mapToCanonical(raw: RawResource): { entities: CanonicalEntity[]; edges: CanonicalEdge[]; facts: CanonicalFact[] }`
  - `getRateLimits(): RateLimitConfig`
- **2.1.2** Build `ReadOnlyHttpGuard`: Intercepts all outgoing HTTP requests from connectors, enforcing an allowlist of `GET` endpoints and throwing fatal errors on `POST`, `PUT`, `DELETE`, or `PATCH` (`CON-04`, `SEC-04`).
- **2.1.3** Build exponential backoff retry and rate-limiting wrapper with status logging.

#### 2.2 Microsoft Entra ID Connector (`backend/connectors/entra/`)
- **2.2.1** App Registration authentication via Client Credentials grant (Certificate or Secret).
- **2.2.2** Ingest Directory Users (`CON-05`):
  - Request: `GET /v1.0/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled,employeeHireDate,employeeLeaveDateTime&$top=999`
  - Pagination handling via `@odata.nextLink`.
  - Capture `employeeLeaveDateTime` (requires `User-LifeCycleInfo.Read.All`).
- **2.2.3** Ingest User Managers:
  - Request: `GET /v1.0/users/{id}/manager?$select=id,mail,displayName`.
  - Map to edge: `(person:user) -[member_of]-> (person:manager)`.
- **2.2.4** Ingest Application Registrations & Service Principals (`CON-06`):
  - Request: `GET /v1.0/applications?$select=id,appId,displayName` and `GET /v1.0/applications/{id}/owners`.
  - Ingest Service Principals via `GET /v1.0/servicePrincipals?$select=id,appId,displayName`.
  - Map to entity `app` and edges `(person:owner) -[owns]-> (app:registration)`.
  - Detect ownerless applications -> emit finding.
- **2.2.5** Ingest Security Groups:
  - Request: `GET /v1.0/groups?$select=id,displayName,mail` and `GET /v1.0/groups/{id}/owners`.
- **2.2.6** Write Entra canonical mapper turning raw MS Graph JSON into canonical entities, edges, and facts.

#### 2.3 Google Workspace Directory Connector (`backend/connectors/google/`)
- **2.3.1** Authenticate using Google Cloud Service Account with Domain-Wide Delegation and scope `admin.directory.user.readonly`.
- **2.3.2** Ingest Directory Users (`CON-05`, `CON-07`):
  - Call `admin.directory.v1.users.list({ customer: 'my_customer', projection: 'full', maxResults: 500 })`.
  - Extract `primaryEmail`, `organizations[].department`, `organizations[].title`, `suspended`, `archived`.
  - Extract manager from `relations` array (`relation.type === 'manager'`).
  - Flag suspended/archived accounts as departed (`status = 'departed'`).
- **2.3.3** Ingest Google Groups:
  - Call `admin.directory.v1.groups.list()` and `admin.directory.v1.members.list()`.
- **2.3.4** Write Google canonical mapper turning Google Directory responses into canonical entities and edges.

#### 2.4 n8n Ingestion Connector (`backend/connectors/n8n/`)
- **2.4.1** Connect via API key header `X-N8N-API-KEY`.
- **2.4.2** Ingest Workflows (`CON-01`):
  - Request: `GET /api/v1/workflows?active=true` and `GET /api/v1/workflows?active=false`.
  - For each workflow: parse `nodes[]`, `connections`, `description`, `notes`, `tags`, `shared[]`.
- **2.4.3** Node Type to Vendor & AI Model Catalog Mapping (`CON-01`):
  - Built-in dictionary mapping n8n node types:
    - `@n8n/n8n-nodes-langchain.agent` -> AI Agent
    - `@n8n/n8n-nodes-langchain.lmChatOpenAi` / `n8n-nodes-base.openAi` -> Vendor: OpenAI
    - `@n8n/n8n-nodes-langchain.lmChatAnthropic` -> Vendor: Anthropic
    - `n8n-nodes-base.jira` -> Vendor: Atlassian Jira
    - `n8n-nodes-base.postgres` -> Infrastructure: PostgreSQL
  - Extract model name from node parameters: `parameters.model`, `parameters.options.model`, `parameters.modelId`.
  - Create edges: `(automation:workflow) -[calls_model]-> (model:name)` and `(automation:workflow) -[depends_on]-> (vendor:name)`.
- **2.4.4** Ingest Workflow Version History (`CON-02`):
  - Request: `GET /api/v1/workflows/{id}/history`.
  - Map authors to infer secondary contributors / backups (`grade = 'inferred'`).
- **2.4.5** Ingest Execution Errors & Volume (`CON-03`):
  - Request: `GET /api/v1/executions?status=error&startedAfter={last_sync}`.
  - Calculate weekly execution volume and failure rates.
  - Persist daily run and failure counts in Postgres before n8n's 7–30 day pruning window expires.
- **2.4.6** Ingest Credentials & Identify Personal Project Risk (`CON-01`, `V0-05`):
  - Request: `GET /api/v1/credentials` (retrieve `id`, `name`, `type`, `projectId`).
  - Request: `GET /api/v1/projects/{projectId}`.
  - Flag workflows executing on credentials owned by personal workspaces (`type === 'personal'`).
  - Create edge: `(automation:workflow) -[runs_on_credentials_of]-> (person:creator)`.

#### 2.5 Air-Gapped n8n Docker Collector (`backend/connectors/n8n/collector/`)
- **2.5.1** Package a standalone Node.js Docker container script (`horquva-collector`).
- **2.5.2** Accepts local environment variables: `N8N_LOCAL_URL`, `N8N_API_KEY`, `HORQUVA_SYNC_ENDPOINT`, `HORQUVA_INGEST_TOKEN`.
- **2.5.3** Executes read calls locally inside customer VPC, packages sanitized raw JSON, encrypts payload, and sends outbound HTTPS POST to Horquva sync endpoint.
- **2.5.4** Includes Dockerfile, docker-compose.yml, and verification script.

#### 2.6 OpenAI & Anthropic Admin Connectors (`backend/connectors/ai_admin/`)
- **2.6.1** OpenAI Admin Usage (`CON-08`):
  - Request: `GET /v1/organization/usage/completions?group_by=project_id,model,api_key_id`.
  - Request: `GET /v1/organization/costs`.
  - Aggregate token usage and monthly spend per model and project.
- **2.6.2** Anthropic Admin Usage (`CON-08`):
  - Request: `GET /v1/organizations/usage_report/messages?group_by[]=model&group_by[]=workspace_id&group_by[]=api_key_id`.
  - Aggregate model consumption per workspace.
- **2.6.3** Create canonical model entities and cost attribution facts.

#### 2.7 Structured CSV Ingestion Engine (`backend/connectors/csv/`)
- **2.7.1** CSV Parser supporting streaming upload of up to 50,000 rows.
- **2.7.2** Strict schema validation against template headers:
  - `asset_id, asset_name, asset_type, owner_email, backup_email, criticality, is_documented, runbook_url, fallback_exists, depends_on_ids`
- **2.7.3** Detailed row-level syntax and semantic validation report (emits errors for invalid emails or missing IDs).

---

### EPIC 3: Identity Resolution & Review Queue

#### 3.1 Deterministic Identity Matching Engine (`backend/identity/`)
- **3.1.1** Directory as Single Source of Truth (`ID-01`):
  - Primary identity records established from Entra ID (`userPrincipalName`, `mail`) and Google Workspace (`primaryEmail`).
  - Normalization: lower-case, strip trailing whitespace, normalize subdomains.
- **3.1.2** Account Association Rules:
  - Match n8n user emails, OpenAI project emails, GitHub emails against directory records.
  - Track user aliases and secondary emails.
- **3.1.3** Service Account Detection Heuristics:
  - Identify non-human accounts via patterns: `svc-*`, `bot-*`, `*-automation@`, `service-*`, or directory accounts with `accountEnabled=false` but active token usage.

#### 3.2 Identity Review Queue Service & APIs (`backend/identity/queue/`)
- **3.2.1** Unmatched Account Routing (`ID-02`):
  - When an external account has no email match in the directory, insert into `identity_queue` with `status = 'pending'`.
  - **Constraint:** Never mark an asset as "no owner" simply because the creator account failed automatic matching.
- **3.2.2** Identity Resolution Actions (`ID-03`):
  - Admin API: `POST /api/identity-queue/{id}/resolve`
    - Action `link`: Assigns external account to a confirmed directory person ID.
    - Action `mark_service_account`: Classifies account as a programmatic service account.
    - Action `mark_departed`: Confirms the account belonged to a departed employee.
  - All decisions logged to `audit_log`.

---

### EPIC 4: Fact Store (SCD Type 2), Snapshot Diff & Change Engine

#### 4.1 Slowly Changing Dimension (SCD Type 2) Fact Store (`backend/db/facts/`)
- **4.1.1** Fact Insertion and Versioning Logic:
  - When new fact arrives for `(entity_id, attribute)`:
    - If active fact (`valid_to IS NULL`) has identical `value` and `grade`: update `observed_at` timestamp.
    - If `value` or `grade` changed: set existing fact's `valid_to = NOW()` and insert new fact with `valid_from = NOW()`.
- **4.1.2** Fact Precedence Hierarchy (`DATA-04`):
  - `confirmed` (by human owner) overrides `stated` (API) and `inferred` (heuristic).
  - A confirmed fact remains active until underlying source emits a conflicting change event, triggering re-attestation.
- **4.1.3** Explicit "Unknown" Fact Semantics (`DATA-03`):
  - Missing facts are stored explicitly as `value = "unknown"`, `grade = "unknown"`.
  - Database queries and application logic strictly differentiate `value = 'unknown'` from `value = 'none'` / `value = false`.

#### 4.2 Snapshot Diffing & Change Event Detection (`backend/services/diffEngine/`)
- **4.2.1** Diff Execution on Sync Run Completion (`CHG-01`):
  - Query facts where `valid_from = current_sync_run_time`.
  - Categorize change events:
    - `person_left`: Directory account disabled or `employeeLeaveDateTime` populated.
    - `owner_changed`: Workflow/app owner updated in source.
    - `workflow_edited`: Version history incremented.
    - `model_swapped`: Model dependency changed (e.g. `gpt-4o` -> `claude-3-5-sonnet`).
    - `failures_spiked`: Failure rate increased by $>20\%$ over rolling 7-day average.
    - `credential_risk`: Workflow reassigned to a personal project credential.
- **4.2.2** Impact Calculation for Changes (`CHG-02`):
  - Walk downstream graph from changed entity.
  - Populate `impact_summary`: list of affected critical assets, affected weekly run volume, and affected active handovers.
- **4.2.3** Weekly Change Feed Digest:
  - Aggregate detected change events over previous 7 days for the weekly briefing.

---

### EPIC 5: In-Memory Dependency Graph & Deterministic Checks Engine

#### 5.1 In-Memory Graph Engine via Graphology (`backend/domain/graph/`)
- **5.1.1** Graph Construction:
  - Instantiate `DirectedMultiGraph` from `graphology`.
  - Populate nodes from active `entity` records with attributes (`kind`, `name`, facts map).
  - Populate directed edges from active `edge` records with attributes (`type`, `grade`, `source`).
  - Graph construction benchmark requirement: $<50\text{ ms}$ for 20,000 nodes.
- **5.1.2** Graph Query Primitives:
  - `getDownstreamDependencies(entityId: string): Entity[]`
  - `getUpstreamDependencies(entityId: string): Entity[]`
  - `findCyclePaths(): string[][]`
  - `getTransitiveRunVolume(entityId: string): number`

#### 5.2 Deterministic Checks Engine (`backend/domain/checks/`)
- **5.2.1** Check Definition Registry (`AD-1`):
  - Interface:
    ```typescript
    interface CheckDefinition {
      id: string;
      name: string;
      description: string;
      targetKind: EntityKind;
      evaluate(entity: Entity, graph: DirectedMultiGraph): CheckResult;
    }
    interface CheckResult {
      checkId: string;
      entityId: string;
      status: 'PASS' | 'FAIL' | 'UNKNOWN';
      evidenceFactIds: string[];
      reason: string;
    }
    ```
- **5.2.2** Core Check Rules Implementation:
  - `critical-asset-has-owner`: PASS if owner exists and active; FAIL if owner is none; UNKNOWN if owner not recorded.
  - `critical-asset-has-backup`: PASS if backup exists; FAIL if backup is none; UNKNOWN if backup not recorded.
  - `critical-asset-documented`: PASS if documented with URL; FAIL if documented is false; UNKNOWN if unrecorded.
  - `critical-asset-has-fallback`: PASS if alternative exists; FAIL if no fallback; UNKNOWN if unrecorded.
  - `automation-not-on-personal-credential`: FAIL if edge `runs_on_credentials_of` points to a personal project of an individual.
  - `asset-owner-is-active`: FAIL if owner's directory status is `suspended` or `accountEnabled = false`.
- **5.2.3** Headline Metric Aggregator (`SIM-07`):
  - Calculates: "X of Y critical assets fully covered" (where fully covered = PASS on owner, backup, and documentation).
  - Outputs count of exposed assets and count of unknown facts.

#### 5.3 Truck Factor & Inferred Bus Factor Algorithm (`backend/domain/metrics/busFactor.ts`)
- **5.3.1** Degree of Authorship (DOA) Calculation:
  - Implementation of Avelino et al. (ICPC 2016) adapted for workflow edit history.
  - $DOA = 3.293 + 1.098 \cdot FA + 0.164 \cdot DL - 0.321 \cdot \ln(1 + AC)$, where $FA$ is first author binary, $DL$ is delivery modifications, $AC$ is subsequent changes.
- **5.3.2** Greedy Truck Factor Simulation:
  - Iteratively removes highest-DOA developers until $>50\%$ of workflows in a department or asset group have no qualified author ($DOA \ge 0.75$).
- **5.3.3** Output Constraints:
  - Result marked strictly as **`inferred`**; feeds suggestions for confirmation campaigns, never stated as certainty.

---

### EPIC 6: What-If Simulation & Succession Engine

#### 6.1 Deterministic What-If Simulation Engine (`backend/domain/simulations/`)
- **6.1.1** Scenario S1: Person Leaves (`SIM-01`):
  - Input: `person_id`.
  - Graph Walk:
    1. Identify all assets where `person_id` is owner.
    2. Filter assets where backup is `none`, `unknown`, or equal to `person_id` -> **Orphaned Critical Assets**.
    3. Identify all automations with edge `runs_on_credentials_of -> person_id` -> **Broken Credential Automations**.
    4. Compute union of downstream dependent workflows -> **Downstream Impact**.
    5. Sum historical executions of all stopped workflows -> **Runs Per Week Affected**.
- **6.1.2** Scenario S2: Automation / Service Fails (`SIM-02`):
  - Input: `asset_id`.
  - Walk downstream dependency DAG to find all connected dependent workflows and teams.
- **6.1.3** Scenario S3: AI Model / Vendor Outage (`SIM-03`):
  - Input: `vendor_id` or `model_id` (e.g. `vendor:openai`, `model:claude-3-5-sonnet`).
  - Traverse all incoming `calls_model` and `depends_on` edges.
  - Check `fallback_exists` fact on each automation.
  - Output: automations halted (no fallback), automations resilient (fallback verified), total runs affected.
- **6.1.4** Scenario S4: Combined Scenario (`SIM-04`):
  - Input: Array of entities (e.g. Person leaves AND Vendor goes down).
  - Evaluate compounding impact: detect if backup person was also dependent on failed vendor.
- **6.1.5** Scenario Ranking ("Worst Single Losses") (`SIM-06`):
  - Iterates over all employees and vendors; computes S1 and S3; sorts by orphaned critical assets, then runs per week affected.

#### 6.2 Succession Testing Engine (`backend/domain/simulations/succession.ts`)
- **6.2.1** Succession Scenario Execution (`SIM-05`):
  - Inputs: `departing_person_id`, `successor_person_id`, `asset_ids[]`.
  - Virtual Reassignment:
    - Temporarily rebinds `owner` on selected assets to `successor_person_id`.
    - Re-evaluates all checks on the affected assets.
- **6.2.2** Output Metrics:
  - Assets successfully covered by successor.
  - Assets remaining exposed.
  - Successor's New Concentration Load: total critical assets owned by successor post-handover.
  - Warning trigger if successor now holds $>30\%$ of company's critical automations.

---

### EPIC 7: Access Review Campaigns & Attestation Service

#### 7.1 Campaign Scheduler & Management (`backend/campaigns/`)
- **7.1.1** Campaign Creation API (`CHK-01`):
  - `POST /api/campaigns`: Admin defines scope (e.g. all unconfirmed critical assets, department filter, or triggered by leaver).
  - Creates `campaign` record and populates `attestation_task` rows grouped by reviewer.
- **7.1.2** Reviewer Assignment Logic:
  - Primary reviewer = Stated owner/creator.
  - If unowned = Line manager of team or department lead.
- **7.1.3** Unique Cryptographic Token Generation:
  - Generate secure 256-bit URL-safe token per `attestation_task`.
  - Store token hash in database with expiration date.

#### 7.2 Attestation Notification & Delivery (`backend/campaigns/delivery/`)
- **7.2.1** Email Delivery Service (`CHK-04`):
  - Template: "Action Required: Confirm ownership and backups for your [N] automations".
  - One email per reviewer listing all their assigned assets.
  - Direct Magic-Link URL: `https://app.horquva.com/attest/{token}`.
- **7.2.2** Automated Reminders & Escalation:
  - Scheduled worker running via `pg-boss`.
  - Day 3 reminder email.
  - Day 7 escalation: notifies reviewer's manager if task is still pending.

#### 7.3 Attestation Submission & Fact Reconciliation (`backend/campaigns/reconcile/`)
- **7.3.1** Submission API (`CHK-02`, `CHK-06`):
  - `POST /api/attest/{token}`: Accepts answers:
    ```json
    {
      "is_owner": true,
      "backup_person_id": "person:sara@acme.com",
      "criticality": "high",
      "criticality_reason": "Invoicing depends on this daily",
      "is_documented": true,
      "documentation_url": "https://notion.so/acme/invoice-runbook",
      "fallback_exists": false
    }
    ```
- **7.3.2** Fact Store Update:
  - Converts answers into `confirmed` facts with `attested_by = reviewer_id` and `valid_from = NOW()`.
  - Closes prior `unknown` or `stated` facts.
  - If `is_owner == false`: sets asset owner to `unknown` and notifies admin.
- **7.3.3** Claiming Ownerless Assets (`CHK-03`):
  - Allows reviewer to claim ownerless assets discovered in their department.

---

### EPIC 8: Departure Workflow & Handover Pack Generator

#### 8.1 Departure Lifecycle Management (`backend/handover/`)
- **8.1.1** Departure Initiation (`HND-01`):
  - Triggered via (a) HR/Admin API `POST /api/departures` with leave date, or (b) automatic detection from Entra ID `employeeLeaveDateTime` / Google `suspended`.
- **8.1.2** Automatic Handover Pack Compilation (`HND-02`):
  - Instantly runs What-If S1 simulation for the departing employee.
  - Aggregates all owned assets, personal-credential automations, undocumented systems, and downstream dependents into a structured JSON handover manifest.
- **8.1.3** Successor Assignment & Acceptance (`HND-03`, `HND-04`):
  - Manager selects successor from smart candidates (existing backups or co-editors).
  - Sends acceptance request to successor: `POST /api/handover/{id}/accept`.
  - Acceptance records a `confirmed` ownership transition fact.
- **8.1.4** Departure Progress Tracking (`HND-05`):
  - Tracks state: `Initiated` -> `Successor Named` -> `Accepted` -> `Account Disabled` -> `Post-Departure Verified`.

#### 8.2 PDF Handover Pack & Executive Scan Export (`backend/reports/`)
- **8.2.1** PDF Generation Service using `@react-pdf/renderer` or Puppeteer.
- **8.2.2** Departure Handover Pack PDF (`RPT-01`):
  - Cover page: Leaver name, role, department, departure date, completion status.
  - Section 1: Critical Assets Owned & Successor Assignments.
  - Section 2: Personal Credential Automations at Risk of Stopping.
  - Section 3: Runbooks and Documentation Links.
  - Section 4: Sign-off block for HR and Manager.
- **8.2.3** Executive Scan Report PDF (`RPT-02`):
  - Board-ready summary: Headline coverage count, Top 5 SPOFs, Concentration vulnerabilities, and Recommended Actions.

#### 8.3 Post-Departure Verification Daemon (`backend/handover/verifier.ts`)
- **8.3.1** Account Deactivation Listener (`HND-06`):
  - Triggers when directory connector detects account is disabled (`accountEnabled = false`).
- **8.3.2** 72-Hour Verification Monitor:
  - Actively polls n8n execution errors for all workflows previously associated with the departed user.
  - If any workflow fails with authentication/credential errors -> immediately emits High-Severity Alert: "Workflow X halted post-departure due to disabled credentials of [User]".

---

### EPIC 9: Free Entry Wedge: v0 n8n Ownership Check

#### 9.1 Stateless Server-Side Scanner (`backend/routes/v0/`)
- **9.1.1** API Route `POST /api/v0/n8n-check` (`V0-01` to `V0-03`):
  - Accepts `{ n8n_url: string, api_key: string }`.
  - Validates key in memory with single test call: `GET {n8n_url}/api/v1/workflows?limit=1`.
  - **Security Guarantee:** Key is held in volatile memory only during the execution of the request. Never saved to PostgreSQL, redis, disk, or logs (`V0-03`).
- **9.1.2** Scan Execution (`V0-04` to `V0-06`):
  - Fetches all workflows: `GET /api/v1/workflows`.
  - Identifies single-owner workflows (workflows where project has only 1 user).
  - Identifies personal-credential usage (workflows calling credentials tied to personal workspaces).
  - Fetches execution errors: `GET /api/v1/executions?status=error` over retained history.
  - Identifies abandoned workflows (active = true, but not modified or executed in $>60$ days).
- **9.1.3** Output Response:
  - Generates instant JSON audit summary with count of single points of failure, credential exposures, and failing automations.
  - Optional lead capture email submission (`V0-08`).

#### 9.2 Frontend Self-Serve Interface (`frontend/app/n8n-check/page.tsx`)
- **9.2.1** Clean single-screen audit submission form with explicit security disclosure:
  - "Read-only access. Keys are held in memory during the scan only and are never saved."
- **9.2.2** Live progress stepper (Validating connection -> Fetching workflows -> Auditing credentials -> Analyzing executions).
- **9.2.3** Interactive audit report card with downloadable PDF export.

---

### EPIC 10: Web Application Frontend (7 Screens + Presentation Contracts)

#### 10.1 Decoupled UI Presentation Contracts & State Store
- **10.1.1** Establish typed UI state contracts (`frontend/types/uiContracts.ts`):
  - `OverviewProps`, `DeparturesProps`, `PeopleProps`, `AssetsProps`, `MapProps`, `WhatIfProps`, `ActionsProps`.
  - Formatted ready for the incoming user Design Document.
- **10.1.2** React Query / TanStack Query data fetching layer with caching and optimistic updates.
- **10.1.3** Elimination of Browser-Side Scoring:
  - Verify zero client-side calculation: all counts, statuses, and reasons come directly from backend checks API.

#### 10.2 The 7 Core Screens
- **10.2.1 Overview Screen (`frontend/app/overview/page.tsx` - `UI-01`)**:
  - Headline Count Banner: "38 of 52 critical assets fully covered · 9 exposed · 5 unknown".
  - Summary Cards: Upcoming departures (next 30 days), Active credential risks, Top 5 SPOFs.
  - Top 5 Ranked Remediation Actions.
- **10.2.2 Departures & Handover Screen (`frontend/app/departures/page.tsx` - `UI-02`)**:
  - Upcoming and recent departures list with leave dates.
  - Progress tracker per departure (Handover pack generated, Successor confirmed, Post-departure verified).
  - "Initiate Departure" modal.
- **10.2.3 People & Teams Screen (`frontend/app/people/page.tsx` - `UI-03`)**:
  - Who holds what: Table of employees and their owned critical assets.
  - Team concentration view: "2 people hold 75% of Finance automations".
  - **Compliance Guard:** Zero individual risk scores, rankings, or attrition predictions.
- **10.2.4 Assets Inventory Screen (`frontend/app/assets/page.tsx` - `UI-04`)**:
  - Filterable table: Automations, AI Models, SaaS Credentials, Vendors, Groups.
  - Columns: Name, Type, Owner, Backup, Criticality, Documented, Fallback, Weekly Run Volume.
  - Fact Evidence Badge: `stated` (blue), `inferred` (amber), `confirmed` (green), `unknown` (gray).
  - Slide-over drawer showing historical fact provenance and source records.
- **10.2.5 Dependency Map Screen (`frontend/app/map/page.tsx` - `UI-05`)**:
  - Interactive WebGL/SVG graph visualization using `@xyflow/react` (React Flow) or `@graphology/sigma`.
  - Node types: People (circles), Automations (hexagons), Models/Vendors (rectangles).
  - Edge types: Ownership, Dependency, Credential, Model Call.
  - Click node -> highlights blast radius and upstream dependencies.
- **10.2.6 What-If Simulation Screen (`frontend/app/what-if/page.tsx` - `UI-06`)**:
  - Scenario Builder: Select single or multiple entities (Employee leaves, Vendor goes down).
  - Simulation Output: Orphaned critical assets list, Broken personal-credential automations, Runs/week affected.
  - Interactive Succession Test: Select candidate successor -> see real-time updated coverage and successor load.
- **10.2.7 Actions Screen (`frontend/app/actions/page.tsx` - `UI-07`)**:
  - Single prioritized list of remediation tasks.
  - Ranked by criticality, then missing backup, then affected run volume.
  - Each action explicitly names the missing fact it resolves with a direct 1-click action (e.g. "Assign Backup", "Launch Confirmation").

#### 10.3 Mobile-Friendly Attestation Web Form (`frontend/app/attest/[token]/page.tsx` - `UI-08`)
- **10.3.1** Token-authenticated standalone page (no app sidebar or user login required).
- **10.3.2** Optimized for mobile screens (iOS Safari, Android Chrome).
- **10.3.3** Step-by-step confirmation wizard for each asset assigned to the reviewer:
  - "Do you still own this?" (Yes / No)
  - "Who is your primary backup?" (Searchable employee dropdown)
  - "How critical is this?" (High / Medium / Low with mandatory reason)
  - "Where is the runbook?" (URL input or "Not documented")
  - "Is there a fallback if this stops?" (Yes / No / Don't know)

---

### EPIC 11: Ask Horquva Assistant & Weekly Briefing Service

#### 11.1 "Ask Horquva" AI Assistant (`backend/agent/`)
- **11.1.1** Assistant Service using `@google/genai` (Gemini 2.0 / latest models) (`AI-01`, `AI-02`).
- **11.1.2** Tool-Calling Architecture:
  - Tools map 1:1 to deterministic backend API endpoints:
    - `get_headline_metrics()`
    - `simulate_departure({ person_id })`
    - `get_asset_details({ asset_id })`
    - `get_person_holdings({ person_id })`
    - `get_failing_checks({ filter })`
- **11.1.3** Evidence-Linked Reasoning:
  - Model prompt enforces: "Every factual claim must cite the specific entity ID, evidence state, and source. You must never invent or compute risk scores."
- **11.1.4** Role-Based Data Scoping:
  - Enforces user's RBAC role in tool invocation context (`AI-03`).

#### 11.2 Weekly Briefing Service (`backend/services/briefing/`)
- **11.2.1** Briefing Aggregator:
  - Gathers: Upcoming departures (next 14 days), unbacked critical assets, credential exposures, new failure spikes from `change_event` table (`CHG-03`).
- **11.2.2** Prose Generation via Gemini:
  - Passes structured JSON counts to Gemini to draft executive prose summary.
- **11.2.3** Email Dispatch via SMTP/Resend to Admin and Executive viewers.

---

### EPIC 12: Automated Verification, Hand-Checkable Fixture & Hardening

#### 12.1 Hand-Checkable Test Organization Fixture (`backend/tests/fixtures/`)
- **12.1.1** Define 10-person, 15-asset paper-verified test organization:
  - Known employees: Omar (DevOps Lead), Sara (Senior Engineer), Alex (Ops), Yuki (Backend), etc.
  - Known automations: Invoice Workflow, Slack Alert Bot, Customer Onboarding, ETL Sync.
  - Known dependencies: Omar owns Invoice Workflow on his personal credential; Sara is unassigned; Alex has no backup.
- **12.1.2** Paper Truth Reference File (`handCheckableTruth.json`):
  - Pre-calculated expected values:
    - Covered assets: Exactly 9 of 15.
    - Top SPOF: Omar (loss breaks 4 automations, affects 1,200 runs/week).
    - Succession: Reassigning Omar's assets to Yuki covers 3, leaves 1 unbacked, raises Yuki load to 6.

#### 12.2 Vitest Automated Test Suites (`backend/tests/`)
- **12.2.1 Contract & Invariant Tests (`backend/tests/domain/checks.test.ts`)**:
  - Tests all check rules against the hand-checkable fixture.
  - Proves that `unknown` is never returned as `false`.
  - Proves that adding a backup strictly preserves or improves coverage.
- **12.2.2 Simulation Accuracy Tests (`backend/tests/simulations/whatIf.test.ts`)**:
  - Verifies that S1 leaver simulation exactly reproduces paper-calculated orphan lists and run volumes.
- **12.2.3 Connector Security & Scopes Tests (`backend/tests/connectors/security.test.ts`)**:
  - Injects mocked HTTP clients; proves that connectors reject `POST`/`PUT`/`DELETE` calls and throw security exceptions.
- **12.2.4 Identity Matching Tests (`backend/tests/identity/matching.test.ts`)**:
  - Tests email canonicalization, alias resolution, and review queue placement.

#### 12.3 Hardening & Performance Benchmarking
- **12.3.1 Synthetic Scale Stress Test**:
  - Generate synthetic graph of 2,000 employees, 5,000 automations, and 20,000 edges.
  - Benchmark requirement: What-If simulation execution time $<500\text{ ms}$; full checks evaluation $<1.5\text{ s}$ (`NFR-01`, `NFR-02`).
- **12.3.2 Security Review & Secret Leak Scan**:
  - Run static analysis verifying that encrypted credentials never enter response payloads or logs (`SEC-03`).

---

## Resource Estimation & Sprint Allocation (2 Engineers)

- **Engineer A (Backend, Data & Ingestion)**: DB Schema, Connectors (Entra, Google, n8n, AI Admin), SCD2 Fact Store, Checks & Simulation Engines.
- **Engineer B (Product, Workflow & UI)**: Campaign Service, Handover Generator, Next.js Screens, Attestation Form, Gemini Assistant, v0 Check.

| Milestone | Duration | Target Deliverables |
|---|---|---|
| **Phase 0: Partner Discovery** | Weeks 1–2 | Manual API scripts executed against 3–5 design partners; validates leaver & credential risk findings. |
| **Sprint 1: Core Foundation** | Weeks 3–5 | Greenfield Postgres DB with `pgcrypto`, Connector SDK, Entra & Google Directory connectors, raw payload landing. |
| **Sprint 2: n8n & Fact Store** | Weeks 6–8 | n8n connector + Docker collector, OpenAI/Anthropic connectors, SCD2 Fact store, Identity review queue. |
| **Sprint 3: Checks & What-If** | Weeks 9–11 | Graphology in-memory graph, deterministic checks engine, What-If simulation & succession engine, Vitest fixture tests. |
| **Sprint 4: Attestation & Handover** | Weeks 12–14 | Campaign scheduler, mobile attestation web form, departure workflow, PDF handover pack generator. |
| **Sprint 5: UI & v0 Entry Wedge** | Weeks 15–17 | 7 Next.js screens (integrating Design Doc), v0 free n8n check route, Ask Horquva Gemini assistant. |
| **Sprint 6: Hardening & Launch** | Weeks 18–19 | 20k-node stress tests, security audit, deployment packaging, production launch. |

**Total Estimated Duration**: ~16 to 18 calendar weeks (~4 months) for 2 engineers to production v1.
