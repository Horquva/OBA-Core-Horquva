# OBA Core Remediation — Decision Log

Date opened: 2026-08-24
Status: decisions D-01…D-16 approved by owner 2026-08-24; D-17…D-21/F-L decided and closed during
W-D's brainstorming phase 2026-08-25; D-22…D-27 decided and closed during W-E's brainstorming phase
2026-08-25; D-28…D-32 decided and closed during W-G's brainstorming phase 2026-08-25; D-33…D-36
decided and closed during W-F's brainstorming phase 2026-08-25; D-37…D-40 decided and closed during
W-H's brainstorming phase 2026-08-25. **All eight workstreams (W-A through W-H) had landed on
`ocos/develop` as of 2026-08-25 and the remediation itself was complete.**

**W-I is a ninth, later workstream, not part of the original 16-decision interrogation.** Found
2026-08-26 while auditing the codebase fresh in preparation for an AI-agent interface layer: the
agent's premise ("reason from one trustworthy answer per fact") turned out false specifically for
"what happens if X leaves/fails/goes down/is disrupted" — four disagreeing implementations existed,
plus a fifth, fully disconnected frontend engine. D-41…D-45 (decided during W-I's brainstorming phase
2026-08-26) closed this before any agent work started. Full detail is in
[the W-I design doc](2026-08-26-w-i-simulation-cascade-consolidation-design.md) and
[plan](../plans/2026-08-26-w-i-simulation-cascade-consolidation.md).

**W-J is a tenth workstream, also outside the original 16-decision interrogation.** Found 2026-08-26
during the same fresh codebase audit, while designing the AI agent layer and fixing a live bug it
surfaced (`M38` flagging systems as "underused" because no agent ever `depends_on` a system in the
data). `backend/tools/export-company.js`'s hand-authored `AUTHORED` block (`systems`,
`external_entities`, `incidents`, `decisions_log`) turned out to be the last place facts live outside
Supabase — the same "two places hold facts" pattern W-C/W-D/W-E already eliminated everywhere else.
Investigation found the four sections are not symmetric: two are real and misplaced
(`systems`/`external_entities`), one is a dead duplicate of an already-live pipeline
(`decisions_log`, superseded by `domain/dataset.js`'s `decision_history`-backed version), and one was
never actually wired up despite existing (`incidents` — no Supabase table, and nothing at runtime
reads even the authored copy). **Correction found during planning:** `processes` was initially
miscounted as a fifth authored section; it is actually already computed live from the real
`accountability_entities`/`accountability_links` tables (`export-company.js:432`) and only needs a
`graphLoader.js` wiring fix, no new table. D-46…D-51 (decided during W-J's brainstorming phase
2026-08-26) design six new tables, wire `processes` at its existing source, delete the dead
duplicate, and wire incidents into live scoring for the first time. Full detail is in
[the W-J design doc](2026-08-26-w-j-authored-entities-migration-design.md). See §3 for the finished
workstream's task and commit count.

**W-K is an eleventh workstream, in progress.** It is W-I's own design doc's deferred item ("frontend
risk/health-score client-side recomputation... a separate, larger frontend-truth-repointing
workstream") picked up 2026-08-26 after a same-day duplication sweep found the department/workflow
normalization bug (commit `f452506`) and the owner gave this workstream's mandate directly: no
intelligence computation should live in the frontend, only in the backend's graph or `derived.js`. Two
exhaustive audits (every `frontend/lib/*.ts` file, every `frontend/components/**/*.tsx` file) found 13
items — one active bug, two routing fixes, two fabricated numbers, two duplicated thresholds, and eight
real intelligence modules/components with no backend equivalent. D-52…D-64 (decided during W-K's
brainstorming phase 2026-08-26) close all thirteen; D-52 has landed, the rest are phased across future
sessions given the combined scope exceeds any single prior workstream in this remediation. Full detail
is in [the W-K design doc](2026-08-26-w-k-frontend-intelligence-migration-design.md).

**A same-day follow-on fix, not its own workstream** (2026-08-26): closing W-J prompted an audit of
which of the ontology's 18 entity types actually populate the graph. Six sat at zero — `team`,
`project`, `asset`, `risk`, `decision`, `capability`. Checked each one against `derived.js` and the
rest of the codebase rather than assuming: `team`/`project` are genuinely empty by design (no data
source exists, per `graphLoader.js`'s own header); `asset` is a category label already satisfied by
`analytics.js`'s `ASSET_TYPES` union; `capability` describes the Brain's own module catalog, not
organizational data; `risk` is correctly represented as a computed score on existing `ai_agent`
entities (`derived.js`'s `predictiveRisk()`), not a type nothing else needs. `decision` was the one
real gap: `decision_queue` — a table with real per-row ownership (`responsible_person`) and subject
(`entity_name`), already read live by six route files — had never been wired into the graph, unlike
`decision_history` (the table `derived.js`'s `decisionQuality()` reads for its aggregate score, which
has no owner column and stays out of the graph for that reason). Fixed directly, same scale as the
earlier `manages`-edge fix: added a `concerns` relationship type to the ontology, wired
`decision_queue` into `graphLoader.js` with cross-namespace subject resolution (employee/agent/
workflow/platform), and added live test coverage. Verified: all 10 rows resolve cleanly, including a
decision concerning an employee rather than an operational asset. Commit `b5b8e7c` on `ocos/develop`.

**A second same-day fix** (2026-08-26): verified a claim that `collaborates_with` is the clearest
duplication in the codebase — true, and worse than claimed. `graphLoader.js` and
`export-company.js` each independently reimplemented the identical RACI/workflow-step pairing
algorithm over the same two Supabase tables (unlike the graph-vs-`derived.js` split, which W-I
correctly ruled is *not* duplication — different substrates, different questions; this was the same
question, same substrate, twice). `graphLoader.js`'s own comment claimed "identical... cannot drift
apart" with nothing enforcing it, and live verification found it had already drifted: different basis
label for the workflow signal (`'workflow_step'` vs `'workflow'`), and no weight/multiplicity
tracking on the graph side despite `export-company.js` already computing and sorting by it. Fixed by
extracting `backend/lib/deriveCollaborations.js` as the one implementation both files now call. Graph
edges gain `metadata.weight` (previously silently discarded). Regenerating `company.json` changed
exactly one line — the single pair whose only shared context is a workflow, now correctly labeled —
confirming this was live drift, not a hypothetical risk. Pair count (51) and people covered (24)
unchanged. Commit `d9f7d25` on `ocos/develop`.

**A third same-day fix** (2026-08-26): verified a claim that agent risk is calculated three
different ways — true. `domain/derived.js`'s `predictiveRisk()` (canonical, `threatLevel()` bands
35/55/75, served via `/api/predictive-risk/*`) was already the real backend definition — the SPOF
fix earlier today established the pattern, this closes the equivalent gap for risk. Two frontend
implementations disagreed with it and each other: `frontend/lib/risk.ts`'s `deriveRisk()` (a fully
independent client-side formula, own 20/40/70 bands, still driving `AgentTable.tsx`,
`recommendations.ts`, `OwnershipList.tsx`, and one call site in `HumanDependencyRisks.tsx`), and
`frontend/lib/riskIntelligence.ts`'s `computeRiskIntelligence()` (drives the `/risk` page — received
the backend's real score but re-banded it with a *third* set of thresholds, 20/40/70, and applied a
hard CRITICAL override the canonical score's own NO_OWNER/SINGLE_OWNER factors already account for).
Confirmed concretely, not just structurally: the same predictedScore of 50 read MEDIUM under the
backend's bands and HIGH under the old `riskIntelligence.ts` bands. Fixed by adding
`frontend/lib/predictiveRisk.ts` as the one place a component turns
`GET /api/predictive-risk/agents` into a tier, and repointing every consumer that actually asserts a
risk verdict to a user. `DependencyPipeline.tsx` and `ScenarioSandbox.tsx`'s use of `deriveRisk()`
were deliberately left alone — both use it only as a private input to an internal ranking/selection,
never rendered as an asserted verdict, matching this codebase's own precedent for
`frontend/lib/graph.ts`'s `getSPOFs()` during the SPOF fix. `tsc --noEmit` clean; browser-verified by
the owner directly. Commit `1cac30f` on `ocos/develop`.

**A fourth same-day fix — a real correctness bug, not just duplication** (2026-08-26): a broader
audit for remaining duplication (dispatched after the risk-tier fix, covering org health/OIS,
documentation coverage, governance/continuity, cascade/BFS direction, knowledge-risk scoring, and
backup coverage) surfaced that `frontend/lib/graph.ts`'s `getDownstream()` walked the wrong direction
— it returned what an agent itself depends on (its prerequisites), not what breaks when it fails
(its victims), the inverse of `backend/domain/derived.js`'s `cascadeReach()`, which has its own
comment explaining the correct direction. `getUpstream()` in the same file already had the correct
backward-walking logic under the wrong name, with zero callers anywhere in the frontend — confirmed
dead code, so the fix was swapping the two functions' bodies, safe with nothing else to break. This
was live, not theoretical: `DependencyTable.tsx`'s "Cascade Impact" column, `FlowCanvas.tsx`'s
downstream count, `riskIntelligence.ts`'s `downstreamCount`, and `getSPOFs()`'s victim-count criterion
(still used by `ScenarioSandbox.tsx`) were all showing the inverse of what they claimed.
`BlastRadiusSimulator.tsx` had a fifth, separately hand-rolled copy of the same forward adjacency —
fixed the same way. `HiddenDependencyOverlay.tsx`'s similar-looking pattern was checked and is
unrelated (finds implicit transitive edges, correctly forward). `tsc --noEmit` clean. Commit
`7333439` on `ocos/develop`.

One finding from the same audit was not simple duplication and needed its own investigation — see
the governance/continuity entry below, after the backup-owner fix.

**Knowledge-risk scoring — investigated, turned out not to be the same bug pattern.** Read both
implementations in full before touching anything: `backend/routes/knowledge/intelligence.js` reads
`knowledge_assets` (a separate tracking table for documented knowledge *topics*, each with its own
`owner_id`/`criticality`/`is_documented` that can differ from the underlying asset's) and answers "who
holds undocumented, critical tacit knowledge." `frontend/lib/knowledgeRisk.ts` reads
agents/workflows/tools' own fields directly and answers "who owns a large share of the org's
weighted-critical assets" — a genuinely different, share-based question, same class of legitimate
non-duplication as the earlier ownership-concentration finding. What was actually wrong: the backend
field was named `concentrationScore` despite computing a per-person *absolute* score with nothing
normalized against org totals — not concentration at all, and the coincidental name collision is what
made this look like duplication on first read. Renamed to `knowledgeRiskScore` (zero consumers,
confirmed by grep — pure clarity fix). Deliberately did not build new UI to surface this endpoint on
`/knowledge` — that's a real feature addition (where it goes, how it's visually distinguished from the
existing concentration panel) needing a product call, not something to decide unilaterally while
auditing for duplication. Commit `5ab6757` on `ocos/develop`.

**Backup-owner lookups — fixed, same day.** `routes/risks.js` was hand-rolling its own
`owners.employee_id/backup_owner` query instead of calling the shared `lib/ownerBackups.js` — fixed by
switching to it directly (commit `cb8e84b`). `routes/ownership.js` turned out to need the *full*
`owners` row (id/name/role/risk, not just backup_owner), so the same fix would have meant querying the
table twice — instead widened `loadOwnerBackupByEmployee()` into `loadOwners()` (full row), with the
narrow helper becoming a thin wrapper on top of it, so its four existing callers (`graphLoader.js`,
`agents.js`, `dependencies.js`, `decisionIntelligence.js`) needed zero changes. Converting
`ownership.js`'s `ownerByEmployee` from a `Map` to the plain object `loadOwners()` returns required
explicit `Number()` coercion on `Object.keys()` before merging with `agents.owner_id` into a
dedup `Set` — object keys are always strings, `Set` dedup is strict-equality, so this needed to be
exact. Live-verified against the running endpoint (17 owners, `undeclared: 7` matching the file's own
header comment) and the full test suite. Commit `d69c886` on `ocos/develop`.

**Governance/continuity — investigated deeper than the first read, then fixed architecture-wide per
explicit owner instruction ("completely fixed and verified").** The first pass concluded there was no
backend equivalent at all; continuing to trace rather than stopping there — prompted by the frontend
page's own "M18"/"M19" section badges — found real brain modules `IMPL.M18`
(Organizational Continuity Intelligence) and `IMPL.M19` (Governance Intelligence) in
`brain/modules/implementations.js`, computed all along but never exposed via any HTTP route. This is
unrelated to D-37's deletion of the old `governance.js`/`continuity.js` route files — those read
different tables (`governance_assessments`/`continuity_assessments`, frozen at seed time, D-04) that
genuinely had no live consumer; M18/M19 are graph-computed and had simply never been wired to a route
at all. `app/continuity/page.tsx` badged its sections "M18"/"M19" and rendered
`<TruthBadge verified />` while the numbers shown came entirely from `continuityRisk.ts`, a local
per-asset heuristic with no relation to either module — a false-provenance bug, not just duplication.
Tracing `TruthBadge.tsx` itself found the root cause: `verified` defaulted to `true`, so any call site
that passed nothing still rendered a confident checkmark — the exact D-07 anti-pattern ("insufficient
evidence, never a fabricated number") applied to a UI trust signal instead of a number. 15+ call sites
across the app hardcoded `<TruthBadge verified />` with no real backing signal; the worst,
`VerifiedAdvisorPanel.tsx`, fabricated a per-item "confidence score" via arithmetic
(`99 - i - (strategic ? 10 : 0)`) under a header claiming "sourced only from Truth-verified data."
Given the owner's explicit instruction to fix this so it sits well with the MVP's architecture —
completely, not a narrow patch — fixed the whole surface in one pass: `TruthBadge.tsx` no longer
defaults `verified`, deriving it from a real `confidence` score when one is supplied; added
`GET /api/intelligence/continuity` and `/governance` to `prediction.js`, mirroring the existing
`moduleEndpoint()` pattern used by the other 8 exposed modules (live-verified over real HTTP through a
mini Express app: 200 with real payload — `continuityScore: 0.91`, `confidence: 0.96`,
`survivability: "resilient"`; `governanceCoverage: 0.08`, `confidence: 0.59` — when the graph is
loaded, 503 when it isn't, same contract as the other 8); `ContinuityTab.tsx`/`GovernanceTab.tsx` now
show the real M18/M19 score as their primary KPI with a real `TruthBadge confidence`, keeping
`continuityRisk.ts`'s per-asset breakdown (department map, must-protect list, governance heatmap,
worst-offenders) as explicitly-labeled local-heuristic detail rather than implicitly claimed verified;
~14 other call sites gated `verified` on actual fetched-data presence; three components computing a
genuine local heuristic with no backend equivalent (`ExternalEcosystemTab.tsx`,
`KnowledgeConcentrationGauge.tsx`, `OpportunityBacklogTab.tsx`) were marked `verified={false}` with a
comment, rather than invented a confidence they don't have; `VerifiedAdvisorPanel.tsx`'s fabricated
confidence arithmetic and "Confidence: X%" UI were removed outright and the panel renamed Priority
Advisor Panel, since its CRITICAL/HIGH ranking is real (backed by the canonical `predictiveRisk` tier)
but there is no per-item Truth-layer verdict to show. `DependencyPipeline.tsx` and
`ScenarioSandbox.tsx`'s use of `deriveRisk()` deliberately left alone — same precedent as
`getSPOFs()`, internal ranking only, never asserted as a verdict. `tsc --noEmit` clean, full backend
test suite clean, M18/M19 live-verified both via `domain.graph.run()` directly and over real HTTP.
Commit `e53acef` on `ocos/develop`.

**A fifth same-day audit, and one fix from it — M53 recomputed M18's continuityScore instead of
consuming it.** Requested a further duplication sweep; two parallel investigations covered areas the
prior audits hadn't touched (truth/evidence-gate, recommendation generation, per-entity trust scores,
executive memory, vendor/tool risk, knowledge concentration, department aggregation, documentation
coverage). Truth-layer, knowledge-concentration, documentation-coverage, and executive-memory all came
back clean or already resolved. Four real findings surfaced; this entry closes the first.
`brain/modules/implementations.js`'s M18 (line 450) and M53 (line 1276) both independently computed
the exact same `1 - min(1, spofs.length/assets.length)` — byte-identical formulas, no shared source.
The module system already has a chaining mechanism for exactly this case (`A.prior(context, code)`,
used by M14/M24/M55 among others) and `constitutional-modules.js` already declares `M53: ['M18']` as a
dependency, but M53 never called `A.prior()` to actually use it. Fixed by having M53 read
`continuityScore` from M18's prior payload (with a local-computation fallback for the case M18 didn't
run, currently unreachable since `dependsOn` guarantees execution order); M53 still computes
`spofs`/`assets` locally since it needs per-SPOF dependent counts for its recovery-plan ranking, which
M18's payload doesn't expose. Live-verified via `domain.graph.run()`: M18 and M53 now report the
identical 0.91, M53's 8 recovery plans unaffected. Commit `6d92fa3` on `ocos/develop`.

**Vendor/tool risk — fixed same day.** `ExternalEcosystemTab.tsx` scored vendor risk via its own
`deriveVendorRisk()` rule cascade, independently of `lib/aiToolIntelligence.ts`'s weighted
`computeAIToolIntelligence()` that `ToolRiskTable.tsx`/`CriticalToolPanel.tsx` already use on the same
page (`app/ai-tools/page.tsx`) — the same tool could show a different risk tier in two tabs of one
page. No backend equivalent exists for either (confirmed by grep across `backend/routes` and
`brain/modules`), so this is a frontend-only dedup, not a provenance fix — `TruthBadge` stays
`verified={false}`. Fixed by having the page compute `ToolRiskProfile[]` once via
`computeAIToolIntelligence()` and pass it down; `ExternalEcosystemTab` now reads `profile.tier`
instead of recomputing risk from raw `AITool` fields, keeping its per-vendor worst-tier escalation
logic unchanged. `tsc --noEmit` clean. Commit `1aa8a1b` on `ocos/develop`.

**Department-level critical-agent counts — fixed same day, traced first.** `OrgRelationshipMap.tsx`'s
`deptMap` counted critical agents with a raw `a.criticality === 'critical'` check instead of the
shared `resolveCriticality()` helper `Heatmap.tsx` uses for the identical rollup. Traced before
fixing: this was not a live discrepancy today — `OrgRelationshipMap.tsx` has exactly one caller
(`app/ownership/page.tsx`), which already normalizes every agent's `criticality` via
`resolveCriticality()` before building the `Dataset` passed down, so the raw check was reading an
already-resolved value. But it was a fragile implicit dependency — nothing in the component itself
enforced that its caller pre-normalizes, so a future or different caller passing less-normalized data
would silently undercount with no error. Fixed by calling `resolveCriticality()` directly, matching
the convention the earlier 12-file dedup already established for every other reader of this field.
`tsc --noEmit` clean. Commit `907c5cf` on `ocos/develop`.

**`DecisionSupportQueue.tsx`'s fabricated scores — fixed, closing this sweep.** The component derived
`impactScore`/`urgencyScore`/`effortScore`/`blastRadius` from `rec.priority`/`rec.effort`/
`rec.targetType` via made-up arithmetic (e.g. priority CRITICAL → `impactScore` 95), then recombined
those fabricated numbers into a `priorityScore` with its own `0.6/0.4` weights — manufactured numeric
precision layered on a genuine 3-tier signal, sorted by a score that was circular (derived from the
very priority label it claimed to refine). A real, differently-weighted `computePriorityScore()` does
exist server-side (`decisionSupport.js`, `0.40/0.35/0.15/0.10` over genuine `decision_queue` columns)
— investigated wiring the component to that endpoint instead, and ruled against it: `decision_queue`
is a separate, independently-authored table of real per-row decisions with its own scores, not the
same entity as `generateRecommendations()`'s auto-computed suggestions (the data source
`app/recommendations/page.tsx` already establishes for this page). Swapping data sources would
silently change what the page shows — a real feature call, not a dedup fix, same reasoning as leaving
the knowledge-risk endpoint unwired earlier in this sweep. Fixed by dropping the fabricated numbers
and displaying the real `priority`/`effort`/`targetType` fields directly (badges, not gauges), sorted
by the same priority-then-effort order `generateRecommendations()` itself establishes. `tsc --noEmit`
clean. Commit `b449fe3` on `ocos/develop`.

