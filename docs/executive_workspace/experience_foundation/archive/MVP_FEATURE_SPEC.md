# OCOS MVP — Feature Specification & Build Plan

**Version 3.0 · Complete rewrite · Verified against the running code**
**Feature set:** F01–F32
**Data source:** the Horquva GitHub organization (Partner Zero)
**Estimated delivery:** demo at week 6–7, all 32 features at week 11–13

> **How this document was produced.** Every architectural claim below was checked against source:
> all 55 module implementations, `analytics.js`, the graph model, the route layer, and the git
> history. Where a module's name and its behaviour disagree, the behaviour is what is recorded.
> Version 2 assumed a greenfield build and was wrong; this version supersedes it entirely.

---

# PART 0 — OVERVIEW

## 0.1 What we are building

OCOS is an Organizational Brain: 55 intelligence modules that boot together over a shared Knowledge
Graph and answer executive questions — who owns what, where the organization is fragile, what
changed, what to pay attention to.

**It works today, on invented data.** The MVP makes it work on a real organization, and adds the
things an executive needs before they will trust it.

## 0.2 What changes

| | Today | After the MVP |
|---|---|---|
| **Data** | 16 hand-seeded entities, 24 relationships | The real Horquva organization, refreshed every 6 hours |
| **Ownership** | Seeded `owns` edges | Derived from CODEOWNERS, team permissions and contribution — with the source recorded on every edge |
| **Time** | None. The graph is a snapshot of *now* | Graph state persisted each run and diffed, so change becomes visible |
| **Human input** | Impossible. Nothing writes | Executives correct owners, capture knowledge, record decisions |
| **Evidence** | Every module returns it; nothing surfaces it | Inspectable, with source, date and freshness |
| **Confidence** | A raw `0.55 + 0.45 × coverage` number | Four honest bands, each traceable to a rule |
| **Not knowing** | Renders as empty | Four distinct, explicit states |

**One sentence:** OCOS stops being a convincing demo and becomes a system that tells the truth about
a real organization, and admits when it doesn't know.

## 0.3 What we add — the whole list

Thirty-two features. **Nine already work** and need only real data. **Four are small edits** to
existing modules. **Nineteen are new**, but they reduce to **six root gaps**.

| Group | Features | Nature of the work |
|---|---|---|
| **Already built** | F03 ownership · F05 concentration · F09 evidence · F10 confidence · F12 dashboard · F13 briefing · F17 views · F21 identity · F25 access | Feed them real data |
| **Small edits** | F04 risk · F07 tribal knowledge · F08 ask OBA · F20 voice | Extend an existing module |
| **G1 — real data** | F01 connect · F31 identity resolution · F27 live updates | New connector |
| **G2 — time** | F28 change detection · F02 see changes · F06 history | Persist and diff the graph |
| **G3 — writes** | F32 override · F29 knowledge capture · F23 decisions · F24 history · F11 review | One write path, five features |
| **G4 — conversation** | F14 continuity · F15 context · F19 follow-ups · F22 memory | Route-layer state |
| **G5 — provenance** | F18 drill-down · F30 unknowns | One helper change |
| **G6 — UI routing** | F16 contextual UI | Typed view intent |
| **Product** | F26 activity history | Small, standalone |

## 0.4 Time

| | |
|---|---|
| Raw engineering effort | **114–154 person-days** |
| With 1.35× integration and QA overhead | **154–208 person-days** |
| Team | 13 interns, 1 reviewer |
| **First demonstrable product** | **Week 6–7** |
| **All 32 features** | **Week 11–13** |

Roughly a third of the originally specified behaviour already exists, which is why this is a
three-month project rather than a nine-month one.

---

# PART 1 — GROUND TRUTH

## 1.1 The architecture, as verified

```
GitHub org  ──►  connector  ──►  Supabase canonical schema (~70 tables)
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                  graphLoader.js                  backend/routes/  (54 files)
                          │                               │
                  Knowledge Graph                         │
                          │                               │
                  55 modules boot                         │
              M46 gates M48 · M55 runs last               │
                          │                               │
                          └───────────────┬───────────────┘
                                          ▼
                              frontend/app/  (~25 views)
```

| Layer | Location | Verified state |
|---|---|---|
| Route / API | `backend/routes/` | 59 files. **54 query Supabase directly; 5 touch the Brain.** Mounted in `backend/index.js`. |
| Constitutional Runtime | `backend/brain/` | Knowledge Graph, capability/module/entity registries, execution engine. **Never touches Supabase.** Seeded at boot by `graphSeeder.js` with 16 entities and 24 relationships. |
| Modules | `backend/brain/modules/implementations.js` | All 55 in **1,338 lines**. Owners: Huzaifa 13 · Kamran 21 · Tahir 14 · Anusha 7. |
| Graph helpers | `backend/brain/modules/analytics.js` | 137 lines. Every module depends on it. |
| Canonical schema | Supabase | ~70 tables: `employees`, `owners`, `agents`, `tool_ownership`, `truth_claims`, `decision_history`, … |
| Frontend | `frontend/app/` | Next.js, ~25 route views. |
| Python engine | `modules/`, `horquva_modules_py/`, `main.py` | Last modified **2026-07-03**. Node never invokes it. Dormant. |

## 1.2 Three properties that determine every decision in this plan

**1. Every module is a pure, stateless function of the graph.**
`(rt, context) → { type, payload, confidence, evidence, recommendations }`. No module reads or
writes a database. This is constitutional and must not change.

**2. The graph has no time dimension.** It is rebuilt at boot and represents *now*. Nothing records
what changed.

