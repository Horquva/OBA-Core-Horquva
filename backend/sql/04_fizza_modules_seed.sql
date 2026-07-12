-- ============================================================
-- OBA — MIGRATION 04: Seed Data for Fizza's Intelligence Tables
-- Reference entities from Horquva Technologies (02_seed_data.sql):
--   Employees: Robert Chen, Aisha Patel, Yuki Tanaka, Sarah Mitchell,
--              Nathan Wright, Jennifer Foster, Grace Okonkwo, etc.
--   Agents:    DeployBot, SecurityScanner, DataPipeline, etc.
--   Workflows: Code Deployment Pipeline, Security Audit, etc.
-- Run AFTER 03_fizza_modules_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. TRUTH ENTITIES
-- ────────────────────────────────────────────────

INSERT INTO truth_entities (entity_name, entity_type, department) VALUES
('DeployBot',              'agent',    'Engineering'),
('SecurityScanner',        'agent',    'Engineering'),
('DataPipeline',           'agent',    'Data'),
('KnowledgeIndexer',       'agent',    'Data'),
('ComplianceChecker',      'agent',    'Operations'),
('IncidentResponder',      'agent',    'Engineering'),
('Yuki Tanaka',            'employee', 'Engineering'),
('Sarah Mitchell',         'employee', 'Engineering'),
('Nathan Wright',          'employee', 'Data'),
('Robert Chen',            'employee', 'Engineering'),
('Jennifer Foster',        'employee', 'Operations'),
('Victoria Adams',         'employee', 'Finance'),
('Code Deployment Pipeline','workflow','Engineering'),
('Data Ingestion Pipeline', 'workflow','Data'),
('Incident Response',       'workflow','Engineering');

-- ────────────────────────────────────────────────
-- 2. TRUTH CLAIMS
-- ────────────────────────────────────────────────

INSERT INTO truth_claims (entity_id, claim_text, claim_category, evidence, verdict, confidence_score, data_source, is_contradicted) VALUES
-- DeployBot (entity 1)
(1, 'DeployBot has a designated backup owner', 'ownership',
 'employee_agent table shows Omar Hassan as backup operator', 'VERIFIED', 92.0, 'employee_agent', false),
(1, 'DeployBot is critical-risk and fully operational', 'risk',
 'agents table: risk=critical, status=active', 'VERIFIED', 95.0, 'agents', false),
(1, 'DeployBot has documented runbook coverage', 'documentation',
 'Knowledge asset for DeployBot is_documented=true', 'VERIFIED', 88.0, 'knowledge_assets', false),

-- SecurityScanner (entity 2)
(2, 'SecurityScanner has no backup owner', 'ownership',
 'employee_agent: only Sarah Mitchell (owner), no backup entry', 'VERIFIED', 97.0, 'employee_agent', false),
(2, 'SecurityScanner is used in 3 critical workflows', 'risk',
 'workflow_dependencies: appears in Deploy, Security Audit, Incident Response', 'VERIFIED', 99.0, 'workflow_dependencies', false),
(2, 'SecurityScanner documentation is complete', 'documentation',
 'knowledge_assets: is_documented=true, criticality=critical', 'UNVERIFIED', 45.0, 'knowledge_assets', true),

-- DataPipeline (entity 3)
(3, 'DataPipeline has a single operator with no backup', 'ownership',
 'workflow_runbooks: only Sophia Chen; no backup assigned', 'VERIFIED', 91.0, 'workflow_runbooks', false),
(3, 'DataPipeline runs hourly and is high risk', 'risk',
 'workflows: frequency=hourly, risk=high', 'VERIFIED', 87.0, 'workflows', false),
(3, 'DataPipeline has Tableau AI as single-tool dependency', 'continuity',
 'workflow_tool_dependencies: only Tableau AI, is_critical=true', 'VERIFIED', 93.0, 'workflow_tool_dependencies', false),

-- KnowledgeIndexer (entity 4)
(4, 'KnowledgeIndexer is in FAILED state', 'risk',
 'agents table: status=failed', 'VERIFIED', 100.0, 'agents', false),
(4, 'KnowledgeIndexer has no active backup coverage', 'continuity',
 'No backup operator found in employee_agent', 'VERIFIED', 98.0, 'employee_agent', false),
(4, 'KnowledgeIndexer failure is causing data gaps', 'documentation',
 'knowledge_assets: is_documented=false for KnowledgeIndexer', 'UNVERIFIED', 60.0, 'knowledge_assets', false),

