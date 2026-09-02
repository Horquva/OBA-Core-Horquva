# W-E — Provenance & Evidence Semantics

Date: 2026-08-25
Status: design approved by owner. Decisions D-07, D-10 (from the
[remediation decision log](2026-08-24-oba-remediation-decision-log.md)) plus D-22…D-27 below
(decided during this workstream's brainstorming phase). No code changed yet.

Follows W-A, W-B, W-C (canonical definitions layer), W-D (truth layer consolidation), all landed.
Read the decision log in full, including its §5 process notes, before resuming this work in a new
session.

---

## 1. The problem this solves

`backend/domain/definitions.js`'s `evidenceGate()` was built and unit-tested in W-C. It has zero
callers outside its own test file. The gate exists; nothing asks it anything yet.

Without it, every score-producing function that bands a computed number reads an **empty or
near-empty population as a specific, false verdict** instead of "unmeasured":

- `derived.js`'s `band()` (`< 40` → `'CRITICAL'`) is the literal target named in D-07. Confirmed
  live: an organization with zero rows in `accountability_entities` computes
  `accountabilityScore = 0` → `'CRITICAL'`. A fully empty database drives `pillars().orgScore` to
  ~12 → `'CRITICAL'` — the number `orchestrator.js /summary` publishes as the headline
  Organizational Intelligence Score, the one `VerdictBanner.tsx` renders.
- The same absence sometimes reads as the **opposite** false verdict. `pillars()` GI's
  `violationScore` defaults to 100 when `ai_platforms` is empty ("no platforms recorded" reads as
  "perfect, zero violations"); `orgHealth()`'s `ownershipSpreadScore` does the same when no agent
  has an owner; `decisionIntelligence.js`'s `calcDQI` returns 100 with zero decisions, banding to
  `'STRONG'`.
- The bug isn't confined to `derived.js`. `routes/truth/truth.js`'s `/summary` computes its own
  `trustStatus` (`TRUSTED`/`PARTIAL`/`UNTRUSTED`) directly from `truth_claims`, independently of
  `band()` and of `domain.intelligence`. Zero claims recorded reads as `'UNTRUSTED'` — same defect,
  different file, never routed through the mechanism W-C built.
- It also exists **client-side**. `frontend/lib/riskIntelligence.ts`, `orgMemory.ts`,
  `knowledgeRisk.ts`, and `aiToolIntelligence.ts` each fetch raw rows and run their own tiering
  logic in the browser — a parallel, un-gated scoring layer with no TypeScript equivalent of
  `evidenceGate()` to call.

D-07's own text anticipates the scale of the fix ("the largest frontend change in the programme")
but the decision log does not enumerate the sites — that enumeration, and the several scope
questions it raised, is this workstream's brainstorming output, recorded as D-22…D-27 below.

## 2. What gets built

### 2.1 Mechanism: gate before banding, not inside `band()`

`band()` itself does not change. Given a genuinely-computed low score with sufficient evidence
behind it, `'CRITICAL'` is the correct label — the defect is only in presenting a **manufactured**
score as if it were genuine. The fix sits at each call site, before `band()` runs:

```js
const gate = evidenceGate(rows, hasField)   // already built, W-C
const result = gate.sufficient
  ? { score, rating: band(score), evidence: gate }
  : { score: null, rating: null, evidence: gate }
```

`evidence` is `evidenceGate()`'s own return shape verbatim: `{status, coverage, covered, total,
threshold}`. No new shape to design — D-23 is "pass it through," not "redesign it."

**What `hasField` means, precisely.** `coverage()` measures what fraction of a population has the
*underlying fact recorded*, not the fact's *value*. For GI's `runbookCoverage`, the question is not
"is this workflow's runbook documented" (that's `is_documented`, the metric itself) but "does a
`workflow_runbooks` row exist for this workflow at all" (was it ever assessed). Conflating the two
would make "assessed and found non-compliant" indistinguishable from "never assessed" — exactly the
conflation D-07 exists to remove. Each site's `hasField` predicate is therefore a per-score design
decision, not a mechanical template; the plan defines each one individually.

**Two distinct absence patterns, and which gate applies:**

1. **Empty population** (`total === 0`) — no rows exist to measure at all.
   `evidenceGate()` already returns `sufficient: false` unconditionally here (an empty population
   can't clear any coverage ratio by construction, per `definitions.js`'s own docstring). This
   alone is the whole fix for scores where "zero" is otherwise a legitimate, real answer —
   collaboration's `aiAdoptionScore`, for instance: zero employees actually recorded as touching AI
   tools is a real "MINIMAL" verdict, not a data gap, and the only failure mode is zero employees
   existing to check at all.
2. **Low-coverage population** (`total > 0`, most rows lack the field) — rows exist but the
   specific fact the score needs is largely unrecorded on them. This is where the 50% ratio (D-10)
   does real work: `accountability_entities` may all exist, but if fewer than half carry any RACI
   link, the accountability score is guesswork, not a measurement. GI's `runbookCoverage`,
   `knowledge_assets.criticality` population, and `truth_claims`-backed scores are this pattern.

Distinguishing which pattern applies to a given score, and picking the right `hasField`, is exactly
the kind of per-site judgment call the plan documents explicitly rather than templating away.

### 2.2 Backend sites (D-22: gated per-component, not just at the top)

| Function | Existing `band()`/verdict call(s) | Gate population | `hasField` |
|---|---|---|---|
| `accountability()` | per-entity `status` (line 230), aggregate `status` (244) | `accountability_entities` | entity has ≥1 `accountability_links` row (`responsible` or `accountable`) |
| `collaboration()` | `adoptionLevel`, `dependencyLevel`, `collaborationLevel` (388/394/398) | `employees` | population-empty check only, per §2.1 pattern 1 — these three are legitimate zeros, not gaps |
| `pillars()` GI | `rating` (847) | three sub-gates: `workflows` (has a `workflow_runbooks` row), `ai_platforms` (has an active `tool_policies` row) — `violationScore` folds into the `ai_platforms` gate (D-24) | — |
| `pillars()` MI | `rating` (847) | `owners` (has `backup_owner` recorded either way — presence of the column being set, not its value) and `knowledge_assets` (has an `owner_id`); accountability sub-score inherits `accountability()`'s own gate | — |
| `pillars()` DI | `rating` (847) | `knowledge_assets` (`is_documented` recorded), `truth_claims` (has a `verdict`) | — |
| `pillars()` `orgScore` | `rating` (867) | insufficient if **any** of GI/MI/DI is insufficient — the weighted composite can't be more trustworthy than its worst input | — |
| `decisionQuality()` | `rating` (908) | `decision_history` | has a non-null `outcome` (replaces the existing ad hoc `score ?? 50`/`hasEvidence` pair — D-25) |
| `orgHealth()` | inline `healthStatus` ternary (993, not `band()` — same bug, different banding call, in scope regardless) | five sub-gates, one per dimension (`knowledge_assets`, `workflow_runbooks`+`workflows`, owned-agents population for `ownershipSpreadScore` — D-24, `agents` for `criticalSafetyScore`, `workflows`+`workflow_failures` for `incidentLoadScore`) | per-dimension, mirroring GI/MI/DI's approach |
| `orgHealthByDepartment()` | reuses `orgHealth()` | same five, scoped to `filterRootsByDepartment()`'s output | same |
| `departmentExposure()` | `incidentRiskLevel` (1129) | per-department: `knowledge_assets`, `owners`, `workflows`+`workflow_failures` | same pattern as `orgHealth` |
| `routes/truth/truth.js` `/summary` | inline `trustStatus` ternary (line ~149) | `truth_claims` | has a `verdict` |
| `routes/decisionIntelligence.js` | `dqiVerdict` (line 358) | `decisions` (the route's own merged agents+workflows+tools list) | population-empty check (D-24 — `calcDQI`'s `return 100` on empty is the optimistic-fabrication bug here) |

This table is what tracing every score-producing route individually (per the decision log's
standing instruction) actually turned up. It is not guaranteed exhaustive — `backend/routes/`
has ~50 files — but every site found by grepping for `band(`, threshold ternaries
(`>= N ? 'LABEL' :`), and `domain.intelligence.all()`/`.compute.*` call sites across the whole
`routes/` tree is listed above. The plan re-runs this sweep before writing tasks, per W-C/W-D's own
practice of not trusting a prior pass's list without re-checking it.

**Not affected:** `predictiveRisk()`'s per-agent `threatLevel()` already defaults absence to
`'LOW'` (the safe direction) via its own thresholds, not `band()`, and doesn't aggregate to a
single published verdict the way the others do — no change needed there. SPOF's `spofVerdict()`
already returns `not_evaluable` rather than fabricating (built in W-C); it needs UI surfacing
(§2.4), not backend rework.

### 2.3 Frontend: one shared component, wired everywhere a gated score renders

A single component, `frontend/components/ui/EvidenceBadge.tsx` (alongside the existing
`RiskBadge.tsx` in the same directory, matching that convention), renders the neutral "insufficient
evidence" state: a grey/neutral badge plus the coverage figure (`"3 of 12 tracked — 25%"`), reading
directly off an `evidence: {status, coverage, covered, total}` prop. Every component that currently
renders a `.rating`/`.score`/`.healthStatus`/CRITICAL-style field from a now-gated backend response
checks `evidence?.status === 'insufficient_evidence'` first and renders `<EvidenceBadge>` instead of
its normal score UI.

The ~35 files found reading these fields (via grep for `rating`, `healthStatus`,
`accountabilityScore`, `CRITICAL`, etc.) span confirmed direct consumers of the gated routes
(`VerdictBanner.tsx`, `FivePillarsRadar.tsx`, `OrgHealthBanner.tsx` — see §2.5, `DecisionSupportQueue.tsx`
reading `decisionIntelligence.js`'s `dqiVerdict`) and files reached indirectly through
`frontend/lib/*.ts` wrapper functions. The plan traces each individually, the way W-D traced its six
backend files — some may already degrade acceptably on `null` and need only the badge; others build
their own fallback strings that need removing so they don't fight the new badge.

### 2.4 Sentinel surfacing (D-26): `unknown`/`not_evaluable` get the same visual language

`definitions.js`'s `UNKNOWN` criticality (surfaced today by `decisionIntelligence.js` and
`tools.js`, post-W-C) and `spofVerdict()`'s `not_evaluable` status are the same underlying idea as
`insufficient_evidence` — "we don't have enough signal to say" — at entity level instead of
aggregate-score level. `EvidenceBadge` (or a small variant reading a `criticality: 'unknown'` /
`status: 'not_evaluable'` prop instead of an `evidence` object) gets used wherever these render
today, likely currently falling through to a falsy/blank/lowest-tier display. Confirmed consumer:
`ConcentrationRiskPanel.tsx` (SPOF `riskTier`); the plan traces the rest.

### 2.5 Client-side scoring layer (D-27): minimal TypeScript evidence gate

`frontend/lib/riskIntelligence.ts` (consumed by `app/risk/page.tsx`), `orgMemory.ts`
(`app/memory/page.tsx`), `knowledgeRisk.ts` (`app/knowledge/page.tsx`), and
`aiToolIntelligence.ts` (`app/ai-tools/page.tsx`) each compute a report object client-side from raw
fetched rows, with their own ad hoc absence handling (`riskIntelligence.ts` and `orgMemory.ts` read
low-score-on-absence as `CRITICAL`; `knowledgeRisk.ts`'s `tier()` defaults empty to `LOW`) and no
gate at all.

A new `frontend/lib/evidenceGate.ts` ports just the population/coverage primitives —
`coverage(rows, hasField)` and `evidenceGate(rows, hasField, opts)` — from `definitions.js`. It does
**not** need the criticality vocabulary (`LEVELS`/`RANK`/`atOrAbove`/`spofVerdict`); these four files
never reimplement that, only score aggregation. Each of the four `computeX()` functions gets an
`evidence` field on its returned report, gated the same way as the equivalent backend score where
one exists (`riskIntelligence.ts`'s `organizationalHealthScore` mirrors `orgHealth()`'s shape
closely enough to reuse the same per-dimension gating approach), and a population-empty check
elsewhere. The four `page.tsx` consumers render `<EvidenceBadge>` the same way the backend-driven
components do.

## 3. Verification performed before writing this design

- **`evidenceGate` caller grep**, whole repo: zero non-test callers. Confirmed the gate is built and
  tested but entirely unwired, matching the prompt's framing.
- **`band(` call-site grep**, `backend/domain/derived.js`: 9 call sites, all traced above (§2.2
  table) to the function and line producing the value passed in.
- **Threshold-ternary grep**, `>= N ? 'LABEL' : ...` pattern, across `backend/routes/`: found
  `decisionIntelligence.js:358` and `signals.js:56` beyond `derived.js`. `signals.js`'s
  `impactWeight` (`prs.predictedScore >= 70 ? 'HIGH' : 'MEDIUM'`) reads `predictiveRisk()`'s
  per-agent score, which is never a fabricated-from-absence number (agents that exist always have
  real per-factor inputs; an agent with zero risk factors genuinely scores 0, correctly banded
  `LOW/MEDIUM`) — not in scope, no defect present.
- **`domain.intelligence.all()`/`.compute.*` caller grep**: ~20 route files (listed in §2.2's
  discussion, full list in the exploration transcript) confirmed as consumers of gated
  `derived.js` functions; none of them recompute their own composite from `intel.*` fields in a way
  that would need a *second* gate beyond passing the `evidence` field through.
- **`frontend/lib/*.ts` compute-function grep**: confirmed exactly four files
  (`riskIntelligence.ts`, `orgMemory.ts`, `knowledgeRisk.ts`, `aiToolIntelligence.ts`) export a
  `computeX()` doing client-side aggregation; each has exactly one `page.tsx` consumer (verified via
  grep for each function name), not a fan-out to multiple pages.
- **`truth.js` cross-check against `derived.js`'s DI pillar**: both independently compute
  `verified/total` over `truth_claims`. Confirmed these are legitimately different products (a
  Truth Report page's own trust figure vs. a DI sub-component) per D-02's boundary — D-02
  consolidated "the one OIS," not every score that happens to read the same table — so this is a
  same-bug-class site to gate individually (§2.2), not an undiscovered F-C-style duplicate needing
  its own consolidation decision.
- **`orchestrator.js`'s `computeTrustScore` cross-check**: reads the 13-module registry's
  verified/score ratio, not `truth_claims` — a genuinely different metric from `truth.js`'s
  `trustScore` despite the shared name. No consolidation question here either.

## 4. Migration of existing call sites

Per the decision log's §5 warning, `git status --short` is re-checked fresh at plan-writing time,
not trusted from this design's snapshot. As of this session: `governance.js`, `memory.js`,
`orchestration.js`, `gateCheck.js`, `knowledge/gaps.js`, `knowledge/impact.js`, `index.js`,
`middleware/auth.js`, `auth/auth.js`, `.env.example`, `schema.sql`, `.claude/launch.json`,
`constitutional-modules.js`, `employeeLeaves.js`, `platformDown.js`, and the frontend files under
the command-bar/deep-link feature (`GlobalSearchOverlay.tsx`, `DependencyEvolutionTab.tsx`,
`SignalDrilldown.tsx`, `CommandBar.tsx`, `DeepLinkFocus.tsx`, `commandIndex.ts`, `focusTarget.ts`,
and related) carry pre-existing WIP confirmed unrelated to evidence/provenance by diff review — none
of it touches `rating`/`score`/`band`/criticality logic. `git diff <file>` before staging any file
already on this list; isolate this workstream's hunks if they land in the same file.

| File | Change |
|---|---|
| `domain/derived.js` | gate `accountability`, `collaboration` summary, `pillars` (GI/MI/DI/orgScore), `decisionQuality`, `orgHealth`, `orgHealthByDepartment`, `departmentExposure` per §2.2; fix D-24 sites inline (`violationScore`, `ownershipSpreadScore`) |
| `routes/truth/truth.js` | gate `/summary`'s `trustStatus` |
| `routes/decisionIntelligence.js` | gate `dqiVerdict`; fix `calcDQI`'s empty-returns-100 (D-24) |
| `frontend/components/ui/EvidenceBadge.tsx` | new |
| `frontend/lib/evidenceGate.ts` | new — TS port of `coverage`/`evidenceGate` (D-27) |
| `frontend/lib/riskIntelligence.ts`, `orgMemory.ts`, `knowledgeRisk.ts`, `aiToolIntelligence.ts` | wire in `evidenceGate.ts`; add `evidence` to each report shape |
| ~35 frontend components (traced individually in the plan) | render `<EvidenceBadge>` when `evidence.status === 'insufficient_evidence'` or `criticality === 'unknown'` / `status === 'not_evaluable'` |

## 5. Testing

- `backend/tests/definitions.unit.test.js` already covers `evidenceGate`/`coverage` in isolation —
  no change needed there.
- `backend/tests/derived.unit.test.js` gains an evidence-boundary case per newly-gated function:
  empty population, low-coverage population (just under 50%), and just-over-50% happy path, using
  its existing `roots(overrides)` fixture builder.
- New `backend/tests/decisionIntelligence.unit.test.js` (or an addition to an existing route test,
  whichever the plan finds) covers `dqiVerdict`'s empty-decisions case.
- New frontend unit test for `EvidenceBadge` (renders the coverage figure, not a score) and for
  `evidenceGate.ts`'s two functions (mirroring `definitions.unit.test.js`'s boundary-focused style).
- Route-level live-server verification (per the decision log's §5 process note, required here
  specifically because the entire point of this workstream is behavior on near-empty data): scratch
  port, log in via `ADMIN_EMAIL`/`ADMIN_PASSWORD`, curl each changed endpoint. Since the current
  database is populated, verifying the *insufficient_evidence* path requires either a disposable
  Supabase project seeded near-empty or a `node -e` snippet calling the gated function directly with
  a hand-built near-empty `roots` object (the same shape `derived.unit.test.js`'s fixture builder
  produces) — the plan picks one mechanism explicitly rather than skipping this check because the
  live database doesn't naturally exercise it.
- `node tests/run-all.js` green before every backend commit; frontend test command (whatever
  `package.json` defines — checked at plan time) green before every frontend commit.

## 6. Explicitly out of scope for W-E

- D-14's graph reload endpoint (W-G) and D-15's endpoint classification/deletion (W-H) — untouched
  by evidence semantics.
- Full criticality-vocabulary parity in `evidenceGate.ts` (§2.5) — only the coverage primitives are
  ported; `atOrAbove`/`spofVerdict`-equivalent logic in TypeScript is not needed because none of the
  four client-side files reimplement SPOF or criticality-threshold logic, only aggregate scoring.
- Any endpoint or component not reachable from the sites enumerated in §2.2–§2.5. If the plan's
  fresh sweep (§2.2's closing paragraph) finds more, they're added as new tasks, not silently
  folded into an existing one.

## 7. Risks

- Gating `decisionQuality()` (D-25) is a genuine behavior change: a 0-decision organization moves
  from a WEAK (50) rating to `insufficient_evidence`. Accepted under D-16 (no reconciliation table),
  but worth calling out explicitly in the commit message per the standing constraint.
- `pillars().orgScore` insufficient-if-any-pillar-insufficient (§2.2) means an organization with
  excellent MI/DI data but zero `ai_platforms`/`tool_policies` rows (GI ungated) now sees its
  headline OIS go from a computed number to `insufficient_evidence`. This is D-07 working as
  intended, not a bug, but it's the single most visible behavior change in this workstream — the
  `VerdictBanner.tsx` update should be verified against this exact scenario, not just the
  fully-empty case.
- The TypeScript port (D-27) creates a second implementation of `coverage()`/`evidenceGate()` in a
  different language, which is exactly the kind of duplication W-C's whole philosophy warns against
  — accepted here only because there is no shared runtime between `backend/` and `frontend/` to
  unify them in. The two must be kept in sync by hand; if the 50% threshold or the coverage formula
  ever changes, both files need the edit, and nothing enforces that mechanically.