All four findings from the fifth same-day duplication sweep are now closed: M18/M53 (`6d92fa3`),
vendor/tool risk (`1aa8a1b`), department-rollup criticality (`907c5cf`), and this one (`b449fe3`).

**A sixth same-day sweep (2026-08-26) found the most severe bug of this entire remediation: agent
department and workflow shape were silently wrong on up to 9 pages — a real correctness bug, not just
duplication.** `/api/agents` never returns a top-level `department` (only nested under
`owner.department`), but 5 of 9 pages that fetch agents (`continuity`, `memory`, `knowledge`,
`ai-tools`, `recommendations`) normalized with `department: a.department || 'Operations'` — always
false, so every agent showed department "Operations" on those pages regardless of its real one. The
other 4 (`map`, `ownership`, `risk`, `simulation`) already had it right
(`a.department || a.owner?.department || 'Unassigned'`). Compounding this: those same pages (plus
`ownership`) fetched `/api/workflows/intelligence` — a genuinely different endpoint, computed
risk-intelligence fields keyed `workflow` not `name`, no `id`/`department`/`criticality`/`documented`/
`steps` — and normalized as if it were the frontend's `Workflow` shape. Every workflow rendered as
"Unknown Workflow", empty (colliding) id, "Operations" department, "low" criticality, undocumented,
zero steps. This silently broke `aiToolIntelligence.ts`'s entire outage-impact simulation (steps
always `[]`) and `generateRecommendations()`'s workflow-based recommendations (criticality always
undefined, so those checks never fired) on every affected page. `ownership/page.tsx` sidestepped the
field-name issue but hardcoded department unconditionally and **fabricated** criticality from
`riskScore` and backup_owner from `totalTools` — invented numbers standing in for real columns that
were one endpoint-switch away. Root cause both times: 9 files hand-copied the same normalization
block independently instead of sharing one implementation, so a bug fixed in 4 of them never
propagated to the other 5.

Fixed per the owner's explicit architecture instruction: centralize data shaping instead of
re-deriving it per page, so this class of bug can't recur a 10th time. `backend/routes/workflows/index.js`'s
`GET /api/workflows` (the already-correct, separate endpoint from `/intelligence`) now also resolves
`backup_owner` (same `owners`-table pattern as `agents.js`) and returns `steps` (from `workflow_steps`)
— making it the complete, correct source for the `Workflow` shape. `frontend/lib/normalize.ts` (new)
holds the one `normalizeAgent()`/`normalizeWorkflow()` pair; all 9 pages that fetch agents now call it
instead of hand-rolling their own block, and the 5 broken workflow-consuming pages switched from
`/api/workflows/intelligence` to `/api/workflows`. Live-verified: `/api/agents` spans 6 real
departments via `owner.department` with no top-level `department` field on any row (confirming every
affected page previously showed "Operations" for 100% of agents); `/api/workflows` now returns real
steps/backup_owner over HTTP. `tsc --noEmit` clean, backend test suite clean. Commit `f452506` on
`ocos/develop`.

**W-K, decision D-52 — the first phase of the frontend-intelligence-migration workstream, landed
same day.** Per [the W-K design doc](2026-08-26-w-k-frontend-intelligence-migration-design.md), D-52
was the active bug: `frontend/lib/risk.ts`'s `deriveRisk()`/`deriveRiskScore()` was the client-side
formula `predictiveRisk.ts` was built to replace, but stayed live in `ScenarioSandbox.tsx` (auto-picking
the highest-risk agent to simulate) and `DependencyPipeline.tsx` (per-person risk ranking) — the one
place in the app where the old and new intelligence were simultaneously live and could visibly
disagree. `calculateHealthScore()` in the same file was dead code (exported, never imported); the
`_simulation_override`/`_simulation_penalty` fields `deriveRiskScore()` read were also dead, never set
anywhere. Fixed by threading the existing `riskByAgentName` map (`predictiveRisk.ts`'s
`buildPredictiveRiskByAgentName()`, already the established pattern in `HumanDependencyRisks.tsx`/
`OwnershipList.tsx`) into both components — `simulation/page.tsx` now also fetches
`/api/predictive-risk/agents`. Both components' remaining local combination logic (SPOF bonus + tier
weight) stays client-side, unchanged in kind — it's internal ranking that picks what to simulate/how to
sort, never rendered as an asserted verdict, matching this session's own established precedent (the
SPOF/`getSPOFs()` and original `deriveRisk`-for-ranking calls). `lib/risk.ts` deleted entirely — zero
remaining imports. `tsc --noEmit` clean. Commit `3af87ba` on `ocos/develop`.