-- ComplianceChecker (entity 5)
(5, 'ComplianceChecker is owned by Grace Okonkwo with backup', 'ownership',
 'employee_agent: Grace owner; no formal backup but James listed', 'CONTRADICTED', 55.0, 'employee_agent', true),
(5, 'ComplianceChecker meets SOC2 requirements', 'risk',
 'ComplianceChecker status=active; policy coverage verified', 'VERIFIED', 80.0, 'tool_policies', false),

-- IncidentResponder (entity 6)
(6, 'IncidentResponder escalation path is undocumented', 'continuity',
 'workflow_failures: escalation_failure, severity=critical', 'VERIFIED', 96.0, 'workflow_failures', false),
(6, 'IncidentResponder depends on SecurityScanner critically', 'risk',
 'dependencies: IncidentResponder→SecurityScanner strength=88', 'VERIFIED', 94.0, 'dependencies', false),

-- Yuki Tanaka (entity 7)
(7, 'Yuki Tanaka is sole owner of the Code Deployment Pipeline', 'ownership',
 'workflow_runbooks: owner_id=4 (Yuki), no backup', 'VERIFIED', 95.0, 'workflow_runbooks', false),
(7, 'Yuki Tanaka manages both DeployBot and IncidentResponder', 'risk',
 'employee_agent: owns agent 1 and agent 6', 'VERIFIED', 90.0, 'employee_agent', false),

-- Sarah Mitchell (entity 8)
(8, 'Sarah Mitchell has no designated backup for SecurityScanner', 'ownership',
 'employee_agent: only owner entry, no backup', 'VERIFIED', 98.0, 'employee_agent', false),
(8, 'Sarah Mitchell''s departure would critically impact Engineering', 'risk',
 'SecurityScanner appears in 3 critical workflows', 'VERIFIED', 92.0, 'workflow_dependencies', false),

-- Nathan Wright (entity 9)
(9, 'Nathan Wright has critical knowledge concentration risk', 'ownership',
 'knowledge_assets: owns KnowledgeIndexer and Tableau, both undocumented', 'VERIFIED', 88.0, 'knowledge_assets', false),
(9, 'Nathan Wright has Sophia Chen as backup for DataPipeline', 'continuity',
 'employee_agent: Sophia backup for DataPipeline', 'VERIFIED', 75.0, 'employee_agent', false),

-- Code Deployment Pipeline (entity 13)
(13, 'Code Deployment Pipeline runbook is documented', 'documentation',
 'workflow_runbooks: is_documented=true, last_updated=2026-05-15', 'VERIFIED', 85.0, 'workflow_runbooks', false),
(13, 'Code Deployment Pipeline has 3 SPOF agents', 'risk',
 'workflow_dependencies: DeployBot, CodeReviewAgent, TestRunner all critical', 'VERIFIED', 97.0, 'workflow_dependencies', false),

-- Data Ingestion Pipeline (entity 14)
(14, 'Data Ingestion Pipeline documentation is up to date', 'documentation',
 'workflow_runbooks: is_documented=true, last_updated=2026-06-01', 'VERIFIED', 90.0, 'workflow_runbooks', false),
(14, 'Data Ingestion Pipeline is at risk from Tableau AI dependency', 'continuity',
 'workflow_failures: tool_failure severity=high', 'VERIFIED', 88.0, 'workflow_failures', false),

-- Incident Response (entity 15)
(15, 'Incident Response workflow has no documented runbook', 'documentation',
 'workflow_runbooks: is_documented=false', 'VERIFIED', 99.0, 'workflow_runbooks', false),
(15, 'Incident Response escalation failure caused 45-min delay', 'risk',
 'workflow_failures: escalation_failure, severity=critical', 'VERIFIED', 100.0, 'workflow_failures', false);

-- ────────────────────────────────────────────────
-- 3. EXECUTIVE MEMORY ITEMS
-- ────────────────────────────────────────────────

INSERT INTO executive_memory_items (memory_type, title, description, entity_name, relevance_score, severity, source_module, is_recurring) VALUES
('lesson', 'Incident Response Escalation Failure',
 'On 2026-04-08, a critical incident caused a 45-minute delay due to undocumented escalation paths. Yuki Tanaka was the sole responder during off-hours.',
 'Incident Response', 95.0, 'critical', 'orchestration', true),