**3. Nothing writes.** Modules read and return. Any feature where a human puts information *in* has
nowhere to land today.

## 1.3 Three modules whose names mislead

Recorded because reading by name rather than by code produced two wrong plans already.

| Module | Name implies | Actual behaviour |
|---|---|---|
| **M10** Organizational Memory | What happened to the organization | Returns `rt.intelligenceBus.history()` — a log of **Brain runs** |
| **M26** Executive Memory | Conversation memory | An executive's **ownership footprint** |
| **M14** Decision Intelligence | Decision records | A decision **readiness score** |

The M01–M55 registry is **LOCKED** — no renaming, merging or duplication. These names stay. Record
the real semantics in each module header so the next reader is not misled.

## 1.4 The graph vocabulary — the most important contract in the project

Modules query exact strings. **If the connector emits anything else, all 55 modules silently return
empty results and it looks as though the entire system is broken.**

**Entity types** (`analytics.js:10`, plus structural types from `graphSeeder.js`):

```
assets    : system | ai_agent | workflow | knowledge | policy | process | asset | project
humans    : executive | employee
structure : organization | department | team
external  : vendor | customer
```

**Relationship types** — every type any module queries:

| Edge | Direction | Read by | Carries |
|---|---|---|---|
| `owns` | human → asset | M01 M07 M08 M09 M20 M26 M30 M40 M51 M52 | **`metadata.source`** (see D1) |
| `depends_on` | asset → asset | M02 M05 M28 M32 M33 M34 M54 | `criticality`, `failureImpact` |
| `governs` | policy → asset | M07 M19 M52 | — |
| `supports` | entity → entity | M07 M26 | — |
| `reports_to` | human → human | M20 M27 | — |
| `manages` | human → entity | M20 M26 | — |
| `collaborates_with` | human → human | M13 M29 | — |

**GitHub → vocabulary** (extends `backend/INTEGRATION_MAPPING.md`):

| GitHub source | Produces |
|---|---|
| Repository, or a path scope within one | `system` entity |
| Contributor | `employee` entity |
| Org team | `team` entity |
| CODEOWNERS entry | `owns` edge · `metadata.source = 'codeowners'` |
| Team with `admin` / `maintain` | `owns` edge · `metadata.source = 'team_permission'` |
| Dominant contributor share | `owns` edge · `metadata.source = 'contribution'` |
| Human correction (F32) | `owns` edge · `metadata.source = 'human'` |
| Import / package dependency | `depends_on` edge |
| Branch protection rule | `policy` entity + `governs` edge |
| Co-authorship on a path | `collaborates_with` edge |
| Directory with concentrated knowledge | `knowledge` entity |

> **Task zero.** Publish this vocabulary as a standalone contract before any code is written. Half a
> day of work. Nothing else may start first.

## 1.5 Partner Zero — we are the first organization

There is no external design partner, and waiting for one blocks everything. **OCOS connects to the
Horquva GitHub organization.** This is a strength, not a fallback: on someone else's organization we
cannot tell a *correct* answer from a merely *plausible* one. On our own we know the truth and can
verify every claim the system makes.

| Property | Reality | Consequence |
|---|---|---|
| Repositories | 1, public | Systems must be **path-scoped**, not repo-scoped |
| Contributors | 13 via API on the default branch; 25 git authors across all 33 branches | F05 concentration has genuine signal at directory level |
| CODEOWNERS | Present · 6 team handles · has commit history | D1 rank 1 works; F28 backfill produces real events |
| Teams / org members | **Unreadable — the token lacks org-level read** | **Blocker.** D1 rank 2 is untestable until fixed (Decision 1) |
| Commit span | 2026-06-20 → 2026-08-09 | ~7 weeks of history at launch |
| Duplicate identities | `Kamil Ejaz` / `KamilEjaz890`, `Kamran Ali` / `Kamran Ali Chandio` | Real F31 test cases |
| Bots | `dependabot[bot]` | Real F31 exclusion case |

**Path-scoped Systems for Horquva:**

| System | Path scope |
|---|---|
| Security Pipeline | `.github/workflows/` |
| Intelligence Engine | `backend/brain/` |
| API Layer | `backend/routes/` |
| Executive Workspace | `frontend/` |
| Data Layer | `infrastructure/databases/` |

**Our own broken CODEOWNERS is the first acceptance case.** It assigns `/infra/`, `/src/`,
`/security-gates/`, `/container-security/`, `/artifact-signing/` and `/supply-chain/` to four
`@horquva/*` team handles. **None of those paths exist in the repository**, and the file's own
header records that the team handles are unverified. Meanwhile real work happens in `backend/`,
`frontend/` and `modules/` with no declared owner.

That is precisely the condition F04 exists to detect. **Do not fix CODEOWNERS before building.** It
is the highest-value test fixture available, and correcting it *after* OCOS finds it is the
demonstration.

**The founding incident.** One engineer was assigned to establish the CI/CD baseline. Another had
already built it. The replacement would have silently removed the security gates, because nobody
knew who owned the pipeline. That is the failure F03 and F04 prevent, it happened here, and it is
the demo narrative. No invented scenario is required.

**Secondary source — scale only.** One repository and ~25 people will not exercise pagination or
rate limiting. Add a large public organization as a load target in wave 1. Note that for an
organization we are not members of, GitHub returns **no team membership and no team-repository
permissions** — it validates throughput and D1 ranks 1 and 3, and nothing else.

**Known weaknesses of dogfooding, stated plainly.** History is ~7 weeks, not a year, so F06
timelines will be short until time passes. Twenty-five people is small — F05 works, the skew is
real, but it will not look like an enterprise. And we are not neutral evaluators: we will
unconsciously ask the questions the product answers well. Have someone outside the build team run
the executive sessions.

