# OBA accountability layer: implementation plan (30 engineer-days · 2 engineers · 3 sprints)

**Revision 17 (2026-10-28).** Revision 16 consolidated sixteen audit passes (60 corrections, log in Appendix E) and was approved by Affan on 2026-10-27. Revision 17 is a **go-to-market re-sequencing** after an executive review (§0): the product now earns attention on the *first connection* with an orphan scan, the scan ships as a customer-run CLI in Sprint 2, and a **real-tenant checkpoint on 10 Nov** proves it on the Part 2 test tenants before Sprint 3's UI is built. **No task depends on a design partner** (there is none yet); the CLI is simply ready for the first prospect. The remaining **[LIVE-VERIFY]** items (R1 manager app-only, advanced-query need for R7, R8 `last_used_at` lag, T3 key `inactive` semantics, `$expand` page size) can only be settled on a real tenant; the code paths for both outcomes are built and tested.

## 0. Revision 17: why the plan changed

**The problem with revision 16.** Every feature fired on a *leaver event*. A 200-person company has a few leavers a month and most break nothing, so a buyer would see a quiet dashboard. The baseline rule (correctly) suppresses alerts on first sync, which meant the first 30 minutes — when a buyer decides — showed nothing. Nothing would have run against a real vendor tenant until Sprint 3.

**What changed:**

| Change | Effect | Days |
|---|---|---|
| **Orphan scan** (new, O1): on any sync, list what is *already* orphaned — keys and automations owned by disabled/departed/inactive owners, app secrets expiring with no active owner, owners missing from the directory — ranked, with cost | Value on first connection; replaces the Overview "accountability panel" | +1 (Affan, S2) |
| **Directory account state moves to S1** (in B3): Entra `accountEnabled` / `employeeLeaveDateTime`, Google `suspended` stored as `externalRefs` strings (was A4, S2) | The scan can say *why* an owner counts as gone ("account disabled" vs "leave date passed"), and B5 has the flag from day one | +0.5 (Affan, S1) |
| **C5 needs no recorded departure** (in B6) | Already true [C]: both directory connectors write status `departed` for a disabled/suspended account (`entra/index.ts:122`, `google/index.ts:143`), so C5's "owner departed" fires on first sync. Revision 17 adds a test that pins this | within B6 |
| **Customer-run scan CLI** (new, O2): the live-verify harness becomes `scripts/orphanScan.ts` — read-only, in-memory, no database, **no data leaves the customer's machine** | A prospect's first meeting can skip the security review; real-tenant scans run in S2, not S3 | +0.5 (Ibrahim, S2; harness moves from S3) |
| **Real-tenant checkpoint, 10 Nov** (§3, end of S2) | The CLI scan on the Part 2 tenants finds every seeded orphan; S3 mockups use real scan output, not invented data | — |
| **Deferred / folded:** A5 grants module (−1.5), accuracy endpoint (−0.5), Assets credential tab and the `/api/continuity/accountability` endpoint (folded into the scan, −1), B4 trimmed to the hook (−0.5) | Removes the scariest permission (Directory.Read.All) and screens a buyer doesn't pay for | −3.5 |
| **B7 ledger moves to S3** | Not needed before the checkpoint; still records every departure from S3 on | 0 |

Net effect: the same 30 engineer-days, with **2 days of slack** in Ibrahim's S3 for checkpoint fallout.

**Positioning the build serves:** buyer = head of IT / platform at a 100–1,000-person company with heavy n8n/Make and AI-API use. Pitch: *"AI and automation offboarding — see what's already orphaned today, and catch what breaks when the next person leaves."* Price to test: $6–15k/year, with the free scan as the entry point.

## Context

The competitive study (`docs/research/2026-10-27-competitive-*.md`) found that agent inventory is now a free commodity. The open position is a **vendor-neutral accountability layer**:
- every automation, agent and **AI key** is tied to a real person and their reporting line;
- **leavers and movers** are detected from the directory;
- the product predicts what breaks, **checks afterwards** whether it did, and **measures its own accuracy**.

Today:
- n8n works (fixed in `6b145ee3`);
- Entra and Google read users only;
- the AI connector reads vendor *model catalogues*, which is noise;
- nothing detects leavers.

This plan builds the first slice:
- **an orphan scan that shows value on the first connection (API + customer-run CLI)**;
- OpenAI/Anthropic key connectors;
- Entra extensions;
- identity hygiene;
- leaver/mover detection;
- check-afterwards adapters for keys;
- a prediction ledger;
- reframed Overview and Departures screens.

**Your decisions:**
- Power Platform is deferred to its own plan (Part 3).
- No test environments exist yet, so there's a test-tenant plan (Part 2).
- The UI is in scope, with **mockups you approve before any UI code**.
- Engineer A = Ibrahim, Engineer B = Affan. Start 2026-10-28.
- **Leavers are suggested, never auto-created.**
- **A leaver's key still in use → an alert that blocks verification.**
- ~~The grants module is an opt-in toggle.~~ **Revision 17: the grants module (A5) is deferred to the next plan.** It needs Directory.Read.All and overlaps Nudge Security; it returns when a prospect asks for it.
- **Revision 17:** orphan scan first; customer-run scan CLI in S2; real-tenant checkpoint on 10 Nov (§0, §3). No dependency on a design partner.

**How each part of your brief was met:**

| Brief | What was done | Where |
|---|---|---|
| 1. Latest API docs: every function we need, sample payloads, statuses, errors. Use Context7. | **Context7 couldn't be used**: it isn't in this session's tools (checked again just now) and needs authorising via `/mcp`. The same primary sources were read directly, and **the full function list of each platform was reviewed** with a use/skip reason. | Appendix A.0 (full surface), Appendix A (calls we make, with payloads and errors) |
| 2. Feasibility: can we get the data? | Feature → data → field → source → obtainable? | Appendix B |
| 3. GitHub prior art, code-level audit | Nine codebases read file by file | Appendix C |
| 4. Repo audit using graphify: where and what to implement | Two graphify-oriented audits; graphify `explain` on hotspots cross-checked with grep; line-level audit passes | §2, Appendix F (file change map), Appendix E |
| 5. Sprints, tests per sprint, integration, e2e | §4–§5 | §4–§5 |

**Labels:**
- [P] primary vendor doc or spec;
- [OSS] open-source code;
- [C] checked in our code.
- **[LIVE-VERIFY]**: built to the documented shape, tested with spec-shaped fakes, confirmed on the Part 2 tenants, and shown as an honest "unknown" until then.

---

# Part 1: the build

## 1. Data-model changes (all additive)

- **`packages/types/src/index.ts`:**
  - `EdgeType` += `reports_to` (person→manager), `grants_access_to` (person→app).
  - `FactAttribute` += `last_used_at`, `expires_at`, `owner_access`, `owner_type`, `cost_30d_usd`, `usage_tokens_30d`, `credential_expires_at`, `created_by_user`.
  - `ChangeEventKind` += `person_moved`, `person_reenabled`.
  - `CanonicalEdge.ownerKind?: 'owner'|'key_principal'|'creator'|'sponsor'`.
- **Delete `backend/src/types/domain.ts`.** It has 0 importers [C].
- **`backend/db/migrations/008_accountability.sql`** (the latest is 007; the runner applies files sorted by name, `migrate.ts:78-82`):
  - `ALTER TABLE edge ADD COLUMN owner_kind VARCHAR(16)`;
  - `ALTER TABLE prediction_ledger ADD COLUMN departure_id VARCHAR(64)`, plus an index;
  - `ALTER TABLE prediction_ledger ALTER COLUMN id SET DEFAULT gen_random_uuid()` (001 used `uuid_generate_v4()`);
  - delete ai_admin catalogue models: `entity` rows of kind `model` with `id = 'model:openai:'||external_id` (raw `resource_type='openai_model'`) or `'model:anthropic:'||external_id` (`'anthropic_model'`; `ai_admin/index.ts:108-109,168-169` write `externalId: m.id`) **and** no `edge` at either end and no `fact`.
- **`persistSync` (`connectors/sdk/base.ts`):**
  - carry `owner_kind` through `incoming_edge`;
  - `UPDATE edge SET owner_kind=i.owner_kind` on the existing active triple when it differs. The insert at `:86-91` only fires when no active triple exists;
  - **entity name:** for `person` rows, keep the stored name when the stored `external_refs` has `entraId`/`googleId` and the incoming one doesn't. Today `:62` is `name = EXCLUDED.name`, so a later AI/n8n sync overwrites the directory name;
  - `graphRepository.loadActiveGraph` / `insertEdge` read and write `owner_kind`.
- **Entity ids:**
  - keys `credential:openai:<key id>`, `credential:anthropic:<key id>`, kind `credential`, `externalRefs{vendor,keyId,projectId|workspaceId,hint}`;
  - Entra apps **stay `app:entra:<appId>`** (`entra/index.ts:168`). SP owners and credentials attach to that same entity. Third-party grant clients use the same id format with `externalRefs.thirdParty='true'`.