('lesson', 'DataPipeline Single-Owner Outage',
 'Sophia Chen''s absence in March 2026 caused a 6-hour data pipeline failure. No backup operator was trained on the hourly data ingestion process.',
 'DataPipeline', 88.0, 'critical', 'continuity', true),

('hero_risk', 'Yuki Tanaka — DevOps Hero Dependency',
 'Yuki is the sole owner of DeployBot, IncidentResponder, and the Code Deployment Pipeline. His absence halts all deployments and incident response.',
 'Yuki Tanaka', 97.0, 'critical', 'ownership', true),

('hero_risk', 'Sarah Mitchell — Security Hero Dependency',
 'Sarah is the sole owner of SecurityScanner which is used in 3 critical workflows. No backup is trained. Her departure would ground security operations.',
 'Sarah Mitchell', 94.0, 'critical', 'ownership', false),

('hero_risk', 'Nathan Wright — Data Hero Dependency',
 'Nathan owns the entire data architecture and KnowledgeIndexer. KnowledgeIndexer is in a FAILED state and Nathan is the only person who can restore it.',
 'Nathan Wright', 91.0, 'critical', 'knowledge', true),

('repeat_offender', 'Code Deployment Pipeline — Recurring Human SPOF',
 'The deployment pipeline has recorded human SPOF failures in 2025-Q3, 2026-Q1, and 2026-Q2. The same pattern repeats despite recommendations.',
 'Code Deployment Pipeline', 89.0, 'high', 'learning', true),

('repeat_offender', 'Data Ingestion Pipeline — Tool Failure Pattern',
 'Tableau AI rate-limiting has caused data pipeline delays on 4 separate occasions in 2026. A backup tool has been recommended but not actioned.',
 'Data Ingestion Pipeline', 82.0, 'high', 'learning', true),

('bad_decision', 'DataRobot Deprecation Delay',
 'DataRobot was flagged for deprecation in Q4-2025. No migration has occurred. The organization continues to pay $5,500/month for a tool with 8% adoption.',
 'DataRobot', 78.0, 'medium', 'governance', false),

('bad_decision', 'SecurityScanner Backup Owner Decision',
 'In 2025, a decision was made to delay assigning a backup owner for SecurityScanner until Q1-2026. Q1-2026 passed with no action taken.',
 'SecurityScanner', 85.0, 'critical', 'ownership', false),

('lesson', 'Employee Offboarding Knowledge Loss',
 'Two senior employees left in 2025 without completing knowledge transfer. The offboarding workflow is not documented and lacks a required knowledge transfer step.',
 'Employee Offboarding', 76.0, 'high', 'continuity', false);

-- ────────────────────────────────────────────────
-- 4. INCIDENT PATTERNS
-- ────────────────────────────────────────────────

INSERT INTO incident_patterns (pattern_name, failure_type, occurrence_count, affected_entities, first_seen, last_seen) VALUES
('Human SPOF — DevOps',
 'human_spof', 4,
 ARRAY['DeployBot', 'Code Deployment Pipeline', 'Yuki Tanaka'],
 '2025-07-01T00:00:00Z', '2026-04-08T00:00:00Z'),

('Tool Rate-Limiting Cascade',
 'tool_failure', 4,
 ARRAY['Tableau AI', 'DataPipeline', 'Data Ingestion Pipeline'],
 '2025-11-15T00:00:00Z', '2026-06-10T00:00:00Z'),

('Undocumented Escalation Path',
 'escalation_failure', 2,
 ARRAY['IncidentResponder', 'Incident Response', 'Yuki Tanaka'],
 '2026-01-20T00:00:00Z', '2026-04-08T00:00:00Z'),

('Security Scanning Gap',
 'process_gap', 3,
 ARRAY['SecurityScanner', 'Security Audit Process'],
 '2025-09-01T00:00:00Z', '2026-06-01T00:00:00Z'),

('Offboarding Knowledge Loss',
 'process_gap', 2,
 ARRAY['Employee Offboarding', 'Thomas Garcia'],
 '2025-06-01T00:00:00Z', '2026-01-15T00:00:00Z');

-- ────────────────────────────────────────────────
-- 5. HERO DEPENDENCIES
-- ────────────────────────────────────────────────

INSERT INTO hero_dependencies (person_name, department, resolution_count, risk_level, description) VALUES
('Yuki Tanaka', 'Engineering', 47,
 'critical',
 'Sole owner of DeployBot, IncidentResponder, and Code Deployment Pipeline. Handles all deployment-related incidents personally.'),

