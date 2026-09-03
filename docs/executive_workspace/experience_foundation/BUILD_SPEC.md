# OCOS BUILD SPEC

What's built, what's missing, and where each change goes.

**2026-08-11.** Every claim here was checked against the code and a running server. Counts are exact
unless marked as an estimate. ⚠ marks a trap — something that will cost you a day if you assume the
obvious thing.

**The demo company is settled.** The repo used to hold three unrelated fictional companies, which is
what made every number disagree with every other number. One of them won and now lives in
[data/company.json](data/company.json) — 40 people with real reporting lines, 15 agents, 12 tools.
Part 0 has the full story and says what happens to the rest. **Do not merge datasets** — Part 0A
explains why the loader will reject it.

**Every item has a named owner and reviewer** — see **A4**, assigned from the team structure of
2026-08-11. Two of them are flagged there as worth confirming before kickoff, and nobody should hear
their assignment from this document first.

### Read in this order

1. **A0** — four ways to destroy other people's work. Before your first commit, no exceptions.
2. **A3** — how to get it running, and how to tell you got it right.
3. **A4** — who owns your item and who reviews it. If your row is blank, stop.
4. **Part 0** — why this product's whole problem is data. **Part 0A** if you are on W2 or W7.
5. **Part B** — where your code goes, and the nine things that will cost you an hour.
6. Your **W-item** in Part C, and the rules in **Part D** it references.

Parts E and F are reference. Read F's **THREATS** if you touch deployment, credentials, or the
database.

### What this document does not decide

- **Which real company's data we use.** A sourcing problem, not an engineering one — the shape is
  fully specified in Part 0 and Part 0A. See Part F.
- **Whether each person accepts their assignment.** A4 names everyone, but a name in a table is a
  proposal, not a commitment. Two cells are explicitly flagged as guesses.

---

# PART 0 — THE REAL SITUATION

## The problem was three different companies, not one company described badly

This is the thing to understand before anything else. The repo did not contain one organization
described inconsistently — it contained **three fully-formed, unrelated fictional companies** with
zero overlapping people, agents or departments, plus a corrupted copy of one of them and some mock
fragments. Every "why don't these two numbers agree" question traced back to this.

| Company | Where it lived | Cast |
|---|---|---|
| "Sunrise Care" — care/services SMB | `data/sunrise_care.json` | **8 first names** (David, Emma, James, Lisa, Mike, Nina, Robert, Sarah) and the integer `employees: 120`. Business-process agents: Lead Scoring Agent, Payroll Agent, Appointment Reminder Agent |
| An unnamed B2B SaaS company | `sql/02_seed_data.sql` → Supabase | **40 full people** with roles, departments, tenure, skills and real reporting lines. Technical agents: DeployBot, SecurityScanner, KnowledgeIndexer, TestRunner |
| "Horquva Pilot Org" | `graphSeeder.js` | 16 placeholder entities, no personal names — Chief Executive, Engineering Lead, Core Platform |

**Resolved: the B2B SaaS company won and now lives in [data/company.json](data/company.json).**
It was exported from the seed SQL into the eleven-section contract, and it passes every Part 0A
validation rule. 40 employees · 15 agents, all with resolved owners · 12 tools · 10 workflows with
steps · 23 dependencies · 32 knowledge areas · 6 months of history.

**The other two are deleted in W2, not merged.** Merging casts is forbidden — see the rule at the
end of Part 0A. Sunrise Care contributed nothing but coverage: it named three sections the database
has no table for, and those are authored fresh against the surviving cast.

### The eight invented sources that remain, and what happens to each

| Source | What it is | Who reads it | Disposition |
|---|---|---|---|
| `data/company.json` | **the company** — 17 sections, 40 people | nothing yet — W2 wires it | **the single source** |
| Supabase (70 tables) | the same company, plus ~50 tables of computed output | **54 of 66 route files** | stays: written from the dataset by `toTables.js`, and the store for everything computed or human-written |
| `data/sunrise_care.json` | a different company, 8 first names | `intelligence/constitutional.js`, `tools.js`, `avatar/index.js`, `automation/index.js`, `selfHealing/index.js` | **deleted**; those five routes repoint to Supabase like the other 54 |
| `graphSeeder.js` | "Horquva Pilot Org", 16 entities | the brain, all 55 modules | `graphLoader.js` becomes the default. **Deleted once `systems` is authored** — that is the last entity type it holds alone |
| `frontend/data/sunrise_care.json` | a **partial** copy — 6 of 11 sections, missing `history`, `incidents`, `decisions_log`, `external_entities`, `knowledge_areas` | `frontend/lib/data.ts` → `app/network/page.tsx` | deleted |
| `INLINE_AI_TOOLS` in `routes/tools.js` | 5 tools hardcoded in the route | `/api/tools`, when the file isn't found | deleted |
| `BRAIN` + `INLINE_INTENTS` in `routes/voice/voice.js` | a stale, partly-wrong copy of the Supabase cast | everything OBA says through `/api/voice` | deleted |
| `mockNotifications` in `components/global/GlobalNotificationPanel.tsx` | hardcoded alerts | the notification panel, every page | deleted |
| `MOCK_RESULTS` in `components/global/GlobalSearchOverlay.tsx` | 4 hardcoded results — Payroll Processing, Sarah Jenkins | global search, every page | deleted in **W7** |

⚠ **`BRAIN` in `voice.js` is the dangerous one, and not for the reason you'd guess.** It is not an
unrelated fiction. Yuki Tanaka, Nathan Wright and Priya Sharma are real people in the surviving cast;
SecurityScanner, KnowledgeIndexer, IncidentResponder and DeployBot are real agents. What differs is
**who owns what** — plus one invented person, "Aisha Khan," one letter from the real "Aisha Patel."
OBA's spoken answers contradict the database using the database's own names, so **nobody reviewing a
demo will catch it.** A wholly separate fake company would have been safer.

Same class of problem: `components/decision/DecisionTrailTable.tsx:104` fakes verification state from
a heuristic and says so in a comment — *"Mocking verification state … as a demo heuristic."* Replace
it with the real verdict from `truth_claims` (W3).

## The fallback chain is worse than the fake data

`routes/tools.js` searches five filesystem paths, then falls back to hardcoded tools —
*"guarantees the demo is NEVER empty."* `routes/voice/voice.js` opens with *"Supabase is optional —
the engine works fully from the inline brain even when the database is empty or unreachable."*

**When the system knows nothing, it invents a confident answer instead of saying so.** For a product
whose entire value is whether an executive can trust what it says, a never-fail fallback that
silently serves fiction is the most damaging thing in this codebase. All of them go, and R-8 exists
to stop them coming back.

## The brain isn't connected to any of it

Of 66 route files, exactly one — `routes/intelligence/prediction.js` — calls the brain. The 55
modules and the 203 HTTP endpoints are two products sharing a folder. That's W9.

## The contract, and what is actually in it

Sixteen sections. This is `data/company.json` as it stands, verified field by field:

```
company            "Northwind Labs"        ← a STRING. placeholder name — rename freely.
organization        1 · name, industry
departments         6 · name, head, headcount, documentation_coverage, backup_coverage,
                        incident_exposure_score, risk_level
employees          40 · id, name, role, department, reports_to, status, started_at,
                        left_at, skills[], workload          ← see Part 0A
agents             15 · owner, backup_owner, criticality, department, documented,
                        type, status, monthly_cost_usd
ai_tools           12 · name, vendor, users[], departments[], monthly_cost_usd,
                        access_owner, backup_tool
workflows          10 · owner, accountable, backup_owner, criticality, department,
                        frequency, documented, steps[] of {step, actor: human|tool|agent,
                        actor_name, required, duration_minutes}
processes           2 · name, department, accountable, responsible
policies            9 · name, scope: tool|organization, governs[], department,
                        accountable, status
dependencies       23 · from, from_type → to, to_type, type, strength
collaborations     51 · from, to, basis: raci|workflow, on, weight   ← derived, see below
knowledge_areas    32 · area, holders[], documented, criticality
history             6 · monthly: headcount, avg_workload, tool_cost_usd, risk_index,
                        continuity_score, governance_score
systems             4 · name, owner, department, criticality, documented, depends_on[]
incidents           8 · date, entity, entity_type, impact, owner, resolved_by,
                        resolution_days, lesson
decisions_log       6 · date, owner, area, decision, factors[], outcome
external_entities  10 · name, kind: vendor|customer, supplies[], relationship_owner,
                        criticality
```

**All seventeen sections are populated. Treat the whole file as frozen** unless you are replacing the
company.

⚠ **`ai_tools[].vendor` is filled on 4 of 12** — the four whose vendor is a matter of fact
(ChatGPT Enterprise → OpenAI, and so on). `ai_platforms` has no vendor column, so the other eight
stay `null` and render as R-3 `NOT_INGESTED`. Do not infer the rest from tool names.

### Why `organization`, `departments`, `processes` and `policies` are here

**They are what made `graphSeeder.js` impossible to delete.** Those four entity types existed *only*
in Horquva Pilot Org. Without them the graph has no org node, no departments, and nothing for M19
Governance or M20 Accountability to work on — so a second company had to stay behind to supply them.

They now come from the real cast: departments from `department_exposure` joined to their head,
policies from `tool_policies` and `accountability_entities`, processes and their accountable owners
from `accountability_links`.

**`graphSeeder.js` is now content-redundant** — every type it held alone is sourced here, and
`collaborations` replaces the only relationship type it uniquely demonstrated. It is deleted in W2
**the moment `graphLoader.js` exists**, and not before: `runtime.js:63` still boots the brain from it.

### ⚠ The dataset now contains three real R-1 `CONFLICT` cases — keep them

`workflows[].owner` comes from the runbook; `workflows[].accountable` comes from the RACI links.
They disagree on three workflows:

| Workflow | `owner` (runbook) | `accountable` (RACI) |
|---|---|---|
| Code Deployment Pipeline | Yuki Tanaka | Robert Chen |
| Data Ingestion Pipeline | Sophia Chen | Nathan Wright |
| Compliance Review | Grace Okonkwo | Jennifer Foster |

**Do not "fix" these by picking one.** Two sources genuinely disagree about who owns a workflow —
that is precisely what R-1's `CONFLICT` state and R-3's fifth state exist to surface, and they are
the only non-synthetic conflict fixtures in the repo. W6 and W7 should be built against them.

### The four authored sections — where they live and how to change them

`systems`, `incidents`, `decisions_log` and `external_entities` have **no source table**, so they are
hand-written in the `AUTHORED` block at the top of
[backend/tools/export-company.js](backend/tools/export-company.js). Edit them there, not in the JSON
— regenerating preserves them, and the script's rule-2 check fails the build if you name someone who
isn't an employee. All 36 person-references in them currently resolve.

They are written against the **real failure surface** rather than invented independently, so the demo
tells a coherent story. KnowledgeIndexer is `critical`, `failed`, undocumented and held only by Nathan
Wright — so the April incident is that it stalled six days, and the lesson names the concentration.
Sarah Mitchell is both Responsible and Accountable for Security Audit Process, which the seed itself
flags as a problem — so the March incident is a missed credential nobody independently reviewed. Keep
that discipline when you add rows.

`decisions_log` is the log W4's "record a decision" writes into; `organizational_decisions` remains a
quality audit and is a different thing.

### ⚠ `collaborations` is derived, and it is load-bearing

**Modules read `collaborates_with`.** `implementations.js:1007` marks every human with no such edge as
**siloed**, and `:1054` weighs its volume against `depends_on`. A dataset without it makes the brain
confidently report all 40 people as isolated — a wrong answer, not a missing one.

There is no source table, so it is **derived, never invented** (R-1 `metadata.source='derived'`): two
people collaborate if they share an entity's RACI in `accountability_links`, or both act as `human` in
the same workflow's steps. That yields 51 pairs.

⚠ **Those pairs cover 24 of 40 people.** The other 16 appear in no shared-work record, so the module
will call them siloed. **That may be a real finding or a coverage gap, and the data cannot tell you
which** — RACI links exist for only 12 entities. This is exactly the R-3 split between `NO_SIGNAL`
("no collaboration recorded") and a conclusion. **W6 must not let it render as a flat "siloed" verdict.**

## What that means for the plan

1. **The demo company is settled and complete enough to build on.** Nothing waits on it.
2. **A real customer's data is still the credibility blocker, and it is not an engineering task.**
   Until it exists nobody in the room can tell a *correct* answer from a merely *plausible* one, and
   that distinction is the entire product. It changes no code.
3. **The engineering task is to make the source swappable.** One file in → the graph, the routes and
   the frontend all read from it. Today there are eight feeds and no switch. That is W2.
