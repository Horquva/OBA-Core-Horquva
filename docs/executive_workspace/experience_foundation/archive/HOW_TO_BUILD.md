# HOW TO BUILD — the 32 features

Companion to `MVP_FEATURE_SPEC.md`. That document says *what* and *why*. This one says **exactly
which file you open**.

Read Part A and Part B once. Then read only your feature in Part C.

---

# PART A — HOW WE WORK

1. `ocos/develop` is the baseline. Branch from it, never from `main`.
2. One feature = one branch = one PR. `feat/F14-conversation-continuity`.
3. When your branch is ready, **tell the reviewer** — post the branch name and the feature ID. Don't
   wait to be asked.
4. Rebase on `ocos/develop` before you ask for review.
5. Tests ship in the same PR. A PR without them is not reviewed.
6. If your PR is over ~400 lines, split it.

---

# PART B — WHERE THINGS GO

**Six kinds of change. Each has a create step and a wire step. Skipping the wire step is the most
common way a correct feature does nothing at all.**

### B1 · A new API endpoint

- **Create:** `backend/routes/<domain>/<name>.js`
- **Wire:** add one line to `backend/index.js`, in the block at lines 38–83:
  `app.use('/api/<domain>', require('./routes/<domain>/<name>'))`
- **Copy:** [backend/routes/ownership.js](backend/routes/ownership.js) — the canonical shape:
  `express.Router()`, `require('../supabase')`, query, shape the JSON, `try/catch` returning 500,
  `module.exports = router`.
- **Miss the wire step and:** the endpoint 404s and looks unbuilt.

### B2 · A new database table

- **Create:** `backend/sql/NN_name.sql`, next number in sequence, forward-only.
- **Wire:** add `await runMigration('NN_name.sql')` to `backend/run_migrations.js` around line 64.
- **⚠ The runner does NOT scan the folder.** It executes a hardcoded list. Your migration will
  silently never run if you skip this. This has bitten people already.

### B3 · Changing what a brain module computes

- **Edit:** `backend/brain/modules/implementations.js`. Find `IMPL.M03 = (rt) => {...}`. One file,
  1338 lines, all 55 modules as entries on the `IMPL` object.
- **Wire:** nothing. Module codes are declared in `backend/brain/data/constitutional-modules.js` and
  already registered. Editing an existing `IMPL.MXX` needs no registration.
- **Rule:** a module is a pure function of `rt.graph`. It must not read Supabase, call the network,
  or hold state between calls. If your feature needs to write something, it is not a module change —
  see B6.
- **Shared graph helpers** live in `backend/brain/modules/analytics.js` on the `A` object. If two
  modules need the same computation, put it there.

### B4 · A new frontend view

- **Create:** `frontend/app/<route-name>/page.tsx`. Next.js app router — **the folder name is the
  URL.** `frontend/app/systems/page.tsx` serves `/systems`.
- **Wire:** nothing. No router file to edit.
- **Calling the API:** inline `fetch(\`${base}/api/...\`)` as in
  [frontend/app/ownership/page.tsx:22](frontend/app/ownership/page.tsx:22), or a shared typed client
  in `frontend/services/*.ts` — see `frontend/services/voiceApi.ts`. Use a service when more than one
  view calls the same endpoints.
- **Existing views:** 25 folders already under `frontend/app/`. Check whether yours exists as a shell
  before creating a new one. Rebind, don't recreate.

### B5 · Where the graph gets its data

- **Today:** `backend/brain/knowledge/graphSeeder.js` builds a hard-coded demo org (82 lines — read
  it, it is the template for the real thing).
- **Create:** `backend/brain/knowledge/graphLoader.js`, same output shape, real source.
- **Wire:** `backend/brain/runtime/runtime.js:63`, currently `if (seed) seedDemoOrganization(graph)`.
  Add the branch so `bootBrain({ seed: false, load: true })` calls the loader.
- **Both paths must keep working.** Seeded mode is how everyone else develops while the connector is
  being built.