('Sarah Mitchell', 'Engineering', 38,
 'critical',
 'Sole owner of SecurityScanner. Only person who can interpret security scan results and sign off on compliance reports.'),

('Nathan Wright', 'Data', 29,
 'critical',
 'Sole architect of the data platform. Only person who can restore KnowledgeIndexer or modify data pipeline architecture.'),

('Jennifer Foster', 'Operations', 22,
 'high',
 'COO who is the final escalation point for all cross-departmental incidents. No formal backup escalation path exists.'),

('Robert Chen', 'Engineering', 18,
 'high',
 'VP Engineering who participates in every critical post-mortem. Architecture decisions are gated on his approval.'),

('Victoria Adams', 'Finance', 15,
 'high',
 'CFO with no backup designated. Financial reporting and board prep both require her exclusive sign-off.');

-- ────────────────────────────────────────────────
-- 6. DECISION HISTORY
-- ────────────────────────────────────────────────

INSERT INTO decision_history (title, outcome, description, decided_at, should_revisit, revisit_reason) VALUES
('Assign Backup Owner for SecurityScanner', 'negative',
 'Decided to delay backup owner assignment until Q1-2026 hiring cycle. No backup was ever assigned.',
 '2025-10-15T00:00:00Z', true,
 'Still no backup assigned as of Q2-2026. SecurityScanner remains a critical SPOF.'),

('Deprecate DataRobot Platform', 'negative',
 'Decision to migrate off DataRobot was made but migration plan was never executed. $5,500/month continues.',
 '2025-12-01T00:00:00Z', true,
 'No migration progress. Deprecated tool still in production use with 8% adoption.'),

('Document Incident Response Runbook', 'negative',
 'Engineering agreed to document the incident response runbook by end of Q1-2026. Deadline passed.',
 '2025-11-20T00:00:00Z', true,
 'Runbook still undocumented. A critical incident in April 2026 resulted from this gap.'),

('Cross-Train Omar Hassan on DeployBot', 'positive',
 'Omar Hassan was made backup operator for DeployBot in late 2025. Deployment continuity improved.',
 '2025-09-10T00:00:00Z', false, NULL),

('Consolidate ChatGPT and Claude Licenses', 'positive',
 'Decided to standardize on ChatGPT Enterprise + Claude Pro dual-LLM strategy. Cost optimized.',
 '2026-01-05T00:00:00Z', false, NULL),

('Cancel Perplexity Pro Subscription', 'neutral',
 'Subscription cancelled due to low 12% adoption. Research needs migrated to ChatGPT.',
 '2026-05-01T00:00:00Z', false, NULL),

('Assign Sophia Chen as DataPipeline Backup', 'positive',
 'Sophia Chen formally designated as backup operator for the DataPipeline agent.',
 '2026-02-15T00:00:00Z', false, NULL),

('Delay Employee Offboarding Runbook', 'negative',
 'Offboarding documentation was deprioritized in favor of product initiatives in Q3-2025.',
 '2025-08-01T00:00:00Z', true,
 'Two knowledge-loss incidents occurred. Runbook still not created as of 2026-Q2.'),

('Implement Tableau AI Backup Pipeline', 'negative',
 'A backup data pipeline was proposed to reduce Tableau AI single-tool dependency. Never implemented.',
 '2026-01-20T00:00:00Z', true,
 'Fourth rate-limiting incident occurred in June 2026. No backup tool in place.'),

('Promote James O''Brien to QA Lead', 'positive',
 'James O''Brien promoted and given expanded testing authority. TestRunner adoption increased to 80%.',
 '2026-03-01T00:00:00Z', false, NULL);

-- ────────────────────────────────────────────────
-- 7. DECISION QUEUE
-- ────────────────────────────────────────────────

INSERT INTO decision_queue (title, description, driver, impact_score, urgency_score, effort_score, blast_radius, entity_name, responsible_person, status) VALUES
('Assign backup owner for SecurityScanner',
 'Sarah Mitchell is the sole owner of SecurityScanner which serves 3 critical workflows. No backup exists. A single absence grounds security operations.',
 'spof', 95, 98, 20, 85, 'SecurityScanner', 'Robert Chen', 'pending'),

('Document Incident Response runbook',
 'The Incident Response workflow has no documented runbook. A critical escalation failure in April 2026 caused a 45-min outage delay.',
 'active_incident', 90, 95, 30, 80, 'Incident Response', 'Yuki Tanaka', 'pending'),

