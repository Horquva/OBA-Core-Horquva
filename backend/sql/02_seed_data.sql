-- ============================================================
-- OBA — RICH SEED DATA — 40 employees, 12 tools, 15 agents
-- Run this AFTER 01_schema_migration.sql in Supabase SQL Editor
-- Company: Horquva Technologies
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. EMPLOYEES (40 people, 6 departments)
-- ────────────────────────────────────────────────

INSERT INTO employees (id, name, role, department, risk, tenure, skills, workload, manager, hire_date) VALUES
-- Engineering (10)
(1,  'Robert Chen',        'VP Engineering',         'Engineering',  'critical', 12.0, ARRAY['architecture','leadership','python','aws'], 92, NULL, '2014-03-15'),
(2,  'Aisha Patel',        'Senior Backend Engineer','Engineering',  'high',     7.5,  ARRAY['node.js','postgresql','docker','kubernetes'], 85, 'Robert Chen', '2018-09-01'),
(3,  'Marcus Rodriguez',   'Frontend Lead',          'Engineering',  'medium',   5.0,  ARRAY['react','typescript','css','figma'], 70, 'Robert Chen', '2021-02-20'),
(4,  'Yuki Tanaka',        'DevOps Engineer',        'Engineering',  'high',     4.0,  ARRAY['terraform','ci_cd','aws','monitoring'], 88, 'Robert Chen', '2022-03-10'),
(5,  'Elena Vasquez',      'Junior Developer',       'Engineering',  'low',      1.5,  ARRAY['python','javascript','git'], 55, 'Aisha Patel', '2024-11-01'),
(6,  'James O''Brien',     'QA Lead',                'Engineering',  'medium',   6.0,  ARRAY['selenium','jest','testing','automation'], 65, 'Robert Chen', '2020-05-15'),
(7,  'Priya Sharma',       'ML Engineer',            'Engineering',  'high',     3.5,  ARRAY['python','tensorflow','mlops','data_pipelines'], 78, 'Robert Chen', '2022-09-01'),
(8,  'David Kim',          'Backend Engineer',       'Engineering',  'low',      2.0,  ARRAY['node.js','express','mongodb'], 60, 'Aisha Patel', '2024-03-15'),
(9,  'Sarah Mitchell',     'Security Engineer',      'Engineering',  'critical', 8.0,  ARRAY['security','compliance','penetration_testing','soc2'], 90, 'Robert Chen', '2018-01-10'),
(10, 'Omar Hassan',        'Platform Engineer',      'Engineering',  'medium',   3.0,  ARRAY['kubernetes','docker','terraform','monitoring'], 72, 'Yuki Tanaka', '2023-04-01'),

-- Product (6)
(11, 'Lisa Wang',          'VP Product',             'Product',      'high',     9.0,  ARRAY['product_strategy','roadmapping','analytics','ux'], 88, NULL, '2017-01-15'),
(12, 'Carlos Mendez',      'Senior PM',              'Product',      'medium',   4.5,  ARRAY['agile','jira','user_research','metrics'], 75, 'Lisa Wang', '2021-08-01'),
(13, 'Nina Petrov',        'Product Designer',       'Product',      'low',      2.5,  ARRAY['figma','design_systems','prototyping'], 60, 'Lisa Wang', '2023-10-15'),
(14, 'Raj Gupta',          'Product Analyst',        'Product',      'low',      1.0,  ARRAY['sql','tableau','python','analytics'], 50, 'Carlos Mendez', '2025-03-01'),
(15, 'Tom Bradley',        'Junior PM',              'Product',      'low',      0.5,  ARRAY['jira','confluence','communication'], 45, 'Carlos Mendez', '2025-12-01'),
(16, 'Fatima Al-Rashid',   'UX Researcher',          'Product',      'medium',   3.0,  ARRAY['user_research','surveys','analytics','figma'], 65, 'Lisa Wang', '2023-04-01'),

-- Operations (7)
(17, 'Jennifer Foster',    'COO',                    'Operations',   'critical', 14.0, ARRAY['operations','strategy','leadership','compliance'], 95, NULL, '2012-06-01'),
(18, 'Michael Torres',     'Operations Manager',     'Operations',   'high',     6.5,  ARRAY['project_management','vendor_management','budgeting'], 82, 'Jennifer Foster', '2019-09-15'),
(19, 'Hannah Lee',         'Business Analyst',       'Operations',   'medium',   3.5,  ARRAY['sql','excel','reporting','process_mapping'], 68, 'Michael Torres', '2022-09-01'),
(20, 'Alex Novak',         'IT Support Lead',        'Operations',   'medium',   5.0,  ARRAY['helpdesk','networking','hardware','ticketing'], 70, 'Michael Torres', '2021-03-20'),
(21, 'Grace Okonkwo',      'Compliance Officer',     'Operations',   'high',     7.0,  ARRAY['compliance','soc2','gdpr','audit'], 80, 'Jennifer Foster', '2019-04-10'),
(22, 'Ryan Phillips',      'Procurement Specialist', 'Operations',   'low',      2.0,  ARRAY['vendor_management','contracts','budgeting'], 55, 'Michael Torres', '2024-04-01'),
(23, 'Diana Kowalski',     'Office Manager',         'Operations',   'low',      4.0,  ARRAY['admin','scheduling','facilities'], 50, 'Michael Torres', '2022-03-15'),

-- Data & Analytics (5)
(24, 'Nathan Wright',      'Head of Data',           'Data',         'critical', 8.5,  ARRAY['data_architecture','spark','airflow','strategy'], 90, NULL, '2017-09-01'),
(25, 'Sophia Chen',        'Data Engineer',          'Data',         'high',     4.0,  ARRAY['python','spark','airflow','dbt','sql'], 85, 'Nathan Wright', '2022-03-01'),
(26, 'Lucas Brown',        'Data Analyst',           'Data',         'medium',   2.5,  ARRAY['sql','python','tableau','looker'], 62, 'Nathan Wright', '2023-10-01'),
(27, 'Isabella Ferreira',  'ML Research Scientist',  'Data',         'medium',   3.0,  ARRAY['pytorch','python','research','nlp'], 72, 'Nathan Wright', '2023-04-15'),
(28, 'Kevin Osei',         'Data Platform Engineer', 'Data',         'low',      1.5,  ARRAY['aws','terraform','data_pipelines','monitoring'], 58, 'Sophia Chen', '2024-11-01'),

-- Sales & Marketing (7)
(29, 'Rebecca Stone',      'VP Sales',               'Sales',        'high',     10.0, ARRAY['sales_strategy','crm','leadership','enterprise'], 88, NULL, '2016-03-01'),
(30, 'Daniel Murphy',      'Marketing Director',     'Sales',        'medium',   5.5,  ARRAY['digital_marketing','seo','content','analytics'], 75, 'Rebecca Stone', '2020-09-15'),
(31, 'Amara Diallo',       'Account Executive',      'Sales',        'low',      2.0,  ARRAY['salesforce','prospecting','negotiation'], 65, 'Rebecca Stone', '2024-03-01'),
(32, 'Chris Anderson',     'Sales Engineer',         'Sales',        'medium',   3.5,  ARRAY['demos','technical_writing','api_integration'], 70, 'Rebecca Stone', '2022-09-01'),
(33, 'Mia Johnson',        'Content Strategist',     'Sales',        'low',      1.5,  ARRAY['writing','seo','social_media','analytics'], 55, 'Daniel Murphy', '2024-11-15'),
(34, 'Patrick Sullivan',   'Growth Manager',         'Sales',        'medium',   2.5,  ARRAY['analytics','a_b_testing','growth_hacking','sql'], 68, 'Daniel Murphy', '2023-10-01'),
(35, 'Zara Hussein',       'SDR Team Lead',          'Sales',        'low',      3.0,  ARRAY['outreach','crm','pipeline_management'], 60, 'Rebecca Stone', '2023-04-01'),

-- HR & Finance (5)
(36, 'Victoria Adams',     'CFO',                    'Finance',      'critical', 11.0, ARRAY['finance','budgeting','compliance','strategy'], 92, NULL, '2015-01-15'),
(37, 'Thomas Garcia',      'HR Director',            'Finance',      'high',     7.5,  ARRAY['hr_strategy','recruiting','culture','compliance'], 78, 'Victoria Adams', '2018-09-01'),
(38, 'Emily Chang',        'Financial Analyst',      'Finance',      'medium',   3.0,  ARRAY['excel','financial_modeling','reporting','sql'], 65, 'Victoria Adams', '2023-04-01'),
(39, 'Brian Nelson',       'Payroll Manager',        'Finance',      'medium',   5.0,  ARRAY['payroll','hris','compliance','benefits'], 60, 'Thomas Garcia', '2021-03-15'),
(40, 'Olivia Park',        'Talent Acquisition',     'Finance',      'low',      1.0,  ARRAY['recruiting','linkedin','screening'], 48, 'Thomas Garcia', '2025-06-01');

-- Reset sequence
SELECT setval('employees_id_seq', 40);

-- ────────────────────────────────────────────────
-- 2. AI PLATFORMS / TOOLS (12)
-- ────────────────────────────────────────────────