### B6 · Human input (the write path)

**Modules never accept writes.** The chain is always:

```
route → Supabase table → graphLoader materialises it as an edge → module reads it as graph
```

So a write feature is: a table (B2) + a route (B1) + a few lines in `graphLoader.js` (B5). No
runtime change, ever. If you find yourself wanting to mutate state inside `implementations.js`, stop
and re-read this.

### B7 · The brain's own HTTP surface

`backend/brain/runtime/brainApi.js` and `backend/brain/knowledge/graphApi.js`, mounted under
`/api/brain` by `backend/brain/index.js:28`. Add endpoints here only if they are about the brain
itself (status, execution, graph traversal). Product endpoints go in `backend/routes/` per B1.

### B8 · Vocabulary — read this before writing any connector code

Modules match relationship types by exact string: `analytics.js:24` is `r.type === 'owns'`. Emit
`"owner"` or `"OWNS"` and that module returns an empty array. So do the other 54. Nothing throws.

Entity types (`analytics.js:10-11`): `system` `ai_agent` `workflow` `knowledge` `policy` `process`
`asset` `project` · `executive` `employee` · `organization` `department` `team` · `vendor` `customer`

Edge types: `owns` · `depends_on` · `governs` · `supports` · `reports_to` · `manages` ·
`collaborates_with`

---

# PART C — THE 32 FEATURES

Each entry: **Problem · Files · Wiring · Build · Depends on · Done when · Effort**

---

## GROUP 1 — Built already. Needs only real data. (9 features, 0 module changes)

These nine work today against seeded data. Nothing to write in the brain. The work is verifying they
still hold on real data and fixing the surface where they don't.

### F03 — Who owns what
**Problem.** Executives can't see who owns which system.
**Files.** None in the brain. `IMPL.M01` already maps assets → owners and computes
`ownershipCoverage`.
**Build.** Verify against real data after F01 lands. Surface the D1 rank and, where there is no
owner, the explicit unknown state — never a blank cell.
**Depends on.** F01, F30.
**Done when.** Every system returns owners with rank, or an explicit unknown state.
**Effort.** 0 (absorbed into F01 verification)

### F05 — Knowledge concentration
**Problem.** One person holds knowledge nobody else has, and nobody knows until they leave.
**Files.** None. `IMPL.M09` (bus factor) and `IMPL.M30` (`concentrationRatio`, flags above 0.40).
**Build.** Verify on real contributors. The correctness risk is upstream: if F31 hasn't merged
duplicate identities, one person counts as two and the concentration disappears.
**Depends on.** F01, **F31**.
**Done when.** A real contributor above threshold is named with their share; bots excluded; one
human counted once.
**Effort.** 0

### F09 — Inspect evidence
**Problem.** A claim with no visible basis is not trustworthy.
**Files.** None. Every module already returns `evidence[]` of `{source, ref, note}`.
**Build.** Surface it. The work is in the views (F17) and the drill-down (F18).
**Done when.** Every displayed claim lists its evidence, including records that contradict it.
**Effort.** 0

### F10 — Reliability
**Problem.** Users can't tell a strong claim from a weak one.
**Files.** None. Every package carries `confidence`; `IMPL.M46` computes `truthScore`.
**Build.** Band it at the surface. **Never render the raw number** — `analytics.js:122` computes it
as `0.55 + 0.45 × coverage`, which is a coverage proxy, not a reliability measurement. Showing
`0.87` implies a precision that does not exist.
**Depends on.** The banding work in F30.
**Done when.** Every claim shows a band and the rule that produced it. No number anywhere.
**Effort.** 0 (banding counted in F30)

### F12 — Dashboard
**Problem.** No single place showing what needs attention.
**Files.** `frontend/app/page.tsx` (rebind). Brain side: `IMPL.M36` emits typed signals,
`IMPL.M23` assembles the executive view.
**Build.** Bind the existing view to real signals. Cap at 7 items.
**Done when.** Renders real data, max 7 items, coverage statement present.
**Effort.** counted in F17

