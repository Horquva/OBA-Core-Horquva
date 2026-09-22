# AI-6: Change → Impact — Persistence Design

Date: 2026-09-21
Owner: Maaz Khan (AI-6)
Reviewer: Aleesha Minahil (Lead B)
Branch: `feature/ai-change-impact`, base `5017dcc`
Consumer: AI-7 — Volatility Intelligence (Taimour Mushtaq)

This is the schema and behaviour spec for persisting AI-6's output. The pure diff
engine (`backend/domain/changeImpact.js`, 47 offline checks) is already built and
does not depend on anything here. Nothing in this document is implemented until it
has been reviewed. Anything implementation turns up that this document does not
cover is flagged back, not decided in code.

---

## 1. What this stores, and why it has to exist

Two things:

1. **Change events** — one append-only row per detected organisational change,
   carrying the impact the existing risk/SPOF engine computed for it: before, after,
   delta, and the named downstream workflows and entities.
2. **A baseline** — the last-seen values of the fields AI-6 watches, so the next scan
   has something to compare against.

Persistence is not optional. AI-7's spec says it will *"pattern-read the change
history AI-6 is already writing"* to answer how often the organisation's dependency
structure moves. Without stored history there is nothing for it to read. And
detecting a real change at all needs the previous state kept somewhere — the pure
engine's `detectChanges(prev, next)` takes both snapshots as arguments; this design
decides where `prev` lives.

It is **not** an audit log. SEC-4's `audit_log` (WD-3) records *who* did *what*
through *which endpoint*. This records *what a change did to risk*. See §3.

## 2. Constraints this design follows

| Constraint | Source | Effect here |
|---|---|---|
| Free tier only, no new services, no scheduler | Handout §2.4 | Plain Postgres tables. Detection is triggered, never polled (§6). |
| Single tenant | D-01, `lib/orgGuard.js` | No `org` column. |
| Migrations only via runner | Handout §5.4 | One new file under `backend/sql/`, applied by `run_migrations.js`. |
| Existing engine unmodified | AI-6 done-when; Handout §12 | Nothing here edits `derived.js`, `simulations.js` or `definitions.js`. Persistence wraps the pure engine; it does not reach into it. |
| No new rule set for what a change "means" | Handout §7 | Stored impact is exactly what the engine returned. Vendor and model changes are stored as priced `false` with a zero delta — not re-scored. |
| Do not duplicate `audit_log` | SEC-4 | No actor, IP, user agent or endpoint fields. §3. |
| No agent-team scope | Handout §5 | No writes from `routes/avatar/*` or W-L code. |

## 3. Relationship to SEC-4's `audit_log`

The overlap is real and narrow. `audit_log` records `agent.owner_update` with
`changes: {"owner_id": {"from": x, "to": y}}` — the same raw fact as AI-6's
`owner_changed`. Everything else differs:

| | `audit_log` (SEC-4) | `change_events` (AI-6) |
|---|---|---|
| Question it answers | Who did what, when, through which endpoint | What did this change do to risk |
| Sees | Only changes made through an instrumented endpoint | Any change between two snapshots, however it was made |
| Change types | `agent.owner_update` only | owner, backup, tool backup, model, vendor |
| Stores impact | No | Yes — scores before/after, SPOF status, downstream |
| Reader | Admin, for security | AI-7 and the app, for analysis |

Four of AI-6's five change types — backup removed, tool backup removed, model swap,
vendor change — have no write path through any endpoint (the `agent_platform` schema
comment says nothing writes that table, D-04). The audit log cannot see them.

**Rule this design follows:** `change_events` stores no *who*. Actor, endpoint and
user agent live in `audit_log` only. For an owner change, the two can be joined on
`target_type = 'agent'` and `target_id`, within the scan window.

## 4. Table schema

Migration number: the next free one when this lands. `17_` and `18_` are both
taken upstream, so this is `19_change_impact.sql`.