INSERT INTO ai_platforms (id, name, type, status, cost_monthly, usage_count, adoption_pct, last_used) VALUES
(1,  'ChatGPT Enterprise',  'llm',             'active',     4500.00, 1250, 85, '2026-06-26'),
(2,  'Claude Pro',          'llm',             'active',     2800.00, 890,  62, '2026-06-26'),
(3,  'GitHub Copilot',      'code_assistant',  'active',     1900.00, 2100, 78, '2026-06-26'),
(4,  'Gemini Advanced',     'llm',             'active',     1200.00, 450,  35, '2026-06-20'),
(5,  'Midjourney',          'design',          'active',     600.00,  180,  25, '2026-06-18'),
(6,  'Jasper AI',           'content',         'active',     850.00,  320,  40, '2026-06-25'),
(7,  'Cursor',              'code_assistant',  'active',     960.00,  680,  55, '2026-06-26'),
(8,  'Tableau AI',          'analytics',       'active',     2200.00, 410,  48, '2026-06-24'),
(9,  'Notion AI',           'productivity',    'active',     780.00,  920,  72, '2026-06-26'),
(10, 'Grammarly Business',  'content',         'active',     450.00,  1100, 80, '2026-06-26'),
(11, 'Perplexity Pro',      'research',        'inactive',   300.00,  90,   12, '2026-05-10'),
(12, 'DataRobot',           'ml_platform',     'deprecated', 5500.00, 45,   8,  '2026-03-15');

SELECT setval('ai_platforms_id_seq', 12);

-- ────────────────────────────────────────────────
-- 3. AGENTS (15)
-- ────────────────────────────────────────────────

INSERT INTO agents (id, name, type, status, risk, owner_id, usage_count, adoption_pct, last_used, cost) VALUES
(1,  'DeployBot',           'automation',  'active',     'critical', 4,  980,  90, '2026-06-26', 350.00),
(2,  'CodeReviewAgent',     'analysis',    'active',     'medium',   2,  1200, 85, '2026-06-26', 200.00),
(3,  'SecurityScanner',     'monitoring',  'active',     'critical', 9,  650,  95, '2026-06-26', 500.00),
(4,  'DataPipeline',        'automation',  'active',     'high',     25, 450,  70, '2026-06-25', 400.00),
(5,  'CustomerInsightBot',  'analysis',    'active',     'medium',   29, 320,  60, '2026-06-24', 150.00),
(6,  'IncidentResponder',   'monitoring',  'active',     'high',     4,  180,  45, '2026-06-26', 250.00),
(7,  'ContentGenerator',    'assistant',   'active',     'low',      30, 560,  55, '2026-06-25', 100.00),
(8,  'ComplianceChecker',   'monitoring',  'active',     'high',     21, 290,  65, '2026-06-23', 300.00),
(9,  'OnboardingAssistant', 'assistant',   'active',     'low',      37, 150,  40, '2026-06-20', 80.00),
(10, 'SalesForecaster',     'analysis',    'active',     'medium',   29, 210,  50, '2026-06-22', 180.00),
(11, 'LogAnalyzer',         'monitoring',  'inactive',   'medium',   10, 80,   20, '2026-05-15', 120.00),
(12, 'TestRunner',          'automation',  'active',     'medium',   6,  890,  80, '2026-06-26', 160.00),
(13, 'BudgetTracker',       'analysis',    'active',     'low',      38, 170,  35, '2026-06-21', 90.00),
(14, 'KnowledgeIndexer',    'automation',  'failed',     'critical', 24, 30,   15, '2026-04-10', 220.00),
(15, 'MeetingSummarizer',   'assistant',   'active',     'low',      12, 420,  65, '2026-06-26', 70.00);

SELECT setval('agents_id_seq', 15);

-- ────────────────────────────────────────────────
-- 4. OWNERS (backward compat)
-- ────────────────────────────────────────────────

INSERT INTO owners (id, name, role, backup_owner, risk, employee_id) VALUES
(1, 'Robert Chen',       'VP Engineering',    'Aisha Patel',     'critical', 1),
(2, 'Aisha Patel',       'Senior Backend',    'David Kim',       'high',     2),
(3, 'Yuki Tanaka',       'DevOps Engineer',   'Omar Hassan',     'high',     4),
(4, 'Sarah Mitchell',    'Security Engineer', NULL,              'critical', 9),
(5, 'Nathan Wright',     'Head of Data',      'Sophia Chen',     'critical', 24),
(6, 'Jennifer Foster',   'COO',               'Michael Torres',  'critical', 17),
(7, 'Lisa Wang',         'VP Product',        'Carlos Mendez',   'high',     11),
(8, 'Rebecca Stone',     'VP Sales',          NULL,              'high',     29),
(9, 'Victoria Adams',    'CFO',               NULL,              'critical', 36),
(10, 'Grace Okonkwo',    'Compliance Officer','Jennifer Foster', 'high',     21);

SELECT setval('owners_id_seq', 10);

-- ────────────────────────────────────────────────
-- 5. WORKFLOWS (10)
-- ────────────────────────────────────────────────

INSERT INTO workflows (id, name, status, risk, department, frequency) VALUES
(1,  'Code Deployment Pipeline',     'active',   'critical', 'Engineering',  'daily'),
(2,  'Security Audit Process',       'active',   'high',     'Engineering',  'weekly'),
(3,  'Customer Onboarding',          'active',   'medium',   'Sales',        'daily'),
(4,  'Data Ingestion Pipeline',      'active',   'high',     'Data',         'hourly'),
(5,  'Incident Response',            'active',   'critical', 'Engineering',  'on_demand'),
(6,  'Sprint Planning & Execution',  'active',   'medium',   'Product',      'weekly'),
(7,  'Financial Reporting',          'active',   'high',     'Finance',      'monthly'),
(8,  'Employee Offboarding',         'degraded', 'high',     'Finance',      'on_demand'),
(9,  'Content Publishing',           'active',   'low',      'Sales',        'daily'),
(10, 'Compliance Review',            'active',   'critical', 'Operations',   'monthly');

SELECT setval('workflows_id_seq', 10);

-- ────────────────────────────────────────────────
-- 6. EMPLOYEE ↔ AGENT MAPPING
-- ────────────────────────────────────────────────

INSERT INTO employee_agent (employee_id, agent_id, role) VALUES
-- Robert owns nothing directly but oversees
(4,  1,  'owner'),       -- Yuki → DeployBot
(2,  2,  'owner'),       -- Aisha → CodeReviewAgent
(9,  3,  'owner'),       -- Sarah → SecurityScanner
(25, 4,  'owner'),       -- Sophia → DataPipeline
(29, 5,  'owner'),       -- Rebecca → CustomerInsightBot
(4,  6,  'owner'),       -- Yuki → IncidentResponder
(30, 7,  'owner'),       -- Daniel → ContentGenerator
(21, 8,  'owner'),       -- Grace → ComplianceChecker
(37, 9,  'owner'),       -- Thomas → OnboardingAssistant
(29, 10, 'owner'),       -- Rebecca → SalesForecaster
(10, 11, 'owner'),       -- Omar → LogAnalyzer
(6,  12, 'owner'),       -- James → TestRunner
(38, 13, 'owner'),       -- Emily → BudgetTracker
(24, 14, 'owner'),       -- Nathan → KnowledgeIndexer
(12, 15, 'owner'),       -- Carlos → MeetingSummarizer
-- Backup operators
(10, 1, 'backup'),       -- Omar backup for DeployBot
(8,  2, 'backup'),       -- David backup for CodeReviewAgent
(25, 4, 'backup'),       -- Sophia backup for DataPipeline (also owner of 4, but different role)
(6,  3, 'backup');       -- James backup for SecurityScanner

-- ────────────────────────────────────────────────
-- 7. AGENT ↔ PLATFORM MAPPING
-- ────────────────────────────────────────────────

INSERT INTO agent_platform (agent_id, platform_id) VALUES
(1,  3),   -- DeployBot uses GitHub Copilot
(2,  3),   -- CodeReviewAgent uses GitHub Copilot
(2,  1),   -- CodeReviewAgent uses ChatGPT
(3,  1),   -- SecurityScanner uses ChatGPT
(4,  8),   -- DataPipeline uses Tableau AI
(5,  1),   -- CustomerInsightBot uses ChatGPT
(5,  2),   -- CustomerInsightBot uses Claude
(6,  1),   -- IncidentResponder uses ChatGPT
(7,  6),   -- ContentGenerator uses Jasper AI
(7,  10),  -- ContentGenerator uses Grammarly
(8,  2),   -- ComplianceChecker uses Claude
(9,  9),   -- OnboardingAssistant uses Notion AI
(10, 8),   -- SalesForecaster uses Tableau AI
(10, 4),   -- SalesForecaster uses Gemini
(12, 3),   -- TestRunner uses GitHub Copilot
(12, 7),   -- TestRunner uses Cursor
(14, 1),   -- KnowledgeIndexer uses ChatGPT
(15, 1),   -- MeetingSummarizer uses ChatGPT
(15, 9);   -- MeetingSummarizer uses Notion AI

-- ────────────────────────────────────────────────
-- 8. DEPENDENCIES (varied graph)
-- ────────────────────────────────────────────────