4. **A code-repository connector would not help.** Look at the contract: tool spend, vendors,
   incidents, workflow steps, backup owners, who holds which knowledge. A git host knows none of it,
   and would fill two of eleven sections.

---

# PART 0A — THE `employees` CONTRACT

Read this before starting W2 or W7; skip it otherwise.

**This section is realized, not aspirational.** `data/company.json` holds 40 employees in this exact
shape and passes every rule below. What follows is the contract a *replacement* dataset must meet.

## Where the reporting lines came from

`backend/sql/01_schema_migration.sql:46` has carried them all along, and **the column is populated**
— verified against `sql/02_seed_data.sql`, which fills `manager` on 34 of 40 rows:

```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY, name TEXT, role TEXT, department TEXT,
  risk TEXT, tenure NUMERIC, skills TEXT[], workload INTEGER,
  manager TEXT,        -- ← the reporting line. holds a NAME, not an id.
  hire_date DATE
);
```

So `reports_to` was never a greenfield design. The contract is that column set renamed, which makes
`toTables.js` a near-straight copy and `toGraph.js` a single name lookup.

## The shape

`employees` is an **array of objects**. An integer headcount is a schema violation and must fail
validation — do not write a loader that accepts both shapes. A real record from `data/company.json`:

```json
{
  "id": "emp_002",
  "name": "Aisha Patel",
  "role": "Senior Backend Engineer",
  "department": "Engineering",
  "reports_to": "Robert Chen",
  "status": "active",
  "started_at": "2018-09-01",
  "left_at": null,
  "skills": ["node.js", "postgresql", "docker", "kubernetes"],
  "workload": 85
}
```

| Field | Type | Required | Maps to | Notes |
|---|---|---|---|---|
| `id` | string | yes | *(not stored — `employees.id` stays serial)* | dataset-local, stable across reloads so W4 corrections survive a re-source |
| `name` | string | yes | `employees.name` | **unique. this is the join key** — see rule 2 |
| `role` | string | yes | `employees.role` | free text; do not enumerate |
| `department` | string | yes | `employees.department` | drives the Teams page and `department_exposure` |
| `reports_to` | string \| `null` \| `"unknown"` | yes (may be `null`) | `employees.manager` | a **name**, not an id |
| `status` | `active` \| `departed` \| `on_leave` | yes | *(new column)* | drives `person_departed` (W5) and owner-departed risk (F04) |
| `started_at` | ISO date | no | `employees.hire_date` | absent → `tenure` is `NO_SIGNAL`, not 0 |
| `left_at` | ISO date \| `null` | only when `departed` | *(new column)* | |
| `skills` | string[] | no | `employees.skills` | already `TEXT[]` |
| `workload` | integer 0–100 | no | `employees.workload` | absent → unknown, not 50 |

`status` and `left_at` are the only new columns; they go in `sql/07_employee_status.sql`. Everything
else already exists.

## Validation — `schema.js` rejects at load, loudly (R-8)

1. **`name` is unique** across the array.
2. **Every person named anywhere else in the dataset must exist in `employees`** — `agents.owner`,
   `agents.backup_owner`, `ai_tools.users[]`, `ai_tools.access_owner`, `workflows.owner`,
   `workflows.backup_owner`, `workflows.steps[]` where `actor` is `human`, `knowledge_areas.holders[]`,
   `incidents.owner`, `incidents.resolved_by`, `decisions_log.owner`.
   **This rule matters more than the org chart.** It collapses eleven name spaces into one — most of
   what W3 is trying to achieve — and it catches "Aisha Khan" vs "Aisha Patel" at load instead of in
   a demo.
3. `reports_to` is `null`, `"unknown"`, or a `name` present in the array.
4. **Report the roots; never reject on their count.** Every person with `reports_to: null` is a root.
   ⚠ **Real orgs have several.** `data/company.json` has **six** — Robert Chen (VP Engineering),
   Lisa Wang (VP Product), Jennifer Foster (COO), Nathan Wright (Head of Data), Rebecca Stone
   (VP Sales), Victoria Adams (CFO) — because there is no CEO row. A rule demanding a single root
   would reject the real data on day one. Log the root list at load so a wrong one is visible.
5. **No cycles.** Walk every chain to a root; fail with the cycle printed.
6. `status` is one of the three values. `left_at` is non-null iff `status === 'departed'`.
7. An empty array fails. An org with no people is a broken feed, not an empty state.

**`headcount` is derived, never stored:** `employees.filter(e => e.status === 'active').length` — 40
today. One array, one count, one answer. `history[].headcount` is unaffected; it is a monthly rollup
and legitimately differs (it starts at 35 six months ago).

## Mapping to the graph

| Source | Produces |
|---|---|
| each employee | an `employee` entity — or `executive` when `reports_to === null` |
| `reports_to: "<name>"` | a `reports_to` edge person → manager, `metadata.source='declared'` |
| the same field | a `manages` edge manager → person, same source — **emit both**; the ontology has both and modules read both directions |
| `reports_to: "unknown"` or `null` | **no edge.** Never infer a manager from department. |
| `status: 'departed'` | **still an entity**, with `metadata.status='departed'` and `metadata.left_at`. Dropping departed people makes "this agent's owner has left" invisible, which is the risk F04 exists to catch. |

Entities before edges or the graph throws (Part B): all employees, then `reports_to`/`manages`, then
everything else pointing at a person.

## When the real company can't give you reporting lines

Don't set everyone to `null` — that makes all 40 people roots, which is indistinguishable from a
genuinely flat org and reads as an answer. Use the sentinel `"reports_to": "unknown"`. Validation
accepts it, no edge is emitted, and the org chart shows an R-3 `NO_SIGNAL` — *"no reporting line
recorded for 12 of 40 people"*. `null` means "reports to nobody"; `"unknown"` means "we weren't
told." They are different facts and the product must not conflate them.

## What to ask the person sourcing the data

**Three columns: name, role, department.** Ask for those and you get a spreadsheet the same day; ask
for ten fields and you get nothing for three weeks. Everything else degrades to an R-3 state rather
than blocking the load. Reporting lines are the valuable fourth column — ask, but don't make the
intake wait on them.

## ⚠ Never merge two organizations' records

When a second dataset shows up — a real customer, another demo, a colleague's export — **replace,
never union.** Two casts merged produce a third company that exists nowhere: two Sales departments
with no shared members, two people called Robert who are not the same Robert, and a headcount that
depends on which section you ask.

This is not a style preference. **Rule 2 makes a merged dataset fail to load**, because names
referenced in one cast's `agents.owner` do not exist in the other cast's `employees`. If you find
yourself editing rule 2 to get a merge through, stop — the rule is working.

If a second dataset has sections the current one lacks, take the *shape*, author the *content*
against the surviving cast, and throw the other records away. That is exactly how the three empty
sections in Part 0 get filled.

---

# PART A — HOW WE WORK

## A0 · Four things that will destroy other people's work

Read before your first commit.

**1. `backend/sql/01_schema_migration.sql` starts with `DROP TABLE IF EXISTS` across 42 tables.** Its
comment calls this "Clean slate (safe re-run)." **It is not safe.** It is safe for the *schema* and
catastrophic for the *data*. Running that file by hand wipes every table for everyone.

**2. There is one database and all of us share it.** No local Postgres, no docker-compose, no
per-developer schema. Every `backend/.env` on the team points at the same Supabase project.
**Anything you write, everybody gets.** Therefore:

- **Never run a `.sql` file by hand** — not with `psql`, not in the Supabase SQL editor, not "just to
  check." The only supported way to change the schema is a numbered file in `backend/sql/` applied by
  `node run_migrations.js`.
- **Never delete a row from `schema_migrations`.** That ledger is what makes re-runs safe. Removing a
  row re-runs its file — and for `01`, that means the `DROP TABLE` above.
- **Never run `run_migrations.js --baseline`** unless the database owner (A4) tells you to.
- To experiment destructively, get your own Supabase project first. Free, five minutes.

**3. `SUPABASE_KEY` is a `service_role` key.** It bypasses every row-level security rule and is valid
until 2036. It must never appear in `frontend/`, a log line, a screenshot, a Slack message, or any
file that isn't `backend/.env`. If you think you leaked it, say so immediately — rotating takes two
minutes and silence costs far more.

**4. Never commit a `.env` file of any kind.** `backend/.env` and `infrastructure/databases/.env` are
gitignored; **`.env.staging` is not** (Part F, threat 5). Run `git status` before every `git add .`
and read what it lists.

## A1 · Branching and review

1. Branch from `ocos/develop`. Never from `main`.
2. **One ticket = one branch = one PR** — not one item. W2 is eight tickets and eight PRs.
   Name the branch for the ticket: `feat/W2-graph-loader`, `feat/W4-ownership-override`.
3. Tell the reviewer when it's ready — branch name and item id.
4. Rebase on `ocos/develop` before review.
5. Tests in the same PR.
6. PRs over ~400 lines get split.
7. **A new endpoint ships with its `frontend/lib/api.ts` method and its type, in the same PR.** That
   file is the contract between the two halves and 30 files already use it. Without this rule the two
   halves invent different response shapes for the same data and nobody finds out until integration.

## A2 · When you are stuck

**Ask after 30 minutes, not after two days.** Ask the reviewer named on your row in A4. The estimates
in Part C assume you get an answer the same day.

Three things you must **not** decide alone, because they change other people's work:

- **A new database table.** 70 already exist — check Part B first. If you still need one, get it
  agreed with the database owner (A4) before writing the migration.
- **A change to an existing endpoint's response shape.** 30 frontend files consume `lib/api.ts`.
  Changing a shape without telling the frontend-contract owner breaks pages you will never open.
- **Anything in `backend/brain/`.** Modules are shared by all 55 capabilities. Nearly every feature in
  this plan is a route plus a table, not a module change.

## A3 · Getting it running — day one

Node 22. Two terminals. **You do not need to run migrations** — the database is already built.

```
# terminal 1 — API on :3000
cd backend
npm install
#   create backend/.env with the three values in Part F, then:
npm start
```

```
# terminal 2 — UI on :3001
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:3000` for the API, so no frontend `.env` is needed unless
you change the API port.

**You are set up correctly when all four are true:**

1. `curl http://localhost:3000/api/dashboard` returns JSON containing `"totalEmployees":40`
2. The backend log reads `Organizational Brain: READY — 55/55 modules, 55 capabilities`
3. `npm test` in `backend/` prints `ALL TEST SUITES PASSED`
4. `http://localhost:3001` renders with no red error box — the **sign-in page** on a fresh browser,
   or the **Executive Command Center** dashboard once you have signed in