- **Key ownership:** a user owner gives `person:<email> -owns-> credential:*`, `ownerKind:'key_principal'`, grade `stated`. A service-account owner gives no edge, and the fact `owner_type='service_account'`.
- **Central key rule:**
  - `isVendorKey(id)`.
  - `ContinuityGraph.getOwnedAssets(personId, {includeVendorKeys?: boolean})` (`domain/graph/index.ts:187-201`) **excludes keys by default**. All 14 existing callers keep today's behaviour.
  - Opt in only at: person holdings `peopleViews.ts:140`, work at risk, S1 `keysAtRisk`, verifier `getAssociatedAssets`, the orphan scan (O1).
  - Two node iterations need explicit exclusion: attestation `all_unknown_critical` (`attestationService.ts:137-145`) and `graphAnswers.ts:90`.

## 2. Repo facts the plan relies on [C]

1. **Every connector hard-codes `stats.errors: 0`** (ai_admin:187, entra:227, google:205, n8n:338, csv:257). Yet `persistSync` closes vanished rows only when `errors===0`, so Entra's swallowed `/applications` error (`entra/index.ts:209-212`) closes real owner edges.
2. **`uq_edge_active`** (`004:40`) allows one active edge per (from, to, type). There are no CHECK constraints on kind, type, attribute or grade.
3. **The guard is GET-only** (`guard.ts:96,167`); it honours 429/503 `Retry-After` (`:108-122`). Token POSTs use raw `fetch`.
4. **The identity matcher and queue never run during sync.** `IdentityQueueService.enqueueUnmatched(MatchCandidate)` exists (`queue.ts:254-271`), and `DataService` holds an instance (`dataService.ts:248`).
5. **`DiffEngine.detectChanges` is never called at runtime.** `executeSync` marks the run completed (`runner.ts:176`), then hydrates (`:179`). Hydrate swaps `this.graph` whole (`dataService.ts:356-366`). The diff engine defaults a missing previous status to `'active'` (`diffEngine.ts:64`).
6. **Managers are stored as teams.** Google and CSV write the manager as person→person `member_of` (`google:183`, `csv:110`), and those are the only connector `member_of` writers. Teams on real data don't exist today.
7. **`prediction_ledger`** (`001:168-182`) is unused: `predicted_range JSONB NOT NULL`, `evaluation_due_at NOT NULL`, `model_version` defaults to `'v1.1-base-rate'`, and `target_entity_id` has an FK to `entity` with CASCADE.
8. **Departure helpers.**
   - `initiateDeparture(ds,{personId,leaveDate,note,detectedFrom?})` returns 409 if a departure is open (`departureService.ts:112-146`), and `POST /api/departures` uses it (`routes/departures.ts:189-210`) without passing `detectedFrom`.
   - `markAccountDisabled(ds,id)` hard-codes `user:admin` (`successionService.ts:232-247`).
   - `createDeparture` makes one handover row per owned asset (`dataService.ts:495-502`).
9. **The verifier is n8n-only and execution-based:** `seenExecutions` at 220, the loop at 225, `status==='error'` at 233, alert via `addChangeEvent` at 243 and `addAuditEntry` at 260. `options.now` is supported.
10. **Unfiltered edge walks:** the neighbourhood BFS walks every edge type (`routes/graph.ts:38-58`), and asset detail lists every edge end (`routes/assets.ts:88-96`). `GET /api/assets` lists only automation, process and app (`:55-57`).
11. **Kind gates:** C2 applies to `automation|app` (`checks/index.ts:98`); the snapshot ownerless count covers `automation|credential|app` (`snapshotService.ts:90`).
12. **Existing defects fixed in S1:**
    - `failure_spiked` vs `failures_spiked` (`snapshotService.ts:136`, `weeklyBriefing.ts:187`);
    - a date-dependent test (`tests/services/snapshotService.test.ts:89-109`);
    - a stale e2e selector (`frontend/e2e/4-departure.spec.ts:68`, "+ Initiate Departure" vs `DeparturesList.tsx:118` "Record a departure");
    - the Entra connector `$select`s `employeeLeaveDateTime` (`entra/index.ts:111`), which needs User-LifeCycleInfo.Read.All [P], although the help text lists only User.Read.All.
13. **Environment:**
    - the e2e backend env (`playwright.config.ts:58-70`): `DEMO_MODE=true`, `JOBS_ENABLED=false`, no `NODE_ENV`;
    - production sets `NODE_ENV=production` (`render.yaml:15-16`);
    - DEMO seed: an open departure for Sarah (`dataService.ts:184-185`); fixture owners omar→101,102, maya→103, sarah→104, david→105, chen→106; all fixture status facts `stated`.
14. **Registration points:**
    - check labels `overviewViews.ts:151-156`, `assetParts.tsx:33-36`, `frontend/tests/features/overview.test.tsx:27-28`;
    - connector form `ConnectionForm.tsx:10,31` (field kinds `text|secret|textarea|select` only);
    - map labels `MapView.tsx:30-37`;
    - departure source `dataService.ts:65`, `view.ts:141`, `departureStatus.ts:28-32`.

## 3. Sprints

- **S1:** Wed 28 Oct – Tue 3 Nov.
- **S2:** 4–10 Nov.
- **S3:** 11–17 Nov.
- 5 days per engineer per sprint.
- **Done for every task:**
  - its listed tests are green: `cd backend && npm test`, plus `npm run test:pg` (`PG_TEST_URL=…/horquva_test`) where marked;
  - `npx tsc --noEmit` passes in backend and frontend;
  - `graphify update .` has been run.

### Sprint 1: safe ingestion + AI keys