('Restore KnowledgeIndexer from FAILED state',
 'KnowledgeIndexer has been in FAILED state since April 2026. No restoration plan is in place and the knowledge indexing pipeline is stalled.',
 'active_incident', 88, 92, 60, 70, 'KnowledgeIndexer', 'Nathan Wright', 'pending'),

('Implement Tableau AI backup pipeline',
 'Data Ingestion Pipeline has a single tool dependency on Tableau AI. 4 rate-limiting incidents in 2026. A backup pipeline must be provisioned.',
 'spof', 82, 78, 70, 65, 'DataPipeline', 'Nathan Wright', 'pending'),

('Complete DataRobot migration and cancel subscription',
 'DataRobot is deprecated with 8% adoption but still incurring $5,500/month. Migration is overdue.',
 'undocumented_knowledge', 70, 65, 40, 30, 'DataRobot', 'Nathan Wright', 'in_progress'),

('Create Employee Offboarding runbook',
 'The Employee Offboarding workflow has no documented runbook. Two knowledge-loss incidents traced to this gap.',
 'undocumented_knowledge', 75, 70, 35, 55, 'Employee Offboarding', 'Thomas Garcia', 'pending'),

('Assign CFO backup designation',
 'Victoria Adams (CFO) has no backup designated. Financial reporting and board prep are single-person dependencies.',
 'spof', 85, 80, 15, 75, 'Victoria Adams', 'Jennifer Foster', 'pending'),

('Train additional engineer on deployment pipeline',
 'Yuki Tanaka remains the primary engineer for code deployments despite Omar being backup. Cross-training depth is insufficient.',
 'spof', 78, 72, 50, 60, 'Code Deployment Pipeline', 'Robert Chen', 'pending'),

('Resolve Customer Onboarding documentation gap',
 'The Customer Onboarding workflow runbook has not been updated since 2025-11-01. Rebecca Stone is sole owner.',
 'undocumented_knowledge', 65, 60, 25, 45, 'Customer Onboarding', 'Rebecca Stone', 'pending'),

('Automate Compliance Review checklist',
 'Compliance Review process relies on manual checklist — no automation. Monthly compliance risk.',
 'other', 60, 55, 55, 40, 'Compliance Review', 'Grace Okonkwo', 'pending');

-- ────────────────────────────────────────────────
-- 8. PENDING DECISIONS
-- ────────────────────────────────────────────────

INSERT INTO pending_decisions (title, description, priority, source_module, status) VALUES
('Backup owner assignment for SecurityScanner',
 'CRITICAL: SecurityScanner has no backup owner. Assign a trained backup before next security audit cycle.',
 'critical', 'ownership', 'pending'),

('Restore KnowledgeIndexer',
 'CRITICAL: KnowledgeIndexer is in FAILED state since April 2026. Data indexing pipeline is stalled.',
 'critical', 'agents', 'pending'),

('Document Incident Response runbook',
 'HIGH: Undocumented incident response workflow caused a 45-min delay in April 2026.',
 'high', 'continuity', 'pending'),

('CFO backup designation',
 'HIGH: Victoria Adams (CFO) has no backup. Financial reporting continuity is at risk.',
 'high', 'governance', 'pending'),

('Tableau AI backup pipeline',
 'HIGH: Four rate-limiting incidents in 2026. Backup data pipeline needed.',
 'high', 'predictive-risk', 'pending'),

('DataRobot migration completion',
 'MEDIUM: DataRobot deprecation is overdue. $5,500/month continues.',
 'medium', 'governance', 'pending'),

('Employee Offboarding runbook',
 'MEDIUM: Two knowledge-loss incidents traced to missing offboarding documentation.',
 'medium', 'continuity', 'pending');

-- ────────────────────────────────────────────────
-- 9. ORG HEALTH SNAPSHOTS (6 months of history)
-- ────────────────────────────────────────────────

INSERT INTO org_health_snapshots (snapshot_month, health_index, health_status, documentation_score, continuity_score, ownership_spread_score, critical_safety_score, incident_load_score) VALUES
('2026-01', 48, 'WARNING',  42, 50, 55, 38, 60),
('2026-02', 50, 'WARNING',  44, 52, 57, 40, 62),
('2026-03', 47, 'WARNING',  43, 48, 54, 36, 58),
('2026-04', 44, 'WARNING',  41, 46, 52, 30, 55),
('2026-05', 49, 'WARNING',  46, 51, 56, 38, 58),
('2026-06', 52, 'WARNING',  48, 54, 58, 42, 62);