**W-K, decision D-53 — the two routing fixes, one already done, one landed today.** Verified live
before touching anything, rather than trusting the design doc's own inventory: `getSPOFs()` routing
turned out to already be fixed by an earlier commit (`aef3109`, see §4's SPOF-unification entry) —
`risk/page.tsx` already fetches `/api/dependencies/agent-spofs` and passes the real `spofAgentIds` Set
into `computeRiskIntelligence()`; `getSPOFs()` itself stays in `lib/graph.ts` for `ScenarioSandbox.tsx`'s
internal scenario-selection only, matching established precedent. The second half was genuinely open:
`riskIntelligence.ts`'s `buildFactors()` re-derived the risk-factor breakdown with its own point scheme
(No Owner +40, No Backup +30, etc.) completely disconnected from `predictiveRisk()`'s real weights
(`contributingFactors`, already shipped on `/api/predictive-risk/agents` but never read) — the displayed
"Total Risk Score" never actually equalled the sum of the factor rows shown above it, since the total
came from the real backend score while the rows came from invented numbers. Fixed by extending
`PredictiveRiskEntry` to carry `contributingFactors`/`reasons` from the same response already fetched,
and building the display list from them directly (`factorsFromRisk()`); per-factor severity (badge color
only, doesn't feed back into anything) derived from the real point value via a small documented banding.
Live-verified over HTTP: 5 keys, 5 reasons, matching order. `tsc --noEmit` clean. Commit `bf10628` on
`ocos/develop`.

**W-K, decision D-54 — the last two fabricated numbers, same anti-pattern already fixed twice this
session.** `OpportunityBacklogTab.tsx`'s `leverageScore` started at 50 and added fixed points for
CRITICAL/HIGH priority and Quick/Medium effort, capped at 99 — the same point-arithmetic-with-no-real-
basis pattern already fixed in `VerifiedAdvisorPanel.tsx` and `DecisionSupportQueue.tsx`. Removed; the
badge now shows the real `rec.priority` label, and the list relies on `generateRecommendations()`'s
own ordering (filtering an already-sorted array preserves order, so no re-sort was needed once the
fake score was gone) — `TruthBadge` moved from a hardcoded `verified={false}` to
`verified={items.length > 0}`, since what remains is an honest relabeling of real fields, not
fabrication. `TwinSyncStatus.tsx` was worse in kind: it framed itself as a live replication process —
"Synchronized"/"Out of Sync" states plus a "Replication Lag" computed as
`max(8, round(totalNodes*0.4))`, pure invention with nothing to back it. Traced why before fixing:
there is no async twin/replica in this architecture to have a lag — the brain graph (M49, "Digital
Twin") recomputes synchronously from the same live data on every request, so "synchronized" was always
true by construction, never a measured fact. The underlying signal (unowned-agent ratio) was real,
just mislabeled as something it wasn't — relabeled honestly as ownership coverage ("Fully Owned"/
"Partial Coverage"/"Coverage Gap"), lag row dropped entirely since nothing real exists to replace it
with. `tsc --noEmit` clean. Commit `241968a` on `ocos/develop`.

**W-K, decision D-55 — one backend-sourced human-SPOF verdict, replacing 3 independent copies.**
`OwnershipOverview.tsx`, `OwnershipList.tsx`, and `DependencyPipeline.tsx` each independently coded the
"≥3 unbacked agents" human-SPOF threshold. Traced before fixing, per this session's established
practice: `agents.js`'s `loadEnrichedAgents()` derives `agent.backup_owner` entirely from the owner's
own `backup_owner` column (there is no per-agent backup_owner in the schema at all), so one owner's
agents are either all backed or all unbacked — meaning the three independently-written formulas were
mathematically identical today, not actually disagreeing, contrary to the design doc's own inventory
(which had assumed the risk without checking the data model). Still worth fixing: a fragile 3×-
duplicated threshold with no shared source is one bug or data-model change away from drifting, and
squarely inside the owner's mandate that this class of judgment belongs in the backend. Added a real
`isHumanSpof` boolean (`HUMAN_SPOF_MIN_AGENTS = 3`) and a `gaps.humanSpofs` list to
`GET /api/ownership`, matching the route's existing gap-list pattern; `ownership/page.tsx` fetches it
once and passes a `Set<string>` of human-SPOF owner names to all three components, replacing their
local threshold logic. Live-verified over HTTP: field present on every owner, correctly false
throughout this dataset (no owner currently owns ≥3 agents). `tsc --noEmit` clean, backend test suite
clean. Commit `a6b8fd4` on `ocos/develop`.

**W-K, decision D-56 — simulation severity now reads the backend's real `severityFor()`, closing the
design doc's Phase 1-3.** `ScenarioRanking.tsx` and `ImpactSummary.tsx` each independently computed
severity from health-score-drop magnitude (`≥7/3/1` points), duplicated verbatim between the two
files — and a worse signal than what the backend already computes. `domain/simulations.js`'s
`severityFor()` (added in W-I) looks at the real criticality of the entities actually impacted, not
just how many points the health score moved; every scenario response already carries this as
`severity`, but `frontend/lib/simulation.ts`'s `mapScenario()` discarded it. Fixed by adding
`severity: RiskLevel` to `ScenarioResult`/`mapScenario()` and replacing both components' local
drop-magnitude banding with a lookup on the real value — styling only, no computation left
client-side. Live-verified over HTTP: 48 scenarios in this dataset span critical/high/low severities
from the real formula. `tsc --noEmit` clean, no backend changes needed (`severityFor()` already
existed from W-I; this only stops discarding its output). Commit `fc43a22` on `ocos/develop`.

This closes the design doc's Phase 1-3 (D-52 through D-56: the active bug, the two routing fixes, the
two fabricated numbers, and both duplicated thresholds).

**W-K, decision D-63 — rescoped smaller than planned after closer inspection.** The design doc's plan
was to add a blast-radius function to `domain/simulations.js`. Closer look found the BFS cascade
traversal itself in `BlastRadiusSimulator.tsx` is graph-traversal utility, not a judgment — the same
class as `lib/graph.ts`'s `getDownstream`/`getUpstream`, already established this session as acceptable
client-side. What was actually fabricated was the "impact %" number (`Math.pow(0.65, hop) * 100`, a
pure narrative assumption with no measured basis) — nothing worth building a new backend endpoint for.
Fixed by keeping the real BFS + hop distance and replacing the invented decay curve with the real
`predictedScore`/`threatLevel` already computed by `predictiveRisk()`, for whichever agent is actually
hit at each hop — no new backend endpoint needed, just wiring `map/page.tsx` to fetch
`/api/predictive-risk/agents` like every other page already does. `tsc --noEmit` clean. Commit
`c7f0e50` on `ocos/develop`.

**W-K, decision D-64 — closed with no code change: not actually a migration candidate.**
`HiddenDependencyOverlay.tsx`'s three edge-inference functions (transitive, shared-owner,
shared-resource) compute no score, tier, or verdict — they trace which pairwise edges are implied by
already-fetched `agents`/`dependencies` data for an exploratory "what might be hidden" visualization,
the same class as `lib/graph.ts`'s `getDownstream`/`getUpstream` BFS traversal, already established
this session as acceptable client-side utility, not intelligence. `TruthBadge` is already correctly
gated on real data presence (fixed earlier this session), not claiming high confidence. The component's
shallow 2-hop transitive check is cruder than `derived.js`'s real unlimited-depth transitive closure,
but answers a different question for a different purpose (visualization of implied pairwise
relationships vs. impact/reachability analysis) — not a duplicate needing reconciliation, matching the
precedent W-I set for `analytics.js`'s separate graph-based traversal. No migration needed; closed by
inspection rather than by building new backend infrastructure for something that wasn't actually
violating the mandate.

**W-K, decision D-57 — human-dependency-risk score moves to the backend, one real formula, owner
delegated the weighting call.** `HumanDependencyRisks.tsx` computed a displayed per-person
`totalRiskScore` as (real agentRisk average) + (`unbackedWorkflows*12 + criticalWorkflows*8`) +
(`unbackedTools*10`) — two invented point weights layered onto one real signal, tiered against a third
invented scheme (50/25/10, disagreeing with `predictiveRisk()`'s own 35/55/75 bands).
`DependencyPipeline.tsx`'s similarly-shaped `riskScore` was left alone — internal sort-only, never
displayed, same exemption as `getSPOFs()`/`ScenarioSandbox`'s selection logic. The design doc flagged
this needing an owner call on the weighting formula; the owner delegated the decision back with
instructions to decide and document. Decision: reuse `RISK_FACTORS`' existing point scale instead of
inventing new numbers, and `threatLevel()`'s existing bands instead of a third tier scheme. Workflow
backup coverage is deliberately NOT counted as its own factor — it's the same owner-level fact
`predictiveRisk()`'s `SINGLE_OWNER` factor for their agents already prices in (a workflow's
`backup_owner` resolves from its owner's own `backup_owner` row, per `routes/workflows/index.js`);
counting it twice would double-weight one signal, not add a second one. Critical-workflow load and
tool-backup coverage are independent real facts, contributing as a *fraction* of owned
workflows/tools (not a raw count) times the matching existing weight, so owning many workflows doesn't
mechanically inflate the score.

Added `domain/derived.js`'s `humanDependencyRisk(roots)` — all inputs were already-loaded root tables
except `tool_backups`, added to `ROOT_TABLES` (zero new queries beyond one more parallel select).
Exposed via new fields on `GET /api/ownership`, merged into the existing D-55 enriched owner objects —
no new endpoint, no new frontend fetch needed. New unit test hand-verifies the exact formula against a
constructed fixture (all 7 assertions pass). Live-verified over HTTP against real data (5 distinct
scores/tiers). `tsc --noEmit` clean, full backend test suite clean. Commit `4fe155e` on `ocos/develop`.

**W-K, decision D-58 — tool-risk composite score moves to the backend, ported not redesigned; the
fabricated recovery-time estimate dropped.** `lib/aiToolIntelligence.ts`'s `buildToolScore()`/
`scoreToTier()` independently reimplemented a 5-factor weighted score (documented/backup/criticality/
dept-exposure/agent-count) that `/api/tool-intelligence` had no equivalent for at all (only booleans,
and unconsumed except by the health pinger). Ported verbatim — same weights, same thresholds — into
`backend/routes/tools.js`'s `computeToolRiskScore()`/`toolRiskTier()`, which already has every input
field computed with zero new queries; this is a migration, not a redesign, matching the reasoning
behind D-57's reuse-don't-reinvent call. Also returns a `riskFactors` breakdown (same shape the UI
already rendered), computed once instead of the score being computed once and the "why" reconstructed
a second time client-side — the same "total doesn't equal the sum of its displayed factors" class of
bug D-53 fixed for agent risk. One deliberate improvement: a tool with unassessed (`null`) criticality
now contributes 0 instead of the frontend's old silent normalization to `'low'` (2 points) — consistent
with this route's own existing "never fabricate a default for unassessed data" principle. Bundled per
the design doc: `OutageImpactPanel.tsx`'s displayed `estimatedRecoveryMinutes`
(`30 + 15*workflows + 10*agents`, no real basis) — same fabricated-number class as D-54/D-63, dropped
entirely, nothing real to back it with. `severityByImpact()`'s real-count-based bucketing and the
outage list's sort score were left alone — display banding over real counts, not fabrication. New
backend unit test (`tools.unit.test.js`) hand-verifies every factor, both thresholds, the 100-point
cap, and cross-checks the formula against the live-verified Tableau AI case — 11/11 assertions pass.
`tsc --noEmit` clean, full backend test suite clean (12 suites). Commit `09fec14` on `ocos/develop`.

**W-K, decision D-59 — knowledge-concentration score moves to the backend, ported not redesigned.**
`lib/knowledgeRisk.ts`'s `concentrationScore` computed a criticality-weighted share of org-wide assets
(agents+workflows+tools) an owner holds, entirely client-side — deliberately distinct from
`routes/knowledge/intelligence.js`'s `knowledgeRiskScore`, an absolute per-person score over that
person's own knowledge_assets holdings, not normalized against org totals (the two shared a name by
coincidence pre-dating this session's D-07-era rename, not because they answer the same question).
Ported verbatim into `domain/derived.js`'s `knowledgeConcentration(roots)` — same weight table
(`critical:4, high:2, medium:1, low:0.5`), same tier bands (90/55/30) — reusing `loadRoots()` (zero new
queries) and `definitions.js`'s `entityCriticality()` as the canonical per-type criticality resolver
(agent/workflow via their own `risk` column, platform via its `knowledge_assets` rows) instead of each
asset type reading a differently-named raw field, which is what the frontend version did.

Exposed via a new `concentration` array on `GET /api/knowledge/intelligence`, computed alongside (not
merged into) that route's existing `knowledgeRiskScore` employees array — the two stay visibly separate
fields on the same response, matching D-57/D-58's "expose on the existing endpoint" pattern rather than
adding a new route. `frontend/app/knowledge/page.tsx` fetches it and passes it into
`computeKnowledgeRisk()`, which now looks the score up by owner name instead of recomputing its own
weighted share; the frontend's local `tier()` function is deleted, its band logic now living only in
`concentrationTier()` on the backend. `components/knowledge/KnowledgeConcentrationGauge.tsx`'s
bus-factor/HHI statistics were left alone — out of scope for D-59, a distinct not-yet-assigned gap the
design doc's inventory table flagged separately.

New unit test hand-verifies the exact formula against a constructed fixture (7 assertions, including
that shares sum to 100% of the weighted whole and that an unassessed platform still weighs 1, never 0,
matching the frontend's old `?? 1` fallback). `tsc --noEmit` clean, full backend test suite clean.
Commit `14b8b87` on `ocos/develop`. D-60, D-61, D-62 remain open.

**W-K, decision D-60 — institutional-memory status/IMHS moves to the backend, owner-chosen formula.**
Genuinely two different formulas shared the PRESERVED/AT_RISK/VULNERABLE/LOST taxonomy name:
`lib/orgMemory.ts`'s live formula (drives the `/memory` page today) keys status off documentation +
`backup_owner` coverage — a continuity/bus-factor framing, "would this survive the owner leaving."
`routes/memory/memory.js`'s own same-named formula keyed off documentation + criticality instead,
never looked at `backup_owner` at all, and had zero real consumers (only a health pinger touched
`/health`; `/map` and `/employee/:name` had no callers) — a risk-exposure framing mislabeled as memory
status. This one genuinely needed an owner call (unlike D-57's weighting-scheme choice, the two
formulas here disagree about what "memory status" even means); asked, owner picked the frontend's
backup-owner formula as canonical — it's the one actually live, and matches this module's own
"memory carrier" framing.

Ported verbatim into `domain/derived.js`'s `orgMemory(roots)`: same 4-status rules, same carrier-tier
weights (`undocumented*2 + noBackup`), same IMHS weights (1.0/0.5/0.25/0). Two departures, both
display-only fields that never feed the status/tier logic: criticality resolved via
`entityCriticality()` (real `unknown` sentinel) instead of the frontend's silent default-to-`'low'`;
"documented" for agents/tools uses a conjunction across every matching `knowledge_assets` row instead
of `routes/agents.js`'s older last-write-wins version, matching the same fix `tools.js` already made
for the identical bug class (F-K).

All three `routes/memory/memory.js` endpoints (`/health`, `/employee/:name`, `/map`) now read this one
computation instead of each re-deriving it — `/map`'s response also dropped a pointless reshaping step
(`assetName`/`isDocumented` field renames that had silently dropped `id`/`backup_owner`/`documented`)
since nothing outside this route consumed the old shape. `frontend/lib/orgMemory.ts` no longer computes
anything; it fetches `GET /api/memory/map` and shapes the JSON into the same types every `memory/`
component already expects, so no component needed to change.

New unit test hand-verifies every status transition, the IMHS formula, and carrier tiering against a
constructed fixture (15 assertions). `tsc --noEmit` clean, full backend test suite clean (146
assertions). Live-verified over HTTP against real data (37 assets, IMHS 57/AT_RISK; one employee's
carrier tier and per-asset status cross-checked by hand against the raw undocumented/no-backup counts).
Frontend rendering not visually verified in a browser this session — Next.js's dev-server directory
lock blocked starting a second instance alongside another active session's; the backend contract this
page consumes is fully verified live, so the remaining risk is presentational only. Commit `d20132b`
on `ocos/develop`. D-61, D-62 remain open.

**Decision D-65 (found mid-W-K, while starting D-61) — `definitions.js`'s `LEVELS` was missing
'medium', silently un-known-ing every medium-risk entity.** `LEVELS` recognized
`'low'/'normal'/'high'/'critical'`; the real data (`agents.risk`, `workflows.risk`,
`knowledge_assets.criticality`) uses `'medium'` for that tier instead — `'normal'` is exclusively a
`dependencies.dependency_type` value, never an entity's own criticality (confirmed against seed data:
59 rows across those four columns, 46 say `'medium'`, 5 say `'normal'`, never overlapping).
`normalizeLevel('medium')` fell through to `UNKNOWN`, so `atOrAbove()`/`entityCriticality()` silently
read every medium-risk agent/workflow/knowledge_asset as unmeasured. Checked the blast radius on
already-shipped work before fixing: D-58's `tools.js` compares raw strings directly, unaffected.
`predictiveRisk`/`humanDependencyRisk`'s `atOrAbove(risk,'high')` calls were unaffected in OUTCOME
(medium correctly fails a 'high' bar either way). D-59's concentration weight table has `medium:1` and
`unknown:1` — the same number by coincidence, so those scores were numerically fine, but every
medium-risk asset was mislabeled `'unknown'` in the output. D-60's `orgMemory()` has the identical
cosmetic mislabeling on its criticality display field only (status/tier logic never reads criticality).
No shipped SCORE was wrong; the label was, everywhere `'medium'` could occur.

Fix: `RANK.medium = RANK.normal` — an alias sharing the same rank, not a rename. `normalizeLevel` keeps
each value's own spelling (`'medium'` stays `'medium'`, `'normal'` stays `'normal'`); only their RANK,
not their label, is shared, so `entityCriticality`/`edgeCriticality` output both stay accurate to their
source column's real vocabulary. New regression test (10 assertions) locks in the alias in every
`atOrAbove` direction, including the previously-broken `atOrAbove('medium','medium')`. Full backend
suite clean (146+95 assertions across the two directly affected files, 17 suites, no regressions in
D-57–D-60's existing assertions). Commit `2e356b5` on `ocos/develop`.

**W-K, decision D-61 — per-asset continuity survival/governance moves to the backend.**
`lib/continuityRisk.ts`'s `computeContinuityRisk()` (survivalStatus/governanceScore/
complianceViolations per agent+workflow+tool, department rollups, must-protect/worst-offenders lists)
was genuinely missing backend-side — unlike D-57 through D-60, `GET /api/intelligence/continuity` (M18)
and `/governance` (M19) answer a different question (org/department AGGREGATES over a different
formula; see `orgHealth()`'s own `continuityScore` and its D-21 comment), so this isn't a
reconciliation of two disagreeing formulas, just a migration of the one real per-asset computation that
existed. The `/continuity` page already labeled this heuristic "Estimated ... not M18/M19" rather than
claiming it was either module.

Ported verbatim into `domain/derived.js`'s `assetContinuity(roots)`: same four-way survival rule
(no owner + high-stakes → LOST; no owner, low-stakes → DEGRADED; no backup + high-stakes → FAILS; no
backup, low-stakes → DEGRADED; undocumented → DEGRADED; else SURVIVES), same governance deductions
(-40 no owner / -25 no backup / -20 undocumented), same compliance-violation count, same top-10
must-protect/worst-offenders selection. Factored owner/backup/documented/criticality/department
resolution out of `orgMemory()` into a shared `ownedAssetBase(roots)` helper — this is the fifth
D-57…D-61 consumer of those four signals, reusing one resolution instead of reimplementing it a fifth
time; `orgMemory()`'s own behavior is unchanged (verified against its existing D-60 test, unaffected).
One departure, the same call D-59/D-60 already made: criticality via `entityCriticality()` (real
`'unknown'`) instead of the frontend's fabricated `'low'`/`'medium'` defaults — behavior-preserving
here too, since `atOrAbove('unknown','high')` and `atOrAbove('low','high')` both fail the same way, so
`highStakes`/`mustProtect`'s boolean outcome is unchanged.

New route `GET /api/continuity`. `frontend/lib/continuityRisk.ts` no longer computes anything; it
fetches that endpoint and shapes the JSON. `app/continuity/page.tsx` now fetches it alongside the
existing M18/M19 module fetches instead of computing locally from `/api/agents`, `/workflows`, `/tools`.

New unit test hand-verifies every survival-status branch, the governance formula, department rollups,
and both top-10 lists against a constructed fixture (15 assertions). `tsc --noEmit` clean, full backend
suite clean (161 derived + 95 definitions assertions, 17 suites). Live-verified over HTTP: 37 assets,
status breakdown self-consistent with `mustProtect`'s count (8 FAILS + 0 LOST = 8 `mustProtect`,
exactly), 14 medium-criticality assets correctly labeled `'medium'` rather than `'unknown'`, confirming
D-65's fix took effect. Frontend rendering not visually verified in a browser this session — same
Next.js dev-server lock as D-60; backend contract is fully verified live. Commit `149f2e3` on
`ocos/develop`. D-62 remains open — the largest item in W-K, and the last one.

**W-K, decision D-62 — recommendation engine moves to the backend; brain module M04 expanded from 3
rule classes to all 7.** `lib/recommendations.ts`'s `generateRecommendations()` (7 hand-authored rules:
unowned agent / agent no backup / owner concentration / undocumented critical-high agent, the same four
crossed onto workflows where applicable, plus tools with no backup) was entirely client-side. M04
(Recommendation Engine) already existed as a brain module but covered only 3 rule classes (unowned
assets, SPOF redundancy, dependency cycles) — the largest single gap identified in this workstream.

