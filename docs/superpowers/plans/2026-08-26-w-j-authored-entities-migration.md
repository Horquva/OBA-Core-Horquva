# W-J — Authored Entities Migration to Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `backend/tools/export-company.js`'s hand-authored `AUTHORED` block (`systems`,
`external_entities`, `incidents`) into real Supabase tables, delete the dead `decisions_log`
duplicate, and point `processes` at the `accountability_entities` table it already has instead of
round-tripping through `data/company.json`.

**Architecture:** One new migration (`14_authored_entities.sql`) creates and seeds six tables.
`backend/brain/knowledge/graphLoader.js` — the one place organizational data enters the knowledge
graph — is repointed section by section from `require('data/company.json')` to direct Supabase
queries, joining the six new tables (and `processes`'s existing `accountability_entities`/
`accountability_links`) into its existing `Promise.all` batch. `domain/dataset.js` gets a seventh
query for `incidents`, replacing its hardcoded `[]`. `export-company.js` stops hand-authoring and
starts querying/deriving, same as every other section of `data/company.json` already does.

**Tech Stack:** Node.js, `@supabase/supabase-js`, PostgreSQL (Supabase), no test framework (this
repo's own `check()`-based pattern in `backend/tests/`).

**Spec:** [docs/superpowers/specs/2026-08-26-w-j-authored-entities-migration-design.md](../specs/2026-08-26-w-j-authored-entities-migration-design.md)

## Global Constraints

- No fabricated relationships beyond what's already authored today — D-07 (never fabricate) applies
  throughout. Every row inserted by the migration is a straight copy of what `AUTHORED` already
  contains (plus the `used_by` links added earlier the same day), not new invented content.
- `incidents.entity_name`/`entity_type` stay plain TEXT, not a polymorphic FK — matches the existing
  `dependencies.source_type`/`target_type` convention (`backend/sql/01_schema_migration.sql:132-133`).
- A missing/failed query for any of the tables this plan adds must fail graph load loudly via the
  existing `firstError` check in `graphLoader.js:110` — no silent partial-graph fallback.
- Full `npm test` (from `backend/`) must stay green after every task. This is the same bar every
  prior workstream (W-A through W-I) held.
- Never amend a commit; one commit per task, per this repo's own git convention.

---

### Task 1: Migration `14_authored_entities.sql` — six tables, seeded

**Files:**
- Create: `backend/sql/14_authored_entities.sql`

**Interfaces:**
- Produces: tables `systems`, `system_dependencies`, `system_agent_usage`, `external_entities`,
  `external_entity_supplies`, `incidents` — consumed by Tasks 2, 4, 7.

- [ ] **Step 1: Write the migration file**

```sql
-- 14_authored_entities.sql — W-J (D-46): systems, external_entities and incidents move from
-- backend/tools/export-company.js's hand-authored AUTHORED block into real tables. Seeded with
-- exactly what AUTHORED already contained (plus the used_by links added 2026-08-26) so nothing
-- changes functionally until graphLoader.js and domain/dataset.js are repointed in later tasks.
-- decisions_log is NOT migrated here — see design doc §2.2, it duplicates the already-live
-- decision_history-backed pipeline in domain/dataset.js and feeds nothing.
-- processes is NOT migrated here — see design doc §2.1b, it already has a real source
-- (accountability_entities/accountability_links) and needs a graphLoader change, not a table.

CREATE TABLE systems (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  owner_id INTEGER REFERENCES employees(id),
  criticality TEXT,
  documented BOOLEAN,
  description TEXT
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
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT, -- 'vendor' | 'customer'
  relationship_owner_id INTEGER REFERENCES employees(id),
  criticality TEXT
);

CREATE TABLE external_entity_supplies (
  external_entity_id INTEGER REFERENCES external_entities(id),
  platform_id INTEGER REFERENCES ai_platforms(id)
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  occurred_at DATE,
  entity_name TEXT,
  entity_type TEXT,
  impact TEXT,
  owner_id INTEGER REFERENCES employees(id),
  resolved_by_id INTEGER REFERENCES employees(id),
  resolution_days INTEGER,
  lesson TEXT
);

-- ── Seed: systems (4, matching AUTHORED.systems + today's used_by addition) ──
-- Employee ids: Omar Hassan=10, Aisha Patel=2, Sophia Chen=25, Marcus Rodriguez=3
INSERT INTO systems (id, name, department, owner_id, criticality, documented, description) VALUES
(1, 'Core Platform', 'Engineering', 10, 'critical', true, 'Multi-tenant application runtime. Everything else runs on it.'),
(2, 'Billing System', 'Engineering', 2, 'critical', false, 'Subscription billing, invoicing and dunning.'),
(3, 'Customer Data Warehouse', 'Data', 25, 'high', true, 'Analytical store behind every dashboard and forecast.'),
(4, 'Internal Admin Portal', 'Engineering', 3, 'medium', false, 'Support and account administration tooling.');

INSERT INTO system_dependencies (system_id, depends_on_system_id) VALUES
(2, 1), -- Billing System -> Core Platform
(3, 1), -- Customer Data Warehouse -> Core Platform
(4, 1), -- Internal Admin Portal -> Core Platform
(4, 2); -- Internal Admin Portal -> Billing System

-- Agent ids: DeployBot=1, CodeReviewAgent=2, SecurityScanner=3, DataPipeline=4,
-- CustomerInsightBot=5, ComplianceChecker=8, OnboardingAssistant=9, SalesForecaster=10,
-- LogAnalyzer=11, TestRunner=12, BudgetTracker=13, KnowledgeIndexer=14
INSERT INTO system_agent_usage (system_id, agent_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 12), (1, 11), -- Core Platform: DeployBot, CodeReviewAgent, SecurityScanner, TestRunner, LogAnalyzer
(2, 13),                                   -- Billing System: BudgetTracker
(3, 4), (3, 5), (3, 10), (3, 14),          -- Customer Data Warehouse: DataPipeline, CustomerInsightBot, SalesForecaster, KnowledgeIndexer
(4, 8), (4, 9);                            -- Internal Admin Portal: ComplianceChecker, OnboardingAssistant

-- ── Seed: external_entities (10, matching AUTHORED.external_entities) ──
-- Employee ids: Robert Chen=1, Lisa Wang=11, Daniel Murphy=30, Yuki Tanaka=4, Ryan Phillips=22,
-- Amara Diallo=31, Chris Anderson=32, Rebecca Stone=29, Zara Hussein=35
INSERT INTO external_entities (id, name, kind, relationship_owner_id, criticality) VALUES
(1, 'OpenAI', 'vendor', 1, 'high'),
(2, 'Anthropic', 'vendor', 11, 'high'),
(3, 'GitHub', 'vendor', 1, 'critical'),
(4, 'Google', 'vendor', 30, 'medium'),
(5, 'Amazon Web Services', 'vendor', 4, 'critical'),
(6, 'Ryan Phillips Procurement Desk', 'vendor', 22, 'low'),
(7, 'Meridian Health', 'customer', 31, 'critical'),
(8, 'Cobalt Logistics', 'customer', 32, 'high'),
(9, 'Harbor Financial', 'customer', 29, 'critical'),
(10, 'Vertex Retail', 'customer', 35, 'medium');

-- Platform ids: ChatGPT Enterprise=1, Claude Pro=2, GitHub Copilot=3, Gemini Advanced=4.
-- AWS's "Core Platform hosting" and Ryan Phillips Procurement Desk have no matching
-- ai_platforms row (same as AUTHORED.external_entities' empty supplies: []) — not inserted,
-- matching graphLoader's existing "skip rather than invent" convention for unmatched names.
INSERT INTO external_entity_supplies (external_entity_id, platform_id) VALUES
(1, 1), -- OpenAI -> ChatGPT Enterprise
(2, 2), -- Anthropic -> Claude Pro
(3, 3), -- GitHub -> GitHub Copilot
(4, 4); -- Google -> Gemini Advanced

-- ── Seed: incidents (8, matching AUTHORED.incidents) ──
-- Employee ids: Aisha Patel=2, Victoria Adams=36, Yuki Tanaka=4, Sarah Mitchell=9,
-- Sophia Chen=25, Kevin Osei=28, Nathan Wright=24, Omar Hassan=10, Robert Chen=1,
-- Rebecca Stone=29, Amara Diallo=31
INSERT INTO incidents (occurred_at, entity_name, entity_type, impact, owner_id, resolved_by_id, resolution_days, lesson) VALUES
('2026-01-30', 'Billing System', 'system',
  'Duplicate invoices issued to 12 customers over one billing run.', 2, 36, 3,
  'Billing System is critical and undocumented. The fix depended on one engineer reading the code.'),
('2026-02-18', 'Code Deployment Pipeline', 'workflow',
  'All deploys blocked for four hours after a CodeReviewAgent rule change rejected every pull request.', 4, 2, 1,
  'Agent configuration changes ship with no review step of their own.'),
('2026-03-05', 'SecurityScanner', 'agent',
  'An exposed credential went undetected for 11 days.', 9, 9, 2,
  'Sarah Mitchell is both Responsible and Accountable for Security Audit Process, so nobody independent reviews the scanner configuration.'),
('2026-03-19', 'Data Ingestion Pipeline', 'workflow',
  'An upstream schema change dropped two days of product events before anyone noticed.', 25, 28, 2,
  'No contract test between the producer and the pipeline.'),
('2026-04-10', 'KnowledgeIndexer', 'agent',
  'Indexing stalled silently for six days; workspace search returned stale results company-wide.', 24, 25, 6,
  'Indexing algorithms are undocumented and Nathan Wright is the only holder. Nothing alerted on a stalled job, so the outage was invisible until users complained.'),
('2026-05-22', 'LogAnalyzer', 'agent',
  'Agent went inactive unnoticed; three weeks of logs were never analysed.', 10, 4, 4,
  'An agent going quiet looks identical to an agent with nothing to do.'),
('2026-06-14', 'Incident Response', 'workflow',
  'On-call engineer had no runbook; time to mitigate ran to three times the target.', 4, 1, 1,
  'The Incident Response workflow is marked critical and is not documented. Yuki Tanaka owns it alongside DeployBot and IncidentResponder.'),
('2026-07-02', 'Customer Onboarding', 'workflow',
  'Two enterprise customers stalled in onboarding for nine days each.', 29, 31, 5,
  'Onboarding is undocumented and its owner is a VP with no operational backup.');
```

- [ ] **Step 2: Apply the migration**

Run: `node run_migrations.js` (from `backend/`)
Expected: output lists `14_authored_entities.sql` as applied; no errors. Migrations are idempotent
per-file (tracked in `schema_migrations`), so re-running is safe if this needs a retry.

- [ ] **Step 3: Verify the seed landed correctly**

Run:
```bash
node -e "
const supabase = require('./supabase');
(async () => {
  const { data: systems } = await supabase.from('systems').select('*');
  const { data: usage } = await supabase.from('system_agent_usage').select('*');
  const { data: ext } = await supabase.from('external_entities').select('*');
  const { data: inc } = await supabase.from('incidents').select('*');
  console.log('systems:', systems.length, '(expect 4)');
  console.log('system_agent_usage:', usage.length, '(expect 12)');
  console.log('external_entities:', ext.length, '(expect 10)');
  console.log('incidents:', inc.length, '(expect 8)');
})();
"
```
Expected: `systems: 4`, `system_agent_usage: 12`, `external_entities: 10`, `incidents: 8`.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/14_authored_entities.sql
git commit -m "feat(w-j): add systems/external_entities/incidents tables, seeded from AUTHORED (D-46)"
```

---

### Task 2: `graphLoader.js` — systems from Supabase, not `company.json`

**Files:**
- Modify: `backend/brain/knowledge/graphLoader.js:75-111` (add queries), `:326-380` (systems block)
- Test: `backend/tests/graphLoader.live.test.js:119-136`

**Interfaces:**
- Consumes: `systems`, `system_dependencies`, `system_agent_usage` tables from Task 1.
- Produces: unchanged graph shape — `system` entities with `owns`/`depends_on` edges, now sourced
  with `metadata.source: 'systems'` (was `'company.json:systems'`) and
  `metadata.source: 'system_agent_usage'` for the used-by edges (was
  `'company.json:systems.used_by'`). Later tasks (3, 4) touch the same `companyData` block, so this
  task lands first and narrows what `companyData` covers.

- [ ] **Step 1: Update the live test's expectations for the new provenance strings**

In `backend/tests/graphLoader.live.test.js`, change line 131-133:

```javascript
		const systemDeps = dependsOn.filter((r) => r.metadata && r.metadata.source === 'systems')
		check('inter-system depends_on edges exist (Billing/Warehouse/Admin -> Core Platform, Admin -> Billing = 4)',
			systemDeps.length === 4, systemDeps.length)
```

And add, right after it:

```javascript
		const systemUsage = dependsOn.filter((r) => r.metadata && r.metadata.source === 'system_agent_usage')
		check('agent-to-system usage edges exist (12: 5 Core Platform, 1 Billing, 4 CDW, 2 Admin Portal)',
			systemUsage.length === 12, systemUsage.length)
```

And update line 141's `expected` set: replace `'company.json:systems'` with `'systems'`.

- [ ] **Step 2: Run the test to confirm it now fails on the new assertions**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: FAIL — `systemDeps.length` and `systemUsage.length` are both 0, because `graphLoader.js`
still reads `company.json` with the old source strings.

- [ ] **Step 3: Add the systems queries to `graphLoader.js`'s `Promise.all`**

In `graphLoader.js:75-92`, add three entries to the destructured array and the `Promise.all`:

```javascript
  const [
    { data: employees, error: e1 },
    { data: agents, error: e2 },
    { data: platforms, error: e3 },
    { data: workflows, error: e4 },
    { data: workflowRunbooks, error: e5 },
    { data: dependencies, error: e6 },
    { data: toolOwnership, error: e7 },
    { data: toolUsers, error: e8 },
    { data: toolPolicies, error: e9 },
    { data: knowledgeAssets, error: e10 },
    { data: acctLinks, error: e11 },
    { data: acctEntities, error: e12 },
    { data: workflowSteps, error: e13 },
    { data: toolBackups, error: e15 },
    { data: agentPlatform, error: e16 },
    { data: workflowToolDeps, error: e17 },
    { data: systemsRows, error: e18 },
    { data: systemDeps, error: e19 },
    { data: systemAgentUsage, error: e20 },
  ] = await Promise.all([
    supabase.from('employees').select('*'),
    supabase.from('agents').select('*'),
    supabase.from('ai_platforms').select('*'),
    supabase.from('workflows').select('*'),
    supabase.from('workflow_runbooks').select('*'),
    supabase.from('dependencies').select('*'),
    supabase.from('tool_ownership').select('*'),
    supabase.from('tool_users').select('*'),
    supabase.from('tool_policies').select('*'),
    supabase.from('knowledge_assets').select('*'),
    supabase.from('accountability_links').select('*'),
    supabase.from('accountability_entities').select('*'),
    supabase.from('workflow_steps').select('*'),
    supabase.from('tool_backups').select('*'),
    supabase.from('agent_platform').select('*, agents ( name )'),
    supabase.from('workflow_tool_dependencies').select('*, workflows ( name )'),
    supabase.from('systems').select('*'),
    supabase.from('system_dependencies').select('*'),
    supabase.from('system_agent_usage').select('*'),
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e15 || e16 || e17 || e18 || e19 || e20
  if (firstError) throw new Error(`graphLoader: ${firstError.message}`)
```

- [ ] **Step 4: Replace the systems section of the `companyData` block**

Replace `graphLoader.js:339-380` (the `if (companyData) { ... systems ... }` opening through the end
of the systems `for` loops) with:

```javascript
  const platformByName = Object.fromEntries(platforms.map((p) => [p.name, platformEntities[p.id]]))
  const agentByName = Object.fromEntries(agents.map((a) => [a.name, agentEntities[a.id]]))
  const employeeById = Object.fromEntries(employees.map((e) => [e.id, employeeEntities[e.id]]))

  // ─── Systems (systems / system_dependencies / system_agent_usage tables) ───
  const systemEntities = {} // systems.id -> entity
  for (const s of systemsRows || []) {
    systemEntities[s.id] = E({
      type: 'system',
      name: s.name,
      metadata: {
        sourceTable: 'systems', sourceId: s.id, department: s.department,
        criticality: s.criticality, documented: s.documented, description: s.description,
      },
    })
    if (s.owner_id && employeeById[s.owner_id]) {
      R(employeeById[s.owner_id], 'owns', systemEntities[s.id], {
        criticality: s.criticality || 'medium', metadata: { source: 'systems' },
      })
    }
  }
  for (const sd of systemDeps || []) {
    if (systemEntities[sd.system_id] && systemEntities[sd.depends_on_system_id]) {
      R(systemEntities[sd.system_id], 'depends_on', systemEntities[sd.depends_on_system_id], { metadata: { source: 'systems' } })
    }
  }
  // Agents that actually run against/deploy to/monitor a system. Without this, no
  // agent ever depends_on a system, so a system's real usage is invisible to
  // fan-in — M38 (Opportunity Intelligence) then reads that as "underused" for
  // any system nothing else in the graph happens to lean on, which is wrong for
  // e.g. Customer Data Warehouse rather than genuinely idle.
  for (const su of systemAgentUsage || []) {
    if (agentEntities[su.agent_id] && systemEntities[su.system_id]) {
      R(agentEntities[su.agent_id], 'depends_on', systemEntities[su.system_id], { metadata: { source: 'system_agent_usage' } })
    }
  }
```

Leave the `external_entities` block below (currently reading `companyData.external_entities`) and
the `processes` block untouched for now — Tasks 3 and 4 handle those. The `let companyData = null;
try { ... } catch...` block and its `if (companyData) {` wrapper stay for now since those two blocks
still read it; Task 5 removes it once nothing does.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: PASS, all checks including the two from Step 1.

- [ ] **Step 6: Run the full suite**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/brain/knowledge/graphLoader.js backend/tests/graphLoader.live.test.js
git commit -m "feat(w-j): graphLoader reads systems from Supabase instead of company.json (D-49)"
```

---

### Task 3: `graphLoader.js` — `processes` from `accountability_entities`, not `company.json`

**Files:**
- Modify: `backend/brain/knowledge/graphLoader.js` (processes block, currently reading
  `companyData.processes`)
- Test: `backend/tests/graphLoader.live.test.js:121,125`

**Interfaces:**
- Consumes: `acctEntities`, `acctLinks` — already loaded in Task 2's `Promise.all` (unchanged from
  before this workstream).
- Produces: `process` entities with `metadata.source: 'accountability_entities'` (was
  `'company.json:processes'`).

- [ ] **Step 1: Update the live test's expectations**

In `backend/tests/graphLoader.live.test.js`, the `processes` check at line 125 stays numerically the
same (`processes.length === 2`) — only the provenance source changes. Update line 141's `expected`
set: replace `'company.json:processes'` with `'accountability_entities'`.

- [ ] **Step 2: Run the test to confirm it fails on the provenance check**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: FAIL on `owns provenance names only real source tables` — `'company.json:processes'` is
still what's emitted, not in the new `expected` set.

- [ ] **Step 3: Replace the processes block**

Find the `// Processes: ...` loop reading `companyData.processes` in `graphLoader.js` and replace it
with (place this near the existing collaboration derivation, since it reads the same `acctEntities`/
`acctLinks` — a `raciFor` helper local to this function, mirroring `export-company.js:389-390`):

```javascript
  // ─── Processes (accountability_entities, entity_type='process') ───
  // Same source `export-company.js`'s outProcesses already derives from — no
  // company.json round-trip needed, graphLoader already has both tables loaded.
  const raciFor = (entityId, role) =>
    (acctLinks || []).find((l) => l.entity_id === entityId && l.raci_role === role)?.person_name ?? null
  for (const e of (acctEntities || []).filter((x) => x.entity_type === 'process')) {
    const processEntity = E({
      type: 'process',
      name: e.entity_name,
      metadata: { sourceTable: 'accountability_entities', sourceId: e.id, department: e.department },
    })
    const accountableName = raciFor(e.id, 'Accountable')
    const responsibleName = raciFor(e.id, 'Responsible')
    if (accountableName && employeeByName[accountableName]) {
      R(employeeByName[accountableName], 'owns', processEntity, { metadata: { source: 'accountability_entities', raci: 'accountable' } })
    }
    if (responsibleName && employeeByName[responsibleName]) {
      R(employeeByName[responsibleName], 'executes', processEntity, { metadata: { source: 'accountability_entities', raci: 'responsible' } })
    }
  }
```

This can live outside the `if (companyData)` block entirely, since it no longer depends on it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`.

- [ ] **Step 6: Commit**

```bash
git add backend/brain/knowledge/graphLoader.js backend/tests/graphLoader.live.test.js
git commit -m "feat(w-j): graphLoader builds process entities from accountability_entities directly (D-47)"
```

---

### Task 4: `graphLoader.js` — `external_entities` from Supabase, not `company.json`

**Files:**
- Modify: `backend/brain/knowledge/graphLoader.js` (external_entities block)
- Test: `backend/tests/graphLoader.live.test.js:122-123,126-127,138-139`

**Interfaces:**
- Consumes: `external_entities`, `external_entity_supplies` tables from Task 1.
- Produces: `vendor`/`customer` entities with `metadata.source: 'external_entities'` (was
  `'company.json:external_entities'`), `produces` edges unchanged.

- [ ] **Step 1: Update the live test's expectations**

Update line 141's `expected` set: replace `'company.json:external_entities'` with
`'external_entities'`. Vendor/customer counts (6/4) and the `produces` check are unchanged.

- [ ] **Step 2: Run the test to confirm it fails on the provenance check**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: FAIL on `owns provenance names only real source tables`.

- [ ] **Step 3: Add the external_entities queries**

Add two more entries to Task 2's `Promise.all` block (extending what Task 2 already added):

```javascript
    { data: externalEntities, error: e21 },
    { data: externalEntitySupplies, error: e22 },
  ] = await Promise.all([
    // ...(all prior entries)...
    supabase.from('external_entities').select('*'),
    supabase.from('external_entity_supplies').select('*'),
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e15 || e16 || e17 || e18 || e19 || e20 || e21 || e22
```

- [ ] **Step 4: Replace the external_entities block**

Replace the `// External entities: ...` loop reading `companyData.external_entities` with:

```javascript
  // ─── External entities (external_entities / external_entity_supplies tables) ───
  const extEntities = {} // external_entities.id -> entity
  for (const ext of externalEntities || []) {
    extEntities[ext.id] = E({
      type: ext.kind === 'customer' ? 'customer' : 'vendor',
      name: ext.name,
      metadata: { sourceTable: 'external_entities', sourceId: ext.id, criticality: ext.criticality },
    })
    if (ext.relationship_owner_id && employeeById[ext.relationship_owner_id]) {
      R(employeeById[ext.relationship_owner_id], 'owns', extEntities[ext.id], {
        criticality: ext.criticality || 'medium', metadata: { source: 'external_entities' },
      })
    }
  }
  for (const sup of externalEntitySupplies || []) {
    if (extEntities[sup.external_entity_id] && platformEntities[sup.platform_id]) {
      R(extEntities[sup.external_entity_id], 'produces', platformEntities[sup.platform_id], { metadata: { source: 'external_entities' } })
    }
  }
```

This can also live outside the `if (companyData)` block. After this task, the `companyData` block
should have nothing left inside it — confirm and remove the `if (companyData) { }` wrapper and the
now-dead `let companyData = null; try { require(...) } catch...` lines.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/graphLoader.live.test.js` (from `backend/`)
Expected: PASS, all checks.

- [ ] **Step 6: Run the full suite**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`.

- [ ] **Step 7: Update the file header comment**

`graphLoader.js`'s header comment (lines 17-26) still describes `system`/`process`/`vendor`/
`customer` as sourced from `data/company.json`'s hand-authored sections. Update it to describe the
real tables now used (`systems`, `accountability_entities`, `external_entities`), keeping the
`team`/`project` "genuinely empty, do not fabricate" note as-is — that part is still true.

- [ ] **Step 8: Commit**

```bash
git add backend/brain/knowledge/graphLoader.js backend/tests/graphLoader.live.test.js
git commit -m "feat(w-j): graphLoader reads external_entities from Supabase; retire company.json require (D-49)"
```

---

### Task 5: `domain/dataset.js` — wire the real `incidents` table

**Files:**
- Modify: `backend/domain/dataset.js:31-41,101-122`
- Test: `backend/tests/dataset.unit.test.js` (new)
- Modify: `backend/tests/run-all.js:14` (register the new test)

**Interfaces:**
- Consumes: `incidents` table from Task 1.
- Produces: `loadOrgDataset()`'s `incidents` field is now populated (`{date, entity, entity_type,
  impact, owner, resolved_by, resolution_days, lesson}` shape), consumed by
  `domain/analyses.js:27,40,102,137-139` (unchanged, no signature change there).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/dataset.unit.test.js`:

```javascript
/*
 * OBA Core — domain/dataset.js incidents unit test (W-J)
 * No external test framework. Stubs Supabase so it runs offline.
 * Run from the backend/ folder:  node tests/dataset.unit.test.js
 */

let passed = 0
let failed = 0

function check(name, condition, detail) {
	if (condition) {
		passed++
		console.log('  ✓', name, detail ? '— ' + detail : '')
	} else {
		failed++
		console.error('  ✗', name, detail ? '— ' + detail : '')
	}
}

console.log('\n=== OBA Core — domain/dataset.js Incidents Unit Test ===\n')

// Stub supabase and brain before requiring dataset.js, same pattern authRoutes.test.js /
// graphRoutes.test.js already use for offline HTTP-level tests.
const Module = require('module')
const originalLoad = Module._load

let incidentRows = []

Module._load = function (request, parent, isMain) {
	if (request === '../supabase' || request.endsWith('/supabase')) {
		return {
			from(table) {
				const rows = table === 'incidents' ? incidentRows
					: table === 'decision_history' ? []
					: table === 'documentation_trend' ? []
					: table === 'snapshots' ? []
					: []
				return { select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }) }
			},
		}
	}
	if (request === '../brain' || request.endsWith('/brain')) {
		return {
			isReady: () => true,
			getGraph: () => ({
				entities: { list: () => [] },
				relationships: { to: () => [] },
			}),
		}
	}
	return originalLoad.apply(this, arguments)
}

const { loadOrgDataset } = require('../domain/dataset')
Module._load = originalLoad

;(async () => {
	// ─── 1. Empty incidents table: honest absence, not fabricated ───
	incidentRows = []
	const empty = await loadOrgDataset()
	check('empty incidents table yields []', Array.isArray(empty.incidents) && empty.incidents.length === 0)

	// ─── 2. Populated incidents table: real fields survive the mapping ───
	incidentRows = [
		{ id: 1, occurred_at: '2026-01-30', entity_name: 'Billing System', entity_type: 'system', impact: 'Duplicate invoices.', owner_id: 2, resolved_by_id: 36, resolution_days: 3, lesson: 'Read the code.' },
	]
	const populated = await loadOrgDataset()
	check('populated incidents table yields one row', populated.incidents.length === 1)
	check('lesson field survives the mapping', populated.incidents[0].lesson === 'Read the code.')
	check('resolved_by field survives the mapping', populated.incidents[0].resolved_by === 36)
})().then(() => {
	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/dataset.unit.test.js` (from `backend/`)
Expected: FAIL — `empty incidents table yields []` passes (already true today), but `lesson field
survives the mapping` and `resolved_by field survives the mapping` fail, because
`domain/dataset.js` still hardcodes `incidents: []` regardless of the stubbed table.

- [ ] **Step 3: Wire the real incidents query into `domain/dataset.js`**

In `backend/domain/dataset.js:31-41`, add a fourth query:

```javascript
  const [
    { data: decisionHistory, error: e1 },
    { data: docTrend, error: e2 },
    { data: snapshots, error: e3 },
    { data: incidentRows, error: e4 },
  ] = await Promise.all([
    supabase.from('decision_history').select('*').order('decided_at'),
    supabase.from('documentation_trend').select('*').order('recorded_month'),
    supabase.from('snapshots').select('*').order('snapshot_date'),
    supabase.from('incidents').select('*'),
  ])
  const firstError = e1 || e2 || e3 || e4
  if (firstError) throw new Error(firstError.message)
```

Replace lines 113-121 (the `return` block)'s `incidents: []` with a real mapping, and update the
file's top comment (lines 1-20) to drop the now-false "incidents is always [] because no incidents
table... exists" note:

```javascript
  const incidents = (incidentRows || []).map((i) => ({
    date: i.occurred_at,
    entity: i.entity_name,
    entity_type: i.entity_type,
    impact: i.impact,
    owner: i.owner_id,
    resolved_by: i.resolved_by_id,
    resolution_days: i.resolution_days,
    lesson: i.lesson,
  }))

  return {
    agents,
    workflows,
    ai_tools,
    knowledge_areas,
    incidents,
    decisions_log,
    history,
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/dataset.unit.test.js` (from `backend/`)
Expected: PASS, all 3 checks.

- [ ] **Step 5: Register the new test in `run-all.js`**

In `backend/tests/run-all.js`, add `'dataset.unit.test.js',` to the `tests` array — place it near
`'orgAnalyses.unit.test.js'` since both exercise `domain/`.

- [ ] **Step 6: Run the full suite**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`. Note: `orgAnalyses.unit.test.js` needs no change — it already
tests `alignmentChecklist`'s incident-lesson dimension against synthetic fixtures (case 3/4 in that
file already pass a populated `incidents` array), independent of where the data comes from.

- [ ] **Step 7: Commit**

```bash
git add backend/domain/dataset.js backend/tests/dataset.unit.test.js backend/tests/run-all.js
git commit -m "feat(w-j): domain/dataset.js reads real incidents table, activates live scoring (D-50)"
```

---

### Task 6: `export-company.js` — retire `AUTHORED.systems`/`external_entities`/`incidents`; delete `decisions_log`

**Files:**
- Modify: `backend/tools/export-company.js`

**Interfaces:**
- Consumes: nothing new. `export-company.js` is entirely synchronous — no Supabase client, no
  `await`, anywhere in the file. It reads `backend/sql/02_seed_data.sql` as raw text into a `sql`
  string (line 8) and regex-parses `INSERT INTO <table> VALUES (...)` tuples out of it via a
  `table(name)` helper (lines 240-249). This task reads `14_authored_entities.sql` the same way and
  concatenates it into the same `sql` string, so `table('systems')` etc. work unmodified — no new
  async code, no Supabase client added to this file. `outProcesses` is untouched (D-47 correction —
  it already parses `accountability_entities` from the same seed file).
- Produces: `data/company.json` — same top-level shape, `systems`/`external_entities`/`incidents`
  populated from the new migration file, `decisions_log` key removed entirely.

- [ ] **Step 1: Read the new migration file into the same `sql` string `table()` already parses**

In `export-company.js:7-8`, change:

```javascript
const ROOT = process.argv[2]
const sql = fs.readFileSync(path.join(ROOT, 'backend/sql/02_seed_data.sql'), 'utf8')
```

to:

```javascript
const ROOT = process.argv[2]
const sql = fs.readFileSync(path.join(ROOT, 'backend/sql/02_seed_data.sql'), 'utf8')
  + '\n' + fs.readFileSync(path.join(ROOT, 'backend/sql/14_authored_entities.sql'), 'utf8')
```

`table(name)`'s regex (`INSERT INTO ${name}\s*\(...\)\s*VALUES([\s\S]*?);`) finds the first matching
`INSERT INTO <name>` anywhere in `sql` — concatenating is sufficient, no change to `table()` itself
needed. Confirmed no name collision: `table('systems')`'s regex requires the literal substring
`systems` immediately followed by `\s*\(`, and `system_dependencies`/`system_agent_usage` don't
contain that substring at a matching position (`system_` breaks the match before `s` of `systems`).

- [ ] **Step 2: Remove `AUTHORED.systems`, `AUTHORED.external_entities`, `AUTHORED.incidents`,
  `AUTHORED.decisions_log` from the `AUTHORED` constant**

In `export-company.js`, delete those four keys from the `AUTHORED` object (lines ~19-155 today). The
`AUTHORED` constant and its comment banner can be removed entirely once empty — check the file after
deleting to confirm nothing else remains in it.

- [ ] **Step 3: Parse the three new tables and build `outSystems`, `outExternalEntities`,
  `outIncidents`**

Near the existing `const acctEntities = table('accountability_entities')` block (`export-company.js:267`),
add:

```javascript
const systemsRows = table('systems')
const systemDepsRows = table('system_dependencies')
const systemUsageRows = table('system_agent_usage')
const externalEntitiesRows = table('external_entities')
const externalSuppliesRows = table('external_entity_supplies')
const incidentsRows = table('incidents')
```

Then, alongside the other `out*` section builders (near `outWorkflows`/`outDeps`), add — using the
same `empName`/`agentById`/`platById` lookups the rest of the file already relies on:

```javascript
const systemNameById = new Map(systemsRows.map((s) => [s.id, s.name]))

const outSystems = systemsRows.map((s) => ({
  name: s.name,
  owner: empName(s.owner_id),
  department: s.department,
  criticality: s.criticality,
  documented: s.documented,
  depends_on: systemDepsRows
    .filter((sd) => sd.system_id === s.id)
    .map((sd) => systemNameById.get(sd.depends_on_system_id))
    .filter(Boolean),
  used_by: systemUsageRows
    .filter((su) => su.system_id === s.id)
    .map((su) => agentById.get(su.agent_id)?.name)
    .filter(Boolean),
  description: s.description,
}))

const outExternalEntities = externalEntitiesRows.map((e) => ({
  name: e.name,
  kind: e.kind,
  supplies: externalSuppliesRows
    .filter((sup) => sup.external_entity_id === e.id)
    .map((sup) => platById.get(sup.platform_id)?.name)
    .filter(Boolean),
  relationship_owner: empName(e.relationship_owner_id),
  criticality: e.criticality,
}))

const outIncidents = incidentsRows.map((i) => ({
  date: i.occurred_at,
  entity: i.entity_name,
  entity_type: i.entity_type,
  impact: i.impact,
  owner: empName(i.owner_id),
  resolved_by: empName(i.resolved_by_id),
  resolution_days: i.resolution_days,
  lesson: i.lesson,
}))
```

- [ ] **Step 4: Update the `dataset` object**

Replace `dataset`'s four lines (currently `systems: AUTHORED.systems`, `incidents:
AUTHORED.incidents`, `decisions_log: AUTHORED.decisions_log`, `external_entities:
AUTHORED.external_entities`) with:

```javascript
  systems: outSystems,
  incidents: outIncidents,
  external_entities: outExternalEntities,
```

(`decisions_log` key is dropped entirely — not replaced with anything, per D-48.) Update the `_note`
field — it currently says these sections "are empty because no source table exists; they must be
authored" — that's no longer true; either remove that sentence or replace it with a note that they're
now derived from `systems`/`external_entities`/`incidents` tables like everything else.

- [ ] **Step 5: Update validation**

`export-company.js`'s `entityIndex.system` (currently `new Set(AUTHORED.systems.map(...))`) becomes
`new Set(outSystems.map((s) => s.name))`. `badSysDep` and `badIncident` reference `AUTHORED.systems`/
`AUTHORED.incidents` — repoint both to `outSystems`/`outIncidents`. Add the same `used_by`-validates-
against-known-agents check Task 1's data implicitly relies on being correct (mirror `badSysDep`'s
shape):

```javascript
const badSysUsedBy = outSystems.flatMap((s) =>
  s.used_by.filter((n) => !entityIndex.agent.has(n)).map((n) => `${s.name}→${n}`))
if (badSysUsedBy.length) errs.push(`systems — used_by agent not found: ${badSysUsedBy.join(', ')}`)
```

- [ ] **Step 6: Regenerate `data/company.json` and verify**

Run: `node tools/export-company.js /e/Professional/HORQUVA/Project/OBA-Core-Horquva` (from
`backend/`)
Expected: `validation: all rules pass`; console output shows `systems 4`, `external_entities 10`,
`incidents 8`; no `decisions_log` line under "authored (no source table)" any more.

- [ ] **Step 7: Diff the regenerated file against the pre-Task-6 version**

Run: `git diff data/company.json`
Expected: `systems`/`external_entities`/`incidents` sections are content-identical to before (same
names, same fields) — this task changes *how* the file is built, not what it contains. `decisions_log`
key disappears from the file. If any other field differs unexpectedly, stop and investigate before
committing — a mismatch here means a name-to-id join went wrong in Step 3.

- [ ] **Step 8: Run the full suite**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`.

- [ ] **Step 9: Commit**

```bash
git add backend/tools/export-company.js data/company.json
git commit -m "feat(w-j): export-company.js retires AUTHORED; company.json becomes pure derived snapshot (D-48, D-51)"
```

---

### Task 7: Final verification and decision log update

**Files:**
- Modify: `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`

- [ ] **Step 1: Run the full suite one more time from a clean state**

Run: `npm test` (from `backend/`)
Expected: `ALL TEST SUITES PASSED`, all suites including the two new/changed ones from this
workstream.

- [ ] **Step 2: Confirm the M38 regression is still fixed**

Run:
```bash
node -e "
const brain = require('./brain');
(async () => {
  await brain.loadGraph();
  const m38 = await brain.run('M38');
  const systemsFlagged = m38.payload.opportunities.filter(o => o.type === 'system');
  console.log('systems flagged as underused:', systemsFlagged.length, '(expect 0)');
})();
"
```
Expected: `systems flagged as underused: 0`.

- [ ] **Step 3: Update the decision log's W-J row from DESIGN DRAFTED to DONE**

In `docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md`, update the W-J table row
(§3) to `**DONE**` with the task count/commit range, matching the style of every other completed
workstream's row (e.g. W-I's `**DONE** — 13 tasks, 25 commits, ...`).

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md
git commit -m "docs(w-j): mark W-J done in the remediation decision log"
```