---

# PART 2 — FROZEN RULES

These bind every feature. They are not per-module choices.

## D1 — What ownership means

Every `owns` edge carries `metadata.source`. M01 ranks by precedence:

| Rank | Source | Origin |
|---|---|---|
| 0 | `human` | An executive correction (F32). Wins unconditionally. |
| 1 | `codeowners` | A CODEOWNERS entry matching the path scope |
| 2 | `team_permission` | A team holding `admin` or `maintain` |
| 3 | `contribution` | ≥ 50% of commits in the trailing 180 days, minimum 10 commits |

The highest-ranked edge wins. **Lower-ranked edges are retained** — agreement across sources drives
confidence (D2); disagreement produces `CONFLICT` (D3) and risk R5.

**"No confirmed owner"** = no edge at any rank. This is M01's existing `unownedAssets`, and it is
risk R1.

> **This single field carries D1, F04-R5, F10 and F32.** Without it all four degrade. Get it right
> in the connector on day one — retrofitting a field onto every edge later is far worse.

## D2 — Confidence is banded at the surface, never shown as a number

`A.confidence(evidenceCount, coverage)` returns `0.4` with no evidence, otherwise
`0.55 + 0.45 × coverage`. **It is a coverage proxy, not calibrated reliability.** M55 fuses it and
that is constitutional — **do not change it.** Band it at the route layer:

| Fused confidence | Displayed as |
|---|---|
| ≥ 0.85 with two or more independent sources | **Strongly supported** |
| ≥ 0.70 | **Likely** |
| ≥ 0.50 | **Uncertain** |
| < 0.50, or M46 `verified === false` | **Requires review** |

"Independent sources" means `owns` edges with different `metadata.source`, or a source plus a
corroborating knowledge entry. No numeric confidence appears in any UI surface or OBA utterance.

*Rationale: with one organization and no labelled ground truth, a two-digit percentage is fabricated
and collapses the first time an executive asks "why 91 and not 87." Each band maps to a rule they
can read and check.*

## D3 — Four epistemic states, all already computed

Each maps to an existing module output. F30 surfaces them; it does not invent them.

| State | Source in code | Executive phrasing |
|---|---|---|
| `RESOLVED` | A claim exists | Normal answer |
| `NO_SIGNAL` | M01 `unownedAssets` / M15 `failedVerification` | "No CODEOWNERS entry and no team holds maintain permission." |
| `NOT_INGESTED` | Entity absent from the graph | "That isn't connected yet." |
| `STALE` | The `freshness` field from D5 | "My last read of that was 34 days ago." |
| `CONFLICT` | Two `owns` edges, different sources, different owners | "Two sources disagree — this needs review." |

## D4 — Canonical entities only

No GitHub login reaches an executive surface. All reasoning uses resolved `employee`, `team` and
`system` entities. A raw login in the UI is a bug.

## D5 — Evidence carries provenance

`analytics.js:11` defines the helper every module uses. Extend it once:

```js
const ev = (source, ref, note, observedAt = null) => ({
  source, ref, note,
  observedAt,
  freshness: !observedAt              ? 'unknown'
           : ageDays(observedAt) <= 7  ? 'fresh'
           : ageDays(observedAt) <= 30 ? 'aging'
           : 'stale',
})
```

**All 55 modules gain provenance from one line**, because all 55 call `ev()`. Make this change
before anyone builds an evidence surface, or 55 modules get touched twice.

## D6 — Human input outranks derived state

A correction (F32) or a rejection (F11) changes the answer for the next person who asks, and
survives every subsequent ingestion until explicitly revoked. A system that repeats something the
executive has already corrected loses trust permanently, and nothing else in this specification
recovers it.

## D7 — Constants

| Constant | Default | Used by |
|---|---|---|
| `FRESH_DAYS` | 7 | D5 |
| `STALE_DAYS` | 30 | D3, D5 |
| `OWNERSHIP_WINDOW_DAYS` | 180 | D1 rank 3 |
| `OWNERSHIP_MIN_SHARE` | 0.50 | D1 rank 3 |
| `OWNERSHIP_MIN_COMMITS` | 10 | D1 rank 3 |
| `CONCENTRATION_DANGEROUS` | 0.40 | M30 (already implemented) |
| `DEPARTED_INACTIVE_DAYS` | 60 | F04-R2 |
| `INGESTION_INTERVAL_HOURS` | 6 | F01, F27 |
| `BACKFILL_HISTORY_DAYS` | 365 | F01, F06 |

---

# PART 3 — THE 32 FEATURES

## 3.1 Already implemented — needs only real data

**Nine features. Zero module changes.**

| Feature | Module | What the code already does | Done when |
|---|---|---|---|
| **F03** Who owns what | **M01** | Maps every asset to its owners, lists `unownedAssets`, computes `ownershipCoverage` | Every System returns owners with their D1 rank, or an explicit D3 state — never blank |
| **F05** Knowledge concentration | **M09** + **M30** | M09: bus-factor on `knowledge` assets with `owners ≤ 1`. M30: `concentrationRatio`, flags `dangerous` above 0.40 | A real contributor above threshold is named with their share; bots excluded; one human counted once |
| **F09** Inspect evidence | **all 55** | Every package returns `evidence[]` of `{source, ref, note}` | Every displayed claim lists its evidence, including contradicting records |
| **F10** Reliability | **all 55** + **M46** | Every package carries `confidence`; M46 computes `truthScore` and gates M48 | Every claim shows a D2 band and the rule that produced it; no number anywhere |
| **F12** Dashboard | **M36** + **M23** | M36 emits typed signals at `critical` / `warning` / `info`; M23 assembles the executive view | Renders from real data, max 7 items, coverage statement present |
| **F13** Briefing | **M23** | Returns `briefing: [...]` as executive sentences plus `recommendedPriorities` | Reads as one connected assessment under 150 words; every fact traces to an F12 item |
| **F21** OBA identity | **M21** | Per-executive avatar with role, scope and an `opensWith` greeting | Consistent voice across chat, briefing and voice; no raw enums or logins |
| **F17** Manual exploration | frontend | ~25 views render today | All eleven views render real data; search works; every view renders D3 states |
| **F25** Access | `auth_schema.sql` | JWT, roles `member` / `admin` / `executive` | Role checks enforced server-side on every mutating route, not by hiding buttons |