**B1 Partial-failure safety + existing defects (Affan, 1d)**
- **Two failure classes (audit #60):**
  - **Core modules** define entities and ownership: users, projects, keys, workflows, the apps list, owner reads. A failure → `stats.errors++`, so nothing is closed.
  - **Optional enrichments** add facts only: OpenAI costs (needs the `api.usage.read` admin-key permission), Anthropic usage, the Graph manager expand, `employeeLeaveDateTime`, grants, credential expiry. A failure → `stats.warnings[]` only, and that module's facts and edges are omitted. Vanished-row closing then closes their previous values, so the UI shows **unknown rather than stale**.
  - Without this split, a key lacking one optional permission would set `errors>0` every hour, and stale rows would never close.
- Every connector records `errorReasons[]` / `warnings[]` in the sync_run stats. The "partial" badge in `ConnectionsView` is UI, so it waits for the S3 mockup gate (Ibrahim's UI list).
- Fix the four defects in §2.12. The snapshot test gets an injected clock.
- **Tests:** pg — Entra `/applications` 500 → existing owner edges stay active; the snapshot test is date-independent.

**B2 Model plumbing (Affan, 1.5d)**
- §1 types, migration 008, the `persistSync` changes (`owner_kind` + name rule), `graphRepository`, delete `domain.ts`.
- The snapshot's "unconfirmed facts" count (`:96-99`) excludes telemetry attributes.
- In the snapshot ownerless count, `owner_type=service_account` counts as owned and `thirdParty` apps are skipped.
- **Tests:** migrate applies 008 (`tests/db/migrate.test.ts`); pg round-trip of `owner_kind`, including a kind change; the Entra name survives an OpenAI sync; the catalogue cleanup deletes only edge-less, fact-less ai_admin models; snapshot unit tests.

**B3 Manager edges + map + directory account state (Affan, 1.5d)**
- Google and CSV emit `reports_to`; add `ContinuityGraph.getManager()`.
- **Revision 17 (moved from A4):** Entra stores `externalRefs.accountEnabled` and `employeeLeaveDateTime` as strings (both are already `$select`ed, `entra/index.ts:111`); Google stores `externalRefs.suspended`. The existing `status` fact (`departed` when disabled/suspended, `:122`, `google:143`) is unchanged.
- The neighbourhood BFS skips `reports_to` and `grants_access_to`; add map labels.
- People & Teams empty state: "Teams come from directory groups — not connected yet". A groups connector is out of scope.
- **Tests:** Google fake server (`apiBaseUrl`, `localhost`); departure `team` ≠ manager; an automation's neighbourhood excludes its owner's manager; a disabled Entra user and a suspended Google user carry the flag in `externalRefs` and status `departed`.

**B4 Identity hygiene (Affan, 1d; matcher and queue already exist, the work is the hook and consistent refs)**
- After `persistSync`, build the directory from persons with `entraId`/`googleId`, using the email from the id minus `person:` (Google uses `primaryEmail`).
- Run the matcher on persons from n8n, openai and anthropic → `enqueueUnmatched`.
- Consistent `externalRefs`: `entraId`, `googleId`, `openaiUserId`, `anthropicUserId`, `n8nUserId`.
- **Tests:** a unit test of the hook (in-memory queue); pg: an n8n-only email is queued, a directory email isn't.

**A1 ai_admin config (Ibrahim, 0.5d)**
- Schema `{vendor, adminApiKey, baseUrl?}`; `baseUrl` is honoured only when `NODE_ENV!=='production'`; the guard allow-list is taken from the `baseUrl` host.
- Drop `organizationId` (zod strips stored keys; remove the form field).
- Key prefixes: Anthropic must be `sk-ant-admin…` [P]. OpenAI: reject `sk-proj-` / `sk-svcacct-` only [OSS: OneUptime], because `sk-admin-` isn't in OpenAI's spec.
- `testConnection` per Appendix A (OpenAI projects `limit=1`; Anthropic users `limit=1`).
- **Tests:** prefix rejection; 401 → `{ok:false}`; 200 → `{ok:true}`.

**A2 OpenAI keys/owners/cost (Ibrahim, 2.5d)**
- A shared cursor pager with a page cap, throwing on the cap; `errors++` nothing closed.
- Users → persons.
- Projects with archived included → keys with **`owner_project_access=any`**.
- Facts per key: `last_used_at`, `expires_at`, `owner_access`, `status`, `owner_type`.
- 30-day `/organization/costs` `group_by=api_key_id`. On 400, retry by project; key cost stays unknown and the project total goes to raw payload `openai_project_cost` only.
- Remove the `/v1/models` read.
- **Tests:** fixture `backend/tests/fixtures/openaiAdminApi.json` from spec schemas; 2-item pages; `any` is sent; a service-account key → no edge; cost-400 path; cap → nothing closed (pg).

**A3 Anthropic keys + usage (Ibrahim, 2d)**
- Users → persons.
- Keys listed **once per status** (active/archived/expired/inactive), because the default status filter is undocumented.
- Owner from `principal.user_actor.user_id` → email; `created_by` → fact.
- 31-day usage `group_by[]=api_key_id` → `usage_tokens_30d`, and `last_used_at` at day granularity. No per-key cost exists.
- **Tests:** fixture from the docs; null principal; service-account principal; usage paging; 529 retried, 401 not.

**S1 exit (fakes):**
- keys with owners, last use and cost/tokens;
- partial failures close nothing;
- managers are `reports_to`;
- directory account state is stored on every person;
- unmatched accounts are queued.

**Owner task during S1 (not engineering):** create the Part 2 tenants T1, T3, T4 and T5 and **seed known orphans**: a key owned by a user who is then disabled, an n8n workflow on a disabled member's personal credential, an Entra app secret expiring within 30 days whose only owner is disabled, and a key whose owner is not in the directory. These are the checkpoint's answer key.

### Sprint 2: Entra, orphan scan + CLI, leaver/mover suggestions, C5, verification

**A4 Entra extensions (Ibrahim, 2d)**
- Users `$top=999` with **`$expand=manager`** (no nested `$select`; audit #57) → `reports_to`. An absent manager = unknown.
  - R1 fallback: on 400/403, drop the expand → manager unknown.
  - R6 fallback: on 403, drop `employeeLeaveDateTime`.
- (Account-state refs moved to B3 in revision 17.)
- Restart on `Directory_ExpiredPageToken` [OSS], at most 5 times.
- SPs:
  - **Tenant GUID (audit #56):** the config `tenantId` can be a domain (it's only interpolated into the token URL, `entra/index.ts:62`), but `appOwnerOrganizationId` is a GUID [P]. Take the GUID from the access token's `tid` claim.
  - **Filter syntax (R7, now resolved):** Microsoft's `$filter` guide gives `servicePrincipals?$filter=appOwnerOrganizationId eq 72f988bf-86f1-41af-91ab-2d7cd011db47` (an **unquoted** Guid) [P]. A Graph Explorer issue shows the quoted form failing with "Invalid filter clause". Whether this filter needs advanced-query mode is undocumented, so the fallbacks stay. Our requests already send `ConsistencyLevel: eventual` (`entra/index.ts:92`); on 400, retry with `$count=true`; if still 400, list all SPs (`$top=100`) and filter client-side on `appOwnerOrganizationId`. Owner calls stay limited to tenant apps either way;
  - `$top=100`;
  - skip `agentIdentityBlueprint*`;
  - owners with concurrency 4, owner `id` → person via the sync's `entraId` map; a failed owner fetch → `errors++`;
  - the existing app-registration owners switch from `mail` to `id`.
- App and SP credentials → `credential_expires_at` (earliest future `endDateTime`; certificates de-duplicated by `customKeyIdentifier` [OSS Maester]).
- `graphBaseUrl` / `loginBaseUrl` overrides (non-production only).
- Help text adds User-LifeCycleInfo.Read.All (optional).
- **Tests:** fake Graph covering manager present/absent, expand 403, leave-date 403, expired token, owner failure, certificate de-duplication.

**A5 Grants module, opt-in: DEFERRED in revision 17 (0d).** Kept below as the spec for the next plan; `grants_access_to` stays in the types so nothing has to be re-migrated.

**O2 Customer-run orphan scan CLI (Ibrahim, 1.5d; replaces the S3 live-verify harness)**
- `backend/scripts/orphanScan.ts`: reads connection configs from a local JSON file or env, constructs the connectors directly (constructors take only `id, name, config` [C], e.g. `n8n/index.ts:27`, `entra/index.ts:33`), calls `sync()` only, **never `persistSync`**, merges the `SyncResult`s, builds `ContinuityGraph.fromSnapshot(entities, edges, facts)` [C] in memory and runs O1's `runOrphanScan(graph)`.
- No database, no network calls other than the vendor APIs the customer configured, nothing written except the report. Read-only keys only; the README lists the exact scopes per vendor (T3 records OpenAI's).
- Output: a terminal table plus `orphan-scan-<date>.csv` and `.json`. The JSON is the same `OrphanScanResult` the API returns, so a scan can later be imported.
- `--verify-shapes` keeps the original harness job: diff response keys against the fixtures and print R1/R3/R6/R7/R8 findings.
- **Tests:** a unit test running the CLI's main function against the fake vendor servers from A2/A3/A4 and the n8n fixture; asserts it never imports the db module.

**A5 spec (deferred)**
- Config `readGrants:'true'|'false'` (form `select`).
- `/oauth2PermissionGrants`, Principal rows only.
- Unknown clients resolved by `GET /servicePrincipals/{id}`, cached per sync, with `thirdParty` when `appOwnerOrganizationId≠tenant`.
- Edge `grants_access_to`.
- C2 returns `null` for third-party apps.
- Asset detail excludes grant edges and returns `grantCount`.
- **Tests:** AllPrincipals ignored; unknown principal → no edge; third-party C2 null; `grantCount`.

**A6 Check-afterwards adapters (Ibrahim, 1.5d)**
- A registry keyed by id prefix. `ai_admin` connections are resolved by decrypted vendor; more than one per vendor → `null`.
- Adapters return `{kind:'executions'}` (n8n, unchanged), `{kind:'key_usage', usedAfterDisable, lastUsedAt}`, `{kind:'key_deleted'}`, or `null`.
- **OpenAI:** single-key GET, `last_used_at > disabledAt`. 404 → `key_deleted`; archived/403 → `null`. **How quickly `last_used_at` updates isn't documented anywhere (R8 [LIVE-VERIFY]).** A key showing no use is reported as "no use seen yet" until the window ends, never as "not used"; the T3 tenant measures the lag.
- **Anthropic freshness:** usage "typically appears within 5 minutes of API request completion, though delays might occasionally be longer" [P, Usage and Cost API FAQ], well inside the hourly check.
- **n8n retention:** pruning is on by default at `EXECUTIONS_DATA_MAX_AGE=336` hours (14 days) [P, n8n execution-data docs], longer than the 72-hour window. A customer who shortens it below 72 hours is shown "execution history may be pruned".
- **Anthropic:** usage with `bucket_width=1h` from the first full hour after the disable, `api_key_ids[]`.
- The verifier's new branch: `usedAfterDisable` → `credential_risk` change event + watch alert + audit entry (mirroring 243-265), **blocking auto-verify** (your decision). De-duplication key: `<keyId>:<lastUsedAt>`.
- Add `getAssociatedAssets`; `getAssociatedAutomations` stays as a wrapper.
- n8n adapter: pass `startedAfter=<disabledAt>` to `/executions` [P: the param exists] instead of filtering by date client-side (`n8n/index.ts` `fetchFailedExecutions`).
- **Tests:** extend `tests/handover/postDepartureVerifier.test.ts`; pg adapter resolution (two OpenAI connections → null).

**B5 Leaver/mover suggestions (Affan, 2d)**
- In `executeSync` for entra/google connections: `prev = ds.getGraph()` before hydrate; build fact arrays from both graphs → `DiffEngine.detectChanges`.
- Add `person_moved` (department or `reports_to` changed) and `person_reenabled`.
- **Baseline:** no lifecycle handling on a connection's first completed sync, i.e. no other completed `sync_run` with `id <> current`. `person_left` also requires `prevNode`.
- **`person_left` → a change event only** (your decision): "Possible leaver: Name (Entra)", href `/departures?record=<personId>&source=entra&detectedAt=<iso>`. Map `ChangeEvent` → `addChangeEvent({kind,title,impact,href})`.
- **The admin opens the departure:**
  - `POST /api/departures` accepts optional `detectedFrom ('entra'|'google')` and `disabledAt`;
  - when the person's `externalRefs.accountEnabled==='false'` (or `suspended==='true'`), the route calls `markAccountDisabled(ds,id,{actor:'system:sync', at: disabledAt})`. New optional params; the window starts at detection, not at the click. Today it uses `new Date()` and `'user:admin'` (`successionService.ts:233-246`); `enterStage(dep, stage, now)` (`:38-44`) already takes the timestamp, so `at` passes straight through;
  - the UI side (S3, after mockup approval; audit #58):
    - `DeparturesList.tsx` (`'use client'`) reads `useSearchParams()` to open the sheet prefilled. **`app/(app)/departures/page.tsx` must wrap it in `<React.Suspense fallback={null}>`**, exactly as `app/(app)/page.tsx` does with the comment "useSearchParams … needs a Suspense boundary". Without it the production build used by e2e can fail.
    - `InitiateDepartureSideSheet` (props today: `open`, `onClose`, `onSuccess`, `availablePeople`; state `selectedPerson`, `leaveDate`, `note`) gains `initialPerson?: EntityRef`, `detectedFrom?`, `disabledAt?`.
    - `frontend/lib/api/departures.ts` `initiateDeparture(input)` (`:19`, today `{personId, leaveDate, note}`) gains the two optional fields.
    - The bell already links `event.href` (`BellPopover.tsx:132-134`);
  - if the leave date has passed but the account is still enabled, the departure stays `initiated`.
- **Tests:**
  - diff units;
  - pg: baseline sync with an already-disabled owner → 0 events;
  - second sync after the flip → exactly one `person_left` event, **0 departures**;
  - POST with `detectedFrom` + `disabledAt` → stage `account_disabled`, timestamp = `disabledAt`;
  - an enabled-but-leave-date-passed person → `initiated`;
  - a department change → `person_moved`;
  - idempotent re-sync.

**B6 Check C5 + central key rule (Affan, 2d)**
- `getOwnedAssets` option and the exclusions in §1.
- `C5_KEY_OUTLIVES_OWNER`:
  - FAIL if (OpenAI) `owner_access==='inactive'` or the owner is `departed`;
  - PASS if `owner_type==='service_account'` or the owner is active;
  - UNKNOWN if there's no owner.
- Labels at the three registration points.
- `workAtRisk` and the handover pack list keys; `WhatIfScenarioResult.keysAtRisk?`.
- **Tests:**
  - graph unit test: 2 automations + 3 keys → 2 by default, 5 with opt-in;
  - C5 cases in `tests/domain/engine.test.ts`, including **a key whose owner was synced from Entra with `accountEnabled:false` and no departure record → FAIL** (revision 17 pin);
  - `tests/api/workAtRisk.test.ts`;
  - **regression**: the simulation, attestation and succession suites pass unchanged.

**O1 Orphan scan service + API (Affan, 1d; first 2 days of S2 alongside B6, because O2 builds on it)**
- `backend/src/services/orphanScan/orphanScanService.ts`: a pure `runOrphanScan(graph: ContinuityGraph, now: Date): OrphanScanResult`, with no database access, so the API and the CLI share it.
- Findings, each `{kind, severity, asset:{id,kind,name,vendor}, owner:{id,name,reason}|null, cost30dUsd|null, lastUsedAt|null, evidence[]}`:
  1. `key_owner_gone` (high): vendor key whose owner has status `departed` (reason `account_disabled` / `leave_date_passed` / `departure_recorded`, from B3's refs and the departure table) or `owner_access==='inactive'` (reason `lost_project_access`). Same rule as C5; the scan calls the check, not a copy of it.
  2. `automation_on_gone_identity` (high): an automation with `runs_on_credentials_of` or `owns` pointing at a `departed` person.
  3. `app_secret_expiring_unowned` (medium): an Entra app with `credential_expires_at` within 30 days and no active owner. Needs A4; until A4 lands the kind simply yields no findings.
  4. `owner_not_in_directory` (low, reported as **"unverified owner"**, never "left"): the owner person has no `entraId`/`googleId` **and** the scan saw at least one directory connection. With no directory connected, this kind is skipped and the result says `directoryConnected:false`.
- Ranking: severity, then `cost30dUsd` desc (nulls last), then most recent `lastUsedAt` (an orphan still in use is the bigger risk).
- Result also carries `{scannedAt, totals:{byKind, monthlyCostUsd}, directoryConnected, connectionsScanned[]}`. **No score or index** (MVP rule: no on-screen indexes).
- `GET /api/continuity/orphan-scan` runs it on the hydrated graph; `?format=csv` returns the export. Types added to `frontend/types/view.ts` and `api-contracts.test.ts`. This **replaces** revision 16's `/api/continuity/accountability` endpoint.
- **Tests:** unit per kind with fixture graphs, including "no directory connected → no `owner_not_in_directory`" and the ranking order; API contract test; CSV header test.

**B7 Prediction ledger: write + evaluate (Affan, 1d) — moved to S3 in revision 17**
- A `predictionRepository` (the DataService state + persist pattern, as departures use).
- `initiateDeparture` writes one row per predicted break:
  - `automation_stops` from S1 `stoppedPersonalCredentialAutomations`;
  - `key_used_after_departure` per key;
  - `predicted_range {"breaks":true}`, `model_version 'rules-v1'`, `departure_id`;
  - `evaluation_due_at` = disable time + window if already disabled, else leave date + window, updated by `markAccountDisabled`.
- At window end: `actual_outcome` = an alert was recorded for that target; unreadable stays null.
- **Tests:** unit + pg.

**S2 exit (fakes):** the first sync of a fake org with a disabled key owner produces an orphan-scan finding and a C5 FAIL with **no departure recorded**. A later disable produces a "Possible leaver" suggestion. Opening it creates a departure at `account_disabled` with keys at risk, and a key used after the disable raises a blocking alert.

**Real-tenant checkpoint (Tue 10 Nov, both engineers, 0.5h).** Run `orphanScan.ts` against the Part 2 tenants (T1, T3, T4, T5).
- **Pass:** every orphan seeded during S1 appears with the right kind and owner reason, and nothing else is reported as `high` that isn't real. Each [LIVE-VERIFY] item gets its answer recorded in `docs/test-tenants/`.
- **On a miss:** fix it in Ibrahim's S3 slack before UI work starts. The B8 mockups are drawn from this real scan output, not invented numbers.
- **If the tenants aren't ready by 10 Nov:** run on the fakes, start S3 anyway, and repeat the checkpoint as soon as they are. **Nothing waits on a design partner.**

### Sprint 3: UI (mockups first), integration, e2e, live-verify tooling

**B8 Mockups → your approval (Affan, 0.5d)**
- Mockups, **filled with the checkpoint's real scan output**:
  - **Overview orphan scan** (replaces revision 16's accountability panel): one ranked list of findings with owner, reason, last use and monthly cost, plus "Export CSV". A ranked list, **not a stat-tile strip**, no score;
  - Departure "Keys & credentials" section + ✓/✗ + prediction line;
  - "Possible leaver" event with an Open-departure button;
  - AI admin and Entra forms.
  - (Revision 16's Assets Credentials tab is folded into the scan list.)
- **No UI code before approval.**

**UI build (Affan 2d · Ibrahim 1d)**
- **Affan:**
  - Overview orphan-scan panel on O1's endpoint, with CSV export.
  - `DepartureDetail.tsx` / `WorkAtRiskPanel.tsx` sections.
  - `DeparturesList` reads `?record=&source=&detectedAt=` to prefill and open the "Record a departure" sheet.
- **Ibrahim:**
  - `ConnectionForm` ai_admin + Entra (no `readGrants` field: A5 deferred); the "partial sync" badge in `ConnectionsView` (from B1's `errorReasons`);
  - C5 label in `assetParts.tsx`.
  - Not built (revision 17): the `credential` kind in `GET /api/assets` and the Assets credential tab. Keys are reachable from the scan list and from person holdings.
- **Tests:** vitest per screen (mocked API modules, as `frontend/tests/features/*` does); contract tests.

**Integration suite (Ibrahim, 1d)**
- `backend/tests/pg/accountability.test.ts`, fake OpenAI + Anthropic + Graph:
  1. connect (the fake directory already has one disabled key owner);
  2. baseline sync → **0 change events, but `/api/continuity/orphan-scan` lists that owner's key as `key_owner_gone`**;
  3. keys with owners;
  4. fake disables Omar;
  5. sync → a `person_left` suggestion;
  6. `POST /api/departures` with `detectedFrom` / `disabledAt` → `account_disabled`, keys at risk;
  7. fake key `last_used_at` moves past the disable;
  8. verify → blocking alert;
  9. `verifyDepartureExecutions(…, {now: +73h})` → ledger `confirmed`;
  10. C5 FAIL in `/api/continuity/overview` causes.

**T6 seed scripts (Ibrahim, 1d)**
- **Seed scripts:** `docs/test-tenants/` per vendor, reproducing the S1 seeded orphans so a tenant can be rebuilt.
- (The live-verify harness moved to S2 as O2's `--verify-shapes` mode.)

**Checkpoint fallout + buffer (Ibrahim, 2d):** fixes from the 10 Nov real-tenant run first; whatever is left is buffer.

**E2E (Affan, 1d)**
- Playwright `globalSetup` runs the fake vendor servers on port 3200, with a test-only control endpoint. Fake users use the fixture `@acme.com` emails.
- `7-ai-keys.spec.ts`:
  - create the connection **via `POST /api/connections`** with `baseUrl` (the form has no `baseUrl`, by design) → sync → the Overview orphan scan lists the fixture key whose owner is departed, with owner and reason;
  - also check the form saves an ai_admin connection, and a rejected key shows a readable error.
- `8-leaver-suggestion.spec.ts`:
  - Entra connection via API → baseline sync → fake disables **Omar** (Sarah already has an open demo departure) → sync;
  - the bell shows "Possible leaver: Omar Farooq" → click → the sheet is prefilled → submit;
  - the departure shows "Microsoft Entra", stage disabled, Omar's keys;
  - `POST /api/departures/:id/verify-executions` → the blocking alert appears.
- Then the full suite: `cd frontend && npx playwright test`.

**Accuracy endpoint: DEFERRED in revision 17.** B7 still writes and evaluates the ledger, so the data accumulates; `GET /api/continuity/prediction-accuracy` (`{evaluated, confirmed, notObserved, unreadable}`, no ratio until `evaluated ≥ 5`) is built when there are enough evaluated predictions to show.

**Hardening (Affan, 0.5d):** fallout fixes; data-processing note (key metadata only, never values), which doubles as the scan CLI's README trust section.

**Day totals (revision 17):**

| Engineer | S1 | S2 | S3 |
|---|---|---|---|
| Affan | B1 1 + B2 1.5 + B3 1.5 + B4 1 = 5 | B5 2 + B6 2 + O1 1 = 5 | B8 0.5 + B7 1 + UI 2 + E2E 1 + hardening 0.5 = 5 |
| Ibrahim | A1 0.5 + A2 2.5 + A3 2 = 5 | A4 2 + A6 1.5 + O2 1.5 = 5 | UI 1 + integration 1 + T6 1 + checkpoint fallout/buffer 2 = 5 |

## 4. Verification
1. Backend: `npm test`, then `npm run test:pg`.
2. Frontend: `npm test`, then `npx playwright test`.
3. Manual: `preview_start backend` / `frontend` with the fake connections. You verify the visuals.
4. On the Part 2 tenants: `npx tsx backend/scripts/orphanScan.ts --verify-shapes` (every seeded orphan found; R1, R3, R6, R7, R8; real SP owners, credential expiry). Then, in the app, a real disable → suggestion.

## 5. Risks
- **R1:** Graph manager with an app-only token. The docs list it as not supported; Cartography does it. There's a fallback.
- **R2:** no live accounts until Part 2.
- **R3:** OpenAI cost `group_by` can return 400. There's a fallback.
- **R4:** Anthropic has no per-key cost; tokens are shown instead.
- **R6:** the `employeeLeaveDateTime` permission. There's a fallback.
- **R8:** OpenAI `last_used_at` update lag is undocumented. The UI wording ("no use seen yet") stays honest, and T3 measures the lag.
- **R7:** syntax resolved [P]; whether advanced-query mode is needed is not documented. Two fallbacks; the A4 tests cover all three paths.
- **R9 (market, revision 17):** no customer has seen a scan yet, and there is no design partner. Mitigation without depending on one: the scan works on first connection, the CLI lets a prospect run it without granting us access, and the 10 Nov checkpoint proves it on real vendor tenants. The first prospect meeting uses the CLI whenever it happens; no task waits for it.
- **R10 (orphan scan noise):** a real org may have many owners missing from the directory (contractors, personal emails). Those are reported as low-severity "unverified owner", never "left", and only when a directory is connected.

---

## Appendix A.0: Full API surface reviewed (brief item 1: "each and every function")

**Context7 status:** still unavailable. It isn't in this session's tool list and needs authorising via `/mcp`. Every surface below was read from the vendor's own reference instead:
- the OpenAI OpenAPI spec (all `/organization/*` paths);
- the full platform.claude.com Admin API reference (875k characters, read end to end in 8 chunks);
- Microsoft Learn Graph pages;
- n8n `public-api/v1/controllers/*` on master;
- the Google Directory reference.

| Platform | Function groups in the docs | Used | Reviewed, not used (why) |
|---|---|---|---|
| **OpenAI Admin** | admin_api_keys · audit_logs · certificates (+activate/deactivate) · **costs** · data_retention · groups (+roles, users) · invites · **projects** · **projects/{id}/api_keys** (+get) · projects archive/certificates/data_retention/groups/hosted_tool_permissions/model_permissions/rate_limits/service_accounts (+api_keys)/spend_alerts/spend_limit/users · roles · spend_alerts · spend_limit · usage/{completions, embeddings, images, audio_*, moderations, vector_stores, code_interpreter_sessions, file_search_calls, web_search_calls, decisions} · **users** (+roles) · external_storage | users, projects, project api_keys (list + get), costs | admin_api_keys: admin keys, not workload keys; Cartography shows the list mislabels project keys. audit_logs: not needed for ownership in v1; candidate for "who deleted a key" later. usage/*: tokens only; costs already gives $ per key. service_accounts: the key's `owner.service_account{id,name}` already names it. Everything else is configuration or write-oriented. |
| **Anthropic Admin** | me · **api_keys** (list/get/update) · external_keys · federation issuers/rules · invites · service_accounts (+workspaces) · **users** (list/get/update/remove) · workspaces (+rate_limits, members, service_accounts) · rate_limits · compliance_settings · **usage_report/messages** · usage_report/claude_code · cost_report · tunnels (+certificates) · analytics/{summaries, users, apps/chat/projects, connectors, plugins, skills, artifacts, usage_report, user_usage_report, cost_report, user_cost_report} · spend_limits (+effective, increase requests) · rbac_groups (+members) · rbac_roles (+permissions) · plugins (+versions, installation settings, shares) · plugin_marketplaces · telemetry_destinations | users, api_keys (list), usage_report/messages | cost_report: no key grouping (`description|workspace_id` only). analytics/*: "Available to organizations on a Claude Enterprise plan"; `user_cost_report` covers only "cost attributable to a seat user" and points to `cost_report` for "direct API-key and automation traffic", so it **can't give per-key cost**. usage_report/claude_code: Claude Code seats, not keys. workspaces: workspace names are display-only; v1 shows the id (later). Everything else is admin or config writes. |
| **Microsoft Graph** | users (+manager, delta) · groups/members · applications (+owners) · servicePrincipals (+owners, delta) · oauth2PermissionGrants (+delta) · appRoleAssignments · signInActivity / servicePrincipalSignInActivities (beta) · directoryAudits · agentIdentity (Agent ID) | users + manager, applications + owners, servicePrincipals + owners, oauth2PermissionGrants (opt-in) | delta: a full read hourly is simpler at ≤2k users. groups: teams out of scope (a groups connector later). appRoleAssignments: app-to-app permissions, not people. signInActivity: needs Entra P1 + AuditLog.Read.All (prior study). servicePrincipalSignInActivities: beta. agentIdentity: its own scope (`2026-10-21-agent365-connector-scope.md`). |
| **n8n v1** | audit · community-packages · credential-type-policies · **credentials** · data-tables · discover · evaluations · **executions** · folders · insights · ldap · log-streaming · node-type-policies · otel · projects · promotions · role-mapping-rules · roles · security-policy · source-control · sso-oidc/saml · tags · **users** · variables · **workflows** (+history, dependencies) | workflows, credentials, users (`?projectId=`), executions | projects: licence-gated (prior verification). workflows/{id}/dependencies: on master, release unverified. audit/insights: later signals. Everything else is configuration. |
| **Google Directory** | users · groups · members · orgunits · tokens · asps · roles · roleAssignments · domains · devices | users | groups/members: teams out of scope. tokens: per-user third-party OAuth tokens; the Google equivalent of Entra grants, a candidate for the next plan. |

## Appendix A: API catalogue (endpoints we call)

The methods, parameters and responses below are taken from the cited source. Example payloads are abridged from the vendor's own examples or schemas. "Handling" is our behaviour.

### A.1 OpenAI Admin API [P: `openai/openai-openapi` `openapi.yaml`]
**Auth:** `securitySchemes.AdminApiKeyAuth: http bearer`.

**Shared shapes:**
- Lists: `{object:"list",data[],first_id,last_id,has_more}`, cursor `after=<last_id>`, `limit` 1–100 (default 20).
- Errors: 400 `ErrorResponse`, 403 `PermissionErrorResponse`, 429 TooManyRequests ("Too many management requests").

| Call | Params we send | Response we read | Statuses → handling |
|---|---|---|---|
| `GET /organization/users` | `limit=100&after` | `User{id,email,name,role(owner\|reader),added_at}` | 200; 403 → `errors++`; 429 → guard backoff |
| `GET /organization/projects` | `limit=100&after&include_archived=true` | `Project{id,name,status,archived_at,created_at}` | same |
| `GET /organization/projects/{project_id}/api_keys` | `limit=100&after&owner_project_access=any` | `ProjectApiKey{id,name,redacted_value,created_at,expires_at,last_used_at,owner_project_access(active\|inactive),owner{type(user\|service_account),user{id,email,name,role},service_account{id,name,created_at,role}}}` | same |
| `GET /organization/projects/{project_id}/api_keys/{api_key_id}` | — | `ProjectApiKey` | 200; documented "project is archived" → `null`; 403 → `null`; **404 → `key_deleted`** |
| `GET /organization/costs` | `start_time=<now-30d>&bucket_width=1d&limit=30&group_by=api_key_id&page` | `{object:"page",data[{start_time,end_time,results[{amount{value,currency},api_key_id}]}],has_more,next_page}` | 400 "unsupported combination" → retry `group_by=project_id`; key cost unknown |

**Example key** (spec example): `{"object":"organization.project.api_key","redacted_value":"sk-abc...def","name":"My API Key","created_at":1711471533,"expires_at":1714063533,"last_used_at":1711471534,"id":"key_abc",…}`

### A.2 Anthropic Admin API [P: platform.claude.com]
**Auth:** `x-api-key: sk-ant-admin…`, `anthropic-version: 2023-06-01` (the docs' example). Admin keys are created by admin-role members; organisations only.

**Shared shapes:**
- Lists: `{data[],has_more,first_id,last_id}`, cursor `after_id`.
- Errors: `{type:"error",error{type,message},request_id}`, with types 400 `invalid_request_error`, 401 `authentication_error`, 402 `billing_error`, 403 `permission_error`, 404 `not_found_error`, 409, 413, 429 `rate_limit_error` (a spend-cap 429 has no `retry-after`), 500 `api_error`, 504, 529 `overloaded_error`.

| Call | Params | Response | Statuses → handling |
|---|---|---|---|
| `GET /v1/organizations/users` | `limit=1000&after_id` | `{id,email,name,role,added_at}` | 401/403 → `errors++`; 429/5xx/529 → guard retry |
| `GET /v1/organizations/api_keys` | `limit=1000&after_id&status=<each of active,archived,expired,inactive>` | `{id,name,status,created_at,expires_at,partial_key_hint,created_by{type,id}\|null,principal{type:user_actor,user_id}\|{type:service_account_actor,service_account_id}\|null,scope{type:workspace,workspace_id}\|{type:organization}}` | same |
| `GET /v1/organizations/usage_report/messages` | sync: `starting_at=<now-31d>&bucket_width=1d&limit=31&group_by[]=api_key_id&page`; verifier: `bucket_width=1h&limit≤168&api_key_ids[]=<id>` | `{data[{starting_at,ending_at,results[{api_key_id,uncached_input_tokens,cache_read_input_tokens,output_tokens,…}]}],has_more,next_page}`; buckets "snapped to the start of the minute/hour/day" | same |

**Not used:** `cost_report`. Its `group_by` is only `description|workspace_id`, and `amount` is a decimal string in cents.

**Example key** (docs): `{"id":"apikey_01Rj2N8SVvo6BePZj99NhmiT","created_by":{"id":"user_01WC…","type":"user"},"principal":{"type":"user_actor","user_id":"user_01WC…"},"scope":{"type":"workspace","workspace_id":"wrkspc_01Jw…"},"status":"active",…}`

### A.3 Microsoft Graph v1.0 [P: Microsoft Learn]
**Auth:** client-credentials token (existing). Throttling: `429` + `Retry-After` seconds, error `{error:{code:"TooManyRequests",message,innerError{request-id,date}}}`.

| Call | Least-privileged app permission | Paging | Notes / handling |
|---|---|---|---|
| `GET /users?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled[,employeeLeaveDateTime]&$expand=manager&$top=999` | User.Read.All (the get-user page lists it for application access; the "List manager" page says app access is not supported, so **R1 stays [LIVE-VERIFY]**); `employeeLeaveDateTime` needs **User-LifeCycleInfo.Read.All** [P] | default 100, max 999; `@odata.nextLink`. With `$expand`, pages may come back at 100 (community report): always follow `nextLink` | **Plain `$expand=manager`, no nested `$select`.** The Graph known-issues page says `$expand` on directory objects has "No support for nesting other query parameters such as `$filter` and `$select`", and that query parameters "might fail silently". A user with no `manager` in the response is recorded as **manager unknown**, never "no manager". `accountEnabled` / `department` "require `$select`". `400 Directory_ExpiredPageToken` [OSS] → restart |
| `GET /applications?$select=id,appId,displayName,passwordCredentials,keyCredentials` | Application.Read.All | default 100, max 999 | `keyCredentials` `$select` throttled at 150/min per tenant; skip `agentIdentityBlueprint` |
| `GET /applications/{id}/owners` | Application.Read.All | nextLink | existing call; map by `id` |
| `GET /servicePrincipals?$filter=appOwnerOrganizationId eq '<tenantId>'&$select=id,appId,displayName,appOwnerOrganizationId,passwordCredentials,keyCredentials&$top=100` | Application.Read.All | **default and max 100** | `appOwnerOrganizationId` = "tenant ID where the application is registered", `$filter eq` supported; skip `agentIdentityBlueprintPrincipal` |
| `GET /servicePrincipals/{id}/owners` | Application.Read.All | nextLink | user/SP directoryObjects; unreadable types → `@odata.type` + `id` only |
| `GET /servicePrincipals/{id}?$select=id,appId,displayName,appOwnerOrganizationId` | Application.Read.All | — | grant-client lookup |
| `GET /oauth2PermissionGrants` | Directory.Read.All | nextLink | `clientId` = client SP **object id**; `consentType` `AllPrincipals\|Principal`; `principalId` only for Principal; `resourceId`; `scope` space-separated |

**`passwordCredential`:** `{keyId,displayName,startDateTime,endDateTime,hint,secretText}`; `secretText` is returned only on creation.

### A.4 Google Workspace Directory API [P: developers.google.com] (existing connector, touched by B3/A4)
| Call | Scope | Params / paging | Notes |
|---|---|---|---|
| `GET https://admin.googleapis.com/admin/directory/v1/users` | `admin.directory.user.readonly` | `customer=my_customer&projection=full&maxResults=100&pageToken` (`maxResults` must be 1–500 [P]; we send 100 explicitly because the default isn't documented); `nextPageToken` "valid for three days" | `viewType=admin_view` (the default) includes admin-only fields; we read `primaryEmail`, `suspended`, `relations[type=manager]`, `orgUnitPath` (existing code) |

### A.5 n8n public API v1 [P: n8n `packages/cli/src/public-api/v1` on master] (existing, used by the verifier and sync)
**Auth:** `X-N8N-API-KEY`.

**Errors** (shared responses): 400 badRequest, 401 unauthorized, 403 forbidden, 404 notFound. The spec also defines 409/413/422/500/503 responses.

**Paging:** `limit` (default 100, max 250) + `cursor` / `nextCursor`.

| Call | Scope | Used for |
|---|---|---|
| `GET /api/v1/workflows` | `workflow:list` | sync (built `6b145ee3`) |
| `GET /api/v1/credentials` | `credential:list` | sync |
| `GET /api/v1/users[?projectId=]` | `user:list` (instance owner) | sync; not licence-gated |
| `GET /api/v1/executions?workflowId&status=error&includeData&limit&cursor&startedAfter` | `execution:list` | verifier. `status` ∈ `canceled\|crashed\|error\|new\|running\|success\|waiting`; `startedAfter` / `startedBefore` exist. The current verifier filters by date client-side; switching to `startedAfter` is in A6 |

### A.6 Power Platform inventory: Part 3 only (see there)

## Appendix B: Feasibility matrix (can we get the data?)

| Feature | Data needed | Field / API | Obtainable? |
|---|---|---|---|
| Key inventory + owner (OpenAI) | key, owner email, last use, owner access | `ProjectApiKey.owner.user.email`, `last_used_at`, `owner_project_access` | **Yes** [P] |
| Key inventory + owner (Anthropic) | key, acting principal | `principal.user_actor.user_id` → users email | **Yes** [P]. No last-used field: **day-level** from the usage report |
| Key cost | per-key USD | OpenAI `costs group_by=api_key_id` | **Yes, conditional** (400 for some combinations) [P]. **Anthropic: No** per key [P] |
| Manager | manager id | Graph `$expand=manager`; Google `relations` | **Conditional** (R1 app-only) / **Yes** |
| Leave date | `employeeLeaveDateTime` | Graph | **Conditional**: needs User-LifeCycleInfo.Read.All [P] |
| Leaver detection | account disabled | Graph `accountEnabled`; Google `suspended` | **Yes** |
| App owners | owners | `/applications/{id}/owners`, `/servicePrincipals/{id}/owners` | **Yes** [P]; often empty (admin-created apps) |
| Secret expiry | `endDateTime` | `passwordCredentials` / `keyCredentials` on app + SP | **Yes** [P] |
| Delegated grants | user→app consent | `/oauth2PermissionGrants` | **Yes, with Directory.Read.All** [P] |
| Key used after disable | post-disable use | OpenAI `last_used_at`; Anthropic hourly usage | **Yes** [P] (Anthropic hour-level) |
| Automation broke after disable | failed executions | n8n `/executions?status=error` | **Yes** [P] |
| Teams | group membership | — (no groups connector) | **Not in scope**; honest empty state |
| Power Platform owners | `ownerId` | inventory API (delegated only) | **Deferred**: Part 3 |

## Appendix C: Open-source prior art (code read via `gh api`)

| Repo (licence) | Files read | Adopted | Avoided |
|---|---|---|---|
| cartography-cncf/cartography (Apache-2.0) | `intel/openai/*`, `intel/anthropic/*`, `intel/microsoft/entra/{users,service_principals,applications,utils}.py`, `graph/cleanupbuilder.py`, `intel/ontology/*` | `$expand=manager($select=id)`; expired-page-token restart; cleanup only after a successful fetch | owner from `created_by`; missing `owner_project_access`; email-only identity |
| OneUptime/oneuptime (licence unclear: ideas only) | `…/OpenAI/OpenAIAdminClient.ts`, `…/Anthropic/AnthropicAdminClient.ts` | separate list/report pagers; repeated-cursor stop; key-prefix check; `owner_project_access=any`; `include_archived` | silent partial data at the page cap |
| SpecterOps/AzureHound (GPL-3.0: ideas only) | `client/rest/client.go`, `client/service_principals.go` | one owners call per SP | owner errors treated as "no owners" |
| maester365/maester (MIT) | `Test.MT.1198/1199.ps1` | de-duplicate certificates by `customKeyIdentifier`; ceiling-days expiry | — |
| cisagov/ScubaGear (CC0) | `AADRiskyPermissionsHelper.psm1`, `Utility.psm1` | read credentials on app **and** SP | — |
| microsoft/coe-starter-kit (archived) | `HELPER-MakerCheck…json`, `CLEANUP-…OrphanedMakers…json` | "orphaned = owner disabled, or not found and not an SP" logic (Part 3) | — |
| microsoft/ValueLens-for-Microsoft-Copilot (MIT) | `collect/resource_graph.py`, `api.py` | status per probe; never close after forbidden/empty (Part 3) | — |
| bitwarden/directory-connector (GPL-3.0: ideas only) | `entra-id-directory.service.ts` | email = `mail`, else UPN | ignoring hard deletes |
| NangoHQ/integration-templates | `integrations/microsoft/syncs/users.ts` | — | dropping explicit nulls (breaks mover detection) |

## Appendix A.7: Sample payloads → test fixtures (brief item 1)

Every fake server serves payloads copied **verbatim from the vendor's own example or schema** (sources in Appendix A), then extended to cover the edge cases. Each fixture file's header names its source, as `tests/fixtures/n8nPublicApi.json` already does.

| Fixture | Built from | Must include |
|---|---|---|
| `backend/tests/fixtures/openaiAdminApi.json` | spec examples for `User`, `Project`, `ProjectApiKey` (`{"object":"organization.project.api_key","redacted_value":"sk-abc...def","name":"My API Key","created_at":1711471533,"expires_at":1714063533,"last_used_at":1711471534,"id":"key_abc",…}`), `UsageResponse` with `CostsResult` | a user owner; a service-account owner; `owner_project_access:"inactive"`; an archived project; ≥3 pages (2-item pages); a cost 400 case |
| `backend/tests/fixtures/anthropicAdminApi.json` | doc examples for users (`{"id":"user_01WC…","email":"user@emaildomain.com","name":"Jane Doe","role":"admin","type":"user","added_at":"2024-10-30T23:58:27.427722Z"}`), api_keys (example in A.2), usage report (`{"data":[{"starting_at":…,"ending_at":…,"results":[{"api_key_id":"apikey_01Rj…","uncached_input_tokens":1500,"output_tokens":500,…}]}],"has_more":true,"next_page":"page_…"}`) | `principal: null`; a `service_account_actor`; `created_by: null`; each of the 4 statuses; hourly buckets around a disable time |
| `backend/tests/fixtures/graphApi.json` | Learn examples: owners (`{"value":[{"@odata.type":"#microsoft.graph.user","id":"ce4770b3-…"}]}`), manager (`{"id":"7d54cb02-…","displayName":"Sara Davis","mail":"SaraD@contoso.com"}`), throttling 429 body, `oauth2PermissionGrant` JSON representation | a user with and without a manager; a 403 for `$expand`; a 403 for `employeeLeaveDateTime`; `400 Directory_ExpiredPageToken`; an `agentIdentityBlueprintPrincipal` row; duplicated certificate `customKeyIdentifier`; AllPrincipals and Principal grants; a third-party client SP |
| `tests/fixtures/n8nPublicApi.json` (exists) | n8n spec on master | extended: executions with `status:"error"` before and after a `startedAfter` time |
| Google (inline in the B3 test) | `users.list` fields (`primaryEmail`, `suspended`, `relations[{type:"manager",value}]`) | a manager relation; a suspended user |

## Appendix F: File change map (brief item 4: where and what)

**Method:** graphify `explain` was run on the hotspots (`getOwnedAssets`, `ConnectorRunner`, `verifyDepartureExecutions`, `persistSync`). Its INFERRED edges missed 4 `getOwnedAssets` call sites that grep found, so every list below is the **union of graphify and grep**.

| File | Change | Task |
|---|---|---|
| `packages/types/src/index.ts` | `EdgeType`, `FactAttribute`, `ChangeEventKind` additions; `CanonicalEdge.ownerKind` | B2 |
| `backend/src/types/domain.ts` | delete (0 importers) | B2 |
| `backend/db/migrations/008_accountability.sql` | new (§1) | B2 |
| `backend/src/connectors/sdk/base.ts` | `owner_kind` in temp table, insert and UPDATE; person-name CASE | B2 |
| `backend/src/repositories/graphRepository.ts` | read/write `owner_kind` | B2 |
| `backend/src/connectors/sdk/runner.ts` | `CONFIG_SCHEMAS.ai_admin` / `entra` fields; post-persist identity hook (B4); post-hydrate diff hook + baseline (B5) | A1, A4, A5, B4, B5 |
| `backend/src/connectors/ai_admin/index.ts` | rewrite (keys, owners, cost/usage; pager; no catalogue) | A1–A3 |
| `backend/src/connectors/entra/index.ts` | errors counting; manager; SPs + owners; credentials; grants; `tid`; lifecycle `externalRefs` | B1, A4, A5 |
| `backend/src/connectors/google/index.ts` | errors counting; `reports_to`; `suspended` ref | B1, B3, A4 |
| `backend/src/connectors/csv/index.ts` | `reports_to` | B3 |
| `backend/src/connectors/n8n/index.ts` | errors counting; `startedAfter` in `fetchFailedExecutions` | B1, A6 |
| `backend/src/domain/graph/index.ts` | `getOwnedAssets` option; `getManager` | B6, B3 |
| `backend/src/domain/changes/diffEngine.ts` | `person_moved`, `person_reenabled`; `prevNode` requirement | B5 |
| `backend/src/domain/checks/index.ts` | C5 in `ALL_CHECKS`; C2 `thirdParty` skip | B6, A5 |
| `backend/src/domain/simulation/index.ts` | `keysAtRisk` (S1) | B6 |
| `backend/src/handover/postDepartureVerifier.ts` | adapter registry, typed results, key branch, `getAssociatedAssets` | A6 |
| `backend/src/handover/successionService.ts` | `markAccountDisabled(…, {actor, at})` | B5 |
| `backend/src/handover/departureService.ts` | pack keys; ledger write in `initiateDeparture`; `detectedFrom`/`disabledAt` passthrough | B6, B7, B5 |
| `backend/src/repositories/predictionRepository.ts` | new | B7 |
| `backend/src/services/dataService.ts` | ledger state; queue-service getter | B7, B4 |
| `backend/src/services/snapshot/snapshotService.ts` | spelling; telemetry exclusion; service-account / `thirdParty` ownership | B1, B2 |
| `backend/src/services/briefing/weeklyBriefing.ts` | spelling | B1 |
| `backend/src/attestation/attestationService.ts` | exclude vendor keys from `all_unknown_critical` | B6 |
| `backend/src/ai/graphAnswers.ts` | exclude vendor keys (`:90`) | B6 |
| `backend/src/views/overviewViews.ts` | C5 `CAUSE_LABEL` | B6 |
| `backend/src/views/departureViews.ts` / `peopleViews.ts` | keys in work at risk / holdings (opt-in) | B6 |
| `backend/src/routes/departures.ts` | POST accepts `detectedFrom`, `disabledAt` | B5 |
| `backend/src/services/orphanScan/orphanScanService.ts` | new: pure `runOrphanScan(graph, now)` | O1 |
| `backend/src/routes/continuity.ts` | `/orphan-scan` (JSON + `?format=csv`); `/prediction-accuracy` deferred | O1 |
| `backend/src/routes/assets.ts` | list includes `credential`; detail excludes grants, adds `grantCount` | S3, A5 |
| `backend/src/routes/graph.ts` | BFS skips `reports_to` / `grants_access_to` | B3 |
| `backend/scripts/orphanScan.ts` (+ README with per-vendor read-only scopes) | new: customer-run, in-memory scan; `--verify-shapes` | O2 |
| `frontend/types/view.ts` | `OrphanScanResult` types; new fact fields | O1, S3 |
| `frontend/features/settings/ConnectionForm.tsx` / `ConnectionsView.tsx` | ai_admin and entra fields; partial badge | S3 |
| `frontend/features/assets/AssetsView.tsx` / `assetParts.tsx` | credential columns; C5 label | S3 |
| `frontend/features/overview/*` | orphan-scan panel + CSV export | S3 |
| `frontend/features/departures/DeparturesList.tsx` / `DepartureDetail.tsx` / `WorkAtRiskPanel.tsx` | query-param prefill; keys section | S3 |
| `frontend/features/map/MapView.tsx` | relation labels | B3 |
| `frontend/features/people/*` | teams empty-state copy | B3 |
| `frontend/e2e/4-departure.spec.ts` | selector fix | B1 |
| `frontend/e2e/7-ai-keys.spec.ts`, `8-leaver-suggestion.spec.ts`, `globalSetup` | new | S3 |
| Tests (new or extended) | `backend/tests/connectors/{openai,anthropic,entra,google}.test.ts`; `tests/pg/{connectors,accountability}.test.ts`; `tests/handover/postDepartureVerifier.test.ts`; `tests/domain/{engine,diffEngine,graph}.test.ts`; `tests/api/{workAtRisk,departures,assets,graph}.test.ts`; `tests/services/snapshotService.test.ts`; `tests/db/migrate.test.ts`; `frontend/tests/features/*`, `frontend/tests/lib/api-contracts.test.ts` | per task |

## Appendix D: graphify use
- Both repo audits oriented with `graphify query` / `graphify explain` on `graphify-out/graph.json` (3,955 nodes) before reading files.
- Every task ends with `graphify update .` (per `CLAUDE.md`).

## Appendix E: Audit log (55 corrections across 10 passes)

| Area | Corrections |
|---|---|
| API facts | #1 OpenAI prefix not in the spec; #3/#5/#6 citations; #20 SP page max 100; #21 Anthropic status default undocumented; #22 hour buckets; #23 single-key 404/archived |
| Permissions | #4 `employeeLeaveDateTime` needs User-LifeCycleInfo.Read.All; #37 SP owner calls filtered to tenant apps |
| Data integrity | #7/#40 ledger constraints and `model_version`; #8 `owner_kind` update; #35/#51 catalogue cleanup; #38 directory names preserved; #52 one entity per appId |
| Lifecycle | #10 CSV can't be a source; #24/#25 store `accountEnabled` and only disable when disabled; #26 `evaluation_due_at`; #29 first-sync baseline; #30 event mapping; #47 re-enable; #50 current run excluded |
| Leakage | #13 service-account keys; #32–#34/#55 central `getOwnedAssets` rule; #48 map BFS; #53 third-party apps; #54 asset detail |
| Verifier | #11 vendor resolution; #12 wrapper kept; #44 typed results |
| UI/E2E | #14 no boolean form field; #15/#31 API-created connections; #36 assets list; #43 teams empty state; #45 endpoint contract; #46 Omar, not Sarah |
| Planning | #16/#42 day maths |
| Rev 17: go-to-market re-sequencing (2026-10-28) | Orphan scan O1 + customer-run CLI O2 added; directory account state moved A4 → B3; found [C] that directory connectors already mark disabled/suspended users `departed`, so C5 fires on first sync without a departure (pinned by a test); A5 grants and the accuracy endpoint deferred; accountability endpoint and Assets credential tab folded into the scan; B7 moved to S3; 10 Nov real-tenant checkpoint with seeded orphans; no dependency on a design partner |
| Pass 16 (rev 16): runtime-behaviour sweep | #59 OpenAI `last_used_at` lag undocumented → R8 plus honest wording. #60 core vs optional failure classes (otherwise a missing optional permission blocks all closing forever). Anthropic usage freshness ~5 min [P]. n8n retention 336 h default [P]. OpenAI Costs needs `api.usage.read`. No documented admin-API rate limits for either vendor; guard 429 backoff covers it |
| Pass 15 (rev 15): "nothing untouched" sweep | #57 Graph known issue: no nested `$select` in `$expand` on directory objects, so use plain `$expand=manager` and treat missing as unknown. #58 `useSearchParams` needs Suspense on the departures page (repo precedent `app/(app)/page.tsx`); exact side-sheet and API-client signature changes. R7 syntax resolved (MS `$filter` guide). R6 confirmed [P]. Google `maxResults` 1–500. OpenAI admin keys owner-only and permission-scoped. Azure free tenant → Global Admin. M365 trial secondary only. |
| Pass 11–12 (rev 11–12) | Consolidated rewrite; added n8n and Google API sections, the feasibility matrix and the OSS table (brief items 1–3); your 3 decisions applied; #56 tenant GUID from the token `tid`; R7 filter-syntax fallbacks; UI badge moved behind the mockup gate; n8n `startedAfter`; verified `markAccountDisabled`/`enterStage`, `DeparturesList` client component, bell `href` |

---

# Part 2: Test-tenant plan (owner tasks, start day 1)

| # | Environment | Steps | Cost / owner | Verified? |
|---|---|---|---|---|
| T1 | Entra tenant | Azure free account → "your new Azure account automatically includes a default Entra ID tenant", and the account holder becomes Global Administrator (Microsoft Learn training module), so admin consent is possible. App with User.Read.All, Application.Read.All, optional User-LifeCycleInfo.Read.All → admin consent (Directory.Read.All only when the deferred A5 grants module returns). 8 users with managers; 2 app registrations with owners and a secret expiring in 10 days; 1 SP owned by a user who'll be disabled; 1 user consents to a third-party app (kept for the deferred A5). | Affan; free tier **[verify at signup]** | Permissions [P]; signup not verified |
| T2 | M365 trial (Part 3 only) | Business Premium "Try for free" one-month trial (reported by a pricing tracker, Aug 2026; not confirmed on a Microsoft page). The developer E5 sandbox is restricted (community reports). | Owner; confirm on Microsoft's trial page before relying on it | Secondary only |
| T3 | OpenAI org | **Only organisation owners can create Admin API keys**; when creating one "you choose the permissions the integration needs" (OpenAI help: "Admin and Audit Logs API for the API Platform"). So create a **read-only** key with read access to users, projects, API keys and **Usage** (the Costs API reports a missing `api.usage.read` scope without it, per an OpenAI community thread) and record its exact permissions in `docs/test-tenants/`. The same list goes into the Settings help text. Owner → Settings → Organization → Admin keys. 2 projects, 3 keys; remove one key owner from its project (expected `owner_project_access=inactive`, from the field definition [P], **[LIVE-VERIFY]**); a few calls. | Small prepaid credit | Key creation per vendor guides |
| T4 | Anthropic org | Create an Organization [P] → admin key → 2 workspaces, 3 keys from 2 members, a few calls. | Small credit | [P] |
| T5 | n8n | `docker run n8nio/n8n`; owner + 2 members; workflows using personal credentials. | Free | [P] |
| T6 | Seed scripts | `docs/test-tenants/`, built in S3. | Ibrahim | — |

**Seeded orphans (revision 17, during S1):** a key owned by a user who is then disabled; an n8n workflow on a disabled member's personal credential; an Entra app secret expiring within 30 days whose only owner is disabled; a key whose owner is not in the directory.

**Exit (10 Nov checkpoint):** `orphanScan.ts --verify-shapes` finds every seeded orphan on T1, T3, T4 and T5.

# Part 3: Power Platform connector, separate plan (deferred, ~6–8 engineer-days, after T2)

**Facts [P]:**
- The inventory query is `POST {PowerPlatformAPI url}/resourcequery/resources/query?api-version=2024-10-01`.
- Body: `{TableName:"PowerPlatformResources",Clauses[…],Options{Top,Skip,SkipToken}}`.
- Response: `{totalRecords,count,resultTruncated,skipToken,data[]}`.
- **Delegated user auth only**: a service principal or managed identity gets 403.
- Access roles: Global admin, Power Platform admin, Dynamics 365 admin, Global reader (all resources); AI admin / AI reader (AI resources only).
- Types: `microsoft.copilotstudio/agents`, `microsoft.powerautomate/cloudflows|agentflows|m365agentflows`, `microsoft.powerapps/*`.
- Fields: `properties.{displayName,createdAt,createdBy,ownerId,environmentId,lastModifiedAt,lastModifiedBy,powerPlatformConnectors[](preview),trigger}`.
- The flow owner is the creator and "doesn't update when the owner changes".
- Data refreshes within 15 minutes.

**Steps:**
1. **Spike (1d):** Azure Resource Graph `PowerPlatformResources` app-only with a documented role. App-only is "not documented" [OSS ValueLens]; the result decides the path.
2. **Delegated path (2d):**
   - admin OAuth code flow;
   - encrypted refresh token (existing AES-GCM);
   - a reconnect state;
   - a guard `post()` limited to one allow-listed (host, path), with the exact host resolved in the spike.
3. **Connector (2d):**
   - page on `skipToken`;
   - map to automation/app;
   - `ownerId` → owner edge via `entraId` (flows get `ownerKind:'creator'`);
   - `powerPlatformConnectors` → `depends_on`.
4. **Identity (1d):** an `entraId → person` index.
5. **Status per probe:** forbidden, empty or error → `errors++`, nothing closed [OSS].
6. **Tests (1d):** a fake inventory server shaped as documented; token refresh; the guard allow-list.

On approval, Parts 2 and 3 are also saved to `docs/plans/2026-10-28-test-tenants.md` and `docs/plans/power-platform-connector.md`.