INSERT INTO dependencies (source_id, target_id, source_type, target_type, dependency_type, strength, agent_source, agent_target) VALUES
-- Agent → Agent dependencies
(1,  2,  'agent', 'agent', 'critical', 90, 1, 2),    -- DeployBot depends on CodeReviewAgent
(1,  12, 'agent', 'agent', 'critical', 85, 1, 12),   -- DeployBot depends on TestRunner
(1,  3,  'agent', 'agent', 'high',     75, 1, 3),    -- DeployBot depends on SecurityScanner
(3,  8,  'agent', 'agent', 'normal',   50, 3, 8),    -- SecurityScanner → ComplianceChecker
(4,  14, 'agent', 'agent', 'high',     70, 4, 14),   -- DataPipeline → KnowledgeIndexer
(5,  10, 'agent', 'agent', 'normal',   45, 5, 10),   -- CustomerInsightBot → SalesForecaster
(6,  3,  'agent', 'agent', 'critical', 88, 6, 3),    -- IncidentResponder → SecurityScanner
(6,  1,  'agent', 'agent', 'high',     65, 6, 1),    -- IncidentResponder → DeployBot
(6,  11, 'agent', 'agent', 'normal',   40, 6, 11),   -- IncidentResponder → LogAnalyzer
(7,  15, 'agent', 'agent', 'low',      30, 7, 15),   -- ContentGenerator → MeetingSummarizer
(8,  3,  'agent', 'agent', 'high',     72, 8, 3),    -- ComplianceChecker → SecurityScanner
(12, 2,  'agent', 'agent', 'normal',   55, 12, 2),   -- TestRunner → CodeReviewAgent
(14, 4,  'agent', 'agent', 'high',     68, 14, 4),   -- KnowledgeIndexer → DataPipeline
-- Workflow → Agent dependencies (cross-type)
(1, 1, 'workflow', 'agent', 'critical', 95, NULL, NULL),   -- Deploy Pipeline → DeployBot
(1, 2, 'workflow', 'agent', 'critical', 90, NULL, NULL),   -- Deploy Pipeline → CodeReviewAgent
(1, 3, 'workflow', 'agent', 'high',     80, NULL, NULL),   -- Deploy Pipeline → SecurityScanner
(2, 3, 'workflow', 'agent', 'critical', 95, NULL, NULL),   -- Security Audit → SecurityScanner
(2, 8, 'workflow', 'agent', 'high',     75, NULL, NULL),   -- Security Audit → ComplianceChecker
(4, 4, 'workflow', 'agent', 'critical', 92, NULL, NULL),   -- Data Pipeline → DataPipeline agent
(5, 6, 'workflow', 'agent', 'critical', 95, NULL, NULL),   -- Incident Response → IncidentResponder
(5, 3, 'workflow', 'agent', 'high',     85, NULL, NULL),   -- Incident Response → SecurityScanner
(9, 7, 'workflow', 'agent', 'normal',   60, NULL, NULL),   -- Content → ContentGenerator
(10, 8, 'workflow', 'agent', 'critical', 88, NULL, NULL);  -- Compliance Review → ComplianceChecker

-- ────────────────────────────────────────────────
-- 9. RECOMMENDATIONS
-- ────────────────────────────────────────────────

INSERT INTO recommendations (asset_name, asset_type, priority, recommendation, status) VALUES
('SecurityScanner',      'agent',    'critical', 'Assign backup owner — Sarah Mitchell is the sole owner with no backup',            'open'),
('KnowledgeIndexer',     'agent',    'critical', 'Agent is in FAILED state — investigate root cause and restore',                    'open'),
('Employee Offboarding', 'workflow', 'high',     'Workflow is degraded — update runbook and assign proper ownership',                 'open'),
('DataRobot',            'platform', 'high',     'Deprecated tool still incurring $5500/mo — migrate remaining users and shut down', 'in_progress'),
('DeployBot',            'agent',    'high',     'Single DevOps owner (Yuki) is a SPOF — cross-train Omar Hassan',                  'open'),
('Perplexity Pro',       'platform', 'medium',   'Inactive with only 12% adoption — evaluate ROI or cancel subscription',            'open'),
('Incident Response',    'workflow', 'critical', 'No documented runbook — create and validate with engineering team',                'open'),
('Rebecca Stone',        'employee', 'high',     'Owns 2 critical agents with no backup owner — assign backup for Sales agents',     'open'),
('Data Ingestion',       'workflow', 'high',     'Single tool dependency on Tableau AI — add backup data pipeline tool',             'open'),
('Victoria Adams',       'employee', 'critical', 'CFO has no backup owner designated — critical governance gap',                      'open');

-- ────────────────────────────────────────────────
-- 10. TOOL OWNERSHIP
-- ────────────────────────────────────────────────

INSERT INTO tool_ownership (platform_id, employee_id) VALUES
(1,  1),    -- ChatGPT → Robert
(2,  2),    -- Claude → Aisha
(3,  4),    -- Copilot → Yuki
(4,  7),    -- Gemini → Priya
(5,  13),   -- Midjourney → Nina
(6,  30),   -- Jasper → Daniel
(7,  2),    -- Cursor → Aisha
(8,  24),   -- Tableau → Nathan
(9,  12),   -- Notion → Carlos
(10, 30),   -- Grammarly → Daniel
(11, 7),    -- Perplexity → Priya
(12, 24);   -- DataRobot → Nathan

-- ────────────────────────────────────────────────
-- 11. TOOL USERS (varied usage levels)
-- ────────────────────────────────────────────────

INSERT INTO tool_users (platform_id, employee_id, usage_level) VALUES
-- ChatGPT users (widespread)
(1, 1, 'power'), (1, 2, 'power'), (1, 3, 'regular'), (1, 4, 'regular'),
(1, 7, 'power'), (1, 9, 'regular'), (1, 11, 'regular'), (1, 12, 'regular'),
(1, 17, 'occasional'), (1, 24, 'power'), (1, 25, 'regular'), (1, 29, 'occasional'),
(1, 30, 'regular'), (1, 36, 'occasional'), (1, 37, 'occasional'),
-- Claude users
(2, 2, 'power'), (2, 7, 'regular'), (2, 9, 'power'), (2, 21, 'regular'),
(2, 24, 'regular'), (2, 27, 'power'),
-- Copilot users
(3, 1, 'power'), (3, 2, 'power'), (3, 3, 'regular'), (3, 4, 'power'),
(3, 5, 'regular'), (3, 7, 'regular'), (3, 8, 'regular'), (3, 10, 'regular'),
-- Gemini users
(4, 7, 'power'), (4, 11, 'regular'), (4, 27, 'regular'),
-- Midjourney users
(5, 3, 'regular'), (5, 13, 'power'), (5, 33, 'occasional'),
-- Jasper users
(6, 30, 'power'), (6, 33, 'regular'), (6, 34, 'occasional'), (6, 29, 'occasional'),
-- Cursor users
(7, 2, 'power'), (7, 5, 'regular'), (7, 7, 'regular'), (7, 8, 'power'),
-- Tableau users
(8, 24, 'power'), (8, 25, 'power'), (8, 26, 'regular'), (8, 19, 'regular'),
(8, 38, 'regular'),
-- Notion users (widespread)
(9, 11, 'power'), (9, 12, 'power'), (9, 3, 'regular'), (9, 17, 'regular'),
(9, 18, 'regular'), (9, 29, 'occasional'), (9, 37, 'regular'), (9, 30, 'regular'),
-- Grammarly users
(10, 30, 'power'), (10, 33, 'power'), (10, 12, 'regular'), (10, 11, 'regular'),
(10, 29, 'occasional'), (10, 37, 'regular'), (10, 17, 'occasional'),
-- Perplexity users (few)
(11, 7, 'regular'), (11, 27, 'occasional'),
-- DataRobot users (few, deprecated)
(12, 24, 'rare'), (12, 25, 'rare');

-- ────────────────────────────────────────────────
-- 12. TOOL BACKUPS
-- ────────────────────────────────────────────────

INSERT INTO tool_backups (primary_platform, backup_platform) VALUES
(1, 2),    -- ChatGPT backed by Claude
(3, 7),    -- Copilot backed by Cursor
(6, 10);   -- Jasper backed by Grammarly
-- Note: Midjourney, Tableau, DataRobot, Perplexity, Notion have NO backup

-- ────────────────────────────────────────────────
-- 13. TOOL POLICIES
-- ────────────────────────────────────────────────

INSERT INTO tool_policies (platform_id, policy_name, status) VALUES
(1,  'Data Retention Policy',    'active'),
(1,  'Usage Guidelines',         'active'),
(2,  'Data Retention Policy',    'active'),
(3,  'Code Ownership Policy',    'active'),
(3,  'Security Review Policy',   'active'),
(7,  'Code Ownership Policy',    'active'),
(8,  'Data Access Policy',       'active'),
(9,  'Content Governance',       'active'),
(10, 'Communication Standards',  'active');
-- Note: Gemini, Midjourney, Jasper, Perplexity, DataRobot have NO policies

-- ────────────────────────────────────────────────
-- 14. TOOL SPEND (6 months)
-- ────────────────────────────────────────────────