**F17 detail.** Eleven views: Dashboard · People · Teams · **Systems (new)** · Ownership · Risks ·
Knowledge · History · Claims · Evidence · Decisions. Most exist as shells needing rebinding.
**Global search across Systems, people and teams is mandatory** — eleven list views without search
is unusable. Treat each view as its own unit of work, not the list as one ticket.

## 3.2 Small module edits

| Feature | Extend | The change | Effort |
|---|---|---|---|
| **F04** Detect risk | **M03** | R1 exists via M01 `unownedAssets`; R4 via M09/M30. Add R2, R3, R5 | 6–8 pd |
| **F07** Tribal knowledge | **M09** / **M07** | `knowledge` entity type exists; add body text and subject-scoped retrieval | 4–5 pd |
| **F08** Ask OBA | **M50** + **M55** | Fusion already works. Add an NL intent classifier *in front* of the runtime that sets `context` — a route-layer concern, not a module | 8–11 pd |
| **F20** Voice | **M22** | M22 already generates the spoken sentence. Add STT/TTS I/O at the route layer, with an explicit low-confidence confirmation path | 6–8 pd |

**F04 — the complete supported risk set. Nothing outside this list is detected:**

| ID | Condition | Trigger | Severity |
|---|---|---|---|
| R1 | No confirmed owner | M01 `unownedAssets` | High |
| R2 | Owner departed, not reassigned | Owning `employee.status = departed`, no `ownership_changed` since | Critical |
| R3 | Ownership changed with no decision | `ownership_changed` event with no linked decision after 7 days | Medium |
| R4 | Knowledge concentration | M09 bus-factor, or M30 `dangerous` | High / Medium |
| R5 | Ownership in conflict | Two `owns` edges, different `metadata.source`, different owners | High |

Status lifecycle: `open` → `under_review` → `resolved` or `accepted`. A risk that stops firing
auto-resolves with a recorded reason; it is never silently deleted.

**F08 — the complete supported intent set.** Anything outside it is refused, not guessed:
`who_owns` (M01) · `what_changed` (M10) · `why_risky` (M03) · `what_happening` (M23 scoped) ·
`has_happened_before` (M10) · `what_should_i_know` (M23) · `why_reason` (F07) · `who_knows` (M09).
**OBA never states a fact without a claim id.** A statement without one is a bug.

## 3.3 The six root gaps

### G1 — Real data in the graph → F01, F31, F27

**F01 — Connect real organizational data.** GitHub App on the Horquva org. Permissions: Repository →
Contents, Metadata, Pull requests (read); Organization → Members, Administration (read).

*Onboarding, five steps:* install → select scope → **map path scopes to named Systems** → nominate
users and roles → run backfill with visible progress.

*Ingestion cycle*, every `INGESTION_INTERVAL_HOURS`: teams and members → repositories → permissions
→ CODEOWNERS → commits → pull requests → identity resolution → write canonical tables → load graph →
snapshot → diff.

*Rate limiting:* GraphQL for teams, repos, permissions and CODEOWNERS — one paginated query per
resource type, **not one per repository**. REST only for commit history. Below 10% remaining, pause
until reset. A run that hits the ceiling closes as `partial`, never `complete`, and sets
`requires_review` on dependent claims.

*Done when:* the real repository, contributors and (given Decision 1) teams are queryable with
observation timestamps; re-running twice produces zero duplicates; no demo seed row is reachable.
*Effort 20–26 pd. The largest single item — assign two people.*

**F31 — Entity resolution.** GitHub identity → canonical `employee`. Deterministic only: GitHub
numeric id, then verified org-domain email, then the `noreply` pattern. **No name-similarity
matching** — wrong merges are expensive to unwind and silently corrupt F05. Admin merge/split,
re-applied on every run so ingestion never undoes it. Bots classified by account type, `[bot]`
suffix, or configured list. Departure = removed from the org (authoritative) or inactive beyond
`DEPARTED_INACTIVE_DAYS` (provisional, stated as such).
*Done when:* `Kamil Ejaz` and `KamilEjaz890` resolve to one person and count once in F05;
`dependabot[bot]` appears in no ownership or concentration result.
*Effort included in F01.*

**F27 — Live updates.** Scheduled refresh with three visible manifestations, all required — without
them the pipeline is real but invisible: last-refresh time on every view, "since your last visit"
marking on the dashboard, and refresh-in-place without a reload. *Effort 4–5 pd.*

### G2 — Time, via M49 → F28, F02, F06

**M49 (Digital Twin) already emits exactly the snapshot needed.** `implementations.js:1116`:

```js
twin = { syncedAt, entities: [{id, type, name, status}],
         relationships: [{from, type, to}], stats, layers }
```

A timestamped, serialisable, complete graph state — already written, already running.