### F13 — Briefing
**Problem.** Executives want an assessment, not a list.
**Files.** `IMPL.M23` already returns `briefing: [...]` plus `recommendedPriorities`. Route exists at
`backend/routes/briefing/briefing.js`.
**Build.** Rebind to real data.
**Done when.** Reads as one connected assessment under 150 words; every fact traces to a dashboard
item.
**Effort.** 0

### F21 — OBA identity
**Problem.** An assistant with no consistent voice isn't trusted with judgement.
**Files.** `IMPL.M21` — per-executive avatar with role, scope, `opensWith` greeting.
**Build.** Verify the same persona is used by chat, briefing and voice. No raw enums or GitHub
logins in any user-facing string.
**Effort.** 0

### F25 — Access
**Problem.** Not everyone should see or change everything.
**Files.** `backend/sql/auth_schema.sql`, `backend/routes/auth/auth.js`,
`backend/middleware/`. JWT with roles `member` / `admin` / `executive`.
**Build.** Verify every mutating route added in Group 3 has a server-side role check.
**Done when.** Role checks enforced server-side on every mutating route — not by hiding buttons.
**Effort.** 0 (but every write feature must add its own check)

### F17 — Manual exploration
**Problem.** Not every question is a chat question. People need to browse.
**Files.** `frontend/app/<view>/page.tsx` — eleven views: Dashboard · People · Teams · **Systems
(new)** · Ownership · Risks · Knowledge · History · Claims · Evidence · Decisions.
Most exist as shells under `frontend/app/` already. **Systems is genuinely new.**
**Wiring.** None — folder name is the route (B4).
**Build.** One view = one ticket = one person. Do not treat the list as a single item. **Global
search across systems, people and teams is mandatory** — eleven list views without search is
unusable. Every view must render the unknown/stale/conflict states from F30, never blank.
**Depends on.** F01 for data, F30 for states.
**Done when.** All eleven render real data; search works; no view renders blank where an unknown
state applies.
**Effort.** 22–30 pd — the largest volume item. Split across at least two people.

---

## GROUP 2 — Small edits to existing modules (4 features)

### F04 — Detect risk
**Problem.** Risks are visible only if someone goes looking.
**Files.** `backend/brain/modules/implementations.js` → `IMPL.M03`.
**Wiring.** None (B3).
**Build.** R1 already exists via `M01.unownedAssets`; R4 via M09/M30. Add:

| ID | Condition | Trigger | Severity |
|---|---|---|---|
| R2 | Owner departed, not reassigned | owning `employee.status = departed`, no `ownership_changed` since | Critical |
| R3 | Ownership changed with no decision | `ownership_changed` with no linked decision after 7 days | Medium |
| R5 | Ownership in conflict | two `owns` edges, different `metadata.source`, different owners | High |

Nothing outside R1–R5 is detected. Status lifecycle `open → under_review → resolved | accepted`. A
risk that stops firing auto-resolves **with a recorded reason** — never silently deleted.
**Depends on.** R2 and R3 need change events (F28). R5 needs `metadata.source` (F01).
**Done when.** All five fire correctly on real data with a resolution reason recorded.
**Effort.** 6–8 pd

### F07 — Tribal knowledge
**Problem.** The reasons behind decisions live in people's heads.
**Files.** `implementations.js` → `IMPL.M09`, `IMPL.M07`.
**Build.** The `knowledge` entity type already exists. Add body text and subject-scoped retrieval so
a "why" question about a system returns the recorded rationale.
**Depends on.** **F29** — without captured knowledge there is nothing to retrieve.
**Done when.** A why-question about a system returns its recorded rationale with author and date.
**Effort.** 4–5 pd

### F08 — Ask OBA
**Problem.** Executives ask in natural language; the runtime needs module codes.
**Files.** **New route** `backend/routes/oba/ask.js`. Classifier logic in
`backend/services/oba/intent.js` (new).
**Wiring.** `app.use('/api/oba', require('./routes/oba/ask'))` in `backend/index.js`.
**Build.** An intent classifier **in front of** the runtime that sets `context` and picks modules.
This is a route-layer concern — do not put it in `implementations.js`. Fusion already works via M50
and M55.

