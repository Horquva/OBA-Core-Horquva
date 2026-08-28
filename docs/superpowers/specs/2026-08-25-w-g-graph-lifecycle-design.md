# W-G: Graph Lifecycle & Narrative Honesty — Design

Date: 2026-08-25
Decisions covered: D-14 (existing) plus D-28…D-32 (new, decided during this workstream's tracing
phase, the same way D-22…D-27 closed gaps D-07/D-10 left for W-E).

Owner context: this workstream ran unattended per the owner's explicit delegation ("choose the
best option on my behalf and move on") while they were offline. Every decision below is made in
the same spirit as the existing log — Reason/Affected/Consequence stated explicitly — so it reads
the same on review as if it had gone through the interrogation phase live. Nothing here is
provisional; if the owner wants a different call, it is a one-line override, not a redo.

---

## 1. What D-14 already covers, verified against the code

> D-14: Manual graph reload endpoint + expose `loadedAt`. Cannot be admin-gated (D-05). A reload
> is idempotent and non-destructive, so any authenticated user triggering it is acceptable. Every
> graph-derived response carries `loadedAt`.

Traced `backend/brain/index.js`, `backend/domain/index.js`, every caller of `domain.graph.*`, and
`backend/domain/dataset.js` (the second, independent path into the same graph singleton).

**Confirmed true:** `loadGraph()` runs exactly once, at `backend/index.js:128`, at boot. There is
no route anywhere that calls it again. A Supabase hiccup at boot, or any edit to the underlying
data afterward, is invisible until the process restarts.

**Confirmed true, but only for one path:** `backend/brain/index.js` already tracks
`source = { live, stats, loadedAt, error }` internally and exposes it via `graphSource()` /
`domain.graph.source()`.

## 2. D-28 · F-H's "no `loadedAt` exposed anywhere" is stale — corrected

`backend/routes/intelligence/prediction.js` is the **only** route file that calls
`domain.graph.run/runMany/isReady/source` — it serves the 8 Org Science cards (D-18: pattern, dna,
culture, maturity, behavior, benchmark, strategic-alignment, capability-by-dept). Its response
already includes `dataSource: domain.graph.source()` (line 59), which contains `loadedAt`. This
was carried over — not newly added — when W-D's D-18 commit (`f00576e`) moved the file from
`brain.graphSource()` to `domain.graph.source()`; the field predates this workstream entirely.

So F-H's claim was already inaccurate the day it was written (2026-08-24), the same class of
mistake as the withdrawn F-G — a symptom checked without reading the code that already handles it.
**Correction, not withdrawal:** the endpoint exposure exists; two real gaps remain underneath it:

1. **No reload path.** Still true — this is D-14's actual remaining scope.
2. **The frontend never reads or renders it.** `IntelligenceResponse<T>`
   (`frontend/lib/api.ts:605`) is typed `{ module, type, confidence, payload, recommendations,
   generatedAt }` — no `dataSource` field. All 8 card components (e.g.
   `frontend/components/org-science/PatternRegularityCard.tsx`) destructure `res.payload` and
   `res.recommendations` only. The backend has been sending `loadedAt` on every one of these 8
   responses since W-D landed, and nothing has ever displayed it. This is the actual "narrative
   honesty" gap in W-G's name — not a missing field, a missing render.

## 3. D-29 · `voice.js` is out of scope — reasoned, not overlooked

`backend/domain/dataset.js`'s `loadOrgDataset()` is a second, independent consumer of the same
`graph` singleton (`brain.getGraph()`), used only by `backend/routes/voice/voice.js`'s
`buildBrain()`. Unlike `prediction.js`, it exposes **zero** provenance to its caller — `dataset.js`
returns flat arrays (`agents`, `workflows`, …) with no `source`/`loadedAt` anywhere in the shape.

Traced every voice.js route (`/ask`, `/command`, `/history`, `/daily-summary`,
`/intents`) individually rather than assuming "reads the same graph → same fix applies" — the W-D/
W-E lesson this log records twice already. All of them funnel through `respond()`
(`voice.js:412`), which returns `{ query, detectedIntent, resolvedEntity, entityType, answer,
confidence }` — a single natural-language answer, not a score tile or verdict. There is no
existing UI element anywhere that renders a "data as of" indicator for a conversational answer, and
building one would be new UI scope, not wiring existing plumbing — the same distinction W-E drew
between a component that renders a published verdict and one that merely imports from the same
surface.