Expanded M04 by reusing analytics the brain already had rather than reimplementing: rule 1 (unowned)
was already broader than the frontend's agent-only scope, kept as-is. Rules 2 and 5 (agent/workflow, no
backup owner, criticality ≥ high) turned out to be the SAME question `A.singlePointsOfFailure()`
already answered (D-06's `spofVerdict`) for both types in one pass — M04 was calling it but not reading
it richly; no new analytics needed. Rule 3 (owner concentration, ≥4 agents) is new, built from
`A.owners()` per agent, deliberately agent-scoped to match the frontend's own semantics rather than
`A.ownershipConcentration()`'s broader all-asset-types count. Rule 4 (undocumented agent, criticality ≥
high) is new, reading `entity.metadata.documented`/`.risk`, both carried verbatim off the source row by
graphLoader's `rowMeta()`. Rule 6 (tool no backup platform, criticality ≥ high) is new and deliberately
NOT folded into `singlePointsOfFailure()`, whose owner-backup edges are never set for `tool_ownership`
rows — a tool's backup is a fallback PLATFORM, not a person, the same distinction D-60's `orgMemory()`
draws for tools; reads `metadata.assetCriticality`/`backupTool` instead. Rule 7 (undocumented CRITICAL,
not merely high, workflow) is new, porting the frontend's exact critical-only asymmetry rather than
"fixing" it to ≥high. The pre-existing dependency-cycle rule was kept — real intelligence outside the
frontend's 7, not something D-62 asks to remove.

Also addressed the design doc's own "no prose, no effort estimate" gap: every recommendation now
carries `title`/`description`/`impact`/`action`/`effort`/`id`, computed from real graph data. Added
explicit `orphanedAgentCount`/`undocumentedCriticalAgentCount`/`ownerConcentrationWarning` summary
fields so the frontend doesn't need to re-derive them by pattern-matching prose client-side.

