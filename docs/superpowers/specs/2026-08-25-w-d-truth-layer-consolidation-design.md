# W-D — Truth Layer Consolidation

Date: 2026-08-25
Status: design approved by owner. Decisions D-02, D-09a, D-11, D-12 (from the
[remediation decision log](2026-08-24-oba-remediation-decision-log.md)) plus D-17…D-21 below
(decided during this workstream's brainstorming phase). No code changed yet.

Follows W-A (auth hardening), W-B (frozen intelligence rebuilt), W-C (canonical definitions
layer), all landed. Read the decision log in full, including its §5 process notes, before
resuming this work in a new session.

---

## 1. The problem this solves

Three intelligence-shaped numbers exist in this codebase where the decision log says there
should be one:

- `derived.js`'s `pillars.orgScore` (GI/MI/DI, weighted 0.35/0.35/0.30, D-11) — the canonical
  one, per D-02.
- `voice.js`'s own `0.5·documented + 0.5·backed` computation, still present at
  `voice.js:109-114`, called "Organizational Intelligence Score" in `orgStatus()`.
- `orchestrator.js`'s own 13-module weighted composite, cached daily in
  `orchestrator_snapshots.organizational_intelligence_score`.
- `brainCore.js`'s own 10-signal weighted composite ("Brain Index"), cached daily in
  `brain_core_snapshots.brain_index` — found during this workstream's exploration; the
  pre-existing `brain-as-library-design.md` (§11, open question 3) already named this pair as
  unresolved: *"`brainCore.js` / `orchestrator.js` — they compute an 'organizational
  intelligence score' from snapshot tables, independently of both other layers. In scope for
  the domain layer eventually, but not addressed here."* This workstream is that "eventually."

Separately, the domain layer's own stated purpose — "one import for organizational
intelligence... callers do not know or care which [engine] ran" — is not yet true for the Org
Science page: `routes/intelligence/prediction.js` still calls `brain.run()` directly, bypassing
`domain/index.js`'s `graph.run()` re-export that already exists for exactly this purpose.

And `derived.js`'s own operating principle — "a consumer can tell a computed answer from a
remembered one" — is inconsistently applied: five routes read genuinely historical,
never-rewritten tables without saying so, and two more routes (`health.js /departments`,
`learning.js` in full) read frozen tables that were never migrated to a live computation at all,
unlike everything else in their files.

## 2. What gets built

### 2.1 One OIS, everywhere (D-02, D-17)

`intel.pillars.orgScore.score`/`.rating` becomes the only computed headline "Organizational
Intelligence" number in the codebase. Four call sites converge on it:

| File | Today | After |
|---|---|---|
| `executive.js:200-201` | already `intel.pillars.orgScore` | no change |
| `voice.js:109-114` | own `0.5·doc + 0.5·backed` formula | `intel.pillars.orgScore.score`/`.rating` |
| `orchestrator.js` `orchestrate()` | own 13-module weighted `rawScore` | `intel.pillars.orgScore.score`/`.rating` |
| `brainCore.js` `computeBrainCore()` | own 10-signal weighted `rawIndex` | `intel.pillars.orgScore.score`; `posture` rebanded off that score using brainCore's existing STABLE/STRAINED/CRITICAL thresholds |

In both `orchestrator.js` and `brainCore.js`, the module/signal registry, verdict/summary/
explanation prose generation, `dataIntegrity` reporting, and the daily snapshot caching
(`orchestrator_snapshots`, `brain_core_snapshots`) are **unchanged**. They stop voting on the
headline number; they keep narrating it. `orchestrator.js`'s `readBrainCore()` (which reads
`brain_core_snapshots` for display-only `brainPosture`) needs no code change — it now
transparently reads a posture derived from the same canonical score everything else shows,
instead of a fourth independent one.

**Not touched:** `PILLAR_WEIGHTS` (`GI 0.35 / MI 0.35 / DI 0.30`) — D-11 confirmed these stay as
authored, not measured.

### 2.2 Org Science cards route through the domain layer, not the brain directly (D-12, D-18)