Supported intents, complete list — anything else is **refused, not guessed**:
`who_owns` (M01) · `what_changed` (M10) · `why_risky` (M03) · `what_happening` (M23 scoped) ·
`has_happened_before` (M10) · `what_should_i_know` (M23) · `why_reason` (F07) · `who_knows` (M09)

**OBA never states a fact without a claim id.** A statement without one is a bug.
**Done when.** All eight intents route correctly; an out-of-set question is refused clearly.
**Effort.** 8–11 pd

### F20 — Voice
**Problem.** Executives want to ask without typing.
**Files.** `backend/routes/voice/voice.js` (exists), `frontend/services/voiceApi.ts` (exists).
Module side: `IMPL.M22` already generates the spoken sentence.
**Build.** STT/TTS I/O at the route layer. **An explicit confirmation path when transcription
confidence is low** — acting on a misheard question is worse than asking again.
**Done when.** Spoken question → spoken answer, with confirmation on low-confidence transcription.
**Effort.** 6–8 pd · **first thing to cut if the schedule slips.**

---

## GROUP 3 — Real data (3 features)

### F01 — Connect real organizational data
**Problem.** Everything above runs on a hard-coded demo org.
**Files.** **New directory** `backend/connectors/github/`:
`client.js` (auth, pagination, rate limit) · `mapSystems.js` · `mapPeople.js` · `mapOwnership.js` ·
`mapDependencies.js` · `ingest.js` (orchestrates a run).
**Wiring.** Nothing to mount — this is a job, not a route. It writes canonical tables (B2). The
graph picks it up via F01's sibling, `graphLoader.js` (B5).
**Build.**
- GitHub App on the Horquva org. Permissions: Repository → Contents, Metadata, Pull requests (read);
  Organization → Members, Administration (read).
- Onboarding, five steps: install → select scope → **map path scopes to named systems** → nominate
  users and roles → backfill with visible progress.
- Ingestion cycle: teams and members → repositories → permissions → CODEOWNERS → commits → PRs →
  identity resolution → write canonical tables → load graph → snapshot → diff.
- **Rate limiting:** GraphQL for teams, repos, permissions, CODEOWNERS — one paginated query per
  resource type, *not one per repository*. REST only for commit history. Below 10% remaining, pause
  until reset. A run that hits the ceiling closes as `partial`, never `complete`, and sets
  `requires_review` on dependent claims.
- **`owns.metadata.source`** must be set on every ownership edge, one of `codeowners` /
  `team_permission` / `contribution` / `human`. Four separate features read this field. If it is
  dropped, all four degrade and no test fails.
- Read B8 before writing a line.
**Done when.** Real repository, contributors and (given org access) teams queryable with observation
timestamps; running twice produces zero duplicates; no demo seed row reachable.
**Effort.** 20–26 pd — largest single item. **Two people.**

### F31 — Entity resolution
**Problem.** One person under several git identities counts as several people, and concentration
risk vanishes.
**Files.** `backend/connectors/github/mapPeople.js`. Admin merge/split route:
`backend/routes/identity/merge.js` + `app.use` line.
**Build.** **Deterministic matching only,** in order: GitHub numeric id → verified org-domain email →
the `noreply` email pattern. **No name-similarity matching** — a wrong merge is invisible and
silently corrupts F05. Admin merge/split decisions are re-applied on every run so ingestion never
undoes them. Bots classified by account type, `[bot]` suffix, or configured list. Departure = removed
from the org (authoritative) or inactive beyond a configured threshold (provisional, and labelled as
provisional).
**Real test cases in this repo:** `Kamil Ejaz` / `KamilEjaz890`, `Kamran Ali` / `Kamran Ali Chandio`,
and `dependabot[bot]`.
**Done when.** Those two pairs resolve to one person each and count once in F05; the bot appears in
no ownership or concentration result.
**Effort.** included in F01

