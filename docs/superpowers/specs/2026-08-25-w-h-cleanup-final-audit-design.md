# W-H: Cleanup & Final Audit — Design

Date: 2026-08-25
Decisions covered: D-09b, D-15, F-I (existing) plus D-37…D-40 (new, decided during this
workstream's tracing phase — the same pattern that closed gaps in every prior workstream's starting
decisions).

Owner context: this is the last workstream. D-15's endpoint census (177 endpoints, all cross-
referenced against the frontend, tests, and tools) was delegated to a background agent for pure,
non-destructive discovery; every classification decision and every deletion below was made by
tracing the agent's evidence directly, the same rigor as every other workstream — the agent produced
evidence, not verdicts.

---

## 1. D-37 · `governance_assessments`/`continuity_assessments` were never migrated — and don't need to be

D-09's sequencing for the DROP list is explicit: *"derive live → migrate consumers → verify
equivalence → then drop."* Traced each of the 5 DROP-list tables individually rather than trusting
that "W-D: DONE" covered all of them.

**3 of 5 are already fully migrated and safe to drop as-is:**
- `dept_health_scores` — migrated during W-D (D-21/F-L): `derived.js`'s `orgHealthByDepartment()`
  replaced it; `health.js:208`'s own comment confirms this. Zero live `.from('dept_health_scores')`
  calls remain anywhere in `backend/`.
- `collaboration_scores` — confirmed orphaned as of W-B (the original F-J finding). Zero live reads;
  `collaboration.js:9`'s own comment documents the migration.
- `predictive_risk_scores` — same: `voice.js`, `signals.js`, `predictiveRisk.js` all carry
  comments documenting the move to `domain.intelligence.all()`'s live computation. Zero live reads.

**2 of 5 were never migrated, and tracing why reveals they don't need a live replacement at all:**
`backend/routes/governance/governance.js` and `backend/routes/continuity/continuity.js` still read
`governance_assessments`/`governance_gaps` and `continuity_assessments`/`continuity_plans` live,
unconditionally, on every request — 10 endpoints total (5 each: `/score`, `/assets`,
`/heatmap`|`/risk-map`, `/gaps`|`/plans`, `/offenders`|`/must-protect`). Every score, status, and gap
comes straight from a table seeded once and never rewritten (no write loop, D-04) — the exact F-C
pattern (a frozen number presented as live) this entire remediation exists to close, sitting
untouched because neither W-B, W-D, nor any prior workstream's affected-file list happened to name
these two files.