INSERT INTO tool_spend (platform_id, amount_usd, month) VALUES
-- ChatGPT
(1, 4200.00, '2026-01'), (1, 4350.00, '2026-02'), (1, 4400.00, '2026-03'),
(1, 4450.00, '2026-04'), (1, 4500.00, '2026-05'), (1, 4500.00, '2026-06'),
-- Claude
(2, 2200.00, '2026-01'), (2, 2400.00, '2026-02'), (2, 2500.00, '2026-03'),
(2, 2600.00, '2026-04'), (2, 2700.00, '2026-05'), (2, 2800.00, '2026-06'),
-- Copilot
(3, 1600.00, '2026-01'), (3, 1700.00, '2026-02'), (3, 1750.00, '2026-03'),
(3, 1800.00, '2026-04'), (3, 1850.00, '2026-05'), (3, 1900.00, '2026-06'),
-- Gemini
(4, 800.00, '2026-01'), (4, 900.00, '2026-02'), (4, 1000.00, '2026-03'),
(4, 1100.00, '2026-04'), (4, 1150.00, '2026-05'), (4, 1200.00, '2026-06'),
-- Midjourney
(5, 600.00, '2026-01'), (5, 600.00, '2026-02'), (5, 600.00, '2026-03'),
(5, 600.00, '2026-04'), (5, 600.00, '2026-05'), (5, 600.00, '2026-06'),
-- Jasper
(6, 850.00, '2026-01'), (6, 850.00, '2026-02'), (6, 850.00, '2026-03'),
(6, 850.00, '2026-04'), (6, 850.00, '2026-05'), (6, 850.00, '2026-06'),
-- Cursor
(7, 640.00, '2026-01'), (7, 720.00, '2026-02'), (7, 800.00, '2026-03'),
(7, 880.00, '2026-04'), (7, 920.00, '2026-05'), (7, 960.00, '2026-06'),
-- Tableau AI
(8, 2200.00, '2026-01'), (8, 2200.00, '2026-02'), (8, 2200.00, '2026-03'),
(8, 2200.00, '2026-04'), (8, 2200.00, '2026-05'), (8, 2200.00, '2026-06'),
-- Notion AI
(9, 650.00, '2026-01'), (9, 700.00, '2026-02'), (9, 720.00, '2026-03'),
(9, 750.00, '2026-04'), (9, 770.00, '2026-05'), (9, 780.00, '2026-06'),
-- Grammarly
(10, 400.00, '2026-01'), (10, 420.00, '2026-02'), (10, 430.00, '2026-03'),
(10, 440.00, '2026-04'), (10, 445.00, '2026-05'), (10, 450.00, '2026-06'),
-- Perplexity
(11, 300.00, '2026-01'), (11, 300.00, '2026-02'), (11, 300.00, '2026-03'),
(11, 300.00, '2026-04'), (11, 0.00, '2026-05'), (11, 0.00, '2026-06'),
-- DataRobot
(12, 5500.00, '2026-01'), (12, 5500.00, '2026-02'), (12, 5500.00, '2026-03'),
(12, 5500.00, '2026-04'), (12, 5500.00, '2026-05'), (12, 5500.00, '2026-06');

-- ────────────────────────────────────────────────
-- 15. WORKFLOW DEPENDENCIES (agent + tool)
-- ────────────────────────────────────────────────

INSERT INTO workflow_dependencies (workflow_id, agent_id, is_critical) VALUES
(1,  1,  true),    -- Deploy Pipeline → DeployBot
(1,  2,  true),    -- Deploy Pipeline → CodeReviewAgent
(1,  12, true),    -- Deploy Pipeline → TestRunner
(1,  3,  false),   -- Deploy Pipeline → SecurityScanner
(2,  3,  true),    -- Security Audit → SecurityScanner
(2,  8,  true),    -- Security Audit → ComplianceChecker
(3,  5,  false),   -- Customer Onboarding → CustomerInsightBot
(3,  9,  false),   -- Customer Onboarding → OnboardingAssistant
(4,  4,  true),    -- Data Ingestion → DataPipeline
(4,  14, false),   -- Data Ingestion → KnowledgeIndexer
(5,  6,  true),    -- Incident Response → IncidentResponder
(5,  3,  true),    -- Incident Response → SecurityScanner
(5,  11, false),   -- Incident Response → LogAnalyzer
(6,  15, false),   -- Sprint Planning → MeetingSummarizer
(7,  13, false),   -- Financial Reporting → BudgetTracker
(8,  9,  false),   -- Employee Offboarding → OnboardingAssistant
(9,  7,  true),    -- Content Publishing → ContentGenerator
(10, 8,  true);    -- Compliance Review → ComplianceChecker

INSERT INTO workflow_tool_dependencies (workflow_id, platform_id, is_critical) VALUES
(1,  3,  true),    -- Deploy Pipeline → Copilot
(1,  7,  false),   -- Deploy Pipeline → Cursor
(2,  1,  false),   -- Security Audit → ChatGPT
(3,  9,  false),   -- Customer Onboarding → Notion
(4,  8,  true),    -- Data Ingestion → Tableau AI
(5,  1,  true),    -- Incident Response → ChatGPT
(6,  9,  true),    -- Sprint Planning → Notion
(6,  1,  false),   -- Sprint Planning → ChatGPT
(7,  8,  true),    -- Financial Reporting → Tableau AI
(9,  6,  true),    -- Content Publishing → Jasper
(9,  10, false),   -- Content Publishing → Grammarly
(10, 2,  true);    -- Compliance Review → Claude

-- ────────────────────────────────────────────────
-- 16. WORKFLOW RUNBOOKS
-- ────────────────────────────────────────────────

INSERT INTO workflow_runbooks (workflow_id, owner_id, is_documented, last_updated) VALUES
(1,  4,  true,  '2026-05-15'),    -- Deploy Pipeline — Yuki, documented
(2,  9,  true,  '2026-04-20'),    -- Security Audit — Sarah, documented
(3,  29, false, '2025-11-01'),    -- Customer Onboarding — Rebecca, NOT documented
(4,  25, true,  '2026-06-01'),    -- Data Ingestion — Sophia, documented
(5,  4,  false, '2025-08-15'),    -- Incident Response — Yuki, NOT documented (RISK!)
(6,  12, true,  '2026-06-10'),    -- Sprint Planning — Carlos, documented
(7,  36, true,  '2026-05-01'),    -- Financial Reporting — Victoria, documented
(8,  37, false, '2025-06-01'),    -- Employee Offboarding — Thomas, NOT documented
(9,  30, true,  '2026-06-20'),    -- Content Publishing — Daniel, documented
(10, 21, true,  '2026-06-15');    -- Compliance Review — Grace, documented

-- ────────────────────────────────────────────────
-- 17. WORKFLOW FAILURES
-- ────────────────────────────────────────────────

INSERT INTO workflow_failures (workflow_id, failure_type, severity, description) VALUES
(1,  'human_spof',       'critical', 'Only Yuki Tanaka can manage deployment pipeline — no backup trained'),
(1,  'tool_failure',     'medium',   'Copilot outage on 2026-04-12 delayed 3 deployments'),
(2,  'process_gap',      'high',     'Security scanning does not cover third-party dependencies'),
(4,  'tool_failure',     'high',     'Tableau AI rate limiting causing data pipeline delays'),
(4,  'human_spof',       'critical', 'Sophia Chen is sole operator — no backup for data pipeline'),
(5,  'escalation_failure','critical','Incident escalation path not documented — 45 min delay in critical outage'),
(5,  'human_spof',       'high',     'Yuki Tanaka is sole incident responder during off-hours'),
(7,  'process_gap',      'medium',   'Monthly close process requires manual data entry from 3 systems'),
(8,  'process_gap',      'high',     'Offboarding workflow misses knowledge transfer step'),
(8,  'human_spof',       'medium',   'Thomas Garcia is sole owner of offboarding with no backup'),
(10, 'process_gap',      'medium',   'Compliance review relies on manual checklist — no automation');

-- ────────────────────────────────────────────────
-- 18. WORKFLOW STEPS
-- ────────────────────────────────────────────────

INSERT INTO workflow_steps (workflow_id, step_number, step_name, actor_type, actor_name, is_required, duration_minutes) VALUES
-- Deploy Pipeline (5 steps)
(1, 1, 'Code Review',         'agent',  'CodeReviewAgent',  true,  15),
(1, 2, 'Run Tests',           'agent',  'TestRunner',       true,  10),
(1, 3, 'Security Scan',       'agent',  'SecurityScanner',  true,  8),
(1, 4, 'Deploy to Staging',   'agent',  'DeployBot',        true,  5),
(1, 5, 'Manual QA Sign-off',  'human',  'James O''Brien',   true,  30),
-- Security Audit (4 steps)
(2, 1, 'Automated Scan',      'agent',  'SecurityScanner',  true,  60),
(2, 2, 'Compliance Check',    'agent',  'ComplianceChecker', true, 30),
(2, 3, 'Review Findings',     'human',  'Sarah Mitchell',   true,  120),
(2, 4, 'Publish Report',      'human',  'Sarah Mitchell',   true,  60),
-- Customer Onboarding (4 steps)
(3, 1, 'Account Setup',       'human',  'Amara Diallo',     true,  45),
(3, 2, 'Product Demo',        'human',  'Chris Anderson',   true,  60),
(3, 3, 'CRM Data Entry',      'agent',  'CustomerInsightBot', true, 10),
(3, 4, 'Welcome Sequence',    'agent',  'OnboardingAssistant', true, 5),
-- Data Ingestion (3 steps)
(4, 1, 'Extract Sources',     'agent',  'DataPipeline',     true,  20),
(4, 2, 'Transform & Load',    'agent',  'DataPipeline',     true,  30),
(4, 3, 'Quality Validation',  'human',  'Sophia Chen',      true,  15),
-- Incident Response (5 steps)
(5, 1, 'Detect & Alert',      'agent',  'IncidentResponder', true, 2),
(5, 2, 'Triage & Classify',   'human',  'Yuki Tanaka',      true,  10),
(5, 3, 'Investigate',         'human',  'Yuki Tanaka',      true,  60),
(5, 4, 'Resolve',             'agent',  'DeployBot',        false, 15),
(5, 5, 'Post-mortem',         'human',  'Robert Chen',      true,  120),
-- Sprint Planning (3 steps)
(6, 1, 'Backlog Grooming',    'human',  'Carlos Mendez',    true,  60),
(6, 2, 'Capacity Planning',   'human',  'Lisa Wang',        true,  30),
(6, 3, 'Summarize Action Items','agent','MeetingSummarizer', false, 5),
-- Financial Reporting (4 steps)
(7, 1, 'Data Collection',     'agent',  'BudgetTracker',    true,  30),
(7, 2, 'Consolidation',       'human',  'Emily Chang',      true,  120),
(7, 3, 'CFO Review',          'human',  'Victoria Adams',   true,  60),
(7, 4, 'Board Prep',          'human',  'Victoria Adams',   true,  90),
-- Employee Offboarding (3 steps)
(8, 1, 'Knowledge Transfer',  'human',  'Thomas Garcia',    true,  240),
(8, 2, 'Access Revocation',   'human',  'Alex Novak',       true,  30),
(8, 3, 'Exit Interview',      'human',  'Thomas Garcia',    true,  60),
-- Content Publishing (4 steps)
(9, 1, 'Draft Content',       'agent',  'ContentGenerator', true,  20),
(9, 2, 'Edit & Review',       'human',  'Mia Johnson',      true,  45),
(9, 3, 'SEO Optimization',    'human',  'Daniel Murphy',    true,  30),
(9, 4, 'Publish',             'human',  'Daniel Murphy',    true,  10),
-- Compliance Review (4 steps)
(10, 1, 'Policy Scan',        'agent',  'ComplianceChecker', true, 45),
(10, 2, 'Gap Analysis',       'human',  'Grace Okonkwo',    true,  120),
(10, 3, 'Risk Assessment',    'human',  'Jennifer Foster',  true,  60),
(10, 4, 'Report & Remediate', 'human',  'Grace Okonkwo',    true,  90);

