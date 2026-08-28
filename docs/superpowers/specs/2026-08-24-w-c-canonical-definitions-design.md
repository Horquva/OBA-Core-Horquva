# W-C — Canonical Definitions Layer

Workstream: **W-C** (keystone)
Decisions implemented: **D-03, D-06, D-10**; fixes **F-B, F-G′, F-K**
Blocks: W-D, W-E, W-G
Status: **design — awaiting owner approval. No code written.**

See [decision log](./2026-08-24-oba-remediation-decision-log.md) for why these decisions were made.

---

## 1. The problem this solves

Three concepts are currently redefined in every file that needs them:

- **How critical is this thing?** Read from `agents.risk`, `workflows.risk`,
  `knowledge_assets.criticality` — three different column names — and from
  `ai_platforms`, which has no such column at all.
- **How critical is this link?** Read from `dependencies.dependency_type`, a genuinely different
  concept that happens to share the vocabulary.
- **Is this a single point of failure?** Reimplemented across ~16 files with no shared rule.

The result is not just duplication, it is disagreement. `brain/modules/implementations.js:72,86`
treat `'high'` as *the* critical set, excluding `'critical'` entirely. Twenty other files treat
`['critical','high']` as one set.

Route files normalize each table's column into a uniform `criticality` property on a view model,
which is reasonable — but they do it by **fabricating a value when the column is empty**
(`criticality: a.risk || 'low'` at `decisionIntelligence.js:45,326,334`, F-G′) and by **picking
arbitrarily when several values exist** (`tools.js:63` assigns inside a loop, so a platform takes
whichever `knowledge_assets` row the database returned last, F-K). An unmeasured asset presented as
low-criticality is the safest-looking possible lie, and it means the critical-tool penalties never
fire for exactly the tools nobody has assessed.

## 2. What gets built

One module, `backend/domain/definitions.js`, sitting *beneath* `derived.js` in the dependency
order. It has no database access and no I/O — it is pure functions over rows that callers have
already loaded. That keeps it trivially testable and means `derived.js` can keep its
single-load-per-request guarantee.

```
              definitions.js          ← pure, no I/O
                    ▲
         ┌──────────┼──────────┐
    derived.js   brain/    route files
```

### 2.1 The criticality scale

```
low(0) < normal(1) < high(2) < critical(3)
```

Four distinct levels per D-03, with rank comparison — so "at or above high" is expressible as a
single call rather than an array literal repeated in twenty places. A fifth state, `unknown`, is
**not** a level: it means the signal is absent, and it never compares as anything. This is what
stops D-07 from being violated by a default.

### 2.2 Entity criticality — resolving four field names

A field map, per entity type, is the whole trick:

| Entity type | Source |
|---|---|
| `agent` | `row.risk` |
| `workflow` | `row.risk` |
| `knowledge_asset` | `row.criticality` |
| `platform` | **derived** — see below |
| anything else | `unknown` |

`ai_platforms` carries no criticality signal. Criticality for a platform is therefore taken as
**the maximum criticality across its `knowledge_assets` rows** where
`asset_type = 'platform' AND asset_id = platform.id`. Those rows exist and carry criticality —
`backend/sql/10_ai_platforms_knowledge_gaps.sql` populates them. A platform with no such rows
resolves to `unknown`, not `normal`.

**This derivation already exists** at `backend/routes/tools.js:60-65` — W-C is not introducing it.
What W-C changes is the selection rule: that loop assigns `byPlatform[k.asset_id]` on every
iteration, so a platform with several knowledge assets silently keeps whichever row came last (F-K).
Taking the maximum is a correction to an arbitrary pick, not new machinery. The canonical resolver
becomes the single implementation and `tools.js` consumes it.

**Consequence the owner should know:** platforms lacking knowledge-asset coverage cannot be
evaluated for SPOF at all under D-06, because D-06 requires criticality ≥ high and `unknown` never
satisfies a threshold. Those platforms will report insufficient evidence rather than "not a SPOF".
That is the honest answer, but it will visibly shrink platform-SPOF surfaces.

### 2.3 Edge criticality — kept separate on purpose

`dependency_type` on the `dependencies` table gets its own resolver and its own name. It is never
merged with entity criticality. `routes/risks.js:41` is already correct and will simply be retyped,
not rewritten.

