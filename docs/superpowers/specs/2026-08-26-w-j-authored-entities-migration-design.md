# W-J — Authored Entities Migration to Supabase

Date: 2026-08-26
Status: design drafted in chat, awaiting owner review of this file. No code changed yet.

Follows W-I (2026-08-26). **This is a new workstream, not part of the original 16-decision
interrogation.** Found while designing the AI agent layer on top of the truth layer W-D
established: `backend/tools/export-company.js`'s `AUTHORED` block (`systems`, `external_entities`,
`incidents`, `decisions_log`) is the last place hand-authored facts live outside Supabase, exported
once into `data/company.json` and read back by `graphLoader.js` on every graph load. That is the
same "two places hold facts" pattern W-C/W-D/W-E spent three workstreams eliminating everywhere
else — surfaced concretely by a live bug: `M38` (Opportunity Intelligence) was flagging systems as
"underused" because no agent/workflow ever `depends_on` a system in this data (fixed same-day by
adding a `used_by` field to the authored systems and a matching edge in `graphLoader.js` — a
stopgap inside the pattern this workstream retires).

**Correction found during planning, not present in the original brainstorm:** `processes` was
originally grouped with `systems`/`external_entities` as hand-authored. It is not — reading
`export-company.js:432` shows `outProcesses` is computed live from `accountability_entities`/
`accountability_links` (real Supabase tables, filtered by `entity_type === 'process'`), the same
way org-scoped policies already are (`export-company.js:424-428`). `graphLoader.js` already queries
both tables (`graphLoader.js:86-87`, for the `collaborates_with` derivation) — it just never builds
`process` entities from them, reading `company.json`'s roundtripped copy instead. `processes` needs
a graphLoader change, not a new table. `AUTHORED` genuinely holds four sections, not six.

## 1. The problem this solves

`AUTHORED` has four sections, and they are not four symmetric cases:

- **`systems` / `external_entities`** genuinely exist nowhere but this hand-written array. They
  feed the knowledge graph (`graphLoader.js:328-420`) and are real inputs to ownership-coverage,
  SPOF, and (as of today's fix) opportunity-intelligence analyses.
- **`decisions_log` is a dead duplicate.** `backend/domain/dataset.js:101` already builds a live
  `decisions_log` from the real `decision_history` table, and that is what
  `domain/analyses.js`'s "Decisions with tracked outcomes" dimension actually scores.
  `AUTHORED.decisions_log` feeds nothing at runtime — confirmed by grep, not assumption.
- **`incidents` has no Supabase table at all, and the authored copy is also unread.**
  `domain/dataset.js:118` hardcodes `incidents: []` with a comment stating no incidents table
  exists — an honest gap, not a bug. `AUTHORED.incidents` (8 hand-written entries with
  `resolution_days`/`lesson`) exists only in `company.json` and is not wired into anything.
  `backend/API_REFERENCE.md:120`'s claim that "nothing reads [company.json] at runtime" is stale
  for `systems`/`external_entities` (graphLoader does read them) but literally true for this
  section.
- **`processes` isn't authored at all** (see correction above) — it's a graphLoader wiring gap
  wearing the same symptom (`company.json` roundtrip instead of a direct query) as the real cases,
  which is why it was initially miscategorized. Included in this workstream because the fix touches
  the same code (`graphLoader.js`'s `companyData` block), but it needs no migration.

So this workstream is four different repairs wearing one pass through `graphLoader.js`: move two
real-but-misplaced sections into Supabase, delete one dead duplicate, build the one section that was
never actually wired up, and point `processes` at the real table it already has.

## 2. What gets built

### 2.1 Six new tables (D-46)

Migration `backend/sql/14_authored_entities.sql`. FKs to `employees`/`agents`/`ai_platforms` where
the authored data currently only carries a name string — those employees/agents/platforms are now
real rows, so this is strictly more correct than the JSON version, not just a format change:

```sql
CREATE TABLE systems (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, department TEXT,
  owner_id INTEGER REFERENCES employees(id),
  criticality TEXT, documented BOOLEAN, description TEXT
);
CREATE TABLE system_dependencies (
  system_id INTEGER REFERENCES systems(id),
  depends_on_system_id INTEGER REFERENCES systems(id)
);
CREATE TABLE system_agent_usage (
  system_id INTEGER REFERENCES systems(id),
  agent_id INTEGER REFERENCES agents(id)
);
CREATE TABLE external_entities (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, kind TEXT, -- 'vendor' | 'customer'
  relationship_owner_id INTEGER REFERENCES employees(id), criticality TEXT
);
CREATE TABLE external_entity_supplies (
  external_entity_id INTEGER REFERENCES external_entities(id),
  platform_id INTEGER REFERENCES ai_platforms(id)
);
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY, occurred_at DATE, entity_name TEXT, entity_type TEXT,
  impact TEXT, owner_id INTEGER REFERENCES employees(id),
  resolved_by_id INTEGER REFERENCES employees(id),
  resolution_days INTEGER, lesson TEXT
);
```

`incidents.entity_name`/`entity_type` stay text, not a polymorphic FK — matching the existing
`dependencies.source_type`/`target_type` convention already used for the same cross-type-reference
problem, not inventing a new one.

The same migration seeds all six tables with today's `AUTHORED` content (4 systems including the
`used_by` links added earlier today, 10 external_entities, 8 incidents) so nothing changes
functionally for `systems`/`external_entities`/`incidents` beyond where the data lives, until 2.4
turns incidents scoring on. No `processes` table — see 2.1b.

### 2.1b `processes` points at the table it already has (D-47)

No new schema. `graphLoader.js`'s `companyData.processes` loop (`graphLoader.js:386-397` today) is
replaced with a loop over the `acctEntities` rows already queried at `graphLoader.js:86-87`
(`entity_type === 'process'`), building `process` entities and `owns`/`executes` edges from
`raciFor(entity.id, 'Accountable'|'Responsible')` against `acctLinks` — the exact derivation
`export-company.js:432-439`'s `outProcesses` already performs, just done in the loader instead of
round-tripped through `company.json`. `export-company.js` keeps computing `outProcesses` for the
snapshot export (2.5) but graphLoader no longer depends on that snapshot to get there.

### 2.2 `decisions_log` is deleted, not migrated (D-48)

`AUTHORED.decisions_log` and its export are removed from `export-company.js`. The real
`decision_history`-backed pipeline in `domain/dataset.js` is untouched — there is nothing to
reconcile it against, since nothing ever consumed the authored copy.

### 2.3 `graphLoader.js` reads Supabase directly (D-49)

The `require('../../../data/company.json')` block (`graphLoader.js:328-404`) is replaced with
queries for the six new tables above (plus the `processes` change in 2.1b, which needs no new
query), added to the existing `Promise.all` batch alongside
`employees`/`agents`/etc. Edge-building logic (`R()` calls) is unchanged — only where the rows come
from changes.

**Real behavior change, not just a refactor:** today a missing/corrupt `company.json` degrades
softly — systems don't load, the rest of the graph still does, no error. After this, these six
tables join the main `firstError` check like every other table already does: a missing table fails
the whole graph load loudly. This matches how every other real data source in this loader already
behaves (fail loud, never silently serve a partial graph as if it were complete) — the soft-degrade
path was only ever there because `company.json` was optional supplementary data, which it no longer
is once it's a real table.

### 2.4 `incidents` wired into live scoring (D-50)

`domain/dataset.js` adds `supabase.from('incidents').select('*')` to its existing `Promise.all`,
replacing the hardcoded `incidents: []` with a real mapped array (`lesson`, `resolved_by`, matching
what `domain/analyses.js:102,137-139` already expect). This activates two dimensions that have been
silently unscored since they were written: "Incident lessons captured"
(`alignmentChecklist`) and "Incident learning loop is active" (`standardClaimChecks`). Seeded from
the same 8 incidents already authored, so the first real numbers will reflect existing narrative
content, not a cold start.

### 2.5 `export-company.js`'s `AUTHORED` block retires (D-51)

`systems`/`external_entities`/`incidents` become genuinely exported sections — queried and mapped
the same way `outEmployees`/`outAgents`/`outProcesses` already are — rather than hand-written
constants. `data/company.json` becomes a pure derived snapshot again, consistent with the rest of
the file, with no hand-authored content left in it. `outProcesses` itself is unchanged (2.1b never
touches `export-company.js`, only `graphLoader.js`). The `badSysDep`/`badSysUsedBy`/`badIncident`
validation rules move from validating `AUTHORED` arrays to validating the query results, same
checks, same failure messages.

## 3. Testing & verification

- `graphLoader.live.test.js`'s existing systems/processes/external_entities checks (`systems loaded
  from company.json (4)`, etc.) get repointed to assert against the new tables (`systems`,
  `external_entities`) or the direct `accountability_entities` query (`processes`) — same
  assertions, same counts, different source — plus a new check that the `used_by` edges
  (`company.json:systems` → `Supabase:system_agent_usage`) still resolve.
- New unit coverage for `domain/dataset.js`'s incidents mapping (empty table → `[]`, matching
  today's honest-absence behavior; populated table → real `lesson`/`resolved_by` fields).
- `orgAnalyses.unit.test.js` gets cases for the newly-live "Incident lessons captured" and "Incident
  learning loop is active" dimensions — currently only tested via the always-empty path.
- Regression: `M38`'s opportunity list stays correct (no system reappears as "underused") after the
  storage-location change, not just after today's stopgap fix.
- Full `npm test` must stay green before this is considered done, same bar as every prior
  workstream.

## 4. Explicitly out of scope

- **CRUD/admin UI for editing these tables.** This workstream moves storage location and seeds
  today's content; it does not add create/update/delete routes or frontend forms for
  systems/processes/vendors/customers. That's a real product decision (does anyone other than an
  engineer editing a migration ever need to add a system?) for later, not a mechanical follow-on.
- **`team`/`project` entity types.** Still no data source anywhere, authored or otherwise —
  inventing one would violate D-07. Unaffected by this workstream.
- **Multi-tenancy.** D-01 already decided single-tenant; these tables carry no `org` column, same as
  every other table added since that decision.
- **Reconciling `decision_history` against the deleted `AUTHORED.decisions_log`.** They were never
  the same data; there is nothing to reconcile.

## 5. Decisions introduced by this workstream

| # | Decision |
|---|---|
| D-46 | Six new Supabase tables (`systems`, `system_dependencies`, `system_agent_usage`, `external_entities`, `external_entity_supplies`, `incidents`) replace `export-company.js`'s hand-authored `AUTHORED` block, seeded from today's content in migration `14_authored_entities.sql`. |
| D-47 | `processes` gets no new table — `graphLoader.js` builds `process` entities directly from `accountability_entities`/`accountability_links`, tables it already queries, instead of round-tripping through `company.json`. |
| D-48 | `AUTHORED.decisions_log` is deleted, not migrated — it duplicates the already-live `decision_history`-backed pipeline in `domain/dataset.js` and feeds nothing. |
| D-49 | `graphLoader.js` reads the new tables directly from Supabase instead of requiring `data/company.json`; a missing table now fails graph load loudly instead of softly degrading, matching every other root table. |
| D-50 | `domain/dataset.js` reads the new `incidents` table instead of hardcoding `[]`, turning on live scoring for the "Incident lessons captured" and "Incident learning loop is active" dimensions. |
| D-51 | `export-company.js` retires its `AUTHORED` block; `data/company.json` becomes a pure derived snapshot with no hand-authored content. |

This table is written in the style of the central decision log but not yet merged into it — see the
note to the user in chat about whether to append these to
`2026-08-24-oba-remediation-decision-log.md`'s §3 workstream map now or after implementation.