`prediction.js`'s eight card endpoints (`pattern`, `dna`, `culture`, `maturity`, `behavior`,
`benchmark`, `strategic-alignment`, `capability-by-dept`) call `brain.run(analysis)`,
`brain.isReady()`, `brain.toCode()`, `brain.graphSource()` directly. None of these eight
analyses has — or needs — a `derived.js` equivalent: they are graph-structural analyses
(regularity, fingerprinting, benchmarking), not root-table aggregates, and reimplementing them
would be a different, much larger project than this workstream.

What D-12 actually requires here, per its own text ("the brain keeps the knowledge graph...
graph validation... It stops being an independent publisher of product numbers"), is that
routes stop reaching into `brain/` directly and go through `domain/` instead — which already
re-exports exactly this surface (`domain.graph.run`, `.isReady`, `.toCode`, `.source`, from
`domain/index.js:53-64`, landed by the pre-existing brain-as-library work). This is an
import-path change with an identical call path underneath: `domain.graph.run` **is**
`brain.run`. Response shape (`module`/`analysis`/`type`/`confidence`/`payload`/
`recommendations`/`dataSource`/`generatedAt`) does not change.

### 2.3 Historical provenance on the genuinely-historical tables (D-09a, D-20)

Verified individually (§3 below) that four tables — `org_health_snapshots`,
`documentation_trend`, `learning_snapshots`, `organizational_forecasts` — are read-only
everywhere in `backend/`: nothing in the running application ever writes to them. These are
D-09's KEEP list, kept specifically because they are genuine time series the graph cannot
recompute (it has no time dimension).

Every response built directly from one of these four tables gets one added field:
`provenance: { source: 'historical', ...}`, matching the shape `derived.js`'s own
`provenance()` helper already produces for live-computed answers, so a client can tell "this
month's live computation" from "a stored row that will never be recomputed" without inferring
it from which endpoint it called.

**`executive_briefings` is explicitly excluded from this list.** It looked like a fifth
KEEP-shaped table by association (`briefing.js` reads it constantly) but `briefing.js`'s
`/today` route `.insert()`s a new row into it once per day — it is a live daily cache, not a
frozen table, and stamping it `historical` would misrepresent it. It needs no new provenance
stamp; its existing `briefing_date`/`computed_at` fields already say when it was produced.

Affected routes: `forecast.js` (all four handlers reading `organizational_forecasts`),
`learning.js` (`/summary`, `/decisions` reading `learning_snapshots` — see §2.4 for the two
handlers reading other tables), `briefing.js` (`/documentation-trend` reading
`documentation_trend`; `/today`'s `getDocTrend()` internal read does not need a client-facing
stamp since its output is folded into a briefing that carries its own `computed_at`),
`context.js` (`/metrics`'s `documentation_trend` read), `health.js` (`/trend`, `/history`
reading `org_health_snapshots` directly).

**`health.js /summary` needed its own look, and turned up a second bug in passing.**
`getCurrentSnapshot()` (the function `/summary` calls) already returns `computed_at`/`source`
from `derived.js`'s `provenance()` — but `/summary`'s `res.json()` never includes them; it
returns only `healthIndex`/`healthStatus`/`trend`/`snapshotMonth`/`dimensions`. The response
also blends two provenances in one payload without saying so: `healthIndex`/`dimensions` are
this month's live computation, while `trend` is derived from `fetchAllSnapshots()`'s stored
historical rows. `/summary` gets **two** provenance fields, not one: `computedProvenance`
(live, matching what `getCurrentSnapshot()` already carries) alongside `trendProvenance`
(historical, matching the four-table pattern above) — collapsing them into a single field would
misrepresent whichever half it didn't describe.

### 2.4 Two new derived.js functions, kept deliberately separate (D-09a, D-21)

Tracing every remaining frozen-table read surfaced two tables not in D-09's DROP or KEEP list
at all, feeding two different routes with two different shapes. They must **not** be
collapsed into one function — despite both being "per-department" metrics over overlapping
root tables, they answer different questions:

**`dept_health_scores`** (on D-09's DROP list; consumed by `health.js /departments`) has
columns `department, health_index, health_status, documentation_score, continuity_score,
ownership_score, safety_score, incident_score` — `org_health_snapshots`' exact five-dimension
shape, partitioned by department.

→ New function **`orgHealthByDepartment(roots)`**: partitions `roots` by department, then runs
`orgHealth()`'s existing five-dimension formula (`documentationScore`/`continuityScore`/
`ownershipSpreadScore`/`criticalSafetyScore`/`incidentLoadScore` → `healthIndex`/
`healthStatus`) once per partition. Same definition as the org-level score, narrower
population — not a new formula.

**`department_exposure`** (uncatalogued anywhere in the decision log; consumed by
`learning.js /incidents` and `/departments`) has columns `department, documentation_coverage,
backup_coverage, incident_exposure_score, incident_risk_level` — a differently-shaped,
narrower metric about incident exposure, not overall health.

→ New function **`departmentExposure(roots)`**: per department, computes
`documentationCoverage` (knowledge assets documented ÷ total, for that department's assets),
`backupCoverage` (owners with a backup ÷ total named owners, for that department's owners),
`incidentExposureScore` (workflow failures scoped to that department's workflows via
`workflows.department` — **not** the org-wide `failuresPerWorkflow` `orgHealth.
incidentLoadScore` uses), and `incidentRiskLevel` (banded from that score). Computed
independently of `continuityScore` — it shares input root tables with `orgHealthByDepartment`,
not scoring logic.

**Department resolution**, shared by both functions (verified against
`backend/sql/01_schema_migration.sql`):

- `workflows.department` — direct column.
- `agents.owner_id → owners.id → owners.employee_id → employees.id → employees.department` —
  two-hop join, reusing the `ownerRowToEmployee` pattern `derived.js` already builds in
  `executiveMemory()` and `pillars()`.
- `knowledge_assets.owner_id → employees.id → employees.department` — one-hop join (verified
  against `routes/knowledge/gaps.js`'s existing `employees ( id, name, role )` relational
  select, which resolves the same foreign key).

`learning.js` also reads `failure_patterns` (also uncatalogued, also frozen, and already named
in `derived.js`'s own top-of-file "do not read these" list alongside `governance_assessments`
etc.). This one does not need a new `derived.js` function — `executiveMemory()`'s
`repeat_offender`/`lesson` logic already computes the same underlying question
(workflow-failure patterns) from `workflow_failures`; `learning.js /failures` migrates onto
`intel.executiveMemory.items` filtered to those two `memoryType`s, reshaped to
`failure_patterns`' existing field names so the response contract is unchanged.

## 3. Verification performed before writing this design

- **Table-write grep**, every table named above, across all of `backend/` excluding tests:
  confirmed `org_health_snapshots`, `documentation_trend`, `learning_snapshots`,
  `organizational_forecasts` have zero `.insert()`/`.update()`/`.upsert()` call sites anywhere
  — genuinely historical. `executive_briefings` has three (`briefing.js /today`'s insert plus
  its own cache-read path) — genuinely live, excluded from §2.3.
- **`/orchestrator/history` grep**: no such route exists. `orchestrator.js` defines only `/`,
  `/summary`, `/verdict`, `/recommendations`, `/modules`, `/score`. `orchestrator_snapshots` is
  read solely as "is there a row cached for today," never as a trend series, and no frontend
  component (`VerdictBanner.tsx`, `FivePillarsRadar.tsx`) assumes anything about the score's
  composition — `FivePillarsRadar` reads `/orchestrator/modules` (the per-module breakdown,
  unchanged by this workstream). No historical-composition-mismatch risk exists for D-17.
- **`dept_health_scores` discovery**: not connected to any decision until `health.js` was read
  in full for §2.3's provenance work — its `/departments` route reads a D-09 DROP-list table
  that had not yet been traced to a migration target. Corrected into §2.4 above rather than
  silently left as an untouched DROP-list consumer.

## 4. Migration of existing call sites

Six files change. In two of them (`health.js`, `executive.js`), the pre-existing uncommitted
work already sitting in the working tree (unrelated to any W-numbered workstream, per the
decision log's §5) implements this design's shape correctly — `health.js` already reads
`domain.intelligence.all().orgHealth` instead of its own weighted formula, `executive.js`
already reads `intel.pillars.orgScore`. Per D-19, that work is reviewed against this design and
kept under a W-D commit rather than redone; `voice.js`'s WIP (a correct but incomplete
camelCase property migration) is finished, not replaced. Every other file with pre-existing WIP
(`governance.js`, `memory.js`, `orchestration.js`, `gateCheck.js`, `knowledge/*`, `forecast.js`,
`index.js`, `middleware/auth.js`, `auth.js`, `.env.example`, `schema.sql`, and all frontend
files) is confirmed unrelated to D-02/D-09a/D-11/D-12 by diff review and is left untouched —
`git diff <file>` before staging any of these, per the decision log's §5 warning, isolating this
workstream's hunks from theirs if they land in the same file.

| File | Change |
|---|---|
| `domain/derived.js` | add `orgHealthByDepartment`, `departmentExposure`; export both; add to `computeAll()` |
| `domain/index.js` | expose both new functions under `intelligence.compute` |
| `routes/voice/voice.js` | delete `intelligenceScore`/`rating` computation; read from `intel.pillars.orgScore` |
| `routes/intelligence/orchestrator.js` | `orchestrate()`'s `score`/`rating` from `intel.pillars.orgScore` |
| `routes/intelligence/brainCore.js` | `computeBrainCore()`'s `brainIndex` from `intel.pillars.orgScore.score`; `posture` rebanded off it |
| `routes/intelligence/prediction.js` | `brain.run`/`isReady`/`toCode`/`graphSource` → `domain.graph.*` |
| `routes/health/health.js` | absorb WIP; `/departments` migrates to `orgHealthByDepartment`; add historical provenance to `/trend`, `/history`; `/summary` gains both `computedProvenance` (live) and `trendProvenance` (historical) |
| `routes/learning/learning.js` | migrate `/failures` onto `executiveMemory`, `/incidents` + `/departments` onto `departmentExposure`; add historical provenance to `/summary`, `/decisions` |
| `routes/forecast/forecast.js` | add historical provenance to all four handlers |
| `routes/briefing/briefing.js` | add historical provenance to `/documentation-trend` |
| `routes/context/context.js` | add historical provenance to `/metrics`'s `documentation_trend` field |
| `routes/executive/executive.js` | absorb WIP (already correct, confirm and test) |

## 5. Testing

- `backend/tests/derived.unit.test.js` gains cases for `orgHealthByDepartment` and
  `departmentExposure`, using its existing `roots(overrides)` fixture builder — boundary cases
  (a department with zero owners, zero knowledge assets) matter more than happy paths, per the
  existing file's own convention.
- Route-level assertions (added to `backend/tests/api.smoke.test.js` or
  `intelligence.verify.test.js`, whichever already exercises these mounts) confirm: `voice.js`'s
  `org.intelligenceScore` equals `intel.pillars.orgScore.score` for the same request;
  `orchestrator.js`'s `organizationalIntelligenceScore` and `brainCore.js`'s `brainIndex` both
  equal the same; the historical-provenance-stamped routes carry `provenance.source ===
  'historical'`; `prediction.js`'s eight card endpoints return identical payloads before/after
  the `domain.graph.run` swap (byte-diff, matching the verification method the pre-existing
  brain-as-library work already used).
- `node tests/run-all.js` green before every commit.

## 6. Explicitly out of scope for W-D

- D-09b (dropping `governance_assessments`, `continuity_assessments`, `collaboration_scores`,
  `predictive_risk_scores`, and now also `dept_health_scores` once `health.js /departments` no
  longer reads it) — W-H, after every consumer across every workstream is confirmed migrated.
- D-04's write loop, D-07/D-10b's UI-facing evidence semantics (W-E), D-14's graph reload
  endpoint (W-G).
- Reimplementing the eight Org Science card analyses as `derived.js` functions — §2.2 explains
  why the cheaper indirection satisfies D-12 without this.

## 7. Risks

- `orchestrator_snapshots` and `brain_core_snapshots` rows written before this workstream's
  commit land predate the score-composition change. Neither table has a trend-reading consumer
  (verified in §3), so this is a non-issue for anything currently built, but a future workstream
  adding a `/history` endpoint to either should be aware the series has a discontinuity here.
- Threshold-class/rename-only changes (finishing `voice.js`'s WIP camelCase migration) and
  behavior-changing ones (deleting its ad-hoc OIS formula) must not share a commit, per the
  decision log's standing constraint — same rule W-C followed.
