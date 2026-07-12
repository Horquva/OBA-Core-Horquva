# Canonical Organizational Data Model

This document outlines the canonical data model used to power the Organizational Brain Analysis (OBA) platform. The model supports 20+ intelligence modules by providing a rich, interconnected graph of the organization.

## The 12 Canonical Entities

1. **Employees (Humans)**: The people in the organization (engineers, managers, executives).
2. **AI Platforms (Tools)**: The underlying AI services used (ChatGPT, Copilot, Midjourney).
3. **AI Agents**: Specialized AI applications owned by employees and used in workflows (DeployBot, SecurityScanner).
4. **Workflows**: Multi-step business or technical processes.
5. **Knowledge Assets**: Documentation, configurations, and institutional memory.
6. **Dependencies**: The graph edges connecting people, tools, agents, and workflows.
7. **Events & Incidents**: Outages, failures, or violations affecting the organization.
8. **Decisions**: Strategic choices made regarding ownership, backups, or risk mitigation.
9. **Snapshots**: Time-series captures of organizational health metrics.
10. **Governance Policies**: Rules and compliance standards governing tools and workflows.
11. **RACI Records**: Accountability mappings (Responsible, Accountable, Consulted, Informed).
12. **Recommendations**: System-generated suggestions to improve resilience and reduce risk.

---

## Core Database Schema (Supabase)

### `employees`
Tracks human capital, their roles, risk levels, skills, and workload.
- `id`, `name`, `role`, `department`
- `risk` (low, medium, high, critical)
- `tenure` (years)
- `skills` (text array)
- `workload` (0-100)
- `manager`, `hire_date`

### `ai_platforms`
The foundation AI tools purchased/used by the company.
- `id`, `name`, `type`, `status`
- `cost_monthly`, `usage_count`, `adoption_pct`, `last_used`

### `agents`
Specific implementations of AI tools managed by employees.
- `id`, `name`, `type`, `status`, `risk`
- `owner_id` (references `employees`)
- `usage_count`, `adoption_pct`, `last_used`, `cost`

### `workflows` & `workflow_steps`
Business processes and their constituent steps.
- **workflows**: `id`, `name`, `status`, `risk`, `department`, `frequency`
- **workflow_steps**: `id`, `workflow_id`, `step_number`, `step_name`, `actor_type` (human/agent/tool), `actor_name`

### `dependencies`
The edges of the organizational graph.
- `id`, `source_id`, `target_id`
- `source_type`, `target_type` (agent, workflow, platform, employee)
- `dependency_type` (critical, high, normal, low)
- `strength` (0-100)

### `knowledge_assets`
Documentation status and criticality.
- `id`, `asset_type`, `asset_id`, `topic`
- `is_documented` (boolean)
- `criticality`, `owner_id`

### `snapshots`
Monthly time-series data for forecasting.
- `snapshot_date`, `headcount`, `avg_workload`
- `total_tool_cost`, `risk_index`
- `memory_health`, `continuity_score`, `governance_score`

---

## Relational Junction Tables

- **`employee_agent`**: Maps employees to agents (roles: owner, operator, backup).
- **`agent_platform`**: Maps agents to the underlying AI platforms they consume.
- **`tool_ownership`, `tool_users`, `tool_backups`, `tool_policies`**: Extends platform metadata.
- **`workflow_dependencies`, `workflow_tool_dependencies`**: Links workflows to agents and tools.

---

## Intelligence Module Tables

The schema also includes specialized tables for the 20+ modules:
- **Risk & Forecasting**: `predictive_risk_scores`, `organizational_forecasts`, `forecast_findings`
- **Collaboration**: `collaboration_scores`, `collaboration_summary`
- **Decisions & Verification**: `organizational_decisions`, `decision_factors`, `verification_actions`, `policy_violations`
- **Orchestration**: `workflow_orchestration`, `workflow_failures`, `workflow_runbooks`
- **Continuity & Governance**: `continuity_assessments`, `continuity_plans`, `governance_assessments`, `governance_gaps`
- **Learning & Accountability**: `learning_snapshots`, `failure_patterns`, `department_exposure`, `accountability_entities`, `accountability_links`, `accountability_scores`, `accountability_summary`

## Data Quality validation

The system relies on the `validate.js` middleware and `/api/data-quality` route to ensure the integrity of the data across these tables, checking for issues like orphaned agents, undocumented knowledge, and workflows missing runbooks.