New route `GET /api/intelligence/recommendations`. `frontend/lib/recommendations.ts` no longer
generates anything; it fetches that endpoint and shapes the JSON. `app/recommendations/page.tsx` now
fetches it plus `/api/health/summary` (org health, genuinely separate — M04 doesn't compute it) instead
of pulling agents/dependencies/tools/workflows/predictive-risk and generating locally.

New unit test hand-verifies all 7 rules plus the cycle rule plus the summary fields against a
constructed graph fixture (33 assertions). `tsc --noEmit` clean, full backend suite clean (18 suites).
Live-verified over HTTP: 23 recommendations, category and summary-field counts self-consistent across
two independent live checks taken before and after the prose/id enrichment. Frontend rendering not
visually verified in a browser this session, same Next.js dev-server lock as D-60/D-61 — backend
contract is fully verified live. Commit `550d14f` on `ocos/develop`.

**W-K is now fully closed — all thirteen decisions (D-52 through D-64) plus the D-65 bonus fix landed.**

**Post-W-K duplication audit (2026-08-26) — dispatched two parallel, skeptical re-audits** (frontend/lib
files fresh again, and frontend/components for inline intelligence) after W-K closed, specifically
instructed to verify every claim by reading the actual code rather than trusting either the design
doc's now-stale inventory or the audits' own first-pass framing. One flagged item (`lib/graph.ts`'s
`getSPOFs()`, still called by `ScenarioSandbox.tsx` with a stale ≥3-victims rule) was checked against
the decision log and found to already be a deliberately reviewed exemption (same entry as the SPOF fix
above, `getSPOFs`/D-53, commit `aef3109` — internal ranking only, never asserted as a verdict) — not a
new bug, and not reported as one. Three genuine findings survived verification:

**Decision D-66 — the Executive Command Center's "Priority Actions" panel served frozen data through
two independent paths, neither of which was M04.** `components/dashboard/RiskSplit.tsx` fetched
`GET /api/briefing/recommendations`, which SELECTed from the `recommendations` SQL table — seeded once,
zero writers anywhere in the codebase, confirmed by grep — so it answered the same list every day
regardless of what had changed. When that call was empty (including simply being pre-login, the state
most sessions start in), the component fell back to a THIRD, hand-authored implementation: a static
"Review Single-Point Dependencies" card plus a bare `!owner && criticality === 'critical'` check.
Neither path called brain module M04 (D-62), the real, comprehensive 7-rule recommendation engine this
app already has. Fixed both ends: `RiskSplit.tsx` now fetches `GET /api/intelligence/recommendations`
directly (same source `app/recommendations/page.tsx` uses) and the now-dead fallback branch is deleted
(an empty result renders "No priority actions — good standing" instead of a fabricated hint).
`routes/briefing/briefing.js`'s `/recommendations` handler is also repointed to M04 rather than left as
an orphaned frozen-table endpoint that could get wired back up later — same fix-at-the-source precedent
as D-59/D-60/D-61. The now-unused `briefingApi.recommendations()` wrapper is removed from `lib/api.ts`.
`tsc --noEmit` clean, full backend suite clean (18 suites). Live-verified in an actual logged-in browser
session: the panel shows real M04 output ("Document SecurityScanner", "Document KnowledgeIndexer",
"Document critical workflow Incident Response", "Assign owner to Data Retention Policy"), matching the
exact top items already confirmed live over curl for D-62. Commit `445fa63` on `ocos/develop`. D-67
(`routes/dashboard.js`'s dead route serving the same frozen-table class of bug, plus its own duplicate
`riskScore` formula) and D-68 (`ExternalEcosystemTab.tsx`'s fabricated per-vendor "Org concentration %")
are next.

**Decision D-67 — `/api/dashboard` duplicated `riskScore` and served a frozen `snapshots` table under
colliding field names.** `GET /api/dashboard` has no real frontend consumer (only a health pinger,
confirmed by grep) but computed `riskScore` from a bespoke weight table (`{critical:40, high:20,
medium:10, low:5}` over `agents.risk` alone — no owner/backup/dependency signal), duplicating
`predictiveRisk()`'s real, canonical answer with a cruder one. `latestSnapshot.{continuityScore,
governanceScore, memoryHealth, riskIndex}` was read from the `snapshots` table — seeded once by
`sql/02_seed_data.sql`, zero writers anywhere in this codebase — under field names that directly
collide with the now-live M18/M19/`orgMemory()`/`assetContinuity()` concepts.
`openRecommendations`/`criticalRecommendations` read the same frozen `recommendations` table D-66
already fixed elsewhere. Fixed: `riskScore` is now the mean of `predictiveRisk()`'s real
`predictedScore` across agents. Recommendation counts come from brain module M04 (D-62).
`latestSnapshot` is dropped entirely rather than reinvented — those concepts already have their own
correctly-sourced dedicated routes (`/api/memory/health`, `/api/continuity`,
`/api/intelligence/continuity`, `/governance`); this route never needed to be a second home for them.
Also removed an `owners` query that was fetched, error-checked, and never read — dead weight predating
this fix. Full backend suite clean (18 suites). Live-verified over HTTP: `riskScore` (55) exactly
matches `predictiveRisk()`'s live mean across the same 15 agents; `openRecommendations`/
`criticalRecommendations` (23/3) exactly match M04's live output. Commit `d61b2a4` on `ocos/develop`.

**Decision D-68 — `ExternalEcosystemTab.tsx`'s "Org concentration %" was fabricated.** The vendor
cards' concentration bar came from `agents_using.length*12 + departments.length*8` (+6 per merged tool
from the same vendor), capped at 100 — three constants with no stated basis, the same fabricated-number
pattern already fixed elsewhere (D-54/D-58/D-63). This file was partially fixed before (commit
`1aa8a1b`) for its risk TIER, which correctly reads `profile.tier` from the backend — but that fix
didn't touch this separate concentration metric, and nobody caught it since. Replaced with a real
ratio: this vendor's share of the org's total agent-tool usage (sum of `agents_using.length` across the
vendor's tools, divided by that same sum across every tool) — no invented weights, a genuine
share-of-total over counts already present on `profiles`, matching `knowledgeConcentration()`'s own
methodology (D-59). No new backend endpoint needed: this is aggregation over already-real per-tool
data, the same kind of client-side grouping `buildDeptExposure()` in the same file already does without
objection — the violation was the invented weights, not the aggregation itself. `tsc --noEmit` clean.
Live-verified in an actual logged-in browser session: every vendor's displayed percentage (OpenAI 32%,
GitHub 16%, Anthropic/Salesforce/Notion 11%, Google/Jasper/Anysphere/Grammarly 5%, Midjourney/
Perplexity/DataRobot 0%) matches a hand-computed share-of-total from raw `GET /api/tools` data exactly,
and all twelve percentages sum to ~100% (the old formula never summed to anything meaningful). Commit
`c91e9e3` on `ocos/develop`.

**All three post-W-K duplication-audit findings (D-66, D-67, D-68) are now closed.**

**This sweep also surfaced the owner's broader architectural mandate**, given verbatim: "no
intelligence should be in frontend everything related to intelligence calculation should be in
backend the frontend should get it from backend... either from graph or derived... a systematic
approach so we do not keep finding the same problem over and over again." This fix addresses the
*normalization* half of that class of bug (raw API rows → typed shapes). It does not yet address the
larger, separate class: several `frontend/lib/*.ts` files (`aiToolIntelligence.ts`,
`continuityRisk.ts`, `knowledgeRisk.ts`, `networkRisk.ts`, `riskIntelligence.ts`, `recommendations.ts`)
compute genuine scoring/risk *intelligence* client-side with no backend equivalent at all — confirmed
across this session's own audits (vendor/tool risk, knowledge concentration, governance/continuity
before M18/M19 were exposed). Migrating that class to the backend is a much larger, separate
undertaking (new brain modules or `derived.js` functions, confidence/evidence semantics, and a
frontend migration per consumer) that needs its own scoped plan — flagged here, not yet started.

**W-G ran unattended** (2026-08-25) under explicit owner delegation to choose the best option and
proceed without waiting for live approval — the owner was offline and asked for the work to
continue through the normal process regardless. Every decision below still carries its own
Reason/Affected/Consequence, same bar as every prior workstream; nothing was rubber-stamped to move
faster.

**W-F ran with the owner present** (2026-08-25), unlike W-G — D-01's org-consolidation migration is
explicitly owner-gated ("show the rows to the owner before touching them"), so this one couldn't run
unattended by design. Two calls were put to the owner directly rather than decided on their behalf:
how to consolidate the 4 org values (rewrite, not delete), and whether a boot-time violation is a
hard `process.exit(1)` or a soft 503 (hard exit, matching D-01's literal wording). Both live-database
writes in this workstream (the consolidation itself, and creating/removing a verification account
via the new provisioning tool) were run only after an explicit go-ahead at the moment each one
executed, separate from the general plan approval.

**W-H ran with the owner present**, like W-F — D-09b's table drop is a genuinely destructive
live-database action and got its own explicit go-ahead at execution time. Unlike every prior
workstream, W-H's endpoint census (177 endpoints) was delegated to a background agent for pure,
non-destructive discovery — the agent produced evidence only; every classification, every
adjudication of the 9 ambiguous cases, and every deletion decision was made by tracing that evidence
directly, the same rigor as if the tracing had been done inline. The census's own conclusion (zero
provably-dead endpoints across all 177) held up under that scrutiny rather than being second-guessed
into finding deletions that would look more thorough — see D-39.

This file is the source of truth for the remediation. Session memory is a pointer to it, not a
substitute. If memory and this file disagree, **this file wins**.

---

## How to resume this work

1. Read this file top to bottom.
2. Read the workstream map (§3) to see what is done and what is next.
3. Read the design doc for the workstream you are starting.
4. Do not re-litigate D-01…D-16. They were decided by the owner in an interrogation phase on
   2026-08-24. Reopen one only if the code contradicts it — and say so explicitly rather than
   quietly reconciling.

---

## 1. Ground truth about the codebase

Verified against the repository, not the teardown.

- ~50 route modules, **176 endpoints**, mounted in `backend/index.js`.
- `requireAuth` is applied globally at `backend/index.js:71`.
- **Two intelligence engines run as peers:** `backend/brain/` (boot-loaded knowledge graph +
  51 analyses) and `backend/domain/derived.js` (1105 lines, reads 18 ROOT_TABLES per request,
  stamps provenance).
- `derived.js` is the strongest code in the repo and is the model for the target architecture.
  It already labels its own metrics `definitionsAreAuthored: true`.

### Confirmed defects

| # | Defect | Evidence |
|---|--------|----------|
| F-A | RBAC is decorative | `requireRole` defined at `backend/middleware/auth.js:60`, referenced in **zero** route files |
| F-B | Brain misreads criticality | `backend/brain/modules/implementations.js:72,86` treat `criticality === 'high'` as *the* critical set |
| F-C | Three competing OIS | `derived.js` `pillars.orgScore` (GI/MI/DI) vs `backend/routes/voice/voice.js:112` (`0.5·documented + 0.5·backed`, called "Organizational Intelligence Score" at line 265) vs `orchestrator.js` stored column |
| F-D | ~16 independent SPOF implementations | SPOF logic appears across 17 files with no shared module |
| F-E | No write loop | Of 176 endpoints only 4 non-auth writes exist (`avatar/check`, `selfHealing/run`, `voice/ask`, `voice/command`); **none** mutate root organizational data |
| F-F | Tenancy asserted, not enforced | `backend/lib/orgGuard.js` — no business table has an org column; 4 org values in `app_users` |
| ~~F-G~~ | **WITHDRAWN — claim was wrong.** Originally recorded as "phantom criticality reads". | The scoring functions read `.criticality` on view-model objects, and the loaders populate it correctly: `decisionIntelligence.js:45` maps `criticality: w.risk \|\| 'low'`, `:326` maps `criticality: a.risk \|\| 'low'`, and `tools.js:117` derives it from `knowledge_assets`. The original finding checked the symptom against the database schema without reading the loader. **No phantom reads exist.** Replaced by F-G′ and F-K below. |
| F-G′ | **Fabricated criticality defaults (NEW)** | `backend/routes/decisionIntelligence.js:45,326,334` coerce absent criticality to `'low'` via `\|\| 'low'`. An unmeasured asset is presented as the *safest-looking* value, so `PENALTY_CRITICAL_NO_FALLBACK` never fires for a tool with no knowledge-asset coverage. This is a direct D-07 violation and the exact failure mode the `unknown` sentinel exists to prevent. |
| F-K | **Platform criticality is last-row-wins (NEW)** | `backend/routes/tools.js:63` assigns `byPlatform[k.asset_id] = {...}` inside a loop, so a platform with several `knowledge_assets` rows takes whichever row the database happened to return last. Arbitrary and order-dependent. |
| F-H | Graph never refreshes | `loadGraph()` called once at `backend/index.js:128`. No reload path, no `loadedAt` exposed. |
| F-I | Duplicate edge representation | `dependencies` carries both `source_id/target_id` and `agent_source/agent_target` |
| F-J | Two aggregate tables already orphaned | `collaboration_scores` and `predictive_risk_scores` have **zero** consumers after W-B |

### The criticality vocabulary is four fields, not one

Verified against `backend/sql/01_schema_migration.sql`:

| Table | Field carrying the signal |
|---|---|
| `agents` | `risk` |
| `workflows` | `risk` |
| `knowledge_assets` | `criticality` |
| `dependencies` | `dependency_type` (edge-level, **not** entity-level) |
| `ai_platforms` | **none** — no criticality signal exists at all |

`derived.js` reads these correctly (`['critical','high'].includes(a.risk)` at lines 312, 514, 658).

Route files mostly resolve them correctly too, via loader functions that normalize each table's
column into a uniform `criticality` property on a view model. The problem is not *which column* they
read — it is that they **fabricate a value when the column is empty** (F-G′) and **pick arbitrarily
when several values exist** (F-K). Both are D-07 violations dressed as convenience.

The lesson, recorded because it cost a wrong finding: when a route reads `row.criticality` and the
table has no such column, **read the loader before concluding it is a bug**. The view model is
frequently not the table.

Entity criticality ("how critical is this thing") and edge `dependency_type` ("how critical is this
link") are **different concepts sharing a vocabulary**. `backend/routes/risks.js:41` filtering
`dependency_type` is correct, not a bug.

---

## 2. Decisions

### D-01 · Single-tenant; consolidate `app_users` onto one org

- **Reason:** one customer. Isolation that is not implemented must not be implied.
- **Affected:** `backend/lib/orgGuard.js`, `backend/middleware/auth.js` (`orgContext`),
  `backend/routes/auth/auth.js`, `app_users` rows.
- **Migration:** consolidate 4 org values into 1. Destructive — show the rows to the owner before
  touching them.
- **Consequence:** `orgGuard` becomes a **hard boot failure**, not a warning. Once single-tenant is
  a decision rather than a circumstance, a second org is a defect.
- Phase 4 of the original plan collapses from the largest workstream to a cleanup.

### D-02 · `pillars.orgScore` (GI/MI/DI) is the one OIS

- **Reason:** live-computed from roots, deliberately weighted, already carries provenance.
- **Affected:** `derived.js:781`, `routes/voice/voice.js:112,265`,
  `routes/intelligence/orchestrator.js`, `routes/executive/executive.js:201`.
- **Consequence:** the voice assistant's headline number **will change**. `voice.js` stops computing
  its own. The `orchestrator` stored value becomes explicitly historical or is dropped.

### D-03 · Four distinct criticality levels: critical > high > normal > low

- **Reason:** `critical` and `high` mean different things.
- **Affected:** ~20 files plus the brain.
- **Nuance (see D-06):** sites expressing *"at or above high"* are **correct**, merely untyped.
  Sites *conflating the two labels as one meaning* are wrong. Classify each of the 20 individually;
  do not mass-rewrite.
- **Consequence:** published numbers move. Accepted under D-16.

### D-04 · Write loop OUT OF SCOPE this pass

- **Reason:** truth before action.
- **Consequence, deliberately not reconciled away:** the original plan's acceptance criteria §20
  ("approved organizational actions can modify underlying state"; "changes can be verified and
  reflected in subsequent analysis") are **unreachable this pass**. They are marked DEFERRED in the
  final audit, not quietly dropped.
- **Also dormant:** `recommendations.status`, `verification_actions`, Phase 10 recommendation
  lifecycle.
- **Upside:** graph lifecycle (Phase 8) gets much cheaper — see D-14.

### D-05 · Delete `requireRole`; all authenticated users see everything

- **Reason:** single-org executive tool; role separation on a read-only surface is theatre.
- **Consequence:** deleted, not left dormant. A security primitive that protects nothing is worse
  than none, because it reads as protection. `app_users.role` survives as **UI personalization
  only** (`components/layout/Sidebar.tsx`, `app/account/page.tsx`, `lib/search.ts`) and must be
  documented as cosmetic.
- **Accepted trade-off:** any authenticated user can read named-individual judgements — per-person
  risk ratings, hero dependencies, accountability gaps by name. The owner decided this. Do not
  re-raise it.
- `/admin` is a read-only endpoint-health grid, so removing gates costs nothing there.

### D-06 · SPOF = sole owner AND no backup AND criticality ≥ high

- Dependents are **not** required. A zero-dependency critical asset **is** a SPOF.
- **Affected:** the ~16 SPOF sites, notably `brain/modules/implementations.js:86` and
  `routes/workflows/spof.js`.
- **Consequence:** SPOF counts move in both directions — up from low-dependency critical assets,
  down from well-owned high-traffic ones.
- **Interaction with D-03:** "≥ high" means `{critical, high}`. This is precisely why the
  `['critical','high']` filters scattered through the codebase are not uniformly wrong.

### D-07 · Insufficient evidence; never a fabricated number

- **Reason:** original plan §14, taken literally.
- **Consequence:** the largest **frontend** change in the programme. Every score tile, verdict
  banner, pillar card and voice response needs an evidence-absent rendering path.
- **Critical detail:** `band()` at `derived.js:79` must stop mapping absent input to `CRITICAL`.
  An unmeasured organization is not a failing one, and today's banding cannot tell those apart.

### D-08 · superseded by D-09

### D-09 · Keep genuine time-series; drop derivable aggregates

- **DROP:** `governance_assessments`, `continuity_assessments`, `dept_health_scores`,
  `collaboration_scores`, `predictive_risk_scores`.
- **KEEP**, with explicit `historical` provenance: `org_health_snapshots`, `documentation_trend`,
  `learning_snapshots`, `organizational_forecasts`.
- **Reason:** dropping everything would delete the only time-series in the system, and with no write
  loop (D-04) nothing would regenerate it. Real consumers exist: `routes/forecast/forecast.js`,
  `routes/learning/learning.js`, `routes/briefing/briefing.js`, `routes/context/context.js`,
  `routes/health/health.js`.
- **Sequencing (owner-agreed):** derive live → migrate consumers → verify equivalence → *then* drop.
  This honors original plan §10 and §17.

### D-10 · Coverage gate at 50%

- Each score declares its required inputs. Below **50%** coverage it returns
  `status: 'insufficient_evidence'` with the actual coverage figure instead of a number.
- 50% is an assumed default the owner may override.

### D-11 · OIS weights unchanged (GI 0.35 / MI 0.35 / DI 0.30), labelled authored

- `definitionsAreAuthored: true` already tells the truth about them. No change.

### D-12 · `derived.js` is the truth layer; `brain/` becomes a library beneath it

- **Consequence:** the Org Science page's cards currently run brain modules directly via
  `routes/intelligence/prediction.js`. Those become `derived.js` calls — **this is not a
  backend-only refactor**; that page is materially affected.
- The brain **keeps** the knowledge graph, entity and relationship registries, graph validation and
  the atomic swap. It **stops** being an independent publisher of product numbers.

### D-13 · Closed registration; admin provisions accounts

- Remove the public signup route and `frontend/app/signup/page.tsx`.
- **Default chosen, owner may override:** provisioning is a CLI script in `backend/tools/`, matching
  the existing `export-company.js` pattern — not a new admin screen.

### D-14 · Manual graph reload endpoint + expose `loadedAt`

- Cheapest honest option given there are no in-app writes (D-04).
- **Note:** it cannot be admin-gated, because D-05 removes role gating. A reload is idempotent and
  non-destructive, so any authenticated user triggering it is acceptable.
- Every graph-derived response carries `loadedAt`, so staleness is visible rather than silent.

### D-15 · Classify all 176 endpoints; delete only proven-dead

- Apply ACTIVE / ADMIN / INTERNAL / DISCOVERY / DEPRECATED / DEAD.
- Check the frontend, the tests **and** `backend/tools/` before removing anything.
- Deletion happens last, after the truth layer is stable.

### D-16 · "Just fix it" — no before/after accounting for moved numbers

- The owner accepted that changed figures will not get a reconciliation table.
- **Mitigation applied anyway:** each commit message names the decision (D-nn) responsible, so the
  trail exists in git even without a table.

### D-17…D-21, F-L — decided during W-D's brainstorming phase (2026-08-25)

D-02/D-09a/D-11/D-12 above did not fully resolve W-D's scope; these five close the gaps found
while tracing every route each of the four originals named. Full detail, including the
verification performed before each one, is in
[the W-D design doc](2026-08-25-w-d-truth-layer-consolidation-design.md).

- **D-17 · `orchestrator.js` and `brainCore.js`'s own weighted composites collapse onto
  `pillars.orgScore`.** Both computed an independently-weighted "Organizational Intelligence
  Score" / "Brain Index" from the same `domain.intelligence.all()` inputs D-02 already
  consolidated everything else onto — a restatement of F-C the original D-02 pass missed for two
  files. The pre-existing `brain-as-library-design.md` (§11, open question 3) had already flagged
  this pair as unresolved.
- **D-18 · The 8 Org Science cards route through `domain.graph`, not `brain/` directly.** None of
  the 8 (`pattern`/`dna`/`culture`/`maturity`/`behavior`/`benchmark`/`strategic-alignment`/
  `capability-by-dept`) has a `derived.js` equivalent — they're graph-structural, not root-table
  aggregates — so D-12's "brain stops being reached into directly" is satisfied by an
  import-path swap (`domain.graph.run` already re-exports `brain.run`), not a reimplementation.
- **D-19 · Pre-existing uncommitted WIP is reviewed and selectively absorbed.** `health.js` and
  `executive.js` already implemented D-02/D-12's shape correctly at session start, uncommitted;
  redoing them from HEAD would have produced a second, divergent fix. Files confirmed unrelated
  by diff review are left untouched.
- **D-20 · Historical provenance stamping on the 4 genuinely-frozen KEEP-list tables.** Verified
  individually — zero writers anywhere in `backend/` for `org_health_snapshots`,
  `documentation_trend`, `learning_snapshots`, `organizational_forecasts`. `executive_briefings`
  looked like a fifth by association (`briefing.js` reads it constantly) but is written daily by
  `/today`; deliberately excluded.
- **D-21 / F-L · `dept_health_scores` (D-09 DROP list) and two uncatalogued frozen tables
  (`department_exposure`, `failure_patterns`) get live `derived.js` equivalents.** Two new
  functions, kept deliberately separate: `orgHealthByDepartment` reuses `orgHealth()`'s exact
  formula partitioned by department; `departmentExposure` is a distinct, authored
  incident-exposure metric — not `continuityScore` under a new name, despite sharing input
  tables.

### D-22…D-27 — decided during W-E's brainstorming phase (2026-08-25)

D-07 and D-10 above did not fully specify how to wire `evidenceGate()` (built and tested in W-C,
zero callers before W-E) into the ~10 backend sites and ~8 frontend sites that needed it; these six
close the gaps found while tracing every score-producing route and its frontend consumers. Full
detail is in [the W-E design doc](2026-08-25-w-e-provenance-evidence-design.md) and
[plan](../plans/2026-08-25-w-e-provenance-evidence-semantics.md).

- **D-22 · Evidence gating is per-component, not just top-level.** GI/MI/DI, and each
  `derived.js` aggregate (`accountability`, `collaboration`, `orgHealth`'s five dimensions,
  `departmentExposure`, `decisionQuality`), independently declares its required inputs and gates
  on its own coverage — not one blanket gate at the top of a function.
- **D-23 · Sibling `evidence` object, not a wrapped value.** Score/rating fields keep their
  existing type (number-or-null / string-or-null); a new sibling `evidence: {sufficient, status,
  coverage, covered, total, threshold}` carries the detail. A new `combineEvidence()` helper
  (`definitions.js`) composes several named `evidenceGate()` results into one that still exposes
  this same flat shape, surfacing the worst (lowest-coverage) named gate — needed because several
  sites (GI, MI, DI, orgScore, `orgHealth`, `departmentExposure`) draw evidence from more than one
  population.
- **D-24 · The optimistic-fabrication mirror bug is in scope.** The same absence-reads-as-a-verdict
  defect exists in the opposite direction: `pillars()` GI's `violationScore` (100 on zero
  `ai_platforms`), `orgHealth()`'s `ownershipSpreadScore` (100 on zero owned agents),
  `decisionIntelligence.js`'s `calcDQI` (100 on zero decisions), and two client-side TS
  equivalents — `frontend/lib/risk.ts`'s `calculateHealthScore` and `frontend/lib/orgMemory.ts`'s
  `calcIMHS` (both 100 on an empty population). All five fixed under the same gate.
- **D-25 · `decisionQuality()`'s ad hoc `hasEvidence`/`score ?? 50` pattern is replaced by
  `evidenceGate()`.** One evidence mechanism everywhere, same principle W-C applied to
  criticality. Breaking change, accepted under D-16: a 0-decision org moves from a WEAK (50)
  rating to `insufficient_evidence`.
- **D-26 · Sentinel surfacing (`unknown` criticality, SPOF `not_evaluable`) uses the same visual
  language as score-level evidence gaps — narrowed during execution.** Tracing found
  `spofVerdict()` (built in W-C) has zero callers anywhere; `routes/workflows/spof.js` was never
  migrated onto it. That migration is D-06's affected-file list, not D-07/D-10b's, so SPOF
  `not_evaluable` UI surfacing has no live site yet and was left out of W-E rather than silently
  expanded into a D-06 migration. The `unknown` criticality sentinel (already live via
  `decisionIntelligence.js`/`tools.js` post-W-C) did not end up needing dedicated new UI wiring
  either — no confirmed live consumer renders it as a bare tier badge today.
- **D-27 · Minimal TypeScript port of `coverage()`/`evidenceGate()` for client-side scoring.**
  `frontend/lib/riskIntelligence.ts` and `orgMemory.ts` compute their own aggregate score
  client-side from raw fetched rows, bypassing `derived.js`/`domain.intelligence` entirely — the
  same bug class, living in the browser. A new `frontend/lib/evidenceGate.ts` ports just the
  population/coverage primitives (not the criticality vocabulary — nothing client-side
  reimplements SPOF). Originally scoped to four files (design doc); narrowed to two during
  planning — `knowledgeRisk.ts` and `aiToolIntelligence.ts` turned out to have no single top-level
  aggregate score to gate, only per-item tiers over already-empty-safe lists.

**Corrections found during W-E's own execution, beyond the design doc's trace:** `FivePillarsRadar.tsx`
reads the 13-module registry (explicitly narration-only per D-17/D-19, never gated) — no change
needed, contrary to the design doc's assumption. `ConcentrationRiskPanel.tsx` and
`DecisionSupportQueue.tsx` turned out to read unrelated client-side/mock logic, not `spofVerdict()`
or `dqiVerdict` respectively; the real `dqiVerdict` consumer is `DecisionHeader.tsx`. Two more direct
`calculateHealthScore` callers were found only while wiring `riskIntelligence.ts`:
`components/risk/RiskHeader.tsx` (a second, more prominent OHS gauge on `/risk` alongside
`OrgHealthBanner.tsx` — both now wired) and `components/simulation/SimulationDashboard.tsx` /
`TwinHealthIndex.tsx` (given a defensive `?? 0` fallback only, no evidence-badge UI, since neither
is a traced consumer of a published verdict for this workstream). None of these were wrong
reasoning in the design doc — the same lesson W-D recorded for D-02/D-09a/D-12: unverified
generalization from a name or an import, not individually checked, is what slips through.

### D-28…D-32 — decided during W-G's brainstorming phase (2026-08-25)

D-14 named the fix (manual reload + expose `loadedAt`) but not the full trace; these five close
what D-14 left implicit, the same way D-22…D-27 closed D-07/D-10's gaps for W-E. Full detail,
including the verification performed before each one, is in
[the W-G design doc](2026-08-25-w-g-graph-lifecycle-design.md) and
[plan](../plans/2026-08-25-w-g-graph-lifecycle.md).

- **D-28 · F-H's "no `loadedAt` exposed anywhere" was already stale the day it was written.**
  `backend/routes/intelligence/prediction.js` (the 8 Org Science cards, D-18) has sent
  `dataSource: domain.graph.source()` — which includes `loadedAt` — since W-D's D-18 migration
  commit (`f00576e`), predating this workstream entirely. The real gap was never the backend field;
  it was that `frontend/lib/api.ts`'s `IntelligenceResponse<T>` never typed `dataSource` and no
  component ever rendered it, so a value the backend had been sending for a full workstream cycle
  stayed invisible. Same mistake class as the withdrawn F-G: a claim checked against the code
  without reading what the code already did.
- **D-29 · `voice.js` / `dataset.js`'s graph path is out of scope.** `backend/domain/dataset.js`'s
  `loadOrgDataset()` is a second, independent consumer of the same graph singleton, used only by
  `voice.js`. Traced every voice route individually rather than assuming "reads the same graph →
  same fix" — all of them return a single natural-language answer (`{query, answer, confidence,
  ...}`), not a score tile or verdict, and no UI surface anywhere renders a "data as of" indicator
  for a conversational response. Revisit only if the voice UI grows a provenance panel of its own.
- **D-30 · No rate limit or de-dup on the reload endpoint.** D-14 already accepted "any
  authenticated user triggering it" as fine. Verified `loadGraph()`'s actual concurrency behavior
  (`backend/brain/index.js`): each call builds an independent graph locally and only swaps the
  shared reference in on success, so concurrent reloads cannot corrupt each other — merely
  redundant Supabase reads under heavy simultaneous use, not a realistic risk for this
  single-tenant tool. Skipped deliberately, not by omission.
- **D-31 · Two new routes on `prediction.js`, not a new mount point.** `GET
  /api/intelligence/graph/status` (cheap, no analysis run — current `isReady()`/`source()` only)
  and `POST /api/intelligence/graph/reload` (calls `domain.graph.load()`; 502 with the *previous*
  `loadedAt` still attached on failure, so a failed reload degrades to "stale but serving," never
  to "serving nothing"). Neither imports `requireRole` — global `requireAuth` already covers them,
  matching D-05.
- **D-32 · One shared banner, not eight per-card edits.** `GraphFreshnessBanner` on the Org Science
  page (the only page whose cards are graph-derived) fetches `/graph/status` once, shows relative
  time plus a Reload button, and remounts the 10-card grid via a key bump on success. Follows
  `EvidenceBadge.tsx`'s precedent (W-E) of a small, neutral, reusable status chip rather than
  inventing new visual language. `EndpointHealthGrid.tsx` gained one new pingable row for the
  status endpoint; the reload endpoint was deliberately **not** added there — an automatic
  health-check pinger silently reloading the graph on a timer is exactly the invisible side effect
  this workstream removes elsewhere.

Verified live against a running backend (not just the test suite) per §5's standing rule for
UI-observable changes: the banner rendered `Graph data as of 1m ago`, network inspection confirmed
`dataSource.loadedAt` on the wire matched it, clicking Reload advanced the timestamp to "just now"
while all 8 graph-backed cards visibly re-fetched, and `/admin`'s new Graph Status row pinged LIVE.

### D-33…D-36 — decided during W-F's brainstorming phase (2026-08-25)

D-01/D-05/D-13 named the fixes but not every gap; these four close what tracing found, the same way
every prior batch closed gaps in the decisions before it. Full detail is in
[the W-F design doc](2026-08-25-w-f-tenancy-auth-cleanup-design.md) and
[plan](../plans/2026-08-25-w-f-tenancy-auth-cleanup.md).

- **D-33 · `lib/search.ts` was never a D-05 file.** D-05's affected-file list named
  `Sidebar.tsx`, `app/account/page.tsx`, and `lib/search.ts` as needing "role is cosmetic"
  documentation. Traced individually: the first two read `useAuth()`'s auth role; `search.ts`'s only
  `role` reference is `employees[].role`, an organizational job title from the company dataset,
  never touched by `requireRole` or any auth path. Same word, two unrelated vocabularies — the log's
  own §1 already warned about exactly this pattern for criticality fields. Left untouched rather than
  given a comment the decision never actually meant for it.
- **D-34 · `provision-user.js` takes role as an explicit argument, not an env default.**
  `DEFAULT_USER_ROLE`/`ORG_SLUG` existed only inside the deleted `/register` handler and were not
  carried into the CLI tool — an admin creating an account on purpose says what it is. `org` is
  hardcoded to `'horquva'` rather than env-configurable, since D-01 leaves exactly one valid value.
- **D-35 · The `process.exit(1)` boot gate has a real, stated verification boundary.**
  `checkSingleTenant()`'s pure logic is unit-tested offline (`orgGuard.unit.test.js`). The
  `index.js` wiring that calls `process.exit(1)` on a bad result is verified by code review and a
  live happy-path check only — proving the failure path would mean deliberately reintroducing a bad
  org value into the now-consolidated production data purely to watch it crash, which is the same
  class of action W-D's own automation was correctly refused for (§5's mistakes-list, the
  `orchestrator_snapshots` `DELETE`). Recorded as a known gap rather than silently claimed as
  covered.
- **D-36 · Deleting `/register` moves its test, doesn't just delete it.** `authRoutes.test.js`'s
  registration block is replaced with the same "removed endpoint, assert 404" pattern the file
  already used for `reset-password` — proving the route is gone rather than merely that nothing
  currently calls it.

Two calls in this workstream were the owner's, made live rather than decided on the owner's behalf
(§ status line): rewriting `org` → `'horquva'` for all 5 accounts instead of deleting the 3
non-`'horquva'` stragglers, and the hard-exit boot behavior. Both live-database writes (the
consolidation UPDATE, and creating/removing a `provision-user.js` verification account) ran only
after an explicit go-ahead at the moment each one executed.

### D-37…D-40 — decided during W-H's brainstorming phase (2026-08-25)

D-09b, D-15, and F-I named the work but not every gap; these four close what tracing found — the
last batch, closing the last workstream. Full detail is in
[the W-H design doc](2026-08-25-w-h-cleanup-final-audit-design.md) and
[plan](../plans/2026-08-25-w-h-cleanup-final-audit.md); the full 177-endpoint census evidence is in
[the raw census](w-h-endpoint-census-raw.md).

- **D-37 · `governance_assessments`/`continuity_assessments` were never migrated, and don't need to
  be.** D-09's own sequencing ("derive live → migrate consumers → verify equivalence → then drop")
  was completed for 3 of the 5 DROP-list tables during W-B/W-D, but never for these two —
  `governance.js`/`continuity.js` read them live, unconditionally, on every request, frozen at seed
  time (no write loop, D-04) — the exact F-C pattern this whole remediation exists to close, missed
  by every prior workstream's affected-file list. Traced every possible consumer and found zero real
  ones (only the admin health-check ping) — so rather than building a live replacement nobody asked
  for, both route files were deleted outright as a direct consequence of D-09b dropping their only
  data source, not as a D-15 finding (D-15's own census found these two DISCOVERY/AMBIGUOUS on
  caller-count grounds alone — see D-39).
- **D-38 · F-I closed by removing the genuinely-dead half of the duplication, documenting the
  genuinely-used half.** `dependencies.js`'s `agent_source`/`agent_target` embedding computed a join
  and sent it over the wire; nothing ever read it (zero frontend references) — removed.
  `agentFails.js`'s use of the same columns is real (builds the "if this agent fails" simulation's
  impacted-agents list) and can't drift (no write path touches `dependencies`, D-04) — kept, with a
  comment explaining why it's the deliberate exception rather than an oversight.
- **D-39 · The 177-endpoint census found zero DEAD; D-15 deletes nothing on its own criterion.**
  Delegated to a background agent for pure discovery (evidence only, no verdicts), then adjudicated
  by hand: 51 ACTIVE, 20 ADMIN, 97 DISCOVERY, 9 AMBIGUOUS, 0 DEAD. Manufacturing deletions to look
  more thorough would have contradicted D-15's own conservatism ("delete only proven-dead") — every
  zero-caller endpoint found is a real, working route with a plausible manual or future use. All 9
  AMBIGUOUS cases were adjudicated individually and resolved to "leave as-is" (a recurring
  client-bypasses-server-endpoint pattern across 4 routes, `workflows/spof`'s known-pending D-06
  migration, a `self-healing/run` wiring gap, and an `auth/me` session-restoration gap) — none
  deleted. The 176-vs-177 count discrepancy the census found (W-G's two graph routes postdating when
  "176" was last written) is noted for the record, not chased further.
- **D-40 · Two real bugs found during the audit, fixed.** `index.js`'s own `/` self-description and
  the opt-in `api.smoke.test.js` both referenced 3 `/api/brain/*` endpoints that never existed (the
  brain is a library, not a service) — the self-description corrected, the test repaired with a
  login step (it had never authenticated, so it could not have passed a single check in its previous
  form) rather than deleted. `frontend/components/dashboard/RelationshipHealthStrip.tsx` called a
  route that has never existed and — checked one level further than the census's own scope — is
  itself never rendered anywhere; deleted on both ends, matching `BUILD_SPEC.md`'s own instruction
  ("write it or remove the call... don't leave it").

### D-41…D-45 — decided during W-I's brainstorming phase (2026-08-26)

Unlike every prior batch, D-41…D-45 don't close gaps in an earlier decision — W-I is a new
workstream found outside the original 16-decision interrogation, so these are its own first
decisions, not corrections to D-01…D-40. Four things independently answered "what happens if X
leaves/fails/goes down/is disrupted" and disagreed by construction: `derived.js`'s private,
unexported `dependencyIndex()`/`cascadeReach()` (real transitive BFS over the `dependencies` root
table, uncallable outside the file); `brain/modules/analytics.js`'s separate graph-based BFS (kept
deliberately distinct — see D-41); the four live `routes/simulations/*.js` endpoints, each doing a
single direct-relationship hop and stopping, each with its own unrelated severity-bucket thresholds;
and `frontend/lib/simulation.ts`, a fifth, fully independent client-side implementation that never
called any of the four backend routes. Full detail, including the corrections found during planning
and execution, is in [the W-I design doc](2026-08-26-w-i-simulation-cascade-consolidation-design.md)
and [plan](../plans/2026-08-26-w-i-simulation-cascade-consolidation.md).

- **D-41 · Export `dependencyIndex`/`cascadeReach` from `derived.js` rather than reimplementing
  cascade traversal a third time.** Additive to `module.exports`; no behavior change to existing
  callers. `analytics.js`'s separate graph-based traversal is deliberately left untouched — per D-12,
  brain modules answer graph-structural questions the graph is the right substrate for, while
  `derived.js`/`simulations.js` answer root-aggregate questions over the same underlying facts. Two
  different computations over two different data sources by design, not an unresolved duplicate.
- **D-42 · Add `agent_platform` and `workflow_dependencies` to `derived.js`'s `ROOT_TABLES`.**
  These were the two link tables `platformDown.js`/`workflowDisruption.js`/`agentFails.js` queried ad
  hoc, outside `loadRoots()`. Purely additive — `loadRoots()`'s own header comment already names this
  exact remedy ("if a future analysis needs something not in it, the honest move is to add a root");
  none of the six existing analyses that read `roots` are affected.
- **D-43 · Simulation severity is computed from `definitions.js`'s shared criticality vocabulary,
  not a sixth ad hoc bucket scheme.** New `severityFor(impactedEntities)` in
  `backend/domain/simulations.js`, built on the existing `LEVELS`/`atOrAbove` — continuing the same
  pattern D-03/D-06/W-C already established for criticality everywhere else in the codebase, in place
  of the four routes' four mutually unrelated threshold schemes.
- **D-44 · Simulated health impact is `orgHealth()` recomputed on mutated roots, not a new
  formula.** Each scenario function clones `roots`, applies a scenario-specific mutation, and reruns
  `derived.js`'s actual `orgHealth()` on the mutated copy versus baseline — the same formula the rest
  of the product already trusts, applied twice, diffed, rather than a seventh proxy formula.
  **Correction found during execution:** the first implementation had the resulting `healthDelta`'s
  sign convention backwards in the two frontend consumers (`ScenarioSandbox.tsx`,
  `SimulationUniverseRanking.tsx`) — fixed in the workstream's own final commit, not deferred.
  **Correction found during planning, beyond the design doc's original problem statement:**
  `employeeLeaves()`'s "direct hop" was not actually correct before this workstream and needed fixing,
  not just extending — the live route found "agents owned by this employee" via `employee_agent` (an
  operator/usage-role link used elsewhere for adoption metrics), not `agents.owner_id`, the actual
  ownership fact every other consumer uses. The new `employeeLeaves()` filters agents by
  `owner_id === employeeId` directly, matching `routes/ownership.js`'s existing pattern, and uses
  `owners` only for `backup_owner` enrichment. (This is the correct join `derived.js`'s
  `predictiveRisk()` gets wrong — see §4's Deferred entry; W-I fixed it locally in
  `employeeLeaves()` without touching `predictiveRisk()` itself, which stays its own workstream.)
- **D-45 · A new `GET /api/simulations/rank` bulk endpoint is added; the four single-target routes
  are kept (fixed, not removed) for entity-specific callers.** `SimulationDashboard.tsx` ranks
  everything up front — a shape none of the four single-target routes can serve without either a new
  bulk endpoint or ~65 parallel requests per page load. The single-target routes remain useful
  independently, for `voice.js` and later the AI agent, asking about one specific entity.
  **Correction found during planning:** three frontend components consume `lib/simulation.ts`, not
  one as first assumed, and `DepartureSim.tsx` turned out not to be a consumer at all (verified by
  grep). `SimulationDashboard.tsx` and `SimulationUniverseRanking.tsx` both call the bulk endpoint
  once via `page.tsx`'s shared fetch; `ScenarioSandbox.tsx` calls the matching single-target route
  per user-picked scenario. `frontend/lib/simulation.ts` becomes types-only once all three are
  repointed, matching the precedent `lib/decisionIntelligence.ts` already set.

W-I's own final whole-branch review (spanning all 13 implementation tasks across D-41…D-45) was
completed by the owner directly rather than through the usual automated multi-angle process.

---

## 3. Workstream map

Tests are **not** a separate workstream. Each workstream carries regression tests for the findings
it closes, written before the fix.

| Workstream | Scope | Decisions | Status |
|---|---|---|---|
| W-A | Auth hardening | — | **DONE** |
| W-B | Frozen intelligence → live | — | **DONE** |
| **W-C** | Canonical definitions layer | D-03, D-06, D-10, F-G′, F-K | **DONE** — 11 commits, `387bd42`…`687a659` on `ocos/develop` |
| **W-F** | Tenancy & auth cleanup | D-01, D-05, D-13, D-33, D-34, D-35, D-36 | **DONE** — 6 tasks, 11 commits, `a3acd57`…`df2edd0` on `ocos/develop` |
| **W-D** | Truth layer consolidation | D-02, D-09a, D-11, D-12, D-17, D-18, D-19, D-20, D-21, F-L | **DONE** — 16 commits, `c66d871`…`9c15daf` on `ocos/develop` |
| **W-E** | Provenance & evidence semantics | D-07, D-10b, D-22, D-23, D-24, D-25, D-26, D-27 | **DONE** — 20 commits, `2553b20`…`d5d9c7d` on `ocos/develop` |
| **W-G** | Graph lifecycle & narrative honesty | D-14, D-28, D-29, D-30, D-31, D-32 | **DONE** — 4 tasks, 6 commits, `c0dd891`…`9b0f641` on `ocos/develop` |
| **W-H** | Cleanup & final audit | D-09b, D-15, F-I, D-37, D-38, D-39, D-40 | **DONE** — 5 tasks, 8 commits, `4430ace`…`8108669` on `ocos/develop` |
| **W-I** | Simulation cascade & ranking consolidation | D-41, D-42, D-43, D-44, D-45 | **DONE** — 13 tasks, 25 commits, `6e475f4`…`47ab0a8` on `ocos/develop` |
| **W-J** | Authored entities migration to Supabase | D-46, D-47, D-48, D-49, D-50, D-51 | **DONE** — 7 tasks, 12 commits, `579df7a`…`ed827b1` on `ocos/develop` |
| **W-K** | Frontend intelligence migration | D-52, D-53, D-54, D-55, D-56, D-57, D-58, D-59, D-60, D-61, D-62, D-63, D-64, D-65 | **DONE** — Phase 1-3 done (D-52…D-56); Phase 4: D-57 done (`4fe155e`), D-58 done (`09fec14`), D-59 done (`14b8b87`), D-60 done (`d20132b`), D-61 done (`149f2e3`), D-62 done (`550d14f`), D-63 done (`c7f0e50`, rescoped smaller), D-64 closed with no code change, D-65 done (`2e356b5`, found while starting D-61), see [design doc](2026-08-26-w-k-frontend-intelligence-migration-design.md) |

W-C is done: every downstream workstream now has one module to consume
(`backend/domain/definitions.js`) instead of ~16 independent SPOF implementations and 20
criticality filters. Its artifacts are the quality template for every workstream after it — see §5.

W-F remains genuinely independent and may run whenever, in any order relative to W-D onward.

---

## 4. Deferred, with reasons

| Item | Why | Revisit when |
|---|---|---|
| Write/action loop (Phases 9–10) | D-04 | W-E is done; owner decides when to start this |
| Acceptance criteria §20 items 8–9 | unreachable without the write loop | with the write loop |
| Recommendation lifecycle | depends on the write loop | with the write loop |
| `verification_actions` table | dormant, no writer | with the write loop |
| Multi-tenancy | D-01 chose single-tenant | if a second customer appears |
| OIS weight recalibration | D-11 kept them authored | if the owner wants measured weights |
| `routes/workflows/spof.js` migration onto `spofVerdict()` — **found 2026-08-26 to be blocked, not just undone.** `workflow_runbooks` (`backend/sql/01_schema_migration.sql:200-206`) has no backup-owner column at all — backup coverage isn't a measured concept for workflow runbooks the way it is for agent ownership. Calling `spofVerdict()` with a hardcoded `hasBackup: false` would misrepresent "not applicable" as "measured false," the exact fabricated-signal failure D-07's `unknown` sentinel exists to prevent. `routes/workflows/spof.js`'s own multi-reason logic (single tool / single agent / human SPOF failure) answers a genuinely different question — workflow structural fragility, not agent-ownership backup coverage — and is left as-is | if a backup concept is ever added to `workflow_runbooks`, or a decision is made that "not applicable" should map to a specific `spofVerdict()` outcome rather than blocking the migration |
| ~~`derived.js`'s `predictiveRisk()` joins `agent.owner_id` against `owners.id` instead of `employees.id`~~ — **resolved 2026-08-26** (commit `d117d44`), as a prerequisite to repointing the frontend's per-agent risk score onto this function — building on a confirmed-broken formula would have just swapped one wrong number for another. Fixed by resolving the owner via `employees` directly (matching `routes/ownership.js`'s established pattern) with an `owners`-table name fallback; the test fixture embodied the identical bug and was corrected alongside. `filterRootsByDepartment()`'s own doc comment (§7) documents the same `owner_id -> owners.employee_id` chain — **not yet checked or fixed**, still open | `orgHealthByDepartment`/`departmentExposure` still need the same check `predictiveRisk()` just got |
| ~~SPOF definition unification (backend)~~ — **resolved 2026-08-26, no owner decision was actually needed.** `definitions.js`'s `spofVerdict()` was already the canonical definition per D-06 (decided 2026-08-24) — the original "three disagreeing definitions" finding undersold it, and a first pass wrongly excluded `analytics.js` by false analogy to D-12's graph/root split. Corrected on closer check: `analytics.js`'s `singlePointsOfFailure()` was presented to users under the same plain "SPOF" label (via `M03` and other brain modules) with a materially different, undisclosed rule (`dependents>=1 && owners<=1`, no backup/criticality check at all) — a real conflict, not a legitimate specialization; the graph already carried everything `spofVerdict()` needs (criticality on the `owns` edge, backup via the owner entity's `metadata.backup_owner`), so it's fixed the same way (commit `c3e7a46`). `routes/risks.js` (commit `4c08eab`) and `routes/dependencies.js`'s `/agent-spofs` (commit `4ecda6e`, which also stopped conflating the SPOF verdict with blast-radius size) are fixed too. `routes/workflows/spof.js` remains separately blocked, see above, for a different reason (no backup concept in its schema, not a definitional disagreement). **Frontend still has its own live 4th implementation**, see the new row below | backend closed; frontend row below is the remainder |
| ~~`frontend/lib/graph.ts`'s `getSPOFs()` — a 4th SPOF implementation~~ — **resolved 2026-08-26.** The user-facing consumer, `frontend/lib/riskIntelligence.ts` (drives the `/risk` page's SPOF badges), now fetches `/api/dependencies/agent-spofs` (canonical `spofVerdict()`) instead of calling `getSPOFs()` locally (commit `aef3109`). `getSPOFs()` itself is deliberately left in `lib/graph.ts` — its only remaining caller, `ScenarioSandbox.tsx`, uses it purely to pick which agent to demo-fail, never asserts it to the user as a SPOF verdict, so it doesn't need the canonical definition. **SPOF unification is now fully closed, backend and frontend both.** | closed |
| ~~Ownership-concentration definition~~ — **resolved 2026-08-26: not actually a duplication.** The original "four disagreeing formulas" finding was the same mistake the SPOF finding first made (assuming similar-sounding metrics are the same claim without checking): `routes/ownership.js`'s per-owner absolute-count badge, `analytics.js`'s M30 org-wide top-owner-share ratio, `collaboration()`'s `dependencyScore` (backup-weighted personal bus-factor risk feeding the GI/MI pillar), and `orgHealth()`'s `ownershipSpreadScore` (a health-composite sub-dimension) answer four genuinely different questions for four different product surfaces, at different granularities (per-owner vs org-wide vs per-employee), with no shared user-facing label to collide under. `frontend/components/ownership/ConcentrationBar.tsx` (checked too) is a raw display chart, not a fifth competing score. No unification would improve this — it would destroy information each surface actually needs. No code change made | closed |
| ~~Frontend risk/health-score client-side recomputation~~ — **mechanical part resolved 2026-08-26.** `/risk` (SPOF + `predictedScore` + org health, 2 commits), `/ownership`'s `HumanDependencyRisks.tsx`, `/simulation`'s `TwinHealthIndex.tsx`, and `/recommendations`' `generateRecommendations()` all now consume backend values instead of `lib/risk.ts`'s `deriveRiskScore()`/`calculateHealthScore()` (commit `7403ae3`). `deriveRisk()` (a per-agent tier helper, not part of the original finding) was left alone | closed for risk score/org health; `lib/knowledgeRisk.ts`/`lib/aiToolIntelligence.ts` remain, see new row below |
| `lib/knowledgeRisk.ts` / `lib/aiToolIntelligence.ts` have no backend score to repoint to | found 2026-08-26 while closing out the row above: unlike risk score/org health, no backend endpoint computes a knowledge-concentration or per-tool risk score at all — `toolIntelligence.js` returns raw facts (hasBackup/hasPolicy/isCritical) with no score. Fixing these means designing new backend scoring logic (thresholds, weights), which needs an owner decision the same way D-11 needed one for pillar weights — not a repoint | when the owner is ready to define what these two scores should mean |
| ~~`agent_platform`/`workflow_tool_dependencies` represented as metadata, not graph edges~~ — **checked 2026-08-26, was already false.** Raised as a concern the same night; `graphLoader.js` already creates real `depends_on` edges for both (its own comment at lines 117-120 explicitly defends this), and generic `dependents()`/`dependencies()` already traverse them since they're ordinary `depends_on` relationships. Likely fixed in an earlier workstream (W-B or W-G) and the concern was stale. Locked in with a new regression test (commit `d5de757`) rather than left as a one-time read of the code | closed |
| ~~Ontology has empty `system`/`team`/`customer`/`process`/`project` entity types~~ — **3 of 5 wired 2026-08-26** (commit `5763d56`). `data/company.json`'s hand-authored `systems` (4, with real inter-system `depends_on` chains), `processes` (2, RACI accountable/responsible), and `external_entities` (10, split into `vendor`/`customer` by their own `kind` field) are now loaded into the graph — real data, not fabricated. `system` and `process` were already in `analytics.js`'s `ASSET_TYPES`, so SPOF/ownership-coverage analyses now see them instead of silently reading "none". **`team` and `project` have no data source anywhere**, seeded or hand-authored — inventing one would violate D-07 | `team`/`project` stay empty until a real data source exists; nothing to revisit until then |

---

## 5. Process notes (this remediation is complete — kept as a record for the next remediation-style effort)

Each workstream from here on runs in its **own fresh session** — no shared conversation memory with
W-C, W-D, or W-E. This section is what carried W-C's rigor into W-D and then W-E with nothing but
this file — three data points now, not two. Match it; don't skip steps because "the decisions are
already made."

**The sequence that produced W-C, W-D, and W-E, in order:**

1. **Brainstorming skill, architectural path.** Repo exploration first — actual file reads and greps,
   not assumptions from the teardown or from this log. Then batched questions to the owner (4 at a
   time), each answer restated as a Decision with Reason/Affected/Migration/Consequence before moving
   on. This is where D-01…D-16 (W-C) and D-17…D-21/F-L (W-D) came from and why they're trustworthy.
   **W-D's addition:** even when the prior workstream's decisions name the affected files, trace
   every one individually before trusting the list — D-02/D-09a/D-12 named files and tables that
   turned out incomplete (a 4th OIS in `brainCore.js` D-02 never mentioned; `dept_health_scores` and
   `department_exposure`, two frozen tables D-09's DROP/KEEP lists never catalogued;
   `executive_briefings`, which looked like a 5th KEEP-list table by association but is written
   daily). None of these were wrong reasoning, just unverified generalization — checking each item
   individually instead of extrapolating from a pattern is what caught them.
   **W-E's addition:** the same discipline applies to frontend consumers, not just backend files
   and tables — a component *importing* a function is not the same as a component *rendering its
   published verdict*. `FivePillarsRadar.tsx` imports from the same intelligence surface but reads
   the narration-only 13-module registry, not a gated score; `ConcentrationRiskPanel.tsx` and
   `DecisionSupportQueue.tsx` looked like SPOF/DQI consumers by name and page placement but read
   unrelated client-side mock logic. Two more real consumers (`components/risk/RiskHeader.tsx`,
   `components/simulation/SimulationDashboard.tsx`/`TwinHealthIndex.tsx`) were found only while
   wiring a sibling file, not during the design doc's own frontend grep — `grep`ing for a function
   name finds every *caller*; it does not tell you which callers are *published verdicts* worth
   gating versus internal plumbing safe to leave with a defensive fallback. Check each render site
   individually, the same as every backend table.
2. **Design doc** (`docs/superpowers/specs/YYYY-MM-DD-w-x-*-design.md`), committed before any plan
   exists.
3. **writing-plans skill** against that design. Every task gets the actual test code and
   implementation code written out — no "add appropriate handling" placeholders. This is what let
   execution be mechanical instead of another round of judgment calls.
4. **Inline execution, task by task:** red (verify the test fails for the right reason) → green →
   full-suite check (`node tests/run-all.js`) → commit. Never batch multiple tasks into one commit.
   **W-D's addition:** for changes only observable through a running server (a route reading
   `domain.intelligence.all()` instead of computing its own value), the full-suite check alone does
   not prove the wiring is correct — this codebase has no automated HTTP-level test in the default
   suite. Start a local server on a scratch port, log in via the `ADMIN_EMAIL`/`ADMIN_PASSWORD` env
   fallback, and `curl` the changed endpoint against a value read directly from the same domain
   function in a `node -e` snippet. **Restart the server after every code change you're about to
   verify** — Node does not hot-reload, and a stale process will silently serve the old computation
   (caught twice during W-D: once each for `brainCore.js` and `prediction.js`).
   **W-E's addition:** this extends to frontend UI changes claimed complete. `tsc --noEmit` proves
   the types are consistent; it does not prove the component renders correctly. Start both dev
   servers (`.claude/launch.json` has `backend`/`frontend` entries with `autoPort` — another
   session's server on the default port is common and should not be reused or killed), log in
   through the actual UI form with the real `ADMIN_EMAIL`/`ADMIN_PASSWORD` already in `backend/.env`
   (no need to invent scratch credentials — they're already there), and read the rendered page text
   plus console/network logs. If the frontend's `NEXT_PUBLIC_API_URL` (`.env.local`) points at a
   port your own backend instance isn't running on, retarget it and restart the frontend dev
   server for the env change to take effect — then put it back afterward, since `.env.local` is
   gitignored local config, not something a workstream's commits should touch. A cached daily
   snapshot (`orchestrator_snapshots`) will read stale in the browser exactly as it does over curl;
   the "always live" sibling route (`/modules` alongside `/summary`) or a direct `node -e` call
   against the same domain function is the way to see current behavior, matching W-D's stale-cache
   note below.

**Mistakes made and corrected — don't repeat them:**

- **A finding (F-G, W-C) was wrong** because it checked a route's `row.criticality` read against the
  database schema without reading the *loader* that populates that property. The loader normalized
  it correctly; the schema check alone produced a false bug report. **Before calling any
  `row.<field>` read a bug, trace it to the function that builds that row.** This cost a withdrawal
  and a corrected pair of findings (F-G′, F-K) — cheaper to just check first.
- **`git add <file>` is not safe in this repo right now.** Several files carry substantial
  *pre-existing uncommitted work* unrelated to any workstream — visible in `git status` before you
  touch anything. As of the end of W-E, that's `governance.js`, `memory.js`, `orchestration.js`,
  `gateCheck.js`, `knowledge/gaps.js`, `knowledge/impact.js`, `index.js`, `middleware/auth.js`,
  `auth/auth.js`, `.env.example`, `schema.sql`, `.claude/launch.json`, `constitutional-modules.js`,
  `employeeLeaves.js`, `platformDown.js`, and a command-bar/deep-link frontend feature
  (`GlobalSearchOverlay.tsx`, `DependencyEvolutionTab.tsx`, `SignalDrilldown.tsx`, `CommandBar.tsx`,
  `DeepLinkFocus.tsx`, `commandIndex.ts`, `focusTarget.ts`, `globals.css`,
  `recommendations/page.tsx`, `GlobalPanelsContext.tsx`, `AppShell.tsx`, `notifications.ts`,
  `package.json`) — check `git status --short` fresh each session, this list will have moved.
  (`voice.js`, `health.js`, `learning.js`, `forecast.js`, `briefing.js` carried WIP through W-C but
  were fully absorbed or finished during W-D — they're clean now. W-E touched none of the files on
  this list — confirmed by a final `git status --short` diff against the session-start snapshot
  before its last commit.) A directory-wide or whole-file `git add` will bundle
  unrelated work into your commit. Before staging a file that was already modified at session start:
  `git diff <file>` first. If it's larger than your own edit, isolate your change against
  `git show HEAD:<file>` (reconstruct a clean version containing only your edit, stage that, commit,
  then restore the working tree to the full pre-existing-plus-your-edit content) rather than
  committing the mixture — or, simpler and what W-D actually did: commit the unrelated WIP alone
  first (its own commit, naming it as pre-existing and unrelated), *then* make your own edit on top
  and commit that separately. `git status --short` before every commit, always.
- **A destructive action on live data will be blocked, and should be.** W-D's own automation tried to
  `DELETE` a stale cached row in `orchestrator_snapshots` to make a manual verification check read
  cleanly *right now* instead of after the next cache miss. The permission classifier correctly
  refused it — a routine verification step is not grounds for mutating a live table. If a live-server
  checkpoint would read stale for a reason the design already anticipated (a daily cache, in this
  case), find another route that bypasses the cache rather than clearing it.

**Standing constraints that don't change per workstream:**

- No test framework in `backend/` — hand-rolled `node` scripts with a local `check()` helper. Follow
  `backend/tests/definitions.unit.test.js` as the template.
- `backend/domain/definitions.js` is pure (no I/O) and is now the dependency every score-producing
  file should route through — don't reintroduce a parallel definition of criticality, SPOF, or
  coverage anywhere. As of W-D, `backend/domain/derived.js`'s `pillars.orgScore` is the same for
  "the one Organizational Intelligence Score" — don't reintroduce a second weighted composite either.
  As of W-E, `evidenceGate()`/`combineEvidence()` (also in `definitions.js`) are the one evidence
  mechanism — don't reintroduce a second ad hoc "is there enough data" check. The one narrow,
  deliberate exception is `frontend/lib/evidenceGate.ts`, a hand-kept TypeScript port that exists
  only because there is no shared runtime between `backend/` and `frontend/`; the two must be kept
  in sync by hand if the 50% threshold or the coverage formula ever changes.
- Commit messages name the responsible decision (`D-nn`, `F-nn`) — this is the compensating control
  for D-16 (no before/after reconciliation table).
- Threshold-class retyping (behavior-preserving) and bug fixes (behavior-changing) never share a
  commit — otherwise a real regression hides in a wall of no-op renames.

**Quality bar, concretely:** the finished [W-C plan](../plans/2026-08-24-w-c-canonical-definitions.md)
(11 commits, `387bd42`…`687a659`), [W-D plan](../plans/2026-08-25-w-d-truth-layer-consolidation.md)
(16 commits, `c66d871`…`9c15daf`), [W-E plan](../plans/2026-08-25-w-e-provenance-evidence-semantics.md)
(19 tasks, 20 commits, `2553b20`…`d5d9c7d`), [W-G plan](../plans/2026-08-25-w-g-graph-lifecycle.md)
(4 tasks, 6 commits, `c0dd891`…`9b0f641`), [W-F plan](../plans/2026-08-25-w-f-tenancy-auth-cleanup.md)
(6 tasks, 11 commits, `a3acd57`…`df2edd0`), and [W-H plan](../plans/2026-08-25-w-h-cleanup-final-audit.md)
(5 tasks, 8 commits, `4430ace`…`8108669`), all on `ocos/develop`, are the reference. If a future
workstream's design doc, plan, or commit history looks thinner than these — fewer regression tests,
vaguer task steps, batched commits, no live-server verification for route-wiring or frontend UI
changes — that's the signal quality slipped, not that the work was faster.

**W-G's addition:** a workstream can run entirely unattended under explicit owner delegation
without lowering the bar — the questioning phase became "trace the code and decide as the owner
would," not "skip deciding." The tell that this held: D-28 corrected a finding using the exact same
method F-G's withdrawal established (read the code the claim is about before trusting the claim),
found independently in a fresh session with no memory of F-G ever happening. When a workstream runs
unattended, say so explicitly in the log (§'s opening Status line) rather than leaving it
indistinguishable from a normal live session — a decision made without the owner in the room is a
different kind of decision than one they weighed in on, even when it turns out to be the same
answer.

**W-F's addition:** the reverse case — a workstream whose own decision (D-01) is explicitly
owner-gated needs its own explicit go-ahead at the moment the gated action runs, separate from the
general "here's the plan, go" approval that started the session. General approval covers writing
code; it does not retroactively cover a specific destructive database write the design doc itself
flagged as needing the owner's eyes first. Two such moments came up here — the org-consolidation
UPDATE and, unplanned, a verification account the live-check step created and then had to ask
whether to remove — and both got their own confirmation rather than being folded into the earlier
yes. The unplanned one is the more useful lesson: a "verify live" step that writes to a real table
is itself a decision point the plan should flag in advance, not one to notice only after the write
already happened.

**W-H's addition, closing the remediation:** a conservative deletion criterion is only trustworthy
if it's allowed to conclude "delete nothing." D-15 said "delete only proven-dead"; the honest result
of actually checking all 177 endpoints was zero DEAD, and the temptation — never acted on — was to
quietly loosen the bar so a "final audit" would have more to show for itself. It didn't; the 97
DISCOVERY-classified, real-but-uncalled routes stayed exactly as they were. The one large batch of
deletions that did happen (`governance.js`/`continuity.js`, 10 endpoints) came from a different,
stronger justification entirely — their data source disappearing under D-09b, not their caller count
— and D-37/D-39 are careful to say so explicitly rather than let the two get blurred together after
the fact. Delegating the census itself to a background agent worked because the delegation was
scoped to *discovery*, not *judgment* — the agent was explicitly told to flag ambiguity rather than
resolve it, and every one of its 9 flagged cases still got traced and decided by hand before this
file called any of them closed. That boundary — an agent may gather evidence at scale; a human (or
this workstream's own reasoning, held to the same standard) still weighs it — is the one process note
from eight workstreams worth carrying into whatever comes after this remediation.
