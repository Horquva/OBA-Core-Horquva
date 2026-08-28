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