**Decision:** leave `voice.js` unwired. Revisit only if/when the voice UI grows a provenance panel
of its own — tracked here so it isn't rediscovered as a surprise later.

## 4. D-30 · No rate limit or de-dup on the reload endpoint

D-14's text already accepts "any authenticated user triggering it" as fine because the action is
idempotent and non-destructive. Checked `loadGraph()`'s actual concurrency behavior
(`backend/brain/index.js:63-79`): each call builds an entirely new `KnowledgeGraph` into a local
`next` variable and only swaps the module-level `graph` reference in on success — concurrent calls
never share mutable state mid-load, so two overlapping reloads cannot corrupt each other; the
worst case is redundant Supabase reads if several users click at once. Single-tenant, small user
count (§ ground truth: 4 org values in `app_users`, soon 1 under D-01) — this is not a realistic
abuse surface. Adding a limiter would be defensive code for a scenario D-14 already reasoned about
and accepted; skipped deliberately rather than by omission.

## 5. D-31 · Endpoint design

Both live in `prediction.js` — already the graph-facing route file per D-18, already mounted at
`/api/intelligence` (`backend/index.js:115`). No new mount point.

```
GET  /api/intelligence/graph/status
```
No analysis run, no graph mutation — just the current `isReady()` + `source()`. Cheap enough to be
the thing a page polls on load, and the thing `EndpointHealthGrid` pings.

Response (200, always — there is no failure mode for reading current state):
```json
{ "isReady": true, "source": { "live": true, "stats": {...}, "loadedAt": "2026-08-25T…", "error": null } }
```

```
POST /api/intelligence/graph/reload
```
Calls `domain.graph.load()` (= `brain.loadGraph()`). Success:
```json
{ "reloaded": true, "stats": {...}, "loadedAt": "2026-08-25T…" }
```
Failure (Supabase error, or the new graph fails `validate()` — both already handled inside
`loadGraph()`, which leaves the previous graph in place and records `source.error`):
```json
{ "reloaded": false, "error": "…", "source": { "live": false, "stats": {...previous...}, "loadedAt": "...previous...", "error": "…" } }
```
502. The previous graph keeps answering `prediction.js`'s other 8 endpoints throughout — a failed
reload degrades to "stale but serving," never to "serving nothing."

Neither route imports or calls `requireRole` — matches D-05 (deleted, zero callers) and needs no
new exception carved into it, because global `requireAuth` (`backend/index.js:71`) already covers
every mounted route including these two.

## 6. D-32 · Frontend wiring

1. **Type the field that already exists.** Add to `IntelligenceResponse<T>`
   (`frontend/lib/api.ts:605`):
   ```ts
   dataSource?: { live: boolean; stats: unknown; loadedAt: string | null; error: string | null };
   ```
   Optional because `graph/status` and `graph/reload` return a differently-shaped body — this
   field is specific to the 8 card responses.

2. **One new component, not eight edits.** `frontend/components/org-science/GraphFreshnessBanner.tsx`
   — fetches `GET /graph/status` on mount, renders relative time ("Graph data as of 4m ago" /
   "never loaded" / on POST failure "reload failed — showing last-known data"), with a Reload
   button that calls `POST /graph/reload`, re-fetches status, and bumps a counter prop. Follows the
   existing loading/error/success state shape every org-science card already uses (`PatternRegularityCard.tsx`
   is the template) rather than introducing a new pattern.

   A single page-level banner was chosen over per-card footers: all 8 cards share one graph load
   event, so 8 copies of the same timestamp would be redundant, and a banner is one file instead of
   eight. `EvidenceBadge.tsx` already established the precedent of a small, neutral, reusable status
   chip elsewhere in the app (W-E) — this follows the same shape rather than inventing new visual
   language, sized for a banner instead of an inline badge.

3. **Reload actually refreshes the cards.** `frontend/app/org-science/page.tsx` gains a
   `'use client'` directive (currently server-only composition; the state below needs a client
   component) and a `reloadNonce` counter passed down as `key={reloadNonce}` on the grid `<div>`
   wrapping all 10 cards. Bumping the key remounts the grid, which re-runs every card's own
   `useEffect` fetch — the two non-graph cards (`CollaborationScoreCard`, `LearningMaturityCard`,
   both `derived.js`-backed and already live-per-request) refetch harmlessly alongside the 8 that
   actually change.