-- ────────────────────────────────────────────────
-- 19. KNOWLEDGE ASSETS (30+)
-- ────────────────────────────────────────────────

INSERT INTO knowledge_assets (asset_type, asset_id, topic, is_documented, criticality, owner_id) VALUES
-- Agent knowledge
('agent', 1,  'Deployment automation configuration',     true,  'critical', 4),
('agent', 2,  'Code review rules and patterns',          true,  'medium',   2),
('agent', 3,  'Security scanning configuration',         false, 'critical', 9),   -- UNDOCUMENTED CRITICAL
('agent', 4,  'Data pipeline ETL logic',                 true,  'high',     25),
('agent', 5,  'Customer insight algorithms',             false, 'medium',   29),
('agent', 6,  'Incident detection rules',                false, 'critical', 4),   -- UNDOCUMENTED CRITICAL
('agent', 8,  'Compliance rule engine',                  true,  'high',     21),
('agent', 14, 'Knowledge indexing algorithms',           false, 'high',     24),  -- UNDOCUMENTED HIGH
-- Workflow knowledge
('workflow', 1,  'Deployment pipeline procedures',       true,  'critical', 4),
('workflow', 2,  'Security audit methodology',           true,  'high',     9),
('workflow', 4,  'Data ingestion SLA requirements',      true,  'high',     25),
('workflow', 5,  'Incident response playbook',           false, 'critical', 4),   -- UNDOCUMENTED CRITICAL
('workflow', 7,  'Financial reporting procedures',       true,  'high',     36),
('workflow', 8,  'Offboarding checklist',                false, 'high',     37),  -- UNDOCUMENTED HIGH
('workflow', 10, 'Compliance framework',                 true,  'critical', 21),
-- Platform knowledge
('platform', 1,  'ChatGPT enterprise configuration',    true,  'medium',   1),
('platform', 3,  'Copilot workspace settings',          true,  'medium',   4),
('platform', 8,  'Tableau data connections',             false, 'high',     24),  -- UNDOCUMENTED
('platform', 12, 'DataRobot model configs',             false, 'medium',   24),
-- Process/system knowledge
('process', NULL, 'AWS infrastructure architecture',    true,  'critical', 1),
('process', NULL, 'Database schema documentation',      true,  'high',     2),
('process', NULL, 'API design standards',               true,  'medium',   2),
('process', NULL, 'SOC2 compliance procedures',         true,  'critical', 21),
('process', NULL, 'Vendor evaluation criteria',         false, 'medium',   18),
('process', NULL, 'Customer data handling policy',      true,  'critical', 9),
('process', NULL, 'Budget allocation framework',        false, 'high',     36),  -- UNDOCUMENTED
('process', NULL, 'Sales territory assignments',        true,  'medium',   29),
('process', NULL, 'Hiring pipeline process',            true,  'medium',   37),
('process', NULL, 'Disaster recovery plan',             false, 'critical', 17),  -- UNDOCUMENTED CRITICAL
('process', NULL, 'ML model versioning standards',      false, 'high',     24),  -- UNDOCUMENTED
('process', NULL, 'Marketing campaign playbook',        true,  'low',      30),
('process', NULL, 'Product roadmap methodology',        true,  'medium',   11);

-- ────────────────────────────────────────────────
-- 20. SNAPSHOTS (6 months of time-series)
-- ────────────────────────────────────────────────

INSERT INTO snapshots (snapshot_date, headcount, avg_workload, total_tool_cost, risk_index, memory_health, continuity_score, governance_score) VALUES
('2026-01-01', 35, 62, 17440.00, 38.5, 58, 52, 55),
('2026-02-01', 36, 65, 18190.00, 41.2, 55, 50, 54),
('2026-03-01', 37, 68, 18830.00, 44.8, 52, 48, 52),
('2026-04-01', 38, 71, 19530.00, 47.3, 50, 47, 51),
('2026-05-01', 39, 69, 19685.00, 45.6, 53, 49, 53),
('2026-06-01', 40, 68, 19940.00, 43.2, 55, 51, 55);

-- ────────────────────────────────────────────────
-- 21. PREDICTIVE RISK SCORES
-- ────────────────────────────────────────────────

INSERT INTO predictive_risk_scores (agent_id, predicted_score, threat_level, is_emerging_threat, contributing_factors, reasons) VALUES
(1,  82, 'CRITICAL', true,  '{"single_owner": 30, "high_dependency_count": 25, "critical_workflow": 27}',
     ARRAY['Only one DevOps owner','Hub for 3 critical workflows','No cross-trained backup']),
(3,  78, 'CRITICAL', true,  '{"no_backup_owner": 35, "critical_workflows": 25, "undocumented": 18}',
     ARRAY['No backup owner assigned','Critical for security and compliance','Configuration undocumented']),
(4,  70, 'HIGH',     true,  '{"single_operator": 28, "tool_dependency": 22, "failed_indexer": 20}',
     ARRAY['Sophia Chen sole operator','Depends on Tableau AI with no backup','Connected to failed KnowledgeIndexer']),
(6,  65, 'HIGH',     false, '{"single_responder": 30, "undocumented_runbook": 20, "off_hours_gap": 15}',
     ARRAY['Only Yuki can respond off-hours','Incident playbook not documented']),
(14, 90, 'CRITICAL', true,  '{"failed_status": 40, "undocumented": 25, "data_dependency": 25}',
     ARRAY['Agent is in FAILED state since April','No documentation exists','Data pipeline depends on it']),
(8,  55, 'MEDIUM',   false, '{"single_owner": 20, "policy_dependency": 20, "moderate_usage": 15}',
     ARRAY['Grace Okonkwo sole owner','Critical for compliance workflow']),
(2,  35, 'LOW',      false, '{"backup_exists": -10, "documented": -5, "stable": -5}',
     ARRAY['Has backup operator','Well documented','Stable performance']),
(5,  40, 'MEDIUM',   false, '{"no_backup": 20, "moderate_usage": 10, "non_critical": 10}',
     ARRAY['Rebecca owns with no backup for sales agents']),
(10, 42, 'MEDIUM',   false, '{"no_backup": 20, "tool_dependency": 12, "moderate_risk": 10}',
     ARRAY['Depends on Tableau AI','Rebecca owns with no backup']),
(12, 30, 'LOW',      false, '{"backup_exists": -10, "stable": -10, "documented": -5}',
     ARRAY['Has backup','Stable test coverage']),
(7,  25, 'LOW',      false, '{"low_criticality": -15, "documented": -5, "stable": -5}',
     ARRAY['Non-critical content generation agent']),
(9,  20, 'LOW',      false, '{"low_criticality": -20, "stable": -5}',
     ARRAY['Low-risk onboarding assistant']),
(11, 48, 'MEDIUM',   true,  '{"inactive_status": 25, "no_monitoring": 15, "orphan_risk": 8}',
     ARRAY['Agent is inactive','Not being monitored','May become orphaned']),
(13, 22, 'LOW',      false, '{"low_criticality": -15, "stable": -10}',
     ARRAY['Low-risk budget tracking']),
(15, 18, 'LOW',      false, '{"low_criticality": -20, "backup_channel": -5}',
     ARRAY['Non-critical meeting tool','Has human fallback']);

-- ────────────────────────────────────────────────
-- 22. ORGANIZATIONAL FORECASTS
-- ────────────────────────────────────────────────

INSERT INTO organizational_forecasts (id, horizon_days, health_score, health_trend, memory_score, knowledge_loss_risk, continuity_score, resilience_forecast, outlook_score, outlook_status) VALUES
(1, 30, 62, 'stable',    55, 'high',     51, 'at_risk',    56, 'WEAK'),
(2, 60, 58, 'declining', 50, 'high',     47, 'at_risk',    52, 'WEAK'),
(3, 90, 54, 'declining', 45, 'critical', 43, 'vulnerable', 47, 'CRITICAL');

SELECT setval('organizational_forecasts_id_seq', 3);