The reason this isn't a bigger emergency: **zero real product consumers.** `frontend/lib/api.ts`
(the app's central API client) has no calls to `/api/governance` or `/api/continuity` anywhere.
`frontend/` overall has exactly one reference to either path:
`frontend/components/admin/EndpointHealthGrid.tsx`'s reachability-ping registry — which checks that
a `GET` returns something, not that the something is correct or current. No dashboard page, card, or
component renders this data. `backend/tests/` and `backend/tools/` have zero references either.

**Consequence:** building a live equivalent nobody asked for (the way `orgHealthByDepartment` was
built for a real consumer) is not justified here — there is no real consumer to serve. This is
*not* a D-15 dead-endpoint deletion (§3 covers why the census itself found zero DEAD and left these
two as DISCOVERY/AMBIGUOUS on caller-count grounds alone) — it's a direct consequence of D-09b: once
`governance_assessments`/`continuity_assessments` drop, `governance.js` and `continuity.js` have no
data left to serve, so they're deleted outright rather than rewritten. Their 4 backing tables
(`governance_assessments`, `governance_gaps`, `continuity_assessments`, `continuity_plans`) drop
alongside the other 3 under D-09b — with no migration step needed, because nothing was consuming a
"current" answer from them in the first place. `EndpointHealthGrid.tsx`'s two ping entries for them
come out in the same change (they'd otherwise ping routes that no longer exist).

**Not touched:** `routes/automation/governance.js`'s `GET /api/automation/governance` and
`.../continuity` — a same-named but entirely unrelated feature (the self-healing/automation layer's
pending-approvals and backup-coverage advisories), confirmed by reading both files; they don't touch
`governance_assessments`/`continuity_assessments` at all.

## 2. D-38 · F-I closed by removing genuinely-dead duplication, documenting the genuinely-used pair

`dependencies` carries two edge representations: the polymorphic `source_id`/`target_id` +
`source_type`/`target_type` (supports agent, workflow, platform, and employee endpoints), and
`agent_source`/`agent_target` — two dedicated, FK-constrained columns that duplicate the polymorphic
pair's *value* whenever both ends happen to be agents, and are `NULL` otherwise. Confirmed against
the seed data (`backend/sql/02_seed_data.sql:202-224`): every agent→agent row's `agent_source`/
`agent_target` values are byte-identical to that row's `source_id`/`target_id`; every cross-type row
(workflow→agent) has them `NULL`. Since no write path exists to `dependencies` (D-04), this
relationship cannot drift — the duplication is safe by construction, not a live risk. One tool
(`backend/tools/export-company.js:348`) already carries a comment saying exactly this and bypasses
the duplicate columns entirely, referencing "R-4, R-5" — independent prior confirmation, not a
finding invented fresh here.

Traced every real consumer rather than assuming both representations are equally load-bearing:

- **`derived.js`, `graphLoader.js`, `network.js`, `risks.js`, `export-company.js`** — all five
  already use only `source_id`/`target_id` + the type columns. This is the de facto canonical
  representation, consistent with D-12 naming `derived.js` the truth layer.
- **`routes/dependencies.js`'s `GET /`** — selects `agent_source`/`agent_target` via PostgREST
  embedding (`agents!dependencies_agent_source_fkey`) to attach each edge's agent detail inline, and
  returns the whole embedded object in `dependencies: data`. Checked whether the frontend reads
  `.agent_source`/`.agent_target` from this response: **it does not** — `frontend/` has zero
  references to either field name anywhere. This embedding computes a join, sends it over the wire,
  and nothing consumes it. Genuinely dead weight — removed from the `.select()`.
- **`routes/simulations/agentFails.js`'s `GET /:agent`** — a real, working use: filters
  `.eq('agent_target', targetAgent.id)` and embeds `dependent:agent_source(id, name, status, risk)`
  to build the `impactedAgents` list for the "if this agent fails" simulation. This one is kept
  as-is rather than migrated to a two-query polymorphic-column equivalent — the FK-embedding is
  exactly what those columns exist for, correctness is already guaranteed (no drift possible, per
  above), and migrating it would add a second round-trip for a purely architectural preference with
  no behavior change. A comment is added explaining why this file is the deliberate exception rather
  than an oversight.

**Not touched:** the `agent_source`/`agent_target` columns themselves, and their FK constraints
(`backend/sql/05_foreign_keys.sql:35-36`) — `agentFails.js` still depends on them for a real feature.
Dropping them would break a working simulation for zero benefit. `01_schema_migration.sql`'s
`dependencies` table definition gets a comment explaining the relationship, so a future reader
doesn't have to re-derive what this section just traced.

## 3. D-39 · Endpoint census: zero DEAD, 9 AMBIGUOUS adjudicated, nothing deleted under D-15 itself

Full raw evidence — every endpoint, its route file, and every frontend/test/tools cross-reference —
is in the companion file
[`w-h-endpoint-census-raw.md`](w-h-endpoint-census-raw.md). Method: walked `backend/index.js`'s
mounts and every sub-mount recursively (all HTTP methods, not just GET like `sweep.js`), then
cross-referenced each of the 177 found endpoints against `frontend/lib/api.ts`, every direct
`fetch()` call elsewhere in `frontend/` that bypasses it, `backend/tests/`, and `backend/tools/`.

**177, not 176.** No duplicate method+path pairs — verified programmatically, not a script error.
Most likely explanation: the decision log's "176" predates W-G's two new graph routes (D-31). Not
chased further; flagged for the record rather than silently reconciled, matching this project's own
standing practice.

**Classification: 51 ACTIVE, 20 ADMIN, 97 DISCOVERY, 9 AMBIGUOUS, 0 DEAD, 0 INTERNAL.** D-15 says
"delete only proven-dead," and the honest result of actually checking is that almost nothing here is
provably dead — every zero-caller endpoint found is a real, working analysis route with a plausible
manual or future use, not a broken handler or an abandoned duplicate. Manufacturing deletions to
look more thorough would contradict the decision's own conservatism. **D-15 deletes zero endpoints
on its own criterion.** The 10 endpoints that do get deleted in this workstream (`governance.js`,
`continuity.js`) are a consequence of D-09b's table drop (D-37) — their data source is gone, not
their caller count — a stronger and different justification than "nobody calls this."

**The 9 AMBIGUOUS cases, adjudicated:**

| Case | Decision | Reason |
|---|---|---|
| `GET /api/ownership`, `/api/risks`, `/api/dashboard`, `/api/memory/health` | **Leave as DISCOVERY, no change** | Recurring pattern: a live frontend page exists for the same domain but recomputes the analysis client-side (`lib/riskIntelligence.ts`, `lib/orgMemory.ts` — both actively maintained per W-E's D-24/D-27) rather than calling the matching server endpoint. Deciding whether the client or server version should win is a real architectural question, but rewiring live pages to change their data source is a behavior-risking change far outside "classify and delete only proven-dead." Left as a candidate for a future, explicitly-scoped workstream if the owner wants to revisit it — not decided here. |
| `GET /api/continuity/score`, `GET /api/governance/score` | **Resolved by D-37** | Same client-bypass pattern, but moot — both routes are deleted anyway since their whole file goes. |
| `GET /api/workflows/spof` | **Leave as DISCOVERY, no change** | Zero callers, but the decision log's own §4 deferred table already names this file as pending migration onto `spofVerdict()` (D-06's affected-file list, not yet executed). This is known-unfinished work, not orphaned code — deleting it would destroy a route a future D-06 revisit needs. |
| `POST /api/self-healing/run` | **Leave as DISCOVERY, note the gap** | `api.ts` documents it as a completed, live, tested write (one of F-E's 4 pre-existing non-root-mutating writes) with no frontend button wired to it. A real wiring gap, but adding a "heal" button is new UI behavior, not cleanup — noted for a future workstream, not built here. |
| `GET /api/auth/me` | **Leave as DISCOVERY, note the gap** | Tested (`authRoutes.test.js:240`), obvious purpose (token validation), no frontend caller — `AuthContext.tsx` trusts a locally-stored token without a server round-trip. A legitimate session-restoration hardening candidate, but wiring it in is app behavior change, not cleanup — same treatment as the self-healing gap. |

## 4. D-40 · Two real bugs found during the audit, fixed

Distinct from endpoint classification — these are things the census surfaced that are actually
broken today, not merely unused.

1. **`backend/index.js`'s own `/` route self-describes 3 endpoints that don't exist:**
   `/api/brain/boot-report`, `/api/brain/status`, `/api/brain/registry/modules`. `backend/brain/README.md`
   already states explicitly "It is a library, not a service... there is no `/api/brain`" — the
   self-description just never caught up. Removed; the two real entries (`health`, `authLogin`) stay.
2. **`backend/tests/api.smoke.test.js` asserts against those same 3 phantom paths**, and — checked
   independently — its one real check (`/api/health/summary`) never sends an `Authorization` header
   against a codebase where every route it might hit sits behind the global `requireAuth` gate. This
   test could not have passed a single one of its 4 checks in its current form. It's opt-in only
   (`run-all.js` only adds it when `BASE_URL` is set) so this has likely never surfaced as a CI
   failure. Repaired rather than deleted — a live-deployment smoke check is a legitimate thing to
   want — by logging in first (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, matching how every other verification
   step in this remediation authenticates) and swapping the 3 phantom checks for real, meaningful
   endpoints.
3. **`frontend/components/dashboard/RelationshipHealthStrip.tsx` calls `relationshipApi.health()` →
   `/api/relationships/health`, which has never existed** (`docs/executive_workspace/experience_foundation/BUILD_SPEC.md:728-730`
   already documented this, verified still true today). Checked one level further than the census
   did: the component itself is **never imported or rendered anywhere** in `frontend/` — confirmed
   dead on both ends, not a live broken fetch a user would ever see (it fails silently and renders
   `null`). Its link target, `/relationship-explorer`, also does not exist as a page. BUILD_SPEC's own
   instruction is explicit: *"Write it or remove the call from `lib/api.ts`; don't leave it."*
   Building a relationship-health backend feature plus an explorer page is new-feature scope, not
   cleanup — removed the component and its dead API client method instead
   (`relationshipApi`/`RelationshipHealth` in `frontend/lib/api.ts`).
   Checked the two other phantom calls BUILD_SPEC.md names in the same breath
   (`/api/briefing/health`, `/api/briefing/risks`, allegedly called from "the unmounted
   `briefing/index.js`") — neither the phantom file nor any frontend call to those paths exists
   today; already cleaned up by an earlier, uncredited pass. BUILD_SPEC.md itself is not updated —
   confirmed it, like `DATA_MODEL.md`/`INTEGRATION_MAPPING.md`, has never been touched by any of
   W-A through W-G despite equivalent changes elsewhere, so it's treated the same way: historical
   record, not living documentation.

---

## 5. Files touched

Backend:
- `backend/routes/governance/governance.js` — delete (D-37).
- `backend/routes/continuity/continuity.js` — delete (D-37).
- `backend/index.js` — remove the two `/api/governance` / `/api/continuity` mounts (D-37); remove the 3 phantom `/api/brain/*` entries from the `/` route's self-description (D-40).
- `backend/sql/13_drop_frozen_aggregates.sql` — new; drops all 7 tables (5 DROP-list + `governance_gaps` + `continuity_plans`) with `CASCADE` (D-09b/D-37).
- `backend/routes/dependencies.js` — remove the dead `agent_source`/`agent_target` embedding from `GET /`'s `.select()` (D-38).
- `backend/routes/simulations/agentFails.js` — add explanatory comment only; no behavior change (D-38).
- `backend/sql/01_schema_migration.sql` — add an explanatory comment to the `dependencies` table definition (D-38).
- `backend/tests/api.smoke.test.js` — repair: add a login step, replace the 3 phantom `/api/brain/*` checks with real authenticated endpoint checks (D-40).

Frontend:
- `frontend/components/admin/EndpointHealthGrid.tsx` — remove the `Governance` and `Continuity` rows from `ROUTE_REGISTRY` (D-37).
- `frontend/components/dashboard/RelationshipHealthStrip.tsx` — delete; never rendered anywhere (D-40).
- `frontend/lib/api.ts` — remove `relationshipApi` and the `RelationshipHealth` type, `relationshipApi.health()`'s only caller is the deleted component (D-40).

Nothing else in D-15's 177-endpoint inventory is deleted, edited, or reclassified in a way that
changes behavior — see §3's table for the 9 AMBIGUOUS adjudications, all "leave as-is."