-- ────────────────────────────────────────────────
-- 10. DEPARTMENT HEALTH SCORES
-- ────────────────────────────────────────────────

INSERT INTO dept_health_scores (department, snapshot_month, health_index, health_status, documentation_score, continuity_score, ownership_score, safety_score, incident_score) VALUES
('Engineering',  '2026-06', 45, 'WARNING',  52, 40, 55, 30, 50),
('Data',         '2026-06', 42, 'WARNING',  45, 38, 48, 35, 55),
('Operations',   '2026-06', 60, 'STABLE',   65, 62, 70, 58, 68),
('Product',      '2026-06', 68, 'STABLE',   72, 65, 75, 70, 72),
('Sales',        '2026-06', 55, 'WARNING',  50, 52, 60, 58, 60),
('Finance',      '2026-06', 58, 'WARNING',  62, 55, 50, 65, 60),
-- Previous month for trend
('Engineering',  '2026-05', 42, 'WARNING',  48, 37, 52, 28, 47),
('Data',         '2026-05', 40, 'WARNING',  42, 35, 45, 32, 52),
('Operations',   '2026-05', 58, 'WARNING',  62, 60, 68, 55, 65),
('Product',      '2026-05', 65, 'STABLE',   70, 62, 72, 68, 70),
('Sales',        '2026-05', 52, 'WARNING',  48, 50, 58, 55, 58),
('Finance',      '2026-05', 55, 'WARNING',  60, 52, 48, 62, 58);

-- ────────────────────────────────────────────────
-- 11. DOCUMENTATION TREND (6 months)
-- ────────────────────────────────────────────────

INSERT INTO documentation_trend (recorded_month, coverage_pct, total_assets, documented) VALUES
('2026-01', 38.5, 52, 20),
('2026-02', 40.4, 52, 21),
('2026-03', 42.3, 54, 23),
('2026-04', 43.1, 55, 24),
('2026-05', 45.5, 55, 25),
('2026-06', 48.1, 56, 27);

-- ────────────────────────────────────────────────
-- 12. EXECUTIVE BRIEFINGS (last 3 months)
-- ────────────────────────────────────────────────

INSERT INTO executive_briefings (briefing_date, top_spof, top_spof_owner, most_overloaded_owner, overload_score, latest_incident, lesson_learned, doc_trend_current, doc_trend_previous, doc_trend_status, summary_points) VALUES
('2026-04-01', 'SecurityScanner', 'Sarah Mitchell', 'Yuki Tanaka', 82.0,
 'Escalation failure caused 45-min delay in critical incident response',
 'Document all escalation paths and assign backup for SecurityScanner immediately',
 43.1, 42.3, 'IMPROVING',
 '["SPOF ALERT: SecurityScanner has no backup owner — CRITICAL risk", "OVERLOAD: Yuki Tanaka carries a dependency score of 82/100 and owns 3 critical workflows", "INCIDENT: Incident escalation path not documented — 45 min delay in critical outage", "DOCUMENTATION: Coverage is IMPROVING — moved from 42.3% to 43.1% (trend: up). Safe threshold is 60%.", "DECISIONS: 5 pending decisions require executive attention."]'::JSONB),

('2026-05-01', 'SecurityScanner', 'Sarah Mitchell', 'Yuki Tanaka', 82.0,
 'Tableau AI rate limiting caused 6-hour data pipeline disruption',
 'Provision backup data ingestion tool to eliminate Tableau single-tool dependency',
 45.5, 43.1, 'IMPROVING',
 '["SPOF ALERT: SecurityScanner has no backup owner — rated CRITICAL with predicted risk score of 85", "OVERLOAD: Yuki Tanaka carries a dependency score of 82/100 and owns 2 critical agents. has no backup coverage.", "INCIDENT: Tableau AI rate limiting causing data pipeline delays — occurred in workflow: Data Ingestion Pipeline.", "DOCUMENTATION: Coverage is IMPROVING — moved from 43.1% to 45.5% (trend: up). Safe threshold is 60%.", "DECISIONS: 6 pending decisions require executive attention."]'::JSONB),