INSERT INTO forecast_findings (forecast_id, finding_type, reference_name, detail) VALUES
-- 90-day forecast findings
(3, 'critical_memory_carrier', 'Robert Chen',       'Owns AWS architecture knowledge, sole authority on 4 critical systems'),
(3, 'critical_memory_carrier', 'Yuki Tanaka',       'Sole DevOps + incident responder — single point of failure for infrastructure'),
(3, 'critical_memory_carrier', 'Sarah Mitchell',    'Only security engineer — no backup, undocumented scanner config'),
(3, 'critical_memory_carrier', 'Nathan Wright',     'Head of Data owns DataRobot migration + 3 undocumented systems'),
(3, 'fragile_workflow',        'Incident Response',  'No documented playbook, single responder, critical dependency chain'),
(3, 'fragile_workflow',        'Data Ingestion',     'Single tool dependency (Tableau), single operator (Sophia)'),
(3, 'fragile_workflow',        'Employee Offboarding','Degraded status, undocumented, no knowledge transfer step automation'),
(3, 'no_backup',              'SecurityScanner',     'Critical agent with no backup owner — 3 workflows depend on it'),
(3, 'no_backup',              'KnowledgeIndexer',    'Failed agent with no recovery plan'),
(3, 'undocumented',           'Disaster Recovery Plan','Critical process with no documentation'),
(3, 'undocumented',           'Incident Response Playbook','Critical workflow without runbook'),
(3, 'undocumented',           'Security Scanner Config','Critical agent configuration not documented'),
-- 30-day findings (subset)
(1, 'critical_memory_carrier', 'Yuki Tanaka',       'DevOps bottleneck — overloaded at 88% workload'),
(1, 'fragile_workflow',        'Incident Response',  'Off-hours coverage gap'),
(1, 'no_backup',              'KnowledgeIndexer',    'Still in failed state');

-- ────────────────────────────────────────────────
-- 23. COLLABORATION SCORES
-- ────────────────────────────────────────────────

INSERT INTO collaboration_scores (employee_id, adoption_score, dependency_score, collaboration_score, ai_tools_used, ai_agents_used, critical_agents_owned, has_backup) VALUES
(1,  85, 75, 70, 3, 0, 0, true),
(2,  92, 60, 78, 4, 1, 0, true),
(3,  70, 30, 72, 3, 0, 0, false),
(4,  75, 90, 55, 2, 2, 2, true),
(5,  60, 15, 65, 2, 0, 0, false),
(6,  50, 35, 58, 1, 1, 0, true),
(7,  88, 45, 75, 4, 0, 0, false),
(8,  65, 20, 68, 2, 0, 0, false),
(9,  72, 85, 50, 2, 1, 1, false),    -- Sarah: high dependency, no backup
(10, 55, 40, 60, 2, 1, 0, true),
(11, 68, 55, 65, 3, 0, 0, true),
(12, 75, 40, 72, 3, 1, 0, true),
(13, 45, 15, 55, 2, 0, 0, false),
(17, 40, 70, 45, 2, 0, 0, true),
(18, 50, 45, 55, 1, 0, 0, true),
(19, 55, 25, 60, 2, 0, 0, false),
(21, 60, 65, 52, 1, 1, 1, true),
(24, 90, 88, 48, 4, 1, 1, true),     -- Nathan: high adoption but high dependency
(25, 82, 72, 58, 3, 1, 1, true),
(26, 65, 20, 68, 2, 0, 0, false),
(27, 78, 30, 72, 2, 0, 0, false),
(29, 45, 60, 42, 2, 2, 2, false),    -- Rebecca: owns 2 critical agents, no backup
(30, 70, 35, 70, 4, 1, 0, true),
(33, 55, 10, 62, 3, 0, 0, false),
(34, 45, 20, 55, 1, 0, 0, false),
(36, 35, 80, 35, 1, 0, 0, false),    -- Victoria: low adoption, high dependency
(37, 50, 55, 48, 2, 1, 0, false),
(38, 55, 30, 60, 2, 1, 0, false);

INSERT INTO collaboration_summary (ai_adoption_score, adoption_level, human_dependency_score, highest_dependency_employee, collaboration_score, collaboration_level) VALUES
(64, 'MODERATE', 62, 'Yuki Tanaka', 58, 'FAIR');

-- ────────────────────────────────────────────────
-- 24. ORGANIZATIONAL DECISIONS
-- ────────────────────────────────────────────────

INSERT INTO organizational_decisions (id, decision_type, asset_name, asset_type, owner_name, decision_score, quality_tier, recommended_fix) VALUES
(1,  'ownership',       'DeployBot',             'agent',    'Yuki Tanaka',      35, 'POOR',     'Assign backup owner and cross-train Omar Hassan'),
(2,  'backup',          'SecurityScanner',       'agent',    'Sarah Mitchell',   20, 'HARMFUL',  'Critical agent with no backup — immediate action required'),
(3,  'documentation',   'Incident Response',     'workflow', 'Yuki Tanaka',      25, 'HARMFUL',  'Create documented runbook with escalation paths'),
(4,  'tool_selection',  'DataRobot',             'platform', 'Nathan Wright',    30, 'POOR',     'Deprecated tool at $5500/mo — migrate to alternative'),
(5,  'risk_mitigation', 'KnowledgeIndexer',      'agent',    'Nathan Wright',    15, 'HARMFUL',  'Failed agent since April — restore or replace immediately'),
(6,  'ownership',       'Customer Onboarding',   'workflow', 'Rebecca Stone',    55, 'ACCEPTABLE','Consider documenting the workflow runbook'),
(7,  'backup',          'ChatGPT Enterprise',    'platform', 'Robert Chen',      85, 'GOOD',     'Claude Pro backup properly configured'),
(8,  'documentation',   'Deployment Pipeline',   'workflow', 'Yuki Tanaka',      80, 'GOOD',     'Well documented with recent updates'),
(9,  'risk_mitigation', 'Disaster Recovery Plan', 'process',  'Jennifer Foster',  20, 'HARMFUL',  'Critical process completely undocumented'),
(10, 'ownership',       'Employee Offboarding',  'workflow', 'Thomas Garcia',    40, 'POOR',     'Degraded workflow with no backup owner'),
(11, 'tool_selection',  'GitHub Copilot',        'platform', 'Yuki Tanaka',      82, 'GOOD',     'Well adopted with Cursor as backup'),
(12, 'backup',          'Tableau AI',            'platform', 'Nathan Wright',    38, 'POOR',     'No backup tool — Data workflows at risk'),
(13, 'documentation',   'Security Scanner Config','agent',   'Sarah Mitchell',   25, 'HARMFUL',  'Critical configuration completely undocumented'),
(14, 'risk_mitigation', 'LogAnalyzer',           'agent',    'Omar Hassan',      50, 'ACCEPTABLE','Inactive agent — evaluate if still needed'),
(15, 'ownership',       'Content Publishing',    'workflow', 'Daniel Murphy',    75, 'GOOD',     'Well managed with documented runbook');

SELECT setval('organizational_decisions_id_seq', 15);

INSERT INTO decision_factors (decision_id, factor_name, factor_status, score_impact) VALUES
-- DeployBot ownership decision
(1, 'Has Primary Owner',        'met',     10),
(1, 'Has Backup Owner',         'not_met', -25),
(1, 'Cross-Training Completed', 'not_met', -20),
(1, 'Workload Balanced',        'not_met', -10),
-- SecurityScanner backup decision
(2, 'Backup Owner Assigned',    'not_met', -35),
(2, 'Documentation Exists',     'not_met', -20),
(2, 'Recovery Plan Exists',     'not_met', -25),
-- Incident Response documentation
(3, 'Runbook Exists',           'not_met', -30),
(3, 'Escalation Path Defined',  'not_met', -25),
(3, 'Last Updated < 6 months',  'not_met', -20),
-- DataRobot tool selection
(4, 'ROI Positive',             'not_met', -30),
(4, 'Active Users > 5',         'not_met', -20),
(4, 'Migration Plan Exists',    'partial', -10),
-- ChatGPT backup
(7, 'Backup Tool Assigned',     'met',     20),
(7, 'Backup Tested',            'met',     15),
(7, 'Policy Documented',        'met',     10),
-- Disaster Recovery
(9, 'Documentation Exists',     'not_met', -35),
(9, 'Last Test Date',           'not_met', -25),
(9, 'Recovery Time Objective',  'not_met', -20);

-- ────────────────────────────────────────────────
-- 25. VERIFICATION ACTIONS
-- ────────────────────────────────────────────────