**F28 — Change detection.**
1. Persist M49's payload after each ingestion to `graph_snapshot` (`id`, `taken_at`, `payload jsonb`).
2. Diff consecutive snapshots into typed change events.
3. **Extend M10** to read change events, not only the intelligence bus — making it what its name has
   always promised.

*Supported change types*, derivable from an entity/relationship diff and nothing more:
`owner_added` · `owner_removed` · `ownership_changed` · `dependency_added` · `dependency_removed` ·
`entity_added` · `entity_archived` · `person_departed` · `governance_changed`

*Every event carries:* `change_type`, `object`, `previous_state`, `current_state`, `occurred_at`,
`detected_at`, `detection_method`, involved people and teams. **Where only detection time is
knowable, the UI says "detected on"** rather than implying the change happened then — conflating
them makes the product lie about timing.

*Backfill:* `git log --follow` on the CODEOWNERS path replays real historical `owns` edges with real
dates. Team-permission history is **not retrievable from GitHub** and starts at t0.
*Done when:* a real org change produces the correct typed event on the next run, with before and
after populated. *Effort 10–14 pd.*

**F02 — See changes.** Presentation over F28: each change as one natural-language line generated
from the typed event, never a raw diff, with all six inspectable fields one click away and a link to
its evidence. Dashboard shows only `ownership_changed`, `owner_removed`, `person_departed` and
`entity_archived`. *Effort 4–5 pd.*

**F06 — History.** Object timeline in reverse chronological order. **Every timeline states its own
start date**, and backfilled events are visually distinct from observed ones, so partial history is
never mistaken for a complete record. *Effort 4–5 pd.*

### G3 — A write path → F32, F29, F23, F24, F11

**Modules must stay pure functions. So humans never write to a module.** They write to Supabase, and
the graph loader materialises their input as edges.

```
Executive corrects an owner
        │
POST /api/ownership/override  →  human_assertion table
        │
next graph load
        │
graphLoader adds:  owns edge · metadata.source = 'human' · asserted_by · asserted_at
        │
M01 ranks it first (D1) · M46 sees a corroborating source · M03 re-evaluates the risk
```

**Not one line of the runtime changes.** This is the most important design decision in the plan: it
keeps the Brain constitutional and delivers the entire write half of the product for one loader
change.

| Feature | Writes to | Materialises as | Effort |
|---|---|---|---|
| **F32** Human override | `human_assertion` | `owns` edge, `source='human'`. Reason **required**, and stored as a knowledge entry — the correction teaches the system rather than patching it. Survives every run until revoked (D6). Flagged redundant when derived state later agrees, so the system converges on real sources instead of accumulating manual patches. | 6–8 pd |
| **F29** Knowledge capture | `knowledge_entry` | `knowledge` entity + `owns` edge to its author. Three paths: inline on any object; **OBA-prompted** when a "why" question hits `NO_SIGNAL`; onboarding seed import. | 8–10 pd |
| **F23** Record decision | `decision` | Immutable audit record. Four types: approve, reject, acknowledge, mark for review. `reject` and `mark_for_review` require a rationale. Also unblocks F04-R3 and gives M14 real decisions to reason over. | 4–5 pd |
| **F24** Decision history | — | Read over `decision`, by object, claim or person. Superseded decisions shown marked, not hidden. | 3–4 pd |
| **F11** Review a claim | `claim_review` | Review surface showing the claim, its D2 band, its full evidence and the four F23 actions, without navigation. Rejection carries the D6 durability guarantee. | 5–6 pd |

**F29 is required before the first executive session**, not merely before F07. The onboarding seed —
one rationale entry for each of the top Systems — is what makes tribal knowledge demonstrate
anything on day one. Human-asserted knowledge enters D2 at **Likely** at best, unless corroborated.

### G4 — Conversation state → F14, F15, F19, F22

The only gap with no existing foothold. M26 is an ownership footprint; M27 assembles role context.
Neither is conversation memory.

**Build it at the route layer, not as a module.** A `conversation` / `conversation_turn` store holds
the subject stack; the resolved subject passes into the runtime as `context`. The runtime already
accepts `context` and modules already read `context.role`, `context.question` and
`context.simulateRemoveId`. **Conversation is a caller concern; the Brain stays stateless.**