('2026-06-01', 'KnowledgeIndexer', 'Nathan Wright', 'Yuki Tanaka', 82.0,
 'KnowledgeIndexer in FAILED state — data indexing pipeline stalled',
 'Restore KnowledgeIndexer and assign backup knowledge engineer',
 48.1, 45.5, 'IMPROVING',
 '["SPOF ALERT: KnowledgeIndexer is in FAILED state — Nathan Wright is sole owner with no recovery path", "OVERLOAD: Yuki Tanaka carries a dependency score of 82/100 and owns 2 critical agents. has no backup coverage.", "INCIDENT: Sophia Chen is sole operator — no backup for data pipeline — in workflow: Data Ingestion Pipeline.", "DOCUMENTATION: Coverage is IMPROVING — moved from 45.5% to 48.1% (trend: up). Safe threshold is 60%.", "DECISIONS: 7 pending decisions require executive attention."]'::JSONB);

-- ────────────────────────────────────────────────
-- 13. EXECUTIVE QUESTIONS (question library)
-- ────────────────────────────────────────────────

INSERT INTO executive_questions (question_text, question_type) VALUES
('What is my biggest risk right now?', 'risk'),
('Who is the most overloaded person in the organization?', 'ownership'),
('Which workflows have no documented runbook?', 'continuity'),
('What are the top single points of failure?', 'ownership'),
('Which agents are predicted to fail in the next 30 days?', 'predictive'),
('Are there any active governance violations?', 'governance'),
('Who is accountable for the data pipeline?', 'accountability'),
('What critical knowledge is undocumented?', 'knowledge'),
('What is our overall organizational intelligence score?', 'general'),
('Which tools are at risk of disrupting operations?', 'risk'),
('What decisions need to be made this week?', 'risk'),
('Is our documentation coverage improving or declining?', 'knowledge'),
('Which department has the lowest health score?', 'general'),
('What happened in our last critical incident?', 'risk'),
('Who has no backup owner assigned?', 'continuity');

-- ────────────────────────────────────────────────
-- 14. VOICE INTENTS
-- ────────────────────────────────────────────────

INSERT INTO voice_intents (intent_name, example_query) VALUES
('ownership', 'Who owns DeployBot?'),
('ownership', 'Who is responsible for the data pipeline?'),
('ownership', 'Who manages the security scanner?'),
('risk',      'How risky is the KnowledgeIndexer?'),
('risk',      'Is SecurityScanner a threat?'),
('risk',      'What is the risk level of the incident responder?'),
('status',    'How is the deployment pipeline running?'),
('status',    'What is the status of the security audit workflow?'),
('status',    'Is the data ingestion pipeline active?'),
('general',   'Who is the most overloaded person?'),
('general',   'What is my biggest risk?'),
('general',   'Give me a quick summary of today''s situation');

-- ────────────────────────────────────────────────
-- 15. VOICE DAILY SUMMARY
-- ────────────────────────────────────────────────

INSERT INTO voice_daily_summary (summary) VALUES
('Today''s intelligence summary: SecurityScanner has no backup owner (CRITICAL SPOF). Yuki Tanaka is the most overloaded person with a dependency score of 82/100. KnowledgeIndexer remains in FAILED state — Nathan Wright is the only person who can restore it. Documentation coverage is at 48.1%, improving but still below the 60% safe threshold. 7 decisions are pending executive attention.'),
('Organizational posture: WARNING. Three critical human SPOFs identified: Yuki Tanaka (DevOps), Sarah Mitchell (Security), Nathan Wright (Data). The Incident Response workflow still lacks a documented runbook 3 months after the April 2026 escalation failure. DataRobot migration is overdue — $5,500/month continues.'),
('Weekly intelligence digest: Documentation coverage improved 2.6 points month-over-month. DataPipeline experienced another tool rate-limiting event from Tableau AI — the 4th this year. Employee Offboarding runbook still missing. Recommended actions: assign backup for SecurityScanner, restore KnowledgeIndexer, document Incident Response runbook.');

-- ────────────────────────────────────────────────
-- 16. INTELLIGENCE RESULTS  (pillar scores + org score)
-- ────────────────────────────────────────────────

INSERT INTO intelligence_results (result_type, result_key, score, rating, strengths, weaknesses) VALUES
('pillar', 'GI', 62, 'MODERATE',
 ARRAY['Compliance policies active on all critical platforms', 'RACI accountability scores above 60%', 'Governance assessments completed for Engineering and Operations'],
 ARRAY['SecurityScanner and IncidentResponder have no separation of duties', 'DataRobot deprecation overdue — governance gap', 'No documented governance for 4 AI tools (Gemini, Midjourney, Jasper, Perplexity)']),