INSERT INTO verification_actions (id, workflow_id, actor_type, actor_name, action_name, outcome, verification_status, policy_compliant, created_at) VALUES
(1,  1,  'agent', 'DeployBot',          'Production Deployment',         'success', 'COMPLETED', true,  '2026-06-25 14:30:00'),
(2,  1,  'agent', 'CodeReviewAgent',    'Automated Code Review',         'success', 'COMPLETED', true,  '2026-06-25 14:15:00'),
(3,  1,  'agent', 'SecurityScanner',    'Pre-deploy Security Scan',      'success', 'COMPLETED', true,  '2026-06-25 14:20:00'),
(4,  2,  'agent', 'SecurityScanner',    'Weekly Security Audit',         'partial', 'FLAGGED',   false, '2026-06-22 09:00:00'),
(5,  2,  'agent', 'ComplianceChecker',  'SOC2 Compliance Verification',  'success', 'COMPLETED', true,  '2026-06-22 10:30:00'),
(6,  4,  'agent', 'DataPipeline',       'Hourly Data Sync',              'failure', 'FAILED',    true,  '2026-06-24 03:00:00'),
(7,  5,  'human', 'Yuki Tanaka',        'Incident Triage P1',            'success', 'COMPLETED', true,  '2026-06-23 02:15:00'),
(8,  5,  'human', 'Yuki Tanaka',        'Emergency Rollback',            'success', 'COMPLETED', false, '2026-06-23 02:45:00'),
(9,  1,  'agent', 'TestRunner',         'Integration Test Suite',        'success', 'COMPLETED', true,  '2026-06-25 14:10:00'),
(10, 7,  'human', 'Emily Chang',        'Monthly Financial Close',       'success', 'COMPLETED', true,  '2026-06-01 17:00:00'),
(11, 7,  'human', 'Victoria Adams',     'CFO Report Approval',           'success', 'COMPLETED', true,  '2026-06-02 10:00:00'),
(12, 9,  'agent', 'ContentGenerator',   'Blog Post Generation',          'success', 'COMPLETED', true,  '2026-06-24 11:00:00'),
(13, 10, 'agent', 'ComplianceChecker',  'Monthly Compliance Scan',       'partial', 'FLAGGED',   false, '2026-06-15 09:00:00'),
(14, 10, 'human', 'Grace Okonkwo',      'Compliance Gap Analysis',       'success', 'COMPLETED', true,  '2026-06-15 14:00:00'),
(15, 3,  'human', 'Amara Diallo',       'New Client Onboarding',         'success', 'COMPLETED', true,  '2026-06-20 10:00:00'),
(16, 8,  'human', 'Thomas Garcia',      'Employee Exit Processing',      'partial', 'FLAGGED',   false, '2026-06-18 11:00:00'),
(17, 1,  'human', 'Yuki Tanaka',        'Infrastructure Change',         'success', 'COMPLETED', false, '2026-06-20 22:00:00'),
(18, 4,  'human', 'Sophia Chen',        'Data Quality Review',           'success', 'COMPLETED', true,  '2026-06-25 08:00:00'),
(19, 6,  'human', 'Carlos Mendez',      'Sprint Retrospective',          'success', 'COMPLETED', true,  '2026-06-21 15:00:00'),
(20, 2,  'human', 'Sarah Mitchell',     'Penetration Test Review',       'success', 'COMPLETED', true,  '2026-06-22 16:00:00');

SELECT setval('verification_actions_id_seq', 20);

INSERT INTO policy_violations (action_id, violation_reason, severity, created_at) VALUES
(4,  'Third-party dependency scanning skipped — tool limitation',    'high',     '2026-06-22 09:15:00'),
(8,  'Emergency rollback performed without change approval ticket',  'medium',   '2026-06-23 02:50:00'),
(13, 'GDPR data retention check missed for 3 data stores',          'critical', '2026-06-15 09:30:00'),
(16, 'Knowledge transfer step skipped during offboarding',          'high',     '2026-06-18 11:30:00'),
(17, 'Infrastructure change made outside maintenance window',        'medium',   '2026-06-20 22:05:00');

-- ────────────────────────────────────────────────
-- 26. WORKFLOW ORCHESTRATION
-- ────────────────────────────────────────────────

INSERT INTO workflow_orchestration (workflow_id, current_step, total_steps, status, updated_at) VALUES
(1,  3, 5, 'in_progress', '2026-06-26 14:00:00'),    -- Deploy Pipeline at step 3
(2,  1, 4, 'in_progress', '2026-06-26 09:00:00'),    -- Security Audit at step 1
(3,  2, 4, 'in_progress', '2026-06-26 10:30:00'),    -- Customer Onboarding at step 2
(4,  1, 3, 'in_progress', '2026-06-26 15:00:00'),    -- Data Ingestion at step 1
(5,  2, 5, 'in_progress', '2026-06-26 02:30:00'),    -- Incident Response at step 2 (collision: Yuki!)
(6,  1, 3, 'in_progress', '2026-06-26 14:00:00'),    -- Sprint Planning at step 1
(7,  3, 4, 'in_progress', '2026-06-26 11:00:00'),    -- Financial Reporting at step 3
(8,  1, 3, 'blocked',     '2026-06-26 09:00:00'),    -- Employee Offboarding blocked
(9,  4, 4, 'completed',   '2026-06-26 16:00:00'),    -- Content Publishing completed
(10, 2, 4, 'in_progress', '2026-06-26 10:00:00');    -- Compliance Review at step 2

-- ────────────────────────────────────────────────
-- 27. LEARNING MODULE DATA
-- ────────────────────────────────────────────────

INSERT INTO learning_snapshots (learning_maturity_score, learning_maturity_level, total_known_risks, mitigated_risks, unmitigated_risks, mitigation_percentage) VALUES
(42, 'DEVELOPING', 28, 12, 16, 42.86);

INSERT INTO failure_patterns (asset_name, asset_type, appearance_count, failure_severity, is_repeat_offender, reasons) VALUES
('KnowledgeIndexer',     'agent',    5, 'critical', true,  ARRAY['Out of memory errors','API rate limits','Unhandled edge cases']),
('DataPipeline',         'agent',    3, 'high',     true,  ARRAY['Tableau AI rate limiting','Schema changes in source']),
('Incident Response',    'workflow', 4, 'critical', true,  ARRAY['No documented playbook','Single responder bottleneck']),
('Employee Offboarding', 'workflow', 3, 'high',     true,  ARRAY['Knowledge transfer step skipped','Access revocation delayed']),
('DeployBot',            'agent',    2, 'medium',   false, ARRAY['Copilot outage dependency']),
('SecurityScanner',      'agent',    2, 'high',     false, ARRAY['Third-party scan gaps']),
('Data Ingestion',       'workflow', 2, 'high',     false, ARRAY['Tableau rate limits','Manual QA bottleneck']),
('LogAnalyzer',          'agent',    1, 'medium',   false, ARRAY['Became inactive due to config drift']),
('Content Publishing',   'workflow', 1, 'low',      false, ARRAY['Minor formatting errors in AI output']);

INSERT INTO department_exposure (department, documentation_coverage, backup_coverage, incident_exposure_score, incident_risk_level) VALUES
('Engineering',  72.5,  65.0, 78, 'HIGH'),
('Data',         60.0,  55.0, 72, 'HIGH'),
('Operations',   80.0,  70.0, 45, 'MEDIUM'),
('Sales',        55.0,  35.0, 38, 'MEDIUM'),
('Product',      85.0,  75.0, 25, 'LOW'),
('Finance',      68.0,  40.0, 55, 'MEDIUM');

-- ────────────────────────────────────────────────
-- 28. CONTINUITY ASSESSMENTS
-- ────────────────────────────────────────────────

INSERT INTO continuity_assessments (id, asset_name, asset_type, department, owner_name, continuity_score, continuity_status, criticality) VALUES
(1,  'DeployBot',             'agent',    'Engineering',  'Yuki Tanaka',      35, 'FAILS',     'critical'),
(2,  'SecurityScanner',       'agent',    'Engineering',  'Sarah Mitchell',   25, 'FAILS',     'critical'),
(3,  'KnowledgeIndexer',      'agent',    'Data',         'Nathan Wright',    15, 'LOST',      'high'),
(4,  'DataPipeline',          'agent',    'Data',         'Sophia Chen',      40, 'FAILS',     'high'),
(5,  'CodeReviewAgent',       'agent',    'Engineering',  'Aisha Patel',      72, 'DEGRADED',  'medium'),
(6,  'ComplianceChecker',     'agent',    'Operations',   'Grace Okonkwo',    55, 'DEGRADED',  'high'),
(7,  'ContentGenerator',      'agent',    'Sales',        'Daniel Murphy',    80, 'SURVIVES',  'low'),
(8,  'TestRunner',            'agent',    'Engineering',  'James O''Brien',   75, 'SURVIVES',  'medium'),
(9,  'Incident Response',     'workflow', 'Engineering',  'Yuki Tanaka',      20, 'LOST',      'critical'),
(10, 'Deploy Pipeline',       'workflow', 'Engineering',  'Yuki Tanaka',      45, 'FAILS',     'critical'),
(11, 'Data Ingestion',        'workflow', 'Data',         'Sophia Chen',      42, 'FAILS',     'high'),
(12, 'Employee Offboarding',  'workflow', 'Finance',      'Thomas Garcia',    30, 'FAILS',     'high'),
(13, 'Sprint Planning',       'workflow', 'Product',      'Carlos Mendez',    82, 'SURVIVES',  'medium'),
(14, 'Content Publishing',    'workflow', 'Sales',        'Daniel Murphy',    85, 'SURVIVES',  'low'),
(15, 'Compliance Review',     'workflow', 'Operations',   'Grace Okonkwo',    58, 'DEGRADED',  'critical'),
(16, 'Disaster Recovery Plan','process',  'Operations',   'Jennifer Foster',  18, 'LOST',      'critical'),
(17, 'Financial Reporting',   'workflow', 'Finance',      'Victoria Adams',   65, 'DEGRADED',  'high'),
(18, 'Customer Onboarding',   'workflow', 'Sales',        'Rebecca Stone',    60, 'DEGRADED',  'medium');

SELECT setval('continuity_assessments_id_seq', 18);

INSERT INTO continuity_plans (assessment_id, action_type, action_detail, status) VALUES
(1,  'cross_train',    'Cross-train Omar Hassan on DeployBot operations',                    'planned'),
(2,  'assign_backup',  'Assign James O''Brien as backup for SecurityScanner',                'planned'),
(3,  'automate',       'Rebuild KnowledgeIndexer with better error handling',                'in_progress'),
(4,  'cross_train',    'Train Kevin Osei as backup for DataPipeline operations',             'planned'),
(9,  'document',       'Create incident response playbook with escalation paths',            'planned'),
(10, 'assign_backup',  'Assign Omar Hassan as co-owner of Deploy Pipeline',                  'planned'),
(12, 'document',       'Document offboarding workflow with knowledge transfer checklist',    'in_progress'),
(15, 'assign_backup',  'Train Michael Torres as backup for Compliance Review',               'planned'),
(16, 'document',       'Create comprehensive disaster recovery documentation',              'planned'),
(17, 'automate',       'Automate manual data entry steps in financial reporting',            'planned');