### 2.4 The SPOF rule (D-06)

One predicate, three conjuncts:

```
sole owner  AND  no backup owner  AND  entity criticality ≥ high
```

Dependents are **not** consulted. A critical asset with nothing depending on it is still a SPOF.
`unknown` criticality yields *not evaluable*, distinct from *not a SPOF* — the caller decides
whether that becomes an evidence gap or an exclusion.

Backup lookup reuses the existing `backupIndex(roots)` in `derived.js:121` rather than adding a
second one.

### 2.5 The coverage gate (D-10)

Each score declares which field it needs on which population. The gate returns either a value or a
refusal:

- **≥ 50% of the population carries the field** → compute, and report the actual coverage.
- **< 50%** → `{ status: 'insufficient_evidence', coverage, required, populationSize }` and **no
  number**.

W-C ships the gate and its tests. W-E is where the refusal actually reaches the UI — until then,
callers receive it and may ignore it. That split is deliberate: it lets the gate land and be tested
without simultaneously rewriting every frontend tile.

## 3. Migration of existing call sites

The twenty `['critical','high']` sites are **not** uniformly wrong (D-06 nuance). Each is
classified before it is touched:

| Class | Meaning | Action |
|---|---|---|
| **Threshold** | expresses "at or above high" | retype to `atOrAbove(x, 'high')`. Behavior unchanged. |
| **Conflation** | treats `critical` and `high` as the same label | genuine bug. Fix, note in the commit. |
| **Fabrication** (F-G′) | defaults absent criticality to a level | genuine bug. Resolve to `unknown` instead. |
| **Arbitrary pick** (F-K) | collapses several values by overwriting | genuine bug. Use `maxLevel`. |

`brain/modules/implementations.js:72,86` are Conflation — they exclude `critical` entirely.
`routes/decisionIntelligence.js:45,326,334` are Fabrication. `routes/tools.js:63` is Arbitrary pick.

**Before classifying any site as a bug, read the loader that populates the property.** A route
reading `row.criticality` against a table with no such column is usually consuming a normalized view
model, not making an error. Checking the schema alone produced one wrong finding already.

Order of work: build the module and its tests → migrate `derived.js` (already correct, so this
proves the module is behavior-preserving) → migrate the brain → migrate route files in dependency
order.

## 4. Testing

Tests are written **before** each fix, per the original plan §16 and §9. Every finding gets a
regression test.

**Scale and comparison:** each of the four levels; `unknown` never satisfying a threshold;
`atOrAbove` at each boundary.

**Entity resolution:** agent via `risk`; workflow via `risk`; knowledge asset via `criticality`;
platform via max-of-knowledge-assets; platform with no knowledge assets → `unknown`; unrecognized
entity type → `unknown`.

**SPOF (D-06), the matrix from the original plan §9:** zero owners; one owner; multiple owners;
no backup; with backup; criticality at each of the four levels; `unknown` criticality; zero
dependents with critical criticality (**must** be a SPOF — this is the behavior change); many
dependents with low criticality (**must not** be).

**Coverage gate:** 0% coverage; 49%; 50% (boundary — inclusive); 51%; 100%; empty population.

**Regression, one per finding:** F-B (brain must now include `critical`); F-G′ (absent criticality
must resolve to `unknown`, never to `'low'`, and an uncovered tool must not be scored as
low-criticality); F-K (a platform with several knowledge assets must take the maximum, and the
result must not depend on row order).

## 5. Explicitly out of scope for W-C

- Rendering `insufficient_evidence` in the UI → W-E.
- Consolidating the three OIS definitions → W-D.
- Dropping the derivable aggregate tables → W-H.
- Anything that writes to the database → deferred entirely by D-04.

## 6. Risks

**Numbers will move.** SPOF counts change in both directions, and platform-SPOF surfaces will
shrink toward insufficient-evidence. D-16 accepts this without a reconciliation table; commits will
name the responsible decision.

**The platform-criticality derivation is a judgement, not a given.** Taking the max across knowledge
assets is defensible — one critical piece of knowledge about a tool makes the tool critical — but it
is authored, and will be labelled as such rather than presented as measured.

**W-C touches many files without changing most of their behavior.** The Threshold-class migrations
are pure retyping. Reviewing them together with the Conflation-class fixes risks the real bugs
hiding among the noise, so they land as separate commits.