4. **`EndpointHealthGrid.tsx`** gets one new row for `GET /api/intelligence/graph/status` —
   consistent with every other mounted endpoint already listed there, and itself a small
   demonstration that staleness is now visible even from the admin canary grid. `POST
   /graph/reload` is **not** added to this grid — it is a mutating-ish (if idempotent) action, and
   an automatic health-check pinger silently reloading the graph on a timer is exactly the kind of
   invisible side effect this workstream exists to prevent.

## 7. Testing

New `backend/tests/graphRoutes.test.js`, HTTP-level, following `authRoutes.test.js`'s pattern
(boot the real router on an ephemeral port, call it with `fetch`) — but stubs `../brain` via
`require.cache` instead of `../supabase`, since `domain/index.js` and `domain/dataset.js` both
resolve `require('../brain')` to the same cached path. A fake brain exposing
`loadGraph/setGraph/getGraph/isReady/graphSource/run/runMany/resolveOrder/toCode/MODULES` is
enough — `analyses.js` and `derived.js` (also required by `domain/index.js`) take `supabase` as a
call-time parameter rather than requiring it at load time, so they load without a real connection
as long as nothing in this test calls `domain.intelligence.*` or `domain.loadDataset()`.

Cases:
- `GET /graph/status` before any load — `isReady: false`, `source.live: false`, `source.loadedAt: null`.
- `POST /graph/reload` success — `200`, `reloaded: true`, `loadedAt` present and later than
  boot-time; a follow-up `GET /graph/status` reflects the new `loadedAt`.
- `POST /graph/reload` failure (fake `loadGraph` rejects) — `502`, `reloaded: false`, `error`
  present; a follow-up `GET /graph/status` still reports the **previous** successful `loadedAt`,
  proving the failed reload didn't wipe last-known-good state.
- Route-source scan (same style as `brain.smoke.test.js`'s squatter check) asserting neither new
  route imports `requireRole`.

Registered in `backend/tests/run-all.js` alongside `authRoutes.test.js`.

Frontend: no test framework exists in this repo for component-level tests (confirmed — `frontend/`
has no `*.test.tsx` anywhere and no test runner in `package.json`). Verification is manual, via the
live dev server per §5's process notes: log in through the real UI, load `/org-science`, confirm
the banner renders a real `loadedAt`, click Reload, confirm the timestamp advances and the 8 cards
visibly re-fetch (network tab), then kill the backend's Supabase reachability (or point
`NEXT_PUBLIC_API_URL` at a backend instance mid-restart) to see the failure state render without
losing the cards' last-shown data.

## 8. Files touched

Backend:
- `backend/routes/intelligence/prediction.js` — two new routes.
- `backend/tests/graphRoutes.test.js` — new.
- `backend/tests/run-all.js` — register it.

Frontend:
- `frontend/lib/api.ts` — type `dataSource` on `IntelligenceResponse<T>`; add `orgScience.graphStatus()` / `orgScience.graphReload()` client functions.
- `frontend/components/org-science/GraphFreshnessBanner.tsx` — new.
- `frontend/app/org-science/page.tsx` — `'use client'`, reload-nonce wiring.
- `frontend/components/admin/EndpointHealthGrid.tsx` — one new row.

No schema changes, no new tables, no migration. Nothing in `backend/schema.sql` or `backend/sql/`
is touched by this workstream.

## 9. Explicitly not done here (deferred, with reasons — matching §4's table style)

| Item | Why deferred |
|---|---|
| `voice.js` / dataset-path provenance | D-29 — no UI surface exists to render it; new UI scope, not wiring |
| Reload rate limiting | D-30 — D-14 already accepted the risk; concurrency is provably safe, just wasteful |
| Per-card `loadedAt` footers | D-32 — one banner covers all 8; redundant otherwise |
| F-I (duplicate edge representation) | separate finding, W-H's scope per §3, not D-14's |
| F-J (orphaned aggregate tables) | separate finding, W-H's scope per §3, not D-14's |