-- ────────────────────────────────────────────────
-- 29. GOVERNANCE ASSESSMENTS
-- ────────────────────────────────────────────────

INSERT INTO governance_assessments (id, asset_name, asset_type, department, owner_name, criticality, governance_score, governance_status) VALUES
(1,  'DeployBot',              'agent',    'Engineering',  'Yuki Tanaka',      'critical', 40, 'AT_RISK'),
(2,  'SecurityScanner',        'agent',    'Engineering',  'Sarah Mitchell',   'critical', 28, 'CRITICAL'),
(3,  'KnowledgeIndexer',       'agent',    'Data',         'Nathan Wright',    'high',     20, 'CRITICAL'),
(4,  'DataPipeline',           'agent',    'Data',         'Sophia Chen',      'high',     45, 'AT_RISK'),
(5,  'CodeReviewAgent',        'agent',    'Engineering',  'Aisha Patel',      'medium',   78, 'HEALTHY'),
(6,  'ComplianceChecker',      'agent',    'Operations',   'Grace Okonkwo',    'high',     62, 'WARNING'),
(7,  'ContentGenerator',       'agent',    'Sales',        'Daniel Murphy',    'low',      85, 'HEALTHY'),
(8,  'IncidentResponder',      'agent',    'Engineering',  'Yuki Tanaka',      'critical', 32, 'CRITICAL'),
(9,  'Deploy Pipeline',        'workflow', 'Engineering',  'Yuki Tanaka',      'critical', 55, 'WARNING'),
(10, 'Incident Response',      'workflow', 'Engineering',  'Yuki Tanaka',      'critical', 22, 'CRITICAL'),
(11, 'Data Ingestion',         'workflow', 'Data',         'Sophia Chen',      'high',     48, 'AT_RISK'),
(12, 'Employee Offboarding',   'workflow', 'Finance',      'Thomas Garcia',    'high',     30, 'CRITICAL'),
(13, 'ChatGPT Enterprise',     'platform', 'Engineering',  'Robert Chen',      'medium',   88, 'HEALTHY'),
(14, 'DataRobot',              'platform', 'Data',         'Nathan Wright',    'low',      25, 'CRITICAL'),
(15, 'Disaster Recovery Plan', 'process',  'Operations',   'Jennifer Foster',  'critical', 15, 'CRITICAL'),
(16, 'Compliance Review',      'workflow', 'Operations',   'Grace Okonkwo',    'critical', 60, 'WARNING');

SELECT setval('governance_assessments_id_seq', 16);

INSERT INTO governance_gaps (assessment_id, gap_type, gap_severity, description) VALUES
(1,  'no_backup',          'HIGH',     'DeployBot has no designated backup owner'),
(2,  'no_backup',          'CRITICAL', 'SecurityScanner — critical agent with zero backup coverage'),
(2,  'no_documentation',   'CRITICAL', 'Scanner configuration is completely undocumented'),
(3,  'no_documentation',   'HIGH',     'KnowledgeIndexer algorithms not documented'),
(3,  'stale_review',       'HIGH',     'Agent in failed state since April — no review conducted'),
(4,  'no_backup',          'HIGH',     'DataPipeline has single operator with no backup'),
(8,  'no_documentation',   'CRITICAL', 'Incident detection rules not documented'),
(8,  'no_backup',          'CRITICAL', 'Yuki Tanaka is sole owner — critical SPOF'),
(10, 'no_documentation',   'CRITICAL', 'No incident response runbook exists'),
(10, 'no_backup',          'HIGH',     'Only one person can run incident response'),
(11, 'no_backup',          'HIGH',     'Single tool dependency with no backup'),
(12, 'no_documentation',   'HIGH',     'Offboarding process not documented'),
(12, 'no_owner',           'MEDIUM',   'No backup owner for offboarding workflow'),
(14, 'stale_review',       'HIGH',     'Deprecated tool — no decommission plan'),
(15, 'no_documentation',   'CRITICAL', 'Disaster recovery plan does not exist'),
(15, 'no_policy',          'CRITICAL', 'No governance policy for disaster recovery');

-- ────────────────────────────────────────────────
-- 30. ACCOUNTABILITY (RACI)
-- ────────────────────────────────────────────────

INSERT INTO accountability_entities (id, entity_name, entity_type, department) VALUES
(1,  'Code Deployment Pipeline',  'workflow', 'Engineering'),
(2,  'Security Audit Process',    'workflow', 'Engineering'),
(3,  'Customer Onboarding',       'workflow', 'Sales'),
(4,  'Data Ingestion Pipeline',   'workflow', 'Data'),
(5,  'Incident Response',         'workflow', 'Engineering'),
(6,  'Financial Reporting',       'workflow', 'Finance'),
(7,  'Employee Offboarding',      'workflow', 'Finance'),
(8,  'Compliance Review',         'workflow', 'Operations'),
(9,  'AI Tool Governance',        'policy',  'Engineering'),
(10, 'Data Privacy & GDPR',       'policy',  'Operations'),
(11, 'Vendor Management',         'process', 'Operations'),
(12, 'Product Roadmap',           'process', 'Product');

SELECT setval('accountability_entities_id_seq', 12);

INSERT INTO accountability_links (entity_id, person_name, raci_role) VALUES
-- Deploy Pipeline
(1, 'Yuki Tanaka',      'Responsible'),
(1, 'Robert Chen',      'Accountable'),
(1, 'Aisha Patel',      'Consulted'),
(1, 'James O''Brien',   'Informed'),
-- Security Audit
(2, 'Sarah Mitchell',   'Responsible'),
(2, 'Sarah Mitchell',   'Accountable'),    -- ISSUE: same R and A
(2, 'Robert Chen',      'Consulted'),
(2, 'Grace Okonkwo',    'Informed'),
-- Customer Onboarding
(3, 'Amara Diallo',     'Responsible'),
(3, 'Rebecca Stone',    'Accountable'),
(3, 'Chris Anderson',   'Consulted'),
(3, 'Lisa Wang',        'Informed'),
-- Data Ingestion
(4, 'Sophia Chen',      'Responsible'),
(4, 'Nathan Wright',    'Accountable'),
(4, 'Kevin Osei',       'Consulted'),
(4, 'Robert Chen',      'Informed'),
-- Incident Response
(5, 'Yuki Tanaka',      'Responsible'),
(5, 'Yuki Tanaka',      'Accountable'),    -- ISSUE: same R and A
(5, 'Robert Chen',      'Consulted'),
(5, 'Jennifer Foster',  'Informed'),
-- Financial Reporting
(6, 'Emily Chang',      'Responsible'),
(6, 'Victoria Adams',   'Accountable'),
(6, 'Brian Nelson',     'Consulted'),
(6, 'Jennifer Foster',  'Informed'),
-- Employee Offboarding
(7, 'Thomas Garcia',    'Responsible'),
(7, 'Thomas Garcia',    'Accountable'),    -- ISSUE: same R and A
(7, 'Alex Novak',       'Consulted'),
(7, 'Victoria Adams',   'Informed'),
-- Compliance Review
(8, 'Grace Okonkwo',    'Responsible'),
(8, 'Jennifer Foster',  'Accountable'),
(8, 'Sarah Mitchell',   'Consulted'),
(8, 'Robert Chen',      'Informed'),
-- AI Tool Governance
(9, 'Robert Chen',      'Responsible'),
(9, 'Jennifer Foster',  'Accountable'),
(9, 'Aisha Patel',      'Consulted'),
(9, 'Lisa Wang',        'Informed'),
-- Data Privacy
(10, 'Grace Okonkwo',   'Responsible'),
(10, 'Jennifer Foster', 'Accountable'),
(10, 'Sarah Mitchell',  'Consulted'),
(10, 'Nathan Wright',   'Informed'),
-- Vendor Management
(11, 'Michael Torres',  'Responsible'),
(11, 'Jennifer Foster', 'Accountable'),
(11, 'Ryan Phillips',   'Consulted'),
(11, 'Victoria Adams',  'Informed'),
-- Product Roadmap
(12, 'Carlos Mendez',   'Responsible'),
(12, 'Lisa Wang',       'Accountable'),
(12, 'Robert Chen',     'Consulted'),
(12, 'Rebecca Stone',   'Informed');

INSERT INTO accountability_scores (entity_id, score, status, same_r_and_a, missing_responsible, missing_accountable) VALUES
(1,  90, 'COMPLETE', false, false, false),
(2,  45, 'PARTIAL',  true,  false, false),    -- Same R and A
(3,  85, 'COMPLETE', false, false, false),
(4,  88, 'COMPLETE', false, false, false),
(5,  35, 'CRITICAL', true,  false, false),    -- Same R and A + critical workflow
(6,  92, 'COMPLETE', false, false, false),
(7,  40, 'PARTIAL',  true,  false, false),    -- Same R and A
(8,  82, 'COMPLETE', false, false, false),
(9,  80, 'COMPLETE', false, false, false),
(10, 85, 'COMPLETE', false, false, false),
(11, 78, 'COMPLETE', false, false, false),
(12, 82, 'COMPLETE', false, false, false);

INSERT INTO accountability_summary (accountability_score, status, total_entities, entities_with_links, same_r_and_a_count, unique_people_count) VALUES
(74, 'PARTIAL', 12, 12, 3, 18);

-- ────────────────────────────────────────────────
-- DONE — Dataset loaded!
-- Verify: SELECT COUNT(*) FROM employees;  → 40
-- ────────────────────────────────────────────────