```sql
-- backend/sql/19_change_impact.sql — AI-6

-- One append-only row per detected change and its computed impact.
create table if not exists change_events (
  id             bigint generated always as identity primary key,
  detected_at    timestamptz not null default now(),
  scan_id        uuid not null,        -- every row written by one scan shares this

  change_type    text not null check (change_type in (
                   'owner_changed', 'backup_removed', 'tool_backup_removed',
                   'model_swapped', 'vendor_changed')),
  target_type    text not null,        -- 'agent' | 'employee' | 'platform'
  target_id      text not null,
  change         jsonb not null,       -- the change object exactly as detectChanges() returned it
  description    text not null,        -- e.g. 'Owner of CodeReviewAgent changed from Aisha Patel to no one'

  priced         boolean not null,     -- false: no existing calculation scores this change
  health_before  numeric,              -- null when the engine's evidence gate withholds a score
  health_after   numeric,
  health_delta   numeric,
  impact         jsonb not null,       -- { agents, people, spofChanges, downstream } from diffChange()

  dedup_key      text not null unique  -- makes a repeated scan idempotent (§6)
);

create index if not exists idx_change_events_detected_at on change_events (detected_at desc);
create index if not exists idx_change_events_type        on change_events (change_type, detected_at desc);
create index if not exists idx_change_events_target      on change_events (target_type, target_id);

-- The last-seen values of every watched field. Exactly one row.
create table if not exists change_baseline (
  id         smallint primary key default 1 check (id = 1),
  taken_at   timestamptz not null default now(),
  snapshot   jsonb not null
);

-- Same posture as audit_log: the backend's service-role key bypasses RLS;
-- this closes the anon/authenticated path.
alter table change_events   enable row level security;
alter table change_baseline enable row level security;
revoke all on change_events   from anon, authenticated;
revoke all on change_baseline from anon, authenticated;
```

Why these choices:

- **`impact` is `jsonb`, not normalised rows.** It is the engine's output verbatim.
  Normalising it into child tables would mean deciding a schema for the engine's
  output — close to redesigning it — and AI-7 reads counts and types, not nested
  scores.
- **Health gets real columns.** It is the one number AI-7 is likely to aggregate or
  filter on, so it should not require a jsonb extraction.
- **`target_id` is `text`,** matching `audit_log`, so the two can be compared without
  casting, and so employee, agent and platform ids share one column.
- **`scan_id`** groups the changes one scan found. Several changes detected together
  are still written as separate rows — the engine diffs each one on its own against
  the earlier snapshot, so impact is attributed to the change that caused it.

## 5. What the baseline holds

Only the watched fields — not a copy of the 21 root tables:

```json
{
  "agents":         [{ "id": 2, "owner_id": 7 }],
  "owners":         [{ "employee_id": 7, "backup_owner": "Aisha Patel" }],
  "tool_backups":   [{ "primary_platform": 3, "backup_platform": 9 }],
  "agent_platform": [{ "agent_id": 2, "platform_id": 3 }],
  "ai_platforms":   [{ "id": 3, "vendor": "OpenAI" }]
}
```

At scan time, the "before" roots are the **current** roots with these fields
overlaid from the baseline. That is enough for `diffSnapshots(before, current)`, and
it has a useful property: anything that changed but is *not* watched — a renamed
workflow, a new dependency — appears identically on both sides, so it cannot leak
into a watched change's impact.

Size: a few rows per agent, platform and owner. Tens of kilobytes at this org's size.

## 6. How a scan works

No scheduler (§2), so a scan is triggered, never polled. One function does it:

```
scanForChanges()
  1. Load the current roots          derived.loadRoots(supabase)
  2. Read the baseline               change_baseline, id = 1
     - none yet: write one from the current roots, record nothing, stop.
       History starts when tracking starts; nothing earlier can be reconstructed.
  3. Build "before"                  current roots with the baseline overlaid (§5)
  4. Detect and diff                 changeImpact.diffSnapshots(before, current)
  5. Insert one row per change       on conflict (dedup_key) do nothing
  6. Only if every insert succeeded: replace the baseline with the current values
```

**Fail-closed.** This deliberately differs from `audit_log`'s fail-open. An audit
write sits on a user's login; a scan sits on nobody's request. If step 5 fails, step
6 does not run, the baseline stays where it was, and the next scan finds the same
changes again. Advancing the baseline after a failed write would lose those changes
permanently — and history is the only thing AI-7 depends on.

**Idempotent.** `dedup_key` is a hash of the change type, target, from-value,
to-value and the baseline's `taken_at`. If step 5 succeeds and step 6 fails, the
retry produces the same keys and the duplicate inserts are ignored.

**What triggers it** is decision D1 in §11. The two options that fit the constraints:

- **A. Manual, like SEC-4's purge script.** `node backend/tools/scan-changes.js`
  plus an admin-only `POST /api/change-impact/scan`. No existing code changes.