('pillar', 'MI', 55, 'DEVELOPING',
 ARRAY['Sophia Chen designated as DataPipeline backup', 'Omar Hassan cross-trained on DeployBot', 'Sprint planning runbook is documented'],
 ARRAY['KnowledgeIndexer in FAILED state — memory collection halted', 'Two undocumented runbooks (Incident Response, Employee Offboarding)', 'Nathan Wright is single point of data knowledge']),

('pillar', 'DI', 68, 'MODERATE',
 ARRAY['Code Deployment Pipeline has documented runbook', 'Security Audit process is documented', 'Financial Reporting runbook maintained by Victoria Adams'],
 ARRAY['Documentation coverage at 48.1% — below 60% threshold', 'Customer Onboarding runbook last updated 2025-11-01', 'KnowledgeIndexer FAILED state causing indexing gaps']),

('overall', 'org_score', 57, 'DEVELOPING',
 ARRAY['Improving documentation trend (+2.6% month-over-month)', 'Product department health score at 68 (STABLE)', 'Operations department compliance coverage strong'],
 ARRAY['3 critical human SPOFs unresolved (Yuki, Sarah, Nathan)', 'KnowledgeIndexer in FAILED state', 'Documentation coverage 48.1% — 12 points below safe threshold', 'DataRobot migration delayed — $5,500/month sunk cost']);

-- ────────────────────────────────────────────────
-- 17. CONTEXT ITEMS (executive avatar feed)
-- ────────────────────────────────────────────────

INSERT INTO context_items (context_type, title, description, entity_name, responsible_person, urgency, blast_radius, source_module, status) VALUES
('spof', 'SecurityScanner — No Backup Owner',
 'Sarah Mitchell is the sole owner of SecurityScanner. This agent serves 3 critical workflows. If Sarah is unavailable, security operations halt completely.',
 'SecurityScanner', 'Sarah Mitchell', 'CRITICAL', 90, 'ownership', 'open'),

('incident', 'KnowledgeIndexer in FAILED State',
 'KnowledgeIndexer has been in FAILED state since April 2026. Data indexing is stalled. Nathan Wright is the only recovery path.',
 'KnowledgeIndexer', 'Nathan Wright', 'CRITICAL', 70, 'agents', 'open'),

('spof', 'Yuki Tanaka — DevOps SPOF',
 'Yuki owns DeployBot, IncidentResponder, and the Code Deployment Pipeline. 3 agents and workflows are single-person dependent.',
 'Yuki Tanaka', 'Robert Chen', 'CRITICAL', 85, 'ownership', 'open'),

('decision', 'Incident Response Runbook Missing',
 'The Incident Response workflow has no documented runbook. A critical escalation failure in April 2026 caused a 45-minute delay.',
 'Incident Response', 'Yuki Tanaka', 'HIGH', 80, 'continuity', 'open'),

('incident', 'Tableau AI Rate Limiting — 4th Incident',
 'Tableau AI rate limiting caused another Data Pipeline disruption in June 2026. This is the 4th occurrence. No backup tool is in place.',
 'DataPipeline', 'Nathan Wright', 'HIGH', 65, 'predictive-risk', 'open'),

('decision', 'DataRobot Migration Overdue',
 'DataRobot was flagged for deprecation in Q4-2025. Migration has not occurred. $5,500/month continues on a deprecated platform with 8% adoption.',
 'DataRobot', 'Nathan Wright', 'HIGH', 30, 'governance', 'open'),

('metric', 'Documentation Coverage Below Safe Threshold',
 'Organizational documentation coverage is at 48.1% against a 60% safe threshold. Engineering and Data departments are the weakest.',
 'Documentation', 'Robert Chen', 'HIGH', 55, 'health', 'open'),

('spof', 'Victoria Adams — CFO No Backup',
 'CFO Victoria Adams has no backup designated. Financial reporting and board preparation are single-person dependent.',
 'Victoria Adams', 'Jennifer Foster', 'HIGH', 70, 'governance', 'open'),

('decision', 'Employee Offboarding Runbook Needed',
 'The Employee Offboarding workflow has no documented runbook. Two knowledge-loss incidents in 2025 traced to this gap.',
 'Employee Offboarding', 'Thomas Garcia', 'MEDIUM', 45, 'continuity', 'open'),

('metric', 'Engineering Department Health at WARNING',
 'Engineering department health index is 45/100 — the weakest department. Critical safety score is 30/100.',
 'Engineering Department', 'Robert Chen', 'MEDIUM', 60, 'health', 'open');

-- ────────────────────────────────────────────────
-- END OF MIGRATION 04
-- ────────────────────────────────────────────────