### F27 — Live updates
**Problem.** A pipeline nobody can see is indistinguishable from a broken one.
**Files.** `backend/connectors/github/ingest.js` (schedule), every `frontend/app/*/page.tsx`
(last-refresh display).
**Build.** Three visible manifestations, all required: last-refresh time on every view; "since your
last visit" marking on the dashboard; refresh in place without a page reload.
**Done when.** All three visible.
**Effort.** 4–5 pd

---

## GROUP 4 — Time (3 features)

**The foothold already exists.** `IMPL.M49` (Digital Twin) at
`implementations.js:1116` already emits exactly the snapshot needed:

```js
twin = { syncedAt, entities: [{id,type,name,status}], relationships: [{from,type,to}], stats, layers }
```

A timestamped, serialisable, complete graph state. Already written, already running. Nobody needs to
build a snapshotter — persist what M49 already returns.

### F28 — Change detection
**Problem.** The system knows the present and has no memory of the past.
**Files.** `backend/sql/NN_graph_snapshot.sql` (new table: `id`, `taken_at`, `payload jsonb`) ·
`backend/services/change/differ.js` (new) · `implementations.js` → `IMPL.M10`.
**Wiring.** Migration line in `run_migrations.js` (B2 — don't forget). No wiring for the M10 edit.
**Build.**
1. Persist M49's payload after each ingestion run.
2. Diff consecutive snapshots into typed change events.
3. Extend M10 to read change events, not only the intelligence bus.

Supported change types — derivable from an entity/relationship diff and nothing more:
`owner_added` · `owner_removed` · `ownership_changed` · `dependency_added` · `dependency_removed` ·
`entity_added` · `entity_archived` · `person_departed` · `governance_changed`

Every event carries `change_type`, `object`, `previous_state`, `current_state`, `occurred_at`,
`detected_at`, `detection_method`, involved people and teams. **Where only detection time is
knowable, the UI must say "detected on"** — conflating the two makes the product lie about timing.

**Backfill:** `git log --follow` on the CODEOWNERS path replays real historical `owns` edges with
real dates. **Team-permission history is not retrievable from GitHub** and starts at t0 — which is
why the snapshot job should start running before the feature is built.
**Depends on.** F01.
**Done when.** A real org change produces the correct typed event on the next run, before and after
populated.
**Effort.** 10–14 pd

### F02 — See changes
**Problem.** A raw diff is unreadable to an executive.
**Files.** `backend/routes/changes/changes.js` (new + `app.use`) · `frontend/app/page.tsx`.
**Build.** Each change as one natural-language line generated from the typed event, never a raw
diff, with all six inspectable fields one click away and a link to its evidence. The dashboard shows
only `ownership_changed`, `owner_removed`, `person_departed`, `entity_archived`.
**Depends on.** F28.
**Effort.** 4–5 pd

### F06 — History
**Problem.** "Has this happened before?" has no answer.
**Files.** `frontend/app/history/page.tsx` · reads the F02 route.
**Build.** Object timeline, reverse chronological. **Every timeline states its own start date**, and
backfilled events are visually distinct from observed ones — so a partial history is never mistaken
for a complete record.
**Depends on.** F28.
**Effort.** 4–5 pd

---

## GROUP 5 — The write path (5 features)

**One design decision covers all five.** Modules stay pure functions, so humans never write to a
module. They write to Supabase; the loader materialises their input as graph edges:

```
Executive corrects an owner
        │  POST /api/ownership/override
        ▼
   human_assertion table
        │  next graph load
        ▼
   graphLoader adds: owns edge · metadata.source='human' · asserted_by · asserted_at
        │
        ▼
   M01 ranks it first · M46 sees a corroborating source · M03 re-evaluates the risk
```

**Not one line of the runtime changes.** Every feature below is: table (B2) + route (B1) + a few
lines in `graphLoader.js` (B5). Each route needs its own F25 role check.

### F32 — Human override
**Problem.** When the system is wrong about ownership, there's no way to correct it.
**Files.** `backend/sql/NN_human_assertion.sql` · `backend/routes/ownership/override.js` ·
`graphLoader.js`.
**Build.** Materialises as an `owns` edge with `source='human'`. **Reason is required**, and is
stored as a knowledge entry — the correction teaches the system instead of patching it. Survives
every ingestion run until revoked. Flagged redundant once derived state agrees, so the system
converges on real sources rather than accumulating manual patches.
**Done when.** An override survives a full re-ingestion and M01 ranks it above derived ownership.
**Effort.** 6–8 pd

### F29 — Knowledge capture
**Problem.** Nothing records why things are the way they are.
**Files.** `backend/sql/NN_knowledge_entry.sql` · `backend/routes/knowledge/capture.js` ·
`graphLoader.js`.
**Build.** Materialises as a `knowledge` entity plus an `owns` edge to its author. Three capture
paths: inline on any object; **OBA-prompted** when a why-question finds nothing; onboarding seed
import. Human-asserted knowledge enters the reliability bands at *Likely* at best unless
corroborated.
**Note.** Required **before the first executive session**, not merely before F07 — the onboarding
seed (one rationale per top system) is what makes tribal knowledge demonstrate anything on day one.
**Effort.** 8–10 pd

### F23 — Record decision
**Problem.** Decisions happen in meetings and vanish.
**Files.** `backend/sql/NN_decision.sql` · `backend/routes/decisions/decisions.js` (exists — extend).
**Build.** Immutable audit record. Four types: approve, reject, acknowledge, mark for review.
`reject` and `mark_for_review` require a rationale. Also unblocks F04-R3 and gives M14 real decisions
to reason over.
**Effort.** 4–5 pd

### F24 — Decision history
**Problem.** Past decisions aren't findable.
**Files.** `backend/routes/decisions/history.js` · `frontend/app/decision/page.tsx` (exists).
**Build.** Read over the `decision` table by object, claim or person. **Superseded decisions are
shown marked, not hidden.**
**Effort.** 3–4 pd

### F11 — Review a claim
**Problem.** No single place to accept or reject what the system asserts.
**Files.** `backend/sql/NN_claim_review.sql` · `backend/routes/claims/review.js` ·
`frontend/app/claims/page.tsx` (new).
**Build.** One surface showing the claim, its reliability band, its full evidence, and the four F23
actions — **without navigating away**. Rejection is durable across ingestion runs.
**Effort.** 5–6 pd

---

## GROUP 6 — Conversation (4 features)

**The only gap with no existing foothold.** M26 is an ownership footprint; M27 assembles role
context. Neither is conversation memory. **Build this at the route layer, not as a module.** The
runtime already accepts `context`, and modules already read `context.role` and `context.question`.
Conversation is a caller concern; the Brain stays stateless.

**Shared files for all four:** `backend/sql/NN_conversation.sql` (tables `conversation`,
`conversation_turn`) · `backend/services/conversation/subjectStack.js` (new) ·
`backend/routes/oba/ask.js` (from F08).

### F22 — Conversation memory
**Build.** Retrievable by subject across sessions. **Resuming re-resolves cited claims to their
current state** — if ownership changed since, OBA says so rather than repeating stale information.
That is the difference between memory and a transcript.
**Effort.** 6–8 pd

### F14 — Continuity
**Build.** Each turn carries the accumulated subject stack. A bare "Why?" inherits the previous
subject and the natural successor intent. Window: last 10 turns, then fall back to F22 retrieval.
**Effort.** 5–6 pd

### F15 — Live context
**Build.** Subject stack ordered `{type, id, mentioned_at}`. "it" → position 0. "that team" → most
recent of that type. "the other one" → second most recent. **An unresolvable reference produces a
clarifying question, never a guess** — one confidently wrong resolution makes the executive doubt
every previous answer.
**Effort.** 6–8 pd

### F19 — Follow-ups
**Build.** Two follow-up-only intents: `what_evidence` (evidence for the previous turn's claims) and
`how_reliable` (their bands). Valid only as follow-ups, never as openers.
**Effort.** 3–4 pd

---

## GROUP 7 — Provenance (2 features)

### F18 — Evidence drill-down
**Problem.** Evidence exists but can't be traced to its source.
**Files.** `backend/brain/modules/implementations.js:21` — the `ev()` function. **One line, and
every one of the 55 modules inherits it.**
```js
const ev = (source, ref, note) => ({ source, ref, note })   // ← add observedAt, ingestionRunId
```
Plus `backend/routes/evidence/evidence.js` and `frontend/app/evidence/page.tsx`.
**Build.** The full chain: claim → evidence → source → timestamp → freshness → reliability →
supporting context. "Supporting context" = the other claims resting on the same record, which shows
the executive what else depends on this fact.
**Depends on.** F01 (needs real ingestion runs to point at).
**Effort.** 4–5 pd

### F30 — Unknown, staleness and conflict
**Problem.** The system presents gaps as though they were answers.
**Files.** `implementations.js` → `IMPL.M01`, `IMPL.M15`, `IMPL.M46` · a shared banner component in
`frontend/components/` · **every** `frontend/app/*/page.tsx`.
**Build.** Surface four states — unknown, stale, conflicting, confirmed — in executive language with
the concrete reason and, where one exists, the action that would fix it. Persistent coverage banner:
*"Last read: 4 hours ago · 1 of 1 repositories connected · 2 people unresolved."*
**No screen renders blank where one of these states applies.** This is a review checklist item on
every single F17 view.
**Also delivers** the reliability banding for F10 — bands, not numbers.
**Effort.** 5–6 pd · **never cut this.** Without it the demo is a prettier version of what exists.

---

## GROUP 8 — UI routing and audit (2 features)

### F16 — Contextual UI
**Problem.** The executive asks about ownership and has to navigate to the ownership view by hand.
**Files.** `backend/routes/oba/ask.js` (extend response) · `frontend/app/oba/page.tsx`.
**Build.** The route emits a typed side-channel alongside every answer:
```jsonc
{ "view": "ownership | risks | history | knowledge | evidence | decisions |
           people | teams | systems | claims | dashboard | object_detail",
  "subject":   { "type": "system|team|employee", "id": "..." },
  "highlight": [ { "kind": "claim|evidence|change_event", "id": "..." } ],
  "secondary": [ { "view": "...", "subject": {} } ] }
```
Derived from the package `type` every module already returns: `ownership` → ownership view, `risk` →
risks, `dependency` → network. **The UI never parses prose.** Routes only to views that exist in
F17; an unroutable intent degrades to object detail rather than failing.
**Depends on.** F08, F17.
**Effort.** 6–8 pd

### F26 — Activity history
**Problem.** No record of who looked at or approved what.
**Files.** `backend/sql/NN_activity.sql` · `backend/middleware/activityLog.js` (new) ·
`backend/index.js` (mount the middleware alongside `requestLogger` at line 36).
**Build.** Who viewed what, who approved or rejected, when, what was affected. **Mutation logging is
synchronous and in the same transaction** — an approval that isn't logged didn't happen. View
logging is best-effort and asynchronous; never let it slow a read.
**Effort.** 3–4 pd

---

# BUILD ORDER

Dependencies, not a schedule. Assign as you see fit.

```
F01 + F31  ──┬── unblocks ── F03 F05 F27 F17 F18
             │
             ├── F28 ──── F02 F06 ──── F04(R2,R3)
             │
             ├── F32 F29 F23 F24 F11 ──── F07  F04(R3)
             │
             └── F08 ──── F14 F15 F19 F22 ──── F16

F30 runs alongside everything and gates every view.
```

**Only hard rule:** F01 is upstream of everything. Nothing else can be verified against real data
until it lands, so it gets your two strongest people and starts first.