- **B. Also on graph reload.** Graph reload already runs when the data changes, so
  scanning there catches changes close to when they happen. It means one call added
  to an existing route.

**Recommendation: A in this pass.** It touches no existing file, and the effect of
the choice on AI-7 is stated in §7.

## 7. Timestamp precision — the thing AI-7 must know

`detected_at` is when a scan **found** the change, not when it **happened**. With
manual scans, every change made since the previous scan gets the same `detected_at`.

For AI-7, which measures change *frequency*, this matters: the true resolution of
the history is the scan interval. Two changes an hour apart and two a week apart look
identical if one scan finds both. AI-7 should read `detected_at` as "no later than",
and the scan cadence should be recorded alongside any threshold it calibrates. For
owner changes specifically, the exact time is available from `audit_log.occurred_at`.

This is the strongest argument for option B over A, and the reason cadence is a
decision rather than a detail.

## 8. Reading the history

```
GET /api/change-impact/events          requireAuth
  ?change_type=   one of the five types
  ?target_type=   with optional ?target_id=
  ?priced=        true | false
  ?from= ?to=     ISO timestamps on detected_at
  ?limit=         default 50, max 200
  ?before_id=     cursor: rows with id < before_id

200 → { events: [ { id, detected_at, scan_id, change_type, target_type, target_id,
                    change, description, priced, health_before, health_after,
                    health_delta, impact } ],
        next_before_id: <id of last row, or null>,
        baseline_taken_at }
```

Ordered by `id desc`. Invalid filters return `400`, not an empty list — same
convention as SEC-4's `GET /api/audit-log`.

`baseline_taken_at` is in every response so a reader can tell whether the history is
current.

Optional, costs nothing to add: `POST /api/change-impact/preview` taking a change
object and returning `diffChange()` for it, **without writing anything** — a what-if
on the live data.

## 9. Tests

Offline, in the existing no-framework style, Supabase stubbed through
`require.cache`, listed in `tests/run-all.js`:

1. First scan with no baseline writes a baseline and zero events.
2. A scan after an owner change writes one `owner_changed` row whose `impact` matches
   `diffChange()` for the same change, and whose `description` names the agent and
   both owners.
3. A vendor change is stored with `priced = false`, `health_delta = 0` or null, and
   downstream workflows still present in `impact`.
4. Two changes in one scan produce two rows sharing a `scan_id`.
5. **Fail-closed:** when the stubbed insert fails, the baseline is not advanced, and
   the next scan writes the missed changes.
6. **Idempotent:** a scan whose baseline update fails, re-run, produces no duplicate
   rows.
7. `GET /api/change-impact/events`: newest first; `limit=500` capped to 200; a bad
   `change_type` returns 400.
8. No stored row contains an actor, email, IP or user-agent field (§3).
9. `derived.js`, `simulations.js` and `definitions.js` are unchanged
   (`git diff 5017dcc -- domain/` is empty for those three).

Then once against a real Supabase project: change an agent's owner, run a scan, read
the event back.

## 10. Out of scope

- Any change to the risk/SPOF engine, including pricing vendor or model changes.
- A scheduler, cron job or background worker.
- Recording who made a change — that is `audit_log`'s job.
- Tracking entities being created or deleted; only the five change types above.
- Volatility analysis — that is AI-7.
- A UI.

## 11. Decisions

Decided by Aleesha Minahil, 2026-09-21.

| # | Question | Recommendation | Decision |
|---|---|---|---|
| D1 | What triggers a scan? | Manual script + admin endpoint this pass (§6 option A) | **A.** Accepting the §7 resolution limit this pass rather than adding scope. |
| D2 | Scan cadence — who runs it, how often? | Weekly to start, since AI-7's resolution depends on it (§7) | **Weekly.** |
| D3 | Who can read the change history? | Any authenticated user, per D-05; the scan endpoint admin-only | **Any authenticated user**, per D-05. Scan endpoint admin-only. |
| D4 | Retention? | Keep indefinitely — AI-7 calibrates "normal" against long history, and at tens of rows a month the size is negligible | **Keep indefinitely.** |
| D5 | Migration number? | Next free after SEC-4's `17_`, assumed `18_` | **`19_`.** Checked upstream before committing: `17_` and `18_` are both taken. |
| D6 | Store an `audit_log` id on owner-change rows? | No for now — `audit_log` isn't built yet; join on target when it exists | **No for now.** `17_audit_log.sql` has since landed upstream; revisit once WD-3 writes to it. |