⚠ **The UI is behind a login wall, so a sign-in screen is correct, not a broken build.** `app_users`
is empty, so sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` already in your `backend/.env` —
`routes/auth/auth.js:86` falls back to them when no user rows exist. The token is kept in
`localStorage`, so you will land on the dashboard from then on.

If (1) fails, your `.env` is wrong — check `DATABASE_URL` uses the **pooler** host, not
`db.<ref>.supabase.co`, which is IPv6-only and will not resolve on most machines.

**Verify every change like this:**

```
node run_migrations.js --dry-run    # says what WOULD run; changes nothing
npm test                            # must stay green
curl -s localhost:3000/api/<your-endpoint> | head -c 400
```

`--dry-run` is always safe. Plain `node run_migrations.js` is safe *only* because of the
`schema_migrations` ledger — see A0.

## A4 · Who owns each item

Assigned from the team structure of 2026-08-11. **Affan Ahmed Khan is deliberately in no cell** — as
Team Lead his job here is unblocking, not owning a ticket. See the two open questions at the end.

| # | Item | Owner | Reviewer | Why them | Split into |
|---|---|---|---|---|---|
| **W1** | Foundations | **Muhammad Haroon** | **Saad Mehmood** | Full-stack, backend+frontend integration — W1 is routing and SQL across both halves. ⚠ see note 1 | 1 ticket |
| **W2** | Company dataset intake | **Saad Mehmood** | **Ahmad Tanveer** | AI Pipeline Architect, "end-to-end cognitive pipeline integrity" — W2 *is* that pipeline, and it is the largest item | **8 tickets** — Part C |
| **W3** | Identity and claims | **Janita Tahir** | **Saad Mehmood** | Cognitive platforms + the database background this needs. Small, invariant-heavy, high blast radius | 1 ticket |
| **W4** | Human corrections | **Umer Siddiqui** (back)<br>**Zoya Khaliq** (front) | **Muhammad Haroon** | OCOS intelligence for the write path; Executive Experience for the three shared components. Reviewer sees both halves | 4 back + 3 front |
| **W5** | Change over time | **Maaz Khan** | **Jawad Zaheer** | OCOS intelligence — snapshot diffing and typed events. Pairs with Aleesha Manahil | 3 tickets |
| **W6** | Provenance and honesty | **Jawad Zaheer** (back)<br>**Zoya Khaliq** (front) | **Muhammad Ahmed** | Reasoning/intelligence owns confidence banding and `ev()`; the banner is Executive Experience. Pairs with Ahmed Abubakar | 2 tickets |
| **W7** | Missing pages | **Fatima Asif**<br>**Mushtaq Ahmad** (junior) | **Zoya Khaliq** | Six independent pages — the natural place for a junior to work beside a senior on real tickets | 6 tickets, one per page |
| **W8** | Conversation | **Muhammad Ahmed** | **Jawad Zaheer** | Reasoning/intelligence — subject resolution across turns. ⛔ **assigned, do not start** — first on the cut list | 4 back + 2 front |
| **W9** | Wire the brain to the routes | **Ahmad Tanveer** | **Saad Mehmood** | "Reporting / Technical Ownership" — this item owns the one open architectural decision (persist vs live) | 1 ticket |
| **W10** | Close the API | **Bisma Nadeem** | **Muhammad Haroon** | ⚠ see note 2 | 2 tickets |

### The three juniors pair, they do not own

Per the team structure, all three are on a learning/support track under senior guidance. They get
real tickets inside someone else's item, not an item of their own:

| Junior | Pairs with | On |
|---|---|---|
| **Aleesha Manahil** | Maaz Khan | W5 — the typed-event tickets |
| **Ahmed Abubakar** | Jawad Zaheer | W6 — `ev()` and the freshness bands |
| **Mushtaq Ahmad** | Fatima Asif | W7 — Evidence and Claims, the two smallest pages |

### Two roles outside the items

| Role | Owner | What only they do |
|---|---|---|
| **Database** | **Janita Tahir** | Approves every new table (A2), owns the `--baseline` decision (A0), takes the pre-W2 backup, and is the only person who runs anything by hand against Supabase |
| **Frontend contract** | **Zoya Khaliq** | Owns `frontend/lib/api.ts`. 30 files depend on it; response-shape changes go through this person or the halves diverge silently |

### ⚠ Two assignments to confirm before kickoff

**Note 1 — W1 is a guess.** Its skill profile says *"the person who knows this codebase best,"* and a
role title cannot tell you that. Muhammad Haroon fits on paper. If someone else has actually been in
`backend/routes/` and `index.js`, swap them in — W1 calibrates every other estimate in this plan, so
this is the worst cell to get wrong.

**Note 2 — W10 is deliberately outside its owner's specialty.** Bisma Nadeem is AI/ML on cognitive
platforms, not security. W10 is assigned to her *because* it is the most mechanically specified item
here — 46 mount points, three named tiers, an inverted sweep as the test — so it is the safest place
to work outside your specialty, with a full-stack reviewer. If that reads wrong, swap W10 and W9.

### Load, and the one bottleneck

**Saad Mehmood owns W2 (16–20 pd) and reviews W1, W3 and W9.** That is correct for the architect and
it is also the single point of failure in this table: three items stall the day he is unavailable.
If W1 slips for want of an answer, that is the cause. Consider moving the W3 review to Ahmad Tanveer.

Everyone else carries one item plus at most one review. Jawad Zaheer and Bisma Nadeem are the
lightest and are the first people to pull work toward if something slips.

**Nobody reviews their own item** — checked across all ten rows.

### The gate

**No branch is created for a W-item until both its cells are filled.** They now are. What has *not*
happened is the conversation — every person above should hear their assignment from Affan before
they read it here, and say yes.

**The Owner** splits the item into the tickets above · picks the order · **writes the "done when" for
each ticket before starting it**, in the style of W1's · runs the W1 endpoint sweep before and after ·
says when the estimate is wrong on the day they know, not at the end.

**The Reviewer** answers questions the same day — that is the actual job · reads the PR against the
item's "done when", not against taste · **checks one number by hand against the database**, which is
the only thing that catches the class of bug in W1f · blocks merge on a missing value-pinning test, a
missing `lib/api.ts` method (A1 rule 7), or a `.env` in the diff.

---

# PART B — WHERE THE CODE GOES

| I'm adding… | It goes here | Then wire it |
|---|---|---|
| An API endpoint | `backend/routes/<domain>/<name>.js` | one `app.use()` line in `backend/index.js` |
| Backend logic that isn't a route | `backend/lib/<name>.js` | nothing |
| A database table | `backend/sql/NN_name.sql` | nothing — the runner picks up `sql/*.sql` by filename |
| Something on every request | `backend/middleware/<name>.js` | `app.use()` in `backend/index.js` |
| Changing what a module computes | `IMPL.MXX` in `backend/brain/modules/implementations.js` | nothing |
| A shared graph calculation | the `A` object in `backend/brain/modules/analytics.js` | nothing |
| A page | `frontend/app/<route>/page.tsx` | nothing — the folder name is the URL |
| A component | `frontend/components/<domain>/` | nothing |
| Frontend logic | `frontend/lib/<name>.ts` | nothing |
| An API call | a method on `frontend/lib/api.ts` | nothing |
| A fact about the company | `data/company.json` | nothing — the loaders pick it up. ⚠ **replace sections, never merge two datasets** (Part 0A) |

### Nine things that will cost you an hour if nobody tells you

**`owners` is not the people table. `employees` is.** `employees` has 40 rows; `owners` has 10 and is
a subset carrying `role`, `backup_owner` and `risk`, linked by `owners.employee_id`. Both id spaces
start at 1 and **overlap numerically without meaning the same thing.**

⚠ **`agents.owner_id` references `employees.id`, not `owners.id`.** Joining it against `owners.id`
returns a real person who is the wrong person, and never errors. This has already caused one
production-visible bug (W1f). **This is the most common way to get a wrong answer in this codebase.**
Whenever you join two tables, confirm the target column in `backend/sql/05_foreign_keys.sql` — it is
the authoritative list of what points at what.

**Migrations run automatically and re-running is safe.** `node run_migrations.js` applies `schema.sql`
then every `sql/*.sql` in filename order, once each, tracked in `schema_migrations`. Add a numbered
file and it is picked up — no edit to the runner. It needs `DATABASE_URL` in `backend/.env`;
`SUPABASE_KEY` is a PostgREST key and cannot execute DDL.

**Any schema change is a migration file, never a dashboard edit.** Not a style preference: 33 foreign
keys and 9 columns were added by hand to the old project and never written back, so a database built
from this repo was missing them and a third of the API returned 500. See W1d.

**Check the schema before creating a table.** 70 exist across two places — `backend/sql/*.sql` **and**
`backend/schema.sql`, which is easy to miss. `truth_claims`, `knowledge_assets`,
`organizational_decisions`, `decision_history`, `snapshots` and `executive_sessions` are already
there. Look in both.

**Route depth changes the require path.** `routes/x.js` uses `require('../supabase')`;
`routes/x/y.js` uses `require('../../supabase')`.

**Copy [routes/decisions/decisions.js](backend/routes/decisions/decisions.js).** Router, supabase,
query, shape, `try/catch` → 500, export.

**Modules are pure functions of `rt.graph`.** No database, no network, no state between calls. If your
feature writes something it's a route plus a table, never a module change.

**Frontend already has the plumbing.** `frontend/lib/api.ts` is a typed wrapper that throws on
non-2xx; 30 files use it. `frontend/lib/` also holds `risk.ts`, `graph.ts` and `simulation.ts`. Check
before writing a calculation.

### Names the graph accepts

`backend/brain/data/ontology.js` is the allowed list, and the graph **throws** on anything else, so
typos fail loudly at insert.

**Entities (18):** `organization` `executive` `employee` `team` `department` `project` `system`
`ai_agent` `workflow` `process` `knowledge` `asset` `policy` `risk` `decision` `capability` `vendor`
`customer`

**Relationships (13):** `owns` `manages` `reports_to` `collaborates_with` `depends_on` `controls`
`governs` `executes` `creates` `consumes` `supports` `uses` `produces`

Three enforced rules, so build in this order:

- **Entities must exist before any edge pointing at them**, or it throws.
- **Duplicate edges collapse.** Same `from` + `type` + `to` returns the existing edge.
- Entities carry `metadata` and `source`. **Relationships currently don't** — see W1b.

---

# PART C — THE WORK

Ten items, not thirty-two. Most of the thirty-two are already built; Part E says which.

| # | Item | Back | Front | Total | Waits on |
|---|---|---|---|---|---|
| **W1** | Foundations — mount 21 orphaned endpoints, fix wrong-value routes, stop two silent data losses | 3–4 | — | **3–4** | — |
| **W2** | Company dataset intake — wire `data/company.json` up, delete the other seven sources, add graph reload | 15–19 | 1 | **16–20** | W1 |
| **W3** | Identity and claims — stable ids across graph and database | 6–8 | — | **6–8** | W1 |
| **W4** | Human corrections — an executive fixes what's wrong and it sticks | 10–14 | 8–10 | **18–24** | W2, W3 |
| **W5** | Change over time — snapshot, diff, typed events | 10–14 | 3 | **13–17** | W2 |
| **W6** | Provenance and honesty — timestamps, bands, unknown states | 4–5 | 4–5 | **8–10** | W3 |
| **W7** | Missing pages — six views that don't exist | — | 12–16 | **12–16** | W2 |
| **W8** | Conversation — follow-ups that keep their subject | 14–18 | 5 | **19–23** | — |
| **W9** | Wire the brain to the routes — today one route file of 66 uses it | 6–8 | — | **6–8** | W2 |
| **W10** | Close the API — 202 of 203 endpoints are unauthenticated | 4–6 | 2–3 | **6–9** | — |

W1 was scoped at 4–6; parts (d) and (f) are done, leaving 3–4.

**Backend 72–96 · Frontend 35–43.** A third of this plan is frontend. Staff it 80/20 and the write
features ship with no way to click them.

**Raw 107–139 person-days. With integration and rework, 144–188.** Roughly half the original
32-feature estimate, because Part E found most of those features already exist.

**These are estimates, not commitments.** Calibrate against W1, which is small enough to measure.
They assume someone who already knows this codebase — if the person is learning the stack at the same
time, plan on **1.5–2×**, and expect the first item to be worse than that.

**No item over ~8 pd goes to one person as a single ticket.** W2, W4, W8 and W5 all need splitting
before assignment; A4's last column gives the split. Split along the "Where:" list in each item — one
file or one layer per ticket, each with its own "done when."

**W2's eight tickets:** `sql/07_employee_status.sql` · `schema.js` + the seven validation rules ·
`toTables.js` · `toGraph.js` · `graphLoader.js` + `reloadGraph()` · `GET /api/people` · author the
repoint the five JSON readers and delete the hardcoded sources · delete `graphSeeder.js` · frontend
repoint.

**W2 drops to 16–20.** The dataset and its four authored sections are done — two of the original
nine tickets. What remains is wiring, which is the mechanical part.

**Owner and reviewer are named in A4 before work starts, not after.**

---

## W1 — Foundations · 3–4 pd · do this first

**Owner** Muhammad Haroon · **Reviewer** Saad Mehmood

**a. ~~21 written endpoints are unreachable.~~ CLOSED 2026-08-13 — decided: delete.** No work
remains here. Recorded below because the decision matters more than the ticket did.

Six route files were built and never mounted, because `backend/index.js` requires a sibling *file*
instead of the *folder* — `require('./routes/x/x')` loads `x.js` and never touches `x/index.js`.
Earlier passes trimmed the duplicate reads and left the rest as **an open decision: delete the
second system, keep it mounted but labeled as placeholder, or connect it to the live tables.**

**That call has been made — delete.** All **15** files are gone (the six `index.js` files plus the
nine engines and helpers only they used):

| Feature | Files deleted |
|---|---|
| Intent / execution pipeline | `orchestration/{index,intentReceiver,executionEngine}.js` |
| Governance enforcement | `governance/{index,governanceEngine}.js` |
| Briefing engine + recs | `briefing/{index,briefingEngine,recommendations}.js` |
| Continuity risk engine | `continuity/{index,continuityEngine}.js` |
| Self-healing engine | `selfHealing/healingEngine.js` |
| Legacy verification CRUD | `verification/index.js` |
| Deepgram voice pipeline | `voice/{index,intentParser,stt}.js` |

**Why delete rather than reconnect.** The whole cluster sits on one schema — `schema.sql`'s
`orchestration_state` / `verification_logs` / `execution_intents`, keyed by **text** ids (`wf_001`)
and seeded with "Robert", from the retired Sunrise Care dataset. The live app is on `sql/01`+`02`
with **integer** ids. Row counts measured directly against the live database:

| Live table | Rows | Shadow table it shadows | Rows |
|---|---|---|---|
| `workflow_orchestration` + `workflow_steps` | 10 / 39 | `orchestration_state` | 2 |
| `verification_actions` + `policy_violations` | 20 / 5 | `verification_logs` | 2 |
| `recommendations` | 10 | (derived from the three shadow tables) | — |
| — | — | `execution_intents` | **0** |

Reconnecting would have lit up governance, continuity and intent endpoints reporting confidently on
`wf_001` and "Robert" — data describing nothing real. That is the exact failure this spec's R-3
exists to prevent, so the code was removed rather than rewired. The intent/execution pipeline
(`execution_mode` → intent → human approve/reject → execute) was the one genuinely unique capability
in the cluster and it went too: `execution_intents` had zero rows and nothing emitted into it.
**It is recoverable from git if the product ever wants it — start from this commit's parent.**

**Both remaining path collisions are resolved by the deletion.** `GET /mode` and `POST /command` now
have exactly one implementation each — the live `orchestration/orchestration.js` and `voice/voice.js`.
There is no longer any endpoint to *set* the execution mode; `GET /api/orchestration/mode` is
read-only and the frontend's `AutomationModeControl` only reads it.

**Two live bugs fixed at the same time, both in the avatar gate check** — a live route that was
collateral damage from the split:
- `avatar/gateCheck.js` queried the 2-row shadow tables, so no real workflow ever matched: every
  check pushed `no_orchestration_record` and forced `can_act:false`, auto-escalating everything. Now
  reads `verification_actions` + `workflow_orchestration`, deriving collision from `workflow_steps`
  actor overlap the way `/api/orchestration/collisions` already does (the live table has no
  `collision_detected` column). Verified live: workflow 9 clears, workflow 8 escalates with four
  real reasons.
- `avatar/escalate.js` inserted `escalation_id`, `actor_type`, `actor_name`, `reasons` and `message`
  into `escalation_logs` — **none of those five columns exist**, so every gate failure threw instead
  of escalating. `POST /api/avatar/check` was non-functional, not merely over-eager. Fixed to the
  real columns; actor and reason list now go into `detail`.

`escalation_logs` **stays live** — `avatar/index.js` reads it. `orchestration_state`,
`verification_logs` and `execution_intents` are now referenced by nothing; the tables were left in
place deliberately (dropping them needs a migration and buys nothing). Migrations `07` and `08`
still apply cleanly and are harmless, but the columns they added
(`execution_intents.approved_by`/`rejected_by`/`decided_at`, `execution_mode.set_by`) no longer have
a writer. **Do not read the presence of these tables as evidence a feature is missing.**

There is also no `DEEPGRAM_API_KEY` in `backend/.env`, so the deleted "speech pipeline" could only
ever have returned its hardcoded mock transcript (`"Check the status of workflow wf_001…"`).

**This is already breaking the app.** Three paths `frontend/lib/api.ts` calls return 404 today,
verified by calling them: `/api/briefing/health` and `/api/briefing/risks` (both in the unmounted
`briefing/index.js`), and `/api/relationships/health`.

`/api/relationships` is a different problem: **the route file does not exist.** There is no
`routes/relationships*` anywhere — only `brain/knowledge/relationshipRegistry.js`, which is
unrelated. It is an endpoint the frontend calls that was never built. Write it or remove the call
from `lib/api.ts`; don't leave it.

**Three more are dead a different way — shadowed.** `backend/index.js` mounts `/api/intelligence`
twice (lines 77 and 80) and mounts three longer paths under it earlier. Express matches the first, so
`constitutional.js`'s `/truth`, `/brain-core` and `/orchestrator` handlers never run — `truth/truth.js`,
`brainCore.js` and `orchestrator.js` answer instead. Verified by calling all three. Since
`constitutional.js` reads `sunrise_care.json` and the three that win read Supabase, this currently
*hides* a data-source conflict rather than causing one. Delete the shadowed handlers when W2
repoints that file.

**b. Relationships silently drop `metadata`.** `backend/brain/knowledge/relationshipRegistry.js:20`
destructures a fixed field list and discards the rest. Ownership precedence (R-1) depends on
`owns.metadata.source`:

```js
add({ from, to, type, confidence = 1, evidence = [], criticality = 'medium',
      direction = 'directed', failureImpact = null, metadata = {} }) {   // ← add
  const rel = { id, from, to, type, confidence, evidence, criticality,
                direction, failureImpact, metadata,                      // ← add
                timestamp: new Date().toISOString() }
```

**c. M49's snapshot drops `metadata` and `criticality`.** `implementations.js:1123` maps
relationships to `{from, type, to}` only, so a diff can't see that ownership changed *source*. Add
both. Blocks W5.

**d. Database and migrations — ✅ DONE. Do not redo.**

The runner never worked: it called an `exec_sql` RPC that exists in no Horquva project, so it had
**never applied a single statement** — it logged failures and exited 0. That is why `schema.sql` was
missing from the database while `sql/01–04` were present; those had been applied by hand.

Rewritten to connect via `pg` using `DATABASE_URL`, apply `schema.sql` then `sql/*.sql` in filename
order, one transaction per file, recording each in `schema_migrations` so re-runs are safe, exiting
non-zero on failure. `--dry-run` and `--baseline` included.

**The schema in git never described the running database.** Rebuilding from this repo produced a
broken API — proven, because we did exactly that. Two classes of drift, both now closed:

| Added | What was missing | Why it broke things |
|---|---|---|
| `sql/05_foreign_keys.sql` | **33 foreign keys** — `01_schema_migration.sql` creates 42 tables and declares none | ~33 routes use PostgREST nested embedding, e.g. `.select('agents(name, risk)')`, which resolves *only* through a declared FK |
| `sql/06_missing_columns.sql` | **9 columns** — `computed_at`, `created_at`, `snapshot_date` | routes call `.order()` on columns the schema never declared |

Every FK was validated against real data first — matching types, zero orphans. One was informative:
**`agents.owner_id` had 9 orphans against `owners.id` and zero against `employees.id`**, confirming
it references employees. That is the bug the comment in `routes/ownership.js` documents as a JS-side
workaround; the workaround can now be removed.

Both files end with `notify pgrst, 'reload schema'` — without it PostgREST serves stale-cache errors
after DDL, which is what the `escalation_logs` 500s were.

**Result: 70 tables, eight migration files recorded, re-run is a no-op.** The three
`/api/avatar/escalations` 500s are fixed.

**e. There is effectively no test coverage.** `backend/tests/` is 234 lines across four files. They check
counts and that nothing throws — *"55 modules discovered"*, *"fused confidence is a number"*.
**Nothing asserts that a computed value is correct**, and `api.smoke.test.js` runs only when
`BASE_URL` points at a deployed server, so no route is tested locally.

Don't fix this retroactively — fix it going forward. Every W-item ships tests that would **fail if
the number were wrong**, not tests that check the request succeeded:

```js
// NOT this — passes even when every owner is the wrong person
assert(res.status === 200)
assert(Array.isArray(body.owners))

// THIS — pins the actual answer
const sarah = body.owners.find((o) => o.name === 'Sarah Mitchell')
assert.deepEqual(sarah.agents.map((a) => a.name), ['SecurityScanner'])
assert.equal(body.owners.reduce((n, o) => n + o.agentCount, 0), 15)  // no agent dropped
```

**f. Some routes return 200 with the wrong answer.** Status codes did not catch this; only reading
the values did. Two were found and fixed; assume there are more.

| Fixed | What was wrong |
|---|---|
| `routes/ownership.js` | joined `agents.owner_id` against `owners.id`. It references **`employees.id`**. Both id spaces start at 1, so the join never errored — it returned a different, plausible person. 6 agents misattributed, 9 silently dropped. |
| `routes/tools.js` | `normalize()` read `monthly_cost_usd`/`monthly_cost`; the column is **`cost_monthly`**. Every row costed $0, the "is Supabase real?" check failed, and the route served the local JSON instead. |

**Two bugs in the two files anyone looked at closely. Budget for the rest.** So: **spot-check the
claim-bearing routes by value** — `/api/dashboard`, `/api/risks`, `/api/dependencies`,
`/api/knowledge/gaps`, `/api/briefing/today`. Run the equivalent SQL and compare. This is 1 pd and
the highest-value day in the plan, because everything downstream inherits these numbers.

One known failure to start from: **`/api/briefing/today` returns 2 of its 12 fields as `null`** —
`top_spof_owner` and `lesson_learned`. Verified against the live server on 2026-08-11. An earlier
measurement said six; the other four were fixed by the foreign keys in W1d, so re-measure before
assuming any figure in this document about *values* is still current. Both remaining nulls are R-3
violations shipping today, and `lesson_learned` has no source at all — there is no incidents table.

**Done when:**

- ✅ A database built only by `run_migrations.js` has all 70 tables. *(d)*
- ✅ **149 of 163 mounted GET endpoints return 200.** The other 14 are correct behaviour: `401` on
  `/api/auth/me` unauthenticated, `400` on `/api/executive/ask` and `/api/voice/ask` which need a
  query param, and **11** `:param` routes that return 200 given a real value. *(d)*
- ✅ `/api/ownership` and `/api/tools` return values matching the database. *(f)*
- ⬜ Every route file is mounted or deleted, and the three shadowed handlers are gone. *(a)*
- ⬜ The 8 colliding paths each have exactly one implementation left. *(a)*
- ⬜ `/api/briefing/health` and `/api/briefing/risks` return 200; `/api/relationships/health` is
  either built or removed from `lib/api.ts`. *(a)*
- ⬜ An `owns` edge read back from a booted graph still has `metadata.source`. *(b)*
- ⬜ A change of ownership `source` survives into a snapshot diff. *(c)*
- ⬜ The five claim-bearing routes are checked by value against SQL, and each has one test pinning a
  real number. *(f)*

**Reproduce the endpoint sweep before claiming (a) is done** — a count is the only way to know you
didn't break something else while mounting six routers. It is committed at
`backend/tools/sweep.js` — start the server, then `node tools/sweep.js`:

```js
// Lists every GET reachable through index.js and its status. Read-only.
const fs = require('fs'), path = require('path')
const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')
const mounts = [...idx.matchAll(/app\.use\(\s*'(\/api[^']*)'\s*,\s*require\('([^']+)'\)\s*\)/g)]
const seen = new Set(), gets = []
const resolve = (f) => {
  const p = path.join(__dirname, '..', f.replace(/^\.\//, ''))
  return fs.existsSync(p) && fs.statSync(p).isFile() ? p
    : fs.existsSync(p + '.js') ? p + '.js'
      : fs.existsSync(path.join(p, 'index.js')) ? path.join(p, 'index.js') : null
}
const scan = (base, file) => {
  const real = resolve(file); if (!real || seen.has(base + real)) return
  seen.add(base + real)
  const src = fs.readFileSync(real, 'utf8')
  for (const m of src.matchAll(/router\.get\(\s*'([^']*)'/g)) gets.push(base + (m[1] === '/' ? '' : m[1]))
  for (const m of src.matchAll(/router\.use\(\s*'([^']*)'\s*,\s*require\('([^']+)'\)\s*\)/g))
    scan(base + m[1], './' + path.posix.join(path.dirname(real).split(path.sep).slice(-2).join('/'), m[2]))
}
mounts.forEach((m) => scan(m[1], m[2]))
;(async () => {
  let ok = 0
  for (const p of [...new Set(gets)].sort()) {
    const r = await fetch('http://localhost:3000' + p).catch(() => ({ status: 0 }))
    if (r.status === 200) ok++; else console.log(r.status, p)
  }
  console.log(`\n200: ${ok} / ${new Set(gets).size}`)
})()
```

**Baseline: `200: 149 / 163`.** If your number is lower, you broke something.

---

## W2 — Company dataset intake · 16–20 pd · the main event

**Owner** Saad Mehmood · **Reviewer** Ahmad Tanveer · Eight tickets, not one.

**The problem.** Eight sources feed different parts of the system and none of them agree — see
Part 0's table, which says what happens to each.

**The goal.** `data/company.json` becomes the single source for the graph, the routes and the
frontend. Swapping companies becomes replacing one file.

**The dataset already exists.** `data/company.json` was exported from `sql/02_seed_data.sql` by
[backend/tools/export-company.js](backend/tools/export-company.js) and validates against all seven
Part 0A rules. You are wiring it up, not designing or sourcing it.

That script is a one-time migration, kept so the export is reproducible and auditable — `node
backend/tools/export-company.js .` regenerates the file and re-runs the validation. **It is not part
of the runtime and nothing should call it.** Once `schema.js` exists, its validation block is the
reference implementation of Part 0A's seven rules; delete the script when W2 lands.

**The direction of flow — get this right before writing anything:**

```
data/company.json ──┬── toTables.js ──▶ Supabase ──▶ 54 route files
                    └── toGraph.js ───▶ graph ─────▶ 55 modules
```

The file is the source of truth for **facts about the company**. Supabase is the store for those
facts *and* for everything computed (~50 tables) or written by a human (W4, W5). Neither replaces
the other, and nothing reads the file directly except the two loaders.

**Where:**

- `backend/lib/company/schema.js` — the contract with validation. Reject a bad dataset loudly at
  load, not at query time. **Part 0A has the seven rules** — implement them exactly, especially
  rule 2, which is what keeps the dataset one name space instead of eleven, and rule 4, which must
  *report* the six roots rather than reject them.
- `backend/sql/07_employee_status.sql` — the two new columns Part 0A needs, `status` and `left_at`.
- `backend/lib/company/toTables.js` — dataset → the existing Supabase tables: `employees`, `agents`,
  `ai_platforms`, `workflows`, `dependencies`, `knowledge_assets`. Do not create parallel ones.
  ⛔ **Upsert on the natural key. Never `DELETE`, never `TRUNCATE`.** 33 foreign keys point at these
  tables from roughly 50 tables of computed output; clearing and re-inserting either fails on the
  constraints or cascades away work nobody can regenerate. Running it twice must change no rows —
  prove that with a test.
- ⚠ `backend/sql/08_authored_sections.sql` — **four genuinely new tables**: `systems`, `incidents`,
  `decisions_log`, `external_entities`. These are the sections with no source table, so unlike
  everything else in this item there is nothing to reuse. This is also why
  `/api/briefing/today.lesson_learned` is null: it reads incidents, and no incidents table exists.
  Get the shapes agreed with the database owner (A2) before writing the migration.
- `backend/lib/company/toGraph.js` — dataset → entities and edges, using only the Part B names.
- `backend/brain/knowledge/graphLoader.js` — new, beside `graphSeeder.js`, same output shape.
- `backend/brain/runtime/runtime.js:63` — currently `if (seed) seedDemoOrganization(graph)`. Add the
  branch for `bootBrain({ seed: false, load: true })` and make it the default. Keep the `seed: true`
  path only until `systems` is authored, then **delete `graphSeeder.js`** — a second company left in
  the tree is how this problem came back the first time.
- `backend/routes/people.js` — `GET /api/people`, the roster, with `?department=` and `?status=`.
  Nothing serves an employee list today and W7's People page has no data source without it. Now a
  straight select against a populated table.
- **Delete `backend/brain/knowledge/graphSeeder.js`** once `graphLoader.js` boots. Every entity and
  relationship type it held is now in `data/company.json`. Leaving a second company in the tree is
  how this problem arrived in the first place.

**The mapping, so nobody invents their own:**

| Dataset section | Entity | Edges |
|---|---|---|
| `organization` | `organization` | `owns` each department |
| `departments` | `department` | `owns` from the department's `head` |
| `employees` — shape and rules in **Part 0A** | `employee` / `executive` | `reports_to` and `manages`, both from the one `reports_to` field; `"unknown"` emits neither. Carry `department` as `metadata` — the ontology has no membership edge, so do not invent one |
| `processes` | `process` | `owns` from `accountable` |
| `policies` | `policy` | `governs` each name in `governs[]`; `controls` from `accountable` |
| `agents` | `ai_agent` | `owns` (owner), `owns` (backup, `metadata.role='backup'`) |
| `ai_tools` | `asset` | `uses` from each user, `owns` from `access_owner` |
| `workflows` | `workflow` | `owns` from `owner` (`metadata.source='declared'`) **and a second `owns` from `accountable`** where it differs — both edges, so R-1 can raise the `CONFLICT`. Plus `depends_on` per step actor |
| `dependencies` | — | `depends_on`. ⚠ Resolve endpoints with `from_type`/`to_type`, not the name alone — the cast contains a `DataPipeline` agent and a `Data Pipeline` workflow |
| `knowledge_areas` | `knowledge` | `owns` from each holder |
| `external_entities` | `vendor` / `customer` | `supports` — **empty until authored** |
| `incidents`, `decisions_log`, `history` | — | tables only, not graph |

**A running server must be able to rebuild the graph. Today it cannot.** `backend/index.js:87` calls
`mountBrain(app)` once at startup and the graph lives in memory for the life of the process. Nothing
calls `bootBrain` again — there is no reload path anywhere. That breaks two things downstream: **a
human correction (W4) wouldn't appear until someone restarts the server**, making R-6 false in
practice, and F27's "refresh in place" has no backend behind it.

Add a `reloadGraph()` to `backend/brain/index.js` that rebuilds in place and swaps atomically — never
leave a half-built graph readable. Call it on a timer at `LOAD_INTERVAL_HOURS` (R-7) and immediately
after any W4 write. Expose it as an admin-only route for manual triggering. Record `lastLoadedAt`;
F27 and R-3's `STALE` state both read it.

**2026-08-13 — `reloadGraph()` exists and its provenance is now observable. The timer does not.**
`runtime.reloadGraph()` rebuilds and swaps atomically, is called once from `backend/index.js` at
startup, and is exposed at `POST /api/brain/reload-graph`. **Still open:** the
`LOAD_INTERVAL_HOURS` timer (R-7) and the post-W4-write call — reload happens exactly once per
process today.

What was fixed instead was the thing that made a failure invisible. The brain boots synchronously on
`graphSeeder.js`'s 16-entity demo graph and swaps in the real 131-entity Supabase graph
asynchronously; the swap was fire-and-forget, its rejection only `console.error`'d. So a Supabase
outage at boot left the brain serving **synthetic data indefinitely while `/api/brain/status` kept
reporting `READY`** — nothing in any payload distinguished the two.

`BrainStateManager` now tracks graph provenance, surfaced as a `dataSource` block on
`GET /api/brain/status`, `GET /api/brain/boot-report` and `POST /api/brain/reload-graph`:

| field | on the real graph | after a failed load |
|---|---|---|
| `source` | `supabase` | `demo-seed` |
| `live` / `servingDemoData` | `true` / `false` | `false` / `true` |
| `entities` / `relationships` | 131 / 237 | 16 / 24 |
| `loadedAt` | swap timestamp | demo seed timestamp — this is the `lastLoadedAt` R-3's `STALE` state should read |
| `syncAttempts` / `syncFailures` | 1 / 0 | 1 / 1 |
| `lastSyncError` | `null` | `{ message, at }` |
| `warning` | `null` | "Serving the synthetic demo graph, NOT real organizational data…" |

Verified both paths live by pointing `SUPABASE_URL` at an unreachable host. Boot-time failure also
now logs a loud, banner-delimited error instead of one line.

⚠ **Deliberate choice: `accepted`/`phase` still read `READY` on demo data.** `accepted` gates
`state.isReady()`, which gates `POST /api/brain/ask` — failing acceptance on a Supabase outage would
take the runtime offline rather than degrade it. Whether that is the right trade is a product call
that has **not** been made; if the answer is "an outage should hard-fail the brain", add a criterion
to `_buildBootReport()` and expect `/ask` to 503. Until then, **`dataSource.live` is the field to
check — `ready: true` does not mean the data is real.**

**Removing the other sources is most of the work, and it's mechanical:**

- Repoint the five routes that read `data/sunrise_care.json` directly — `intelligence/constitutional.js`,
  `tools.js`, `avatar/index.js`, `automation/index.js`, `selfHealing/index.js` — to query Supabase
  like the other 54, **not** to read `company.json`. Only the two loaders touch the file. Delete the
  multi-path filesystem searches while you're there, then delete `data/sunrise_care.json`.
- Delete `INLINE_AI_TOOLS` from `routes/tools.js`, and `BRAIN` and `INLINE_INTENTS` from
  `routes/voice/voice.js`.
- Delete `mockNotifications` from `components/global/GlobalNotificationPanel.tsx` — the panel is on
  every page showing invented alerts.
- Repoint the frontend and delete `frontend/data/sunrise_care.json`. ⚠ **The reader is
  `frontend/lib/data.ts`, not the page** — `app/network/page.tsx` imports `getDataset()` from it.
  Deleting the JSON without changing `lib/data.ts` and the `Dataset` type in `frontend/types` breaks
  the build.
- ⚠ **`app/ownership/page.tsx` does not call `/api/ownership`.** It assembles its view from
  `/api/agents`, `/api/tools` and `/api/workflows/intelligence`. Check what a page actually fetches
  before changing an endpoint for it — several pages do this.

Each removal will make something return empty. **That is the correct outcome** — R-3 says show the
unknown state. Do not replace one fallback with another.

**Done when:**

- `bootBrain({ load: true })` boots on `data/company.json` and M01 returns its real owners —
  SecurityScanner → Sarah Mitchell, DeployBot → Yuki Tanaka. Pin those in a test.
- **The graph, the routes and the file all report headcount 40.** Assert all three agree in one test;
  that single assertion is what proves the three-companies problem is closed.
- **A dataset breaking any of Part 0A's seven rules fails to load, with the rule named.** Test each,
  including an integer `employees` and a name referenced but absent (rule 2).
- **Six roots are reported, not rejected** — the rule-4 regression test.
- Loading twice creates no duplicates, and `toTables.js` run twice changes no rows.
- **Timing recorded before and after.** Today's baseline is fine — `/api/ownership` responds in 0.4s —
  but that is a Supabase route which never touches the graph, so it says nothing about brain
  performance. Watch `/api/intelligence/*` via `prediction.js`, the only route walking the graph
  today, and every route W9 converts. Note the numbers when real volume lands; if something crosses a
  few seconds it gets a ticket then, not a rewrite now.

---

## W3 — Identity and claims · 6–8 pd

**Owner** Janita Tahir · **Reviewer** Saad Mehmood · Quiet, and everything leans on it.

**The problem.** Three identity systems, nothing joining them:

- Graph entities: `ent_a1b2c3d4e5f6` — **regenerated on every boot**
- Postgres: `truth_entities.id`, `employees.id`, `owners.id` — serial integers
- Older tables: text names — `asset_name`, `owner_name`

So a human correction stored today points at a graph id that won't exist tomorrow. And "claim id" —
which W4, W6 and W8 all reference — is used everywhere and defined nowhere. `truth_claims` exists; no
module writes to it.

**Where:** `backend/lib/identity.js` and `backend/lib/claims.js`.

**Build:**

- **The natural key is the only id that crosses a boundary.** `entityRegistry` already keeps
  `_byNaturalKey(type, name)`. Anything stored in Supabase or shown in a URL uses `type:name`, never
  `ent_...`.
- **A claim is a row in the existing `truth_claims` table**, written when a module produces an
  assertion: `entity_id`, `claim_text`, `claim_category`, `evidence`, `verdict`, `confidence_score`,
  `data_source`. Its `id` is *the* claim id.
- One helper that both routes and modules use to mint and look up claims.

⚠ **`truth_claims.entity_id` is `INT REFERENCES truth_entities(id)`.** It cannot hold a `type:name`
natural key, so R-5 and this table collide. Pick one with the reviewer and write it down before
building:

| Option | What it means |
|---|---|
| **Resolve on write** *(preferred)* | `claims.js` looks up or creates the `truth_entities` row for a `type:name` and stores its integer id. The natural key stays the public identifier, the int stays internal, nothing in the schema changes. |
| Add a column | `alter table truth_claims add column entity_key text` and index it. Simpler to write, but two columns then mean "which entity" and they can disagree. |

`truth_entities` has 15 rows. Check what its natural-key column is called before writing either — do
not assume it matches the graph's `type:name` format.

**Done when:** an entity referenced before a restart resolves to the same thing after it, and every
answer OBA gives carries a `truth_claims.id` that returns the claim.

---

## W4 — Human corrections · 18–24 pd (10–14 backend + 8–10 frontend)

**Owner** Umer Siddiqui (backend) and Zoya Khaliq (frontend) · **Reviewer** Muhammad Haroon

**The problem.** Nothing in 203 endpoints lets a person say "that's wrong." The system asserts and
the human watches.

**The shape — all of it works this way:**

```
route  →  Supabase table  →  loader turns it into an edge  →  modules read it as graph
```

**No module changes. Ever.**

**Where:** `backend/sql/NN_human_assertion.sql` (genuinely new — nothing covers it) ·
`backend/routes/ownership/override.js` · `backend/lib/company/toGraph.js` ·
`backend/routes/knowledge/capture.js` · `backend/routes/claims/review.js`.

**Build:**

- **Override an owner.** Becomes an `owns` edge with `metadata.source='human'`, which R-1 ranks above
  everything. **Reason required**, saved as a knowledge entry so the correction teaches the system
  instead of patching it. Survives every reload until revoked; marked redundant once the dataset
  agrees.
- **Capture knowledge.** Writes to the existing `knowledge_assets`. Three ways in: inline on any
  object, prompted by OBA when a "why" finds nothing, bulk at onboarding.
- **Record a decision.** Writes to the existing `organizational_decisions` / `decision_history`.
  Approve, reject, acknowledge, mark for review — the last two need a reason.
  `routes/orchestration` already does approve/reject for intents; copy that shape.
- **Review a claim.** One screen: the claim, its band, its evidence, the four actions, no navigation.
  That screen is W7's `/claims` page.

**Every one of these routes gets both middlewares, in this order:**

```js
const { requireAuth, requireRole } = require('../../middleware/auth')
router.post('/override', requireAuth, requireRole('admin', 'executive'), handler)
```

⚠ **`requireRole` on its own does not authenticate — it 401s everyone, always.** It reads `req.user`,
which is set by `requireAuth` or by `orgContext`, and `orgContext` **is never mounted in `index.js`**.
Always the pair.

The three roles are `member | admin | executive`, defined in `sql/auth_schema.sql:8`. `app_users` is
empty — nobody has registered — so **register an admin through `POST /api/auth/register` and keep the
token first**, or you cannot test any of this.

`/api/auth/me` is the only protected endpoint in the API; the other 202 are open. W4 is the first
item that puts a real permission check anywhere, so get the pattern right — **W10 retrofits the other
202 against exactly this pair.**

**The frontend is half this item**, and easy to forget because the backend feels like the work. A
write endpoint nobody can click is not a feature. Build these as **shared components, not per-page
copies** — they appear on almost every page.

**Three components in `frontend/components/global/`**, which already holds `GlobalAvatarPanel`,
`GlobalNotificationPanel`, `GlobalSearchOverlay` and `GlobalPanelsContext`, so the pattern and the
mounting point exist:

| New component | What it is |
|---|---|
| `CorrectThis.tsx` | button + modal, reason field **required** |
| `CaptureKnowledge.tsx` | inline "why is this?" box |
| `DecisionActions.tsx` | approve / reject / acknowledge / mark for review — reason required on the last two |

**Wire them into these exact files:**

| Component | Goes in | Why there |
|---|---|---|
| `CorrectThis` | `components/ownership/OwnershipList.tsx` | every row shows an owner |
| | `components/ownership/OwnershipOverview.tsx` | the summary names owners too |
| | `components/dashboard/AgentTable.tsx` | agents show owners on the dashboard |
| | `app/systems/page.tsx` *(W7, new)* | systems have owners |
| `CaptureKnowledge` | `components/knowledge/` — the detail view | the natural home for "why" |
| | `app/oba/page.tsx` | OBA prompts when a why-question finds nothing |
| | `components/risk/` detail | risks need rationale most |
| `DecisionActions` | `components/risk/` | approve or accept a risk |
| | `components/decision/` — 4 files already exist | pending decisions |
| | `app/claims/page.tsx` *(W7, new)* | the review surface |

**The reason field is not optional anywhere.** R-6 only works if we know *why* a human overrode the
system, and F29 stores that reason as the knowledge entry.

Add each endpoint's method to `frontend/lib/api.ts` in the same PR (A1 rule 7).

---

## W5 — Change over time · 13–17 pd (10–14 backend + 3 frontend)

**Owner** Maaz Khan · **Reviewer** Jawad Zaheer · Aleesha Manahil pairs on the event tickets.

**The problem.** `history` in the dataset is monthly rollups — headcount, cost, risk index. Nothing
records that *this person* stopped owning *that agent* on the 14th.

**Where:** `backend/sql/NN_graph_snapshot.sql` — `id`, `taken_at`, `payload jsonb` ·
`backend/lib/changes.js` · `IMPL.M10`.

**This is the one place that genuinely needs a new table.** Neither existing snapshot table can hold
a graph: `snapshots` has fixed metric columns (`headcount`, `risk_index`, `continuity_score`) and
`brain_core_snapshots` holds a brain posture (`brain_index`, `posture`, `top_signals`). Verified —
neither has a payload column. Every other table in this plan is reused.

**Build:** save M49's payload after each load (needs W1b), diff consecutive snapshots, emit typed
events — `owner_added` `owner_removed` `ownership_changed` `dependency_added` `dependency_removed`
`entity_added` `entity_archived` `person_departed` `governance_changed`.

Each carries what changed, before, after, when it happened, when we noticed, and who was involved.
**Where we only know when we noticed, say "detected on"** — otherwise the product lies about timing.

Then extend `IMPL.M10` to read them, which makes it the Organizational Memory its name claims and
unlocks the two missing risk rules in Part E (F04).

**The frontend.** One component, `components/global/ChangeFeed.tsx` — each event as one plain
sentence built from the typed event, **never a raw diff**, with the six fields one click away. Wire
it into exactly two places:

- `app/page.tsx` — the dashboard, showing only `ownership_changed`, `owner_removed`,
  `person_departed`, `entity_archived`. It sits alongside the existing `WhatMattersNowFeed` and
  `EarlyWarningStrip`, which follow the same shape — copy one.
- `app/history/page.tsx` *(W7, new)* — unfiltered, per object.

---

## W6 — Provenance and honesty · 8–10 pd

**Owner** Jawad Zaheer (backend) and Zoya Khaliq (frontend) · **Reviewer** Muhammad Ahmed ·
Ahmed Abubakar pairs on `ev()`.

**Where:** `implementations.js:21` · `IMPL.M01`, `IMPL.M15`, `IMPL.M46` · a banner in
`frontend/components/global/` · every page.

**Build:**

- **`ev()` gains a timestamp.** One line; all 55 modules inherit it:
  ```js
  const ev = (source, ref, note, observedAt = null) => ({
    source, ref, note, observedAt,
    freshness: !observedAt ? 'unknown'
      : ageDays(observedAt) <= 7 ? 'fresh'
      : ageDays(observedAt) <= 30 ? 'aging' : 'stale' })
  ```
- **Band the confidence, never print it** (R-2).
- **Say the unknown states out loud** (R-3), with the reason and the fix. Persistent banner:
  *"Last loaded 4 hours ago · 120 employees · 2 owners unresolved."*
- **No screen renders blank where an unknown state applies.** Check every page.

---

## W7 — Missing pages · 12–16 pd

**Owner** Fatima Asif, with Mushtaq Ahmad on Evidence and Claims · **Reviewer** Zoya Khaliq

**Six independent tickets, one per page** — the most parallelisable
item in the plan, and the natural place for two React people.

23 view folders exist. Six of the eleven the product needs don't: **People · Teams · Systems ·
History · Claims · Evidence.** Each is specified below. If something is missing from a spec, that is
a question for the reviewer, not a gap to fill by taste.

**Where:** `frontend/app/<name>/page.tsx`, components in `frontend/components/<name>/`, calls via
`frontend/lib/api.ts` — **the method and its type ship in the same PR** (A1 rule 7).

**What exists and does not cover these.** `app/network/page.tsx` is a graph view reading
`getDataset()` from `lib/data.ts` — the partial JSON — so it is not a People page, and W2 repoints it
anyway. `app/relationships/page.tsx` and `app/memory/page.tsx` are worth ten minutes each before you
start, but neither is a list of people or of change.

### Rules for all six

- **Every list has all five R-3 states and none of them is a blank table.** Each spec names the state
  that matters most for that page; the others still apply.
- **Names, never ids** (R-4). Rows link by natural key `type:name` (R-5), never by `ent_...`.
- **Confidence renders as a band, never a number** (R-2).
- Page size 50. Server-side sort where the endpoint supports it, client-side otherwise.
- Every page shows the W6 freshness banner.

### 1 · People — `/people` · ~3 pd

The org's roster. The page a new executive opens first.

| | |
|---|---|
| **Data** | ⚠ **`GET /api/people` does not exist yet.** `/api/collaboration/people` returns collaboration scores, not a roster; `/api/human-agent-map` returns pairings. **The route is W2's**, not yours — if it hasn't landed, build against `data/company.json`'s `employees` shape (Part 0A) and say so in the PR. |
| **Columns** | Name · Role · Department · Reports to · Owns (count of `owns` edges) · Knowledge held (count) · Status · Risk band |
| **Sort** | Owns-count descending — it puts concentration at the top, which is the point of the page. Sortable on every column. |
| **Row links to** | the person's detail view. Owns and Knowledge counts link to Systems and Knowledge filtered to that person. |
| **Empty state** | `NOT_INGESTED` — *"No people in the current dataset. The `employees` section is missing or empty."* This is the state the page is in until W2 lands, so build it first, not last. |
| **`unknown` reporting lines** | the Reports-to cell shows `NO_SIGNAL` — *"not recorded"*. Never blank, never a guess. |

### 2 · Teams — `/teams` · ~2 pd

Departments, and where each one is exposed.

| | |
|---|---|
| **Data** | exists: `GET /api/health/departments`, `GET /api/collaboration/departments`, and the `department_exposure` table. **Verify both by value against SQL first** — W1f's lesson applies to every endpoint nobody has read closely. |
| **Columns** | Department · Headcount · Agents owned · Tools used · Undocumented knowledge areas · Single points of failure · Health score band |
| **Sort** | SPOF count descending |
| **Row links to** | People, filtered by department |
| **Empty state** | `NO_SIGNAL` — *"No department recorded on any person."* Distinct from `NOT_INGESTED`: people exist, the field doesn't. |
| **Note** | Departments come from `employees.department`. There is no departments table and there should not be one. |

### 3 · Systems — `/systems` · ~2–3 pd

Every agent and tool in one list with an owner beside each. The ownership answer, as a table.

| | |
|---|---|
| **Data** | exists: `GET /api/agents`, `/api/agents/orphaned`, `/api/agents/risk-summary`, `GET /api/tools`. Both were touched by W1f, so re-verify by value. |
| **Columns** | Name · Kind (`agent` \| `tool`) · Owner · Backup owner · Criticality · Monthly cost · Last used · Ownership source badge (`human` \| `declared` \| `derived`, per R-1) |
| **Sort** | Criticality descending, then no-owner first |
| **Row links to** | the object's detail view. Owner links to that person on People. |
| **Empty state** | the per-row state matters more than the page state: **a system with no owner shows `NO_SIGNAL` — "nobody is listed as owning this" — as a red state, never an empty cell.** That row is the product's most valuable output. |
| **Carries** | `CorrectThis` (W4) — the highest-traffic place a wrong owner gets fixed |

### 4 · History — `/history` · ~2–3 pd

What changed, when, and when we noticed.

| | |
|---|---|
| **Data** | `GET /api/health/history`, `/api/health/trend` and `/api/briefing/history` exist and give **monthly rollups only**. Per-object events come from W5. **Build the rollup chart first — it ships without W5.** |
| **Layout** | trend chart on top, `ChangeFeed` (W5, unfiltered) below |
| **Feed columns** | When it happened · When we noticed · What changed · Before → After · Who was involved |
| **Sort** | most recent first, by *happened* where known, otherwise by *noticed* — and **label which one you sorted by** |
| **Filters** | event type, object, date range |
| **Empty state** | `NO_SIGNAL` — *"No changes recorded yet. Change detection starts at the first snapshot."* Not an error; a new install genuinely has no history. |
| **Never** | render a raw diff. Every row is one plain sentence built from the typed event. |

### 5 · Claims — `/claims` · ~2 pd

Everything the system asserts, and whether it holds up. The review surface W4 writes into.

| | |
|---|---|
| **Data** | exists and is real: `GET /api/intelligence/truth`, `/summary`, `/verified`, `/unverified`, `/entity/:name`. `truth_claims` is populated. |
| **Columns** | Claim · Entity · Category · Verdict (`VERIFIED` \| `UNVERIFIED` \| `CONTRADICTED`) · Confidence **as a band** · Source · Age |
| **Sort** | `CONTRADICTED` first, then `UNVERIFIED`, then age descending — worst first, always |
| **Row links to** | Evidence, filtered to that claim |
| **Filters** | verdict, category, entity |
| **Empty state** | `NOT_INGESTED` — *"No claims recorded. Modules write claims from W3 onward."* |
| **Carries** | `DecisionActions` (W4). This is W4's "review a claim" screen: the claim, its band, its evidence, four actions, no navigation. |

### 6 · Evidence — `/evidence` · ~1–2 pd

Why the system believes a thing. One claim in, its chain out.

| | |
|---|---|
| **Data** | exists: `GET /api/signals/drilldown/:entityName` and `GET /api/intelligence/truth/entity/:name` |
| **Layout** | not a list — a detail view taking `?entity=` or `?claim=`, reached from Claims and from anything showing a confidence band |
| **Shows** | the claim · each piece of supporting evidence with its source, `observedAt` and freshness (W6) · which module produced it · what would change the answer |
| **Sort** | freshest evidence first |
| **Empty state** | `NO_SIGNAL` — *"This claim has no recorded evidence"* — itself a finding worth showing loudly, not a blank panel |
| **Depends on** | W6 for `observedAt`. Without it every item reads `unknown`, which is correct and still worth shipping. |

### Search — part of this item

`components/global/GlobalSearchOverlay.tsx` exists and works — overlay, keyboard toggle, result list
— but it filters a hardcoded `MOCK_RESULTS` array of four items. Delete it and point the overlay at a
real search endpoint across people, teams and systems. The UI is done; the data isn't. Eleven list
pages without working search is unusable.

---

## W8 — Conversation · 19–23 pd (14–18 backend + 5 frontend)

**Owner** Muhammad Ahmed · **Reviewer** Jawad Zaheer · ⛔ **Assigned but do not start** — see the
start order and the cut list.

**What exists:** `routes/executive/executive.js` has `/ask`, `/questions`, `/history`.
`routes/voice/voice.js` has `/ask`, `/intents`, `/history` plus `intentParser.js`. Tables
`executive_sessions` and `executive_questions` are there. **Intent classification and question
history are built.**

**What's missing:** a turn doesn't remember the previous turn's subject.

**Where:** `backend/lib/conversation.js`, extending the existing tables — not new ones.

**Build:** a subject stack of `{type, id, mentioned_at}` passed into the runtime as `context`, which
it already accepts. "it" → most recent. "that team" → most recent team. "the other one" → second most
recent. **If it can't be resolved, ask — never guess;** one confidently wrong resolution makes them
doubt every earlier answer. On resume, re-check the claims cited: if ownership changed since, say so.
That's the difference between memory and a transcript.

Two follow-up-only intents: "what's the evidence" and "how reliable is that".

**Build it in the route layer.** The brain stays stateless.

**The frontend** — all in `frontend/app/oba/page.tsx`, which exists:

- Show the thread, not one answer at a time. A follow-up has to look like a follow-up.
- **Show the current subject**, so the executive knows what "it" refers to before they type.
- Render the clarifying question as a question, not an error, when a reference can't be resolved.
- **Act on the view hint (F16).** Each answer returns `{ view, subject, highlight }` derived from the
  package `type` every module already returns. The page navigates or opens a panel from that object
  and **never parses the prose**. Unroutable hints fall back to object detail rather than failing.
- **Use the existing panel system.** `components/global/GlobalPanelsContext.tsx` manages open/close
  state for the notification and avatar panels and closes the others when one opens. F16 adds one
  more panel to it — don't build a second mechanism beside it.

---

## W9 — Wire the brain to the routes · 6–8 pd

**Owner** Ahmad Tanveer · **Reviewer** Saad Mehmood · This owner makes the architectural call below.

**The problem.** 55 modules compute ownership, risk and dependencies from the graph. **54 of 66 route
files compute the same things from Supabase, and exactly one uses the brain** —
`routes/intelligence/prediction.js`. Two systems answering the same question differently is the most
visible way this product loses credibility.

**This is not a future problem.** Two routes were already contradicting each other on seeded data,
before any real dataset landed: `/api/knowledge/gaps` said SecurityScanner's owner was Sarah
Mitchell, while `/api/ownership` said Sarah Mitchell owned DeployBot and IncidentResponder. Same
question, same database, two answers. That turned out to be a join bug (W1f) rather than
brain-vs-routes — which is the point: **nothing in this codebase forces two answers to the same
question to agree.** W9 builds that. Until it exists, expect more and check by value.

**Decide first: live or persisted.** Either the claim-bearing routes call brain capabilities live, or
brain output is persisted after each load and routes read that. **Persist** — W2's `reloadGraph()` is
the natural trigger, and it keeps `IMPL.M34`'s transitive closure out of the request path. Write
module output to a `module_output` table (`module_code`, `payload jsonb`, `computed_at`) on each
reload, separate from W5's `graph_snapshot`, which stores the graph itself rather than what modules
concluded about it.

**Then convert exactly these five routes and stop:** `/api/ownership`, `/api/risks`,
`/api/dependencies`, `/api/briefing/today`, `/api/dashboard`. They make the claims an executive would
act on. Every other route keeps its own path — converting all of them is a bigger job than this plan
and isn't needed for the demo.

---

## W10 — Close the API · 6–9 pd (4–6 backend + 2–3 frontend)

**Owner** Bisma Nadeem · **Reviewer** Muhammad Haroon · Depends on nothing. Can start day one.

**The problem, counted exactly.** 66 route files hold **203 endpoints** — 183 `GET`, 19 `POST`, one
`DELETE`. `requireAuth` is applied to **one** (`GET /api/auth/me`); `requireRole` to **zero**.
`orgContext` is exported and never mounted, so `req.user` is undefined on every request. CORS is a
bare `app.use(cors())` at `index.js:13` — every origin, every header.

Anyone who can reach the host reads every ownership record, risk score, incident, decision and
knowledge gap in the system, and — once W4 ships — can write corrections as anybody. Acceptable for a
local demo; not acceptable the first time this is deployed anywhere reachable.

**Why it is 4–6 days and not 30.** You do not touch 203 endpoints. **Authentication is applied at the
46 `app.use()` mounts in `index.js`,** one line each, plus per-route `requireRole` on the handful of
writes.

**Build:**

1. **Mount `orgContext` globally**, immediately after `express.json()`. One line. It never blocks; it
   makes `req.user` real when a token is present, which everything else depends on.
2. **Classify all 46 mounts into three tiers** and write that classification into `index.js` as the
   mount order. This is the actual work of the item — an hour of thinking, then mechanical.

   | Tier | What's in it | Middleware |
   |---|---|---|
   | **Public** | `POST /api/auth/login`, `/reset-password`, and one liveness endpoint | none |
   | **Registration** | ⚠ `POST /api/auth/register` — **not public.** Leaving it open lets anyone create an account and then read all 183 GETs, which defeats the item. Make it `requireAuth, requireRole('admin')` after the first admin exists | `requireAuth, requireRole('admin')` |
   | **Authenticated read** | every other `GET` — 183 minus the liveness one | `requireAuth` |
   | **Privileged write** | every `POST`/`PUT`/`DELETE` outside auth, including all of W4's | `requireAuth, requireRole('admin','executive')` |

   Anything you cannot classify goes in the strictest tier and gets raised with the reviewer. There is
   no "probably fine" tier.
3. **CORS allowlist.** `cors({ origin: process.env.CORS_ORIGINS.split(',') })`, defaulting to
   `http://localhost:3001`. Wide-open CORS plus a browser-held token is what turns a read-only leak
   into a write.
4. **Rotate `JWT_SECRET` and `ADMIN_PASSWORD`** to long random values (Part F, threat 4), and never
   reuse the local ones anywhere deployed.
5. **The frontend is nearly done.** `frontend/lib/AuthContext.tsx` exists, has login/register/reset,
   and persists a token in `localStorage` under `horquva-token`. ⚠ **`lib/api.ts` never sends it** —
   `request()` sets only `Content-Type`. So: attach `Authorization: Bearer <token>` in that one
   function · on a 401, clear the token and redirect to `/login` · confirm every page renders behind
   the redirect rather than white-screening.

**Done when:**

- Every endpoint except the four public ones returns **401 without a token**. Prove it by running the
  W1 sweep with no `Authorization` header: **the pass count must be 4, not 149.** Save that inverted
  sweep beside the first one.
- The same sweep with an admin token returns the W1 baseline, **`200: 149 / 163`**. If it doesn't,
  you have locked out something the UI needs.
- Every W4 write returns **403 for a `member` token**, 200 for `admin` or `executive`.
- The UI works end to end after a fresh login, with no page reading data before the token loads.
- `CORS_ORIGINS` is set in `backend/.env`.

**What this deliberately does not do:**

- **No row-level security.** The `service_role` key still bypasses RLS (threat 2). This puts a door on
  the API, not on the database.
- **No multi-tenancy.** `req.org` is populated and **nothing filters on it.** Two organizations in
  this database would see each other's data. Nothing in this plan changes that.
- **No rate limiting and no audit log of reads.** W4's `verification/actions` covers writes only.

---

# PART D — RULES

**R-1 · Ownership precedence.** Every `owns` edge carries `metadata.source`, one of exactly three
values:

| `metadata.source` | Comes from | Rank |
|---|---|---|
| `human` | a W4 correction | wins always |
| `declared` | the dataset's `owner` / `access_owner` / `holders` field | 2nd |
| `derived` | inferred — a workflow step's actor, a lone knowledge holder | 3rd |

Highest wins, **keep the lower ones** — agreement raises confidence, disagreement is a `CONFLICT` to
surface. No edge at any rank means "no owner", which is a risk.

*Today's dataset produces mostly `declared`. `derived` matters once inference is added; the field
exists from day one so nothing needs retrofitting.*

**R-2 · Never show a confidence number.** `A.confidence()` is `0.55 + 0.45 × coverage` — a coverage
proxy, not a measurement. Show a band:

| Confidence | Shows as |
|---|---|
| ≥ 0.85 with 2+ independent sources | Strongly supported |
| ≥ 0.70 | Likely |
| ≥ 0.50 | Uncertain |
| < 0.50, or M46 `verified === false` | Requires review |

*"0.87" invites "why not 0.85?" and there's no answer.*

**R-3 · Five states, never a blank.** `RESOLVED` · `NO_SIGNAL` ("nobody is listed as owning this") ·
`NOT_INGESTED` ("that isn't in the dataset") · `STALE` ("last loaded 34 days ago") · `CONFLICT` ("two
sources disagree"). An empty cell is a bug.

**R-4 · Show people, not identifiers.** Resolved names only, never internal ids.

**R-5 · Natural keys cross boundaries, graph ids never do.** Graph ids are regenerated on every boot.
Anything stored or linked uses `type:name`.

**R-6 · A human correction sticks.** It survives every reload until revoked. Repeating something the
executive already corrected is the one bug that loses trust permanently.

**R-7 · Constants in one config file.** `FRESH_DAYS` 7 · `STALE_DAYS` 30 ·
`CONCENTRATION_DANGEROUS` 0.40 · `DEPARTED_INACTIVE_DAYS` 60 · `LOAD_INTERVAL_HOURS` 6.

**R-8 · Never substitute invented data for missing data.** If a query returns nothing, the answer is
an R-3 state with the reason — not a hardcoded example, not a cached demo value, not a "safe"
default. A route that cannot reach its source returns an error saying so. The codebase currently does
the opposite in at least three places, and a system that quietly makes things up is worse than one
that is visibly down.

---

# PART E — AUDIT OF THE 32 FEATURES

Verified against the code, endpoint by endpoint. **Do not rebuild anything marked ✅.**

## BUILT (6)

⚠ **Every check here was an HTTP 200 with plausibly shaped data. When the *values* were checked
against SQL, two of the six were wrong.** Read this column as "responds," not "correct" — and never
mark anything BUILT on a status code again.

| F | Feature | Status |
|---|---|---|
| **F03** Who owns what | ⚠ **was returning the wrong owners** — joined on `owners.id` instead of `employees.id`. Fixed (W1f). Re-verify before calling it done. |
| **F13** Briefing | ⚠ **2 of 12 fields return `null`** — `top_spof_owner`, `lesson_learned`. Closer than it looks; W1d's foreign keys fixed four others. Needs those two plus an R-3 state, not a 200. |
| **F05** Knowledge concentration | ✅ `GET /api/knowledge/gaps` → real undocumented assets joined to holders, owners correct |
| **F12** Dashboard | ✅ `GET /api/dashboard` → 15 agents / 40 employees / risk 42, all computed |
| **F21** OBA identity | ✅ `GET /api/avatar` → `IMPL.M21`, real module output |
| **F08** Ask OBA | ✅ *"Your biggest risk is KnowledgeIndexer — a critical agent with a predicted risk score of 90…"* with entity and data sources named |

**F03 and F13 are work items, not done items.** The other four still need one person to check their
numbers against the database by hand — an afternoon.

**Two caveats on F08.** It keyword-matches nine question types in `routes/executive/executive.js` and
returns a single answer with no claim id, so W3 and W8 still apply. And `voice/intentParser.js` is
**not** part of it — that parser handles workflow commands (`check_status`, `escalate`, `approve`,
`pause`, `resume`, needs a `wf_001` id), a different feature entirely.

### Two things that look built and aren't

**F20 Voice.** The Deepgram integration in `voice/stt.js` is real **and unreachable.**
`voice/index.js` holds `/transcribe`, `/intent`, `/command` and is never mounted — `index.js:70`
mounts `voice/voice.js` instead. Mount it (W1a) and it works, with a mock transcript until there's a
Deepgram key. Listed under PARTIAL.

**F23/F24 Decisions.** `organizational_decisions` has `decision_score`, `quality_tier` and
`recommended_fix`: it *audits the quality* of decisions already made. It is not a log of executive
approvals with rationale. The dataset's `decisions_log` is the real thing and no route reads it. Both
are NEW.

## PARTIALLY BUILT — finish, don't restart (14)

| F | Feature | What exists | What's missing | Covered by |
|---|---|---|---|---|
| **F02** See changes | monthly rollups in `history` | entity-level events | W5 |
| **F04** Detect risk | `routes/risks.js`, `predictive/predictiveRisk.js` | owner-departed, changed-without-decision, conflicting-owners | W5 |
| **F06** History | `/briefing/history`, `/health/history`, `/health/trend` | per-object timeline | W5, W7 |
| **F07** Tribal knowledge | `knowledge_areas`, `routes/knowledge/intelligence.js` | body text, subject retrieval | W4 |
| **F09** Inspect evidence | `routes/signals/drilldown/:entityName` · `truth/entity/:name` | timestamps, freshness | W6 |
| **F10** Reliability | `truth_claims.confidence_score`, `verdict` | banding at the surface | W6 |
| **F11** Review a claim | `routes/truth/` read · `verification POST /` **(unmounted)** | mount it, then the review surface | W1a, W4 |
| **F17** Manual exploration | 23 pages, 30 files on `lib/api.ts` | six pages, global search | W7 |
| **F18** Evidence drill-down | `signals/drilldown` | source → timestamp → freshness chain | W6 |
| **F20** Voice | the whole pipeline, incl. real Deepgram STT | it's unmounted — 3 endpoints 404 | W1a |
| **F22** Conversation memory | `executive/history`, `/questions`, `executive_sessions` | subject carried between turns | W8 |
| **F25** Access | `requireAuth`/`requireRole` exported; `AuthContext`, login, signup and reset pages built | `requireAuth` on 1 of 203 endpoints, `requireRole` on 0, `orgContext` never mounted, `lib/api.ts` never sends the token it stores | W4, W10 |
| **F26** Activity history | `verification/actions`, `/actor/:name` | view logging | W4 |
| **F30** Unknowns | `truth/unverified`, `routes/dataQuality.js` | executive phrasing, the banner | W6 |

## GENUINELY NEW (12)

| F | Feature | Covered by |
|---|---|---|
| **F01** Real company data | W2 wires `data/company.json` in. A **real customer's** data is a business problem, not a dev task — Part F |
| **F31** Identity resolution | W3 |
| **F27** Live updates | W2 — last-loaded time, refresh in place |
| **F28** Change detection | W5 |
| **F29** Knowledge capture | W4 |
| **F32** Human override | W4 |
| **F23** Record decision | W4 — the existing table audits decision *quality*, it doesn't log decisions |
| **F24** Decision history | W4 — needs F23's log to exist first |
| **F14** Continuity | W8 |
| **F15** Live context | W8 |
| **F16** Contextual UI | W8 — typed view hint alongside each answer |
| **F19** Follow-ups | W8 |

**6 built + 14 partial + 12 new = 32.**

---

# PART F — WHAT WE NEED

## From the business — the real blocker

**A real company's data in the `data/company.json` shape**, eleven sections: people, AI agents and
their owners, tools and what they cost, workflows and their steps, dependencies, who holds which
knowledge, incidents, decisions, monthly history, vendors.

**This no longer blocks engineering.** The demo company is complete enough to build every item in
Part C against. What it blocks is *credibility*: nobody in the room can tell a **correct** answer
from a merely **plausible** one, and that distinction is the entire product. It changes no code.

**Whoever sources it should know:** the sections that matter most are `agents` with `owner` and
`backup_owner`, `knowledge_areas` with `holders`, and `workflows` with `steps` — those three drive
the ownership, concentration and dependency answers that make the demo land. `history` and
`incidents` are what make it feel like memory. Tool spend is the easiest to get and the least
important. For `employees`, ask for three columns — name, role, department. See Part 0A.

⚠ **When it arrives, it replaces `data/company.json`. It never merges with it.** Part 0A's last
section says why, and the loader enforces it.

## From engineering

**The database is set up. You do not need to run migrations to start work.** The project runs against
Supabase ref `ncfwxpstkwuznpjpfomt` (region `ap-southeast-1`) — **70 tables, 68 holding data, all
eight migration files recorded** (`schema.sql`, `01`–`06`, `auth_schema.sql`). Only `app_users` and
`execution_intents` are empty, and correctly so: nobody has signed up and no orchestration intent has
been created.

All 33 foreign keys from `05` are live, which is worth knowing for a reason beyond embedding:
**Postgres refuses to create a foreign key while any orphan row exists, so all 33 applying proves
referential integrity is clean.** If a query returns something that looks wrong, check the join, not
the rows — two of the three bugs found on 2026-08-11 were exactly this.

The previous project (`rxfmwkfetnzhdllcpcdf`) is no longer used; `backend/.env` keeps its values
commented out so the switch can be reverted.

Each developer needs three values in `backend/.env`:

```
SUPABASE_URL   https://ncfwxpstkwuznpjpfomt.supabase.co
SUPABASE_KEY   service-role key  (Settings -> API)
DATABASE_URL   postgresql://postgres.ncfwxpstkwuznpjpfomt:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

⚠ **Use the pooler host, not `db.<ref>.supabase.co`** — the direct host is IPv6-only and will not
resolve on most machines. Note the username form: `postgres.<project-ref>`.

`DATABASE_URL` is used only by `run_migrations.js`; the API needs the first two.

**W10 adds two more:** `CORS_ORIGINS` (comma-separated, default `http://localhost:3001`) and a
rotated `JWT_SECRET`. Until then `JWT_SECRET` falls back to `'dev-insecure-secret-change-me'` in
`middleware/auth.js:13`, which is fine locally and is threat 4 anywhere else.

## THREATS

Ordered by what bites first. None are build items in Part C; all are somebody's job this week.

### 1 · One shared database with a `DROP TABLE` script pointed at it — highest risk

A0 explains the mechanism. What has to happen, in order:

1. ✅ **The header of `backend/sql/01_schema_migration.sql` has been rewritten.** It previously read
   *"Run this FIRST in the Supabase SQL Editor"* — an instruction to do the exact thing that destroys
   the shared database. It now carries a ⛔ warning and names the only supported path. Only comments
   changed; the SQL is untouched, and the runner keys on filename with no checksum, so nothing
   re-applies. Verified with `--dry-run`: *"Nothing to apply — all migrations recorded."*
2. ⬜ **Give each developer their own Supabase project** — or at minimum a separate one for anyone
   doing W2, W4 or W5. Free tier, five minutes each. **The single highest-value hour available.**
   Needs dashboard access, so it cannot be scripted for you.
3. ⬜ **Take a backup before W2 starts.** Neither `pg_dump` nor Docker is on the PATH of the machine
   this was checked on, so this needs doing from somewhere that has one, or via the Supabase
   dashboard. Keep it off the laptop.

One person running that file by hand, or deleting its row from `schema_migrations`, wipes the
database for everyone — including human corrections (W4) and snapshots (W5) built by then. The
`schema_migrations` ledger is the only thing standing between the team and that outcome.

### 2 · `SUPABASE_KEY` is a `service_role` key valid until 2036

It bypasses every row-level security policy. Survivable today because it lives only in `backend/.env`
(gitignored, verified) and the frontend never imports Supabase directly (verified). It stops being
survivable the moment someone pastes it into a Vercel dashboard, a CI variable, a screenshot, or a
`NEXT_PUBLIC_*` variable. **`NEXT_PUBLIC_` anything ships to the browser.**

**Do:** confirm nothing relies on RLS policies — there are none today, so this key's power is the
only access control — and plan to move to an anon key plus RLS before anything real is stored.

### 3 · 202 of 203 endpoints have no authentication

**This is W10**, 6–9 pd, scoped with a done-when and an owner slot in A4. It depends on no other item
and can start day one.

**What W10 does not fix:** no row-level security and no per-organization query filtering. Two
customers in this database would see each other's data. Say so before anyone promises a second
tenant.

### 4 · `JWT_SECRET` is a readable phrase, not a random string

35 characters, hyphenated, guessable in shape. `ADMIN_PASSWORD` sits beside it in the same file.
Replace both with long random values before any deployment. Owned by W10, step 4.

### 5 · ✅ `.env.staging` — fixed, but rotate the password

`infrastructure/databases/.env.staging` holds a real `PGPASSWORD` and was **not** covered by
`.gitignore`, so `git add .` would have staged it. It was **never committed on any branch** —
verified across all refs — so this was caught as a near miss, not an incident.

**Fixed:** `.gitignore` now ends with `.env*` / `!.env.example`. Verified with `git check-ignore`
that all three env files — `backend/.env`, `infrastructure/databases/.env` and `.env.staging` — are
excluded, and no env file appears in `git status` any more.

⬜ **Still do: rotate that password.** It has sat in plaintext on several laptops, and a gitignore
rule does nothing about that.

### 6 · Dead instructions that will waste someone's afternoon

- `infrastructure/databases/.env.staging` documents `bash infrastructure/databases/migrate.sh`.
  **That script does not exist.**
- Its `PGHOST` is `db.<ref>.supabase.co`, which resolves **AAAA/IPv6 only** and will not connect from
  most machines or from GitHub runners. Use the pooler host, as `backend/.env` already does.

Fix or delete both.

## What this plan does not touch

- **`modules/` and `horquva_modules_py/`** — 54 Python files, a parallel implementation of the same
  intelligence. **Nothing in the JavaScript stack references them.** Don't port, migrate or delete
  them during this work.
- **`data/intelligence/accountability/latest.json` and `governance/latest.json`** — read by nothing.
  Delete during W2 or leave them; just don't build on them.
- **Onboarding, notifications and admin** (`app/onboarding/`, `app/notifications/`, `app/admin/`, ~19
  components) — real screens outside the 32 features. The notification panel is the one exception:
  its invented alerts are deleted in W2.
- ✅ **This spec is now in git**, on `ocos/develop`, along with `data/company.json`,
  `backend/tools/`, and the `05`/`06` migrations. Everyone reads one version. It has **not been
  pushed** — that is a deliberate call for whoever owns the remote.

## Start order

**0. Before any W-item — three things that block or endanger everyone.**

- ✅ **A4 is filled in.** Ten owners, ten reviewers, two standing roles, three juniors paired.
  **Still do: talk to all fourteen people** and confirm notes 1 and 2 in A4.
- **Give each developer their own Supabase project** (threat 1).
- **Start sourcing a real company** (Part F). No longer a blocker for building — `data/company.json`
  covers that — but it is still the blocker for anyone trusting the answers, and it has a long lead
  time. The ask is three columns for people, not eleven sections.

**1. W1 first, alone** — 3–4 days. Everything else assumes it. **Do W1f early**, not last: if the
claim-bearing routes return wrong values, every item built on top inherits them.

**2. W2 and W3 in parallel** — the dataset path and the identity path don't collide.

**3. Everything else after W2**, which is what puts real data behind them.

**4. W10 whenever a backend person is free, and before any deploy.** It blocks nothing and depends on
nothing, which makes it the natural filler — but its deadline is not a date, it is the first time
this runs on a host anyone else can reach.

**W8 needs a deliberate call.** It touches nothing W2 touches, so it *can* run alongside from day
one — and it is also first on the cut list, at 19–23 pd for conversational polish on top of answers
the product already gives. Don't start it early unless you have people who'd otherwise be idle.

## If you run short

Cut in this order: **W8** (19–23) → **W9** (6–8) → **W7**'s History, Evidence and Claims pages (5–7)
→ **W5** (13–17). About 43–55 pd of relief, in the order that costs the demo least.

**Keep W7's People, Teams and Systems** — they are the ownership story, which is the demo. History
goes first of the three because W5 is on this list too and is History's real data source.

**Don't cut W3 or W6.** Without stable identity nothing a human writes survives a restart; without
provenance this is a better-looking version of what you already have.

**W10 is only cuttable if this never leaves a laptop.** "We ran short" is not a defence for shipping
203 open endpoints. If the schedule forces a choice, cut a feature and keep the door.

**Cutting W8 removes F14, F15, F16, F19 and F22** — five of the 32. Say that before committing to a
feature count with anyone outside the team.