| Feature | Behaviour | Effort |
|---|---|---|
| **F22** Conversation memory | Retrievable by subject across sessions. Resuming re-resolves cited claims to their **current** state — if ownership changed since, OBA says so rather than repeating stale information. That is the difference between memory and a transcript. | 6–8 pd |
| **F14** Continuity | Each turn carries the accumulated subject stack. A bare "Why?" inherits the previous subject and the natural successor intent. Window: last 10 turns, then F22 retrieval. | 5–6 pd |
| **F15** Live context | Subject stack ordered `{type, id, mentioned_at}`. "it" → position 0; "that team" → most recent of that type; "the other X" → second most recent. **An unresolvable reference produces a clarifying question, never a guess** — a confidently wrong resolution makes the executive doubt every prior answer. | 6–8 pd |
| **F19** Follow-ups | Adds `what_evidence` (→ F09 on the previous turn's claims) and `how_reliable` (→ F10) as follow-up-only intents. | 3–4 pd |

### G5 — Provenance and honesty → F18, F30

**F18 — Evidence drill-down.** `CLAIM → EVIDENCE → SOURCE → TIMESTAMP → FRESHNESS → RELIABILITY →
SUPPORTING CONTEXT`. Built on D5's `ev()` change. Every evidence record traces to the ingestion run
that produced it. "Supporting context" is the other claims resting on the same record — showing the
executive what else depends on this fact. *Effort 4–5 pd.*

**F30 — Unknown, staleness and conflict.** Surfaces the four D3 states across OBA responses, object
views and the dashboard, in executive language with the concrete reason and, where one exists, the
action that would fix it. Persistent coverage banner: *"Last read: 4 hours ago · 1 of 1 repositories
connected · 2 people unresolved."* **No screen renders blank where a D3 state applies** — a review
checklist item for every F17 view. *Effort 5–6 pd.*

### G6 — View intent → F16

**F16 — Contextual UI.** The route layer emits a typed side-channel alongside every answer:

```jsonc
{ "view": "ownership | risks | history | knowledge | evidence | decisions |
           people | teams | systems | claims | dashboard | object_detail",
  "subject":   { "type": "system|team|employee", "id": "..." },
  "highlight": [ { "kind": "claim|evidence|change_event", "id": "..." } ],
  "secondary": [ { "view": "...", "subject": {} } ] }
```

Derived from the package `type` every module already returns — `ownership` → ownership view, `risk`
→ risks view, `dependency` → network view. **The UI never parses prose.** Routes only to views that
exist in F17; an unroutable intent degrades to object detail rather than failing.
*Effort 6–8 pd.*

### Product — F26

**F26 — Activity history.** Who viewed what, who approved or rejected, when, what was affected.
Mutation logging is synchronous and in the same transaction; view logging is best-effort and
asynchronous. Product functionality, **not** Sentinel's enterprise audit responsibility.
*Effort 3–4 pd.*

---

# PART 4 — EVERY FEATURE REPAIRS A GAP

There is no tech-debt phase, because the features *are* the repair. Sequence by which gap unblocks
the most, not by which feature sounds most valuable.

| Existing gap | Repaired by | How |
|---|---|---|
| No time dimension | **F28** | Time enters once via M49 snapshots; F02, F06, F27 follow free |
| M10 is Brain-run history, not org memory | **F28 + F06** | Real change events make M10 what its name promised |
| No write path | **F32** | Establishes `human_assertion → loader → edge`; F29, F23, F11 reuse it |
| M14 is readiness, not records | **F23** | Gives M14 real decisions to reason over |
| M26 is a footprint, not conversation memory | **F22** | Builds the layer everyone assumed existed |
| Evidence has no timestamp | **F18** | One `ev()` change; all 55 modules gain provenance |
| Confidence is a coverage proxy shown as truth | **F10** | Banded at the surface; the raw score untouched |
| Unknowns computed but never exposed | **F30** | Surfacing, not computing |
| `employees` is login-shaped | **F31** | Fixes F05's arithmetic at the source |
| CODEOWNERS assigns dead paths and unverified teams | **F04-R5** | Our own broken file is the first acceptance case |
| Modules never run above 16 entities | **F01** | Real data *is* the load test |

**Dual acceptance.** Each feature has two done-conditions. A feature that ships the behaviour but
skips the repair is **not done** — it spent the budget and left the gap.

| Feature | Behaviour done | Repair done |
|---|---|---|
| F28 | A real org change appears as a typed event | `graph_snapshot` persists every run; M10 reads change events |
| F32 | A correction sticks across runs | The write path works with **zero runtime changes** |
| F18 | Evidence traces to source and date | `ev()` carries `observedAt` for all 55 modules |
| F10 | Claims show a band, never a number | `A.confidence()` itself unchanged |
| F30 | Four states distinguishable | Each maps to an existing module output |
| F31 | One human appears once | `owns` edges carry `metadata.source` |
| F23 | A decision is recorded | M14 reads real decisions |

**Three features are structurally early**, regardless of user-facing priority, because they install
infrastructure everything else depends on:

1. **`owns.metadata.source`** — in the connector, day one. Retrofitting it later is far worse.
2. **D5's `ev()` change** — before any evidence surface exists, or 55 modules get touched twice.
3. **F32's write path** — before F29, F23 and F11, so they inherit a proven pattern instead of
   inventing three variants.

**One is structurally late:** F16, because it routes to views that must exist first.

---

# PART 5 — WHERE THE CODE GOES

## 5.1 The decision

**Build in the JavaScript stack: `backend/` and `frontend/`.** It is what runs, the API surface is
already written in its idiom, and ~25 views already render. Two new directories, one new file,
nothing restructured.

## 5.2 Layout

```
backend/
  connectors/github/        ← NEW · the mapper (F01, F31)
  brain/
    knowledge/
      graphSeeder.js        ← existing, unchanged
      graphLoader.js        ← NEW · same output shape, real source
    modules/
      implementations.js    ← EDIT · ev() at line 21 gains observedAt (D5);
                                     M03, M09, M10 extensions only
  services/                 ← NEW · only for logic that is not a query
    change/                 ← snapshot diffing (F28)
    conversation/           ← subject stack (G4)
  routes/                   ← EXISTING pattern · copy any of the 54
  db/migrations/            ← numbered, forward-only, one per PR
frontend/app/               ← EXISTING · rebind, do not recreate
docs/executive_workspace/   ← this document
```

## 5.3 Rules

1. **Copy the existing route pattern.** `require('../supabase')`, query, shape, return. Mount in
   `backend/index.js`. Fifty-four files already do this — interns copy, they do not invent.
2. **Routes stay thin.** Logic that is not a query goes in `backend/services/<domain>/`. A route file
   above ~80 lines is wrong.
3. **Never change a module's contract.** The registry is LOCKED and every module returns the standard
   Intelligence Package. Features consume that envelope; they do not alter it.
4. **Every schema change is a numbered forward-only migration**, and CI applies all migrations twice
   on every PR. With thirteen people on one schema, a broken migration blocks everyone.

## 5.4 Do not touch

`modules/`, `horquva_modules_py/`, `main.py`, `pyproject.toml`, `uv.lock` — dormant Python engine.
Not deleted, not built on, not migrated during the MVP.

`backend/brain/` runtime and the constitutional rules — *discovery before execution*, *M46 gates
M48*, *M55 runs last*. `graphLoader.js` is an addition beside `graphSeeder.js`, not a runtime change.

---

# PART 6 — EFFORT AND SCHEDULE

## 6.1 Effort

| Work | pd |
|---|---|
| Graph vocabulary contract (§1.4) | 0.5 |
| GitHub connector + identity resolution (G1) | 20–26 |
| `graphLoader.js` | 5–7 |
| Snapshot + differ + M10 extension (G2) | 10–14 |
| Write path + loader materialisation (G3) | 12–16 |
| `ev()` provenance + D2 banding + D3 surfacing (G5) | 6–8 |
| Conversation state (G4) | 10–13 |
| Intent classifier + view intent (F08, G6) | 8–11 |
| Module edits — M03 R2–R5, M09/M07 knowledge, M22 voice I/O | 10–14 |
| Route surfaces (~12 new or edited files) + F26 | 10–14 |
| Frontend rebinds + Systems view + global search | 22–30 |
| **Raw total** | **114–154** |
| **With 1.35× overhead** (integration, review, QA, rework) | **154–208** |

## 6.2 Schedule — 13 interns, 1 reviewer

| Wave | Weeks | Work | Gate to exit |
|---|---|---|---|
| **0** | Day 1 | §1.4 vocabulary contract · snapshot job started · GitHub App requested | Contract published; snapshots accumulating |
| **1** | 1–3 | Connector · identity · `graphLoader.js` · `owns.metadata.source` | `bootBrain()` runs on real data; M01 returns real owners |
| **2** | 3–5 | `ev()` provenance · D2 banding · D3 surfacing · M03 R2–R5 · F26 | Every claim carries evidence, a band and an epistemic state |
| **3** | 4–6 | Snapshot persistence · differ · M10 extension · F02 · F06 | A real org change appears as a typed change event |
| **4** | 5–7 | Write path · F32 · F29 · F23 · F24 · F11 · dashboard and briefing rebind | 🎯 **DEMO** |
| **5** | 7–9 | Remaining F17 views · global search · F07 · F18 · F27 | Full manual exploration on real data |
| **6** | 9–11 | Conversation state · intent classifier · F08 · F14 · F15 · F19 · F22 · F16 | Five-question chain works and drives the UI |
| **7** | 11–13 | Voice I/O · hardening · acceptance tests | All 32 features pass |

**Critical path:** vocabulary contract → connector → loader → `owns.metadata.source` → M01/M03 →
banding → snapshot/differ → demo. Waves 2 and 3 overlap; everything after wave 4 parallelises.

**Wave 0 is urgent and independent.** Two of F28's change types — team membership and team-repository
permission — **cannot be backfilled**; GitHub keeps no history of either. They exist only from the
moment we start watching. Two days for one person, no dependencies. Start today and week 10's
dashboard opens on ten weeks of real change; start in week 10 and it opens empty.

## 6.3 Squads

Assign once and leave them. Reshuffling costs more than it gains. Put the two strongest on A and the
next two on B.

| Squad | People | Owns | Active from |
|---|---|---|---|
| **A — Connector** | 3 | F01, F31, `graphLoader.js`, F27 | Wave 1 |
| **B — Time** | 2 | F28, F02, F06, M10 extension | Wave 3 |
| **C — Trust** | 2 | D5 `ev()`, D2 banding, F30, F18, F09 surfacing | Wave 2 |
| **D — Writes** | 2 | F32, F29, F23, F24, F11 | Wave 4 |
| **E — Intelligence** | 1 | M03 R2–R5, F04, F07 | Wave 2 |
| **F — Frontend** | 2 | F17 eleven views, search, F12, F16 | Wave 2 |
| **G — OBA** | 1 | F08 intent, F13, F14, F15, F19, F22, F20 | Wave 4 |

Squads B, D and G are idle in waves 1–2. Give them the vocabulary contract, test fixtures, the F21
persona spec and view designs — or they will build against seeded data and throw it away.

## 6.4 Making one reviewer work across thirteen builders

One reviewer sustains 4–6 juniors well. Thirteen only works if review is engineered:

1. **The reviewer designs; interns build.** Do not build F01 yourself. Mornings on design notes for
   the next hard piece, afternoons on review. Design judgement is the scarce output and it does not
   scale by typing.
2. **Pair every hard item.** Two people on the connector, the differ and the write path. The pair
   catches ordinary mistakes before the diff reaches review.
3. **Acceptance tests ship with the PR, or the PR is not reviewed.** The largest multiplier
   available. Review becomes "do the tests test the stated behaviour" — minutes, not hours. Enforce
   from the first PR; it is unrecoverable if allowed to slip.
4. **Batch review in fixed, published windows.** Continuous interruption destroys the design half of
   the job — the half only the reviewer can do.
5. **PRs above ~400 lines are returned unread.**

Expect throughput equal to about six experienced engineers, not thirteen. **A second reviewer
compresses the schedule by 3–4 weeks** and is the cheapest available acceleration. The commit
history shows people already operating at that level on this codebase.

---

# PART 7 — RISKS

| Risk | Why it bites | Mitigation |
|---|---|---|
| **Connector emits wrong entity or edge types** | All 55 modules silently return empty; looks like total failure | §1.4 contract first. A fixture test asserting every module returns non-empty on a synthetic graph. |
| **Org-level read access not granted** | D1 rank 2 does not exist; with one repository that removes a third of the ownership model | Start GitHub App approval today. If refused, ship ranks 1 and 3 and state the gap honestly — do not fake it. |
| **Modules written for 16 entities, run on thousands** | M34 does transitive closure over every entity; M28 runs DFS per node; M49 serialises the whole graph per call | Load-test in wave 1, before features depend on them. Budget a tuning pass in wave 2. |
| **Two sources of truth** | 54 routes compute from Supabase; the Brain computes its own. Both seeded now, so they agree. Real data will make them diverge, visibly | **Decide before wave 4.** Either claim-bearing routes call Brain capabilities, or Brain output is persisted and routes read it. Owned by the runtime lead. **No feature repairs this.** |
| **`A.confidence()` presented as reliability** | It is `0.55 + 0.45 × coverage` | Never show the number. D2 exists for this. |
| **Graph rebuilt per boot** | No continuity between runs | Wave 0 snapshots are the continuity layer. Do not defer them. |
| **F01 overruns** | Hardest item, built by juniors | Move a second pair onto A. Wave 3 cannot start without it — the differ has nothing to diff. |
| **F17 overruns** | Eleven views is the largest volume item | Ship six for the demo — Dashboard, Systems, Ownership, Risks, Knowledge, History — and defer the rest. |

**If week 7 must hold, cut in this order:** F20 voice → F16 → F22 → F17 views 7–11 → F19.
**Never cut F30, F32, F09 or F10** — they are the trust features, and without them the demo is a
prettier version of what exists today.

---

# PART 8 — DECISIONS AND SETUP BEFORE DAY 1

## 8.1 Cannot be delegated

| # | Decision | Time |
|---|---|---|
| 1 | **Org-level GitHub read access.** Install the App with Organization → Members and Administration (read). Has approval lead time and blocks wave 1. | 1 hr + wait |
| 2 | **Confirm the §5 layout and its four rules.** | 15 min |
| 3 | **Python runtime status** — active, superseded, or unknown. Last touched 2026-07-03. | 10 min |
| 4 | **Two sources of truth** (Part 7). Needed before wave 4, but decide early. | 30 min |
| 5 | **Who defines the System path scopes.** Two hours with someone who knows the codebase boundaries. | 2 hrs |

## 8.2 Delegable on day 1 — review before others build on them

| Task | Give to | Time |
|---|---|---|
| **§1.4 vocabulary contract** | One strong intern, reading `analytics.js` and `implementations.js` | 0.5 day |
| Environment setup page — Docker Postgres 5433, migrations, running API and frontend | One intern | 4 hrs |
| **Worked example** — implement F24 end to end as the pattern everyone copies (migration, route, auth check, test, PR) | Strongest intern | 3 days |
| Verify §1.5 facts, and whether the frontend shells are genuinely reusable | One intern | 3 hrs |
| Definition of done — branch naming, PR size, reviewers, coverage expectation | One intern, you approve | 1 hr |

---

# APPENDIX — FEATURE INDEX

| F | Name | Status | Module / location | Effort (pd) |
|---|---|---|---|---|
| F01 | Connect real data | New (G1) | `connectors/github/` | 20–26 |
| F02 | See changes | New (G2) | M10 | 4–5 |
| F03 | Who owns what | **Exists** | M01 | 0 |
| F04 | Detect risk | Edit | M03 | 6–8 |
| F05 | Knowledge concentration | **Exists** | M09, M30 | 0 |
| F06 | History | New (G2) | M10 | 4–5 |
| F07 | Tribal knowledge | Edit | M09, M07 | 4–5 |
| F08 | Ask OBA | Edit | M50, M55 + route | 8–11 |
| F09 | Inspect evidence | **Exists** | all 55 | 0 |
| F10 | Reliability | **Exists** + banding | M46 + route | in G5 |
| F11 | Review a claim | New (G3) | route | 5–6 |
| F12 | Dashboard | **Exists** | M36, M23 | 0 |
| F13 | Briefing | **Exists** | M23 | 0 |
| F14 | Continuous conversation | New (G4) | route | 5–6 |
| F15 | Live context | New (G4) | route | 6–8 |
| F16 | Contextual UI | New (G6) | route + frontend | 6–8 |
| F17 | Manual exploration | **Exists** + rebind | frontend | 22–30 |
| F18 | Evidence drill-down | New (G5) | `implementations.js:21` `ev()` | 4–5 |
| F19 | Follow-ups | New (G4) | route | 3–4 |
| F20 | Voice | Edit | M22 + route | 6–8 |
| F21 | OBA identity | **Exists** | M21 | 0 |
| F22 | Conversation memory | New (G4) | route | 6–8 |
| F23 | Record decision | New (G3) | M14 + route | 4–5 |
| F24 | Decision history | New (G3) | M14 + route | 3–4 |
| F25 | Access | **Exists** | `auth_schema.sql` | 0 |
| F26 | Activity history | New | route | 3–4 |
| F27 | Live updates | New (G1) | connector + frontend | 4–5 |
| F28 | Change detection | New (G2) | M49 → `graph_snapshot` → M10 | 10–14 |
| F29 | Knowledge capture | New (G3) | M07, M08 + route | 8–10 |
| F30 | Unknowns | New (G5) | M01, M15, M46 + route | 5–6 |
| F31 | Entity resolution | New (G1) | `connectors/github/` | in F01 |
| F32 | Human override | New (G3) | M01, M14 + loader | 6–8 |
