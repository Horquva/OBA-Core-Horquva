"""Non-destructive dataset extension.
Adds new optional keys (history, incidents, decisions_log, external_entities,
knowledge_areas) WITHOUT touching the existing keys that the original 20
modules rely on. New Phase 4/5/7 modules use these richer keys.
"""
import json

PATH = "data/company.json"

with open(PATH) as f:
    data = json.load(f)

# ---- monthly snapshots (trend data) ----
data.setdefault("history", [
    {"month": "2026-03", "documented_pct": 28, "backup_pct": 30, "headcount": 112,
     "tool_cost_usd": 1180, "risk_index": 71, "knowledge_capture": 30, "open_incidents": 5},
    {"month": "2026-04", "documented_pct": 31, "backup_pct": 32, "headcount": 115,
     "tool_cost_usd": 1260, "risk_index": 68, "knowledge_capture": 34, "open_incidents": 4},
    {"month": "2026-05", "documented_pct": 33, "backup_pct": 33, "headcount": 118,
     "tool_cost_usd": 1390, "risk_index": 66, "knowledge_capture": 38, "open_incidents": 6},
    {"month": "2026-06", "documented_pct": 35, "backup_pct": 34, "headcount": 120,
     "tool_cost_usd": 1444, "risk_index": 64, "knowledge_capture": 40, "open_incidents": 3},
])

# ---- incident log ----
data.setdefault("incidents", [
    {"id": "inc_001", "date": "2026-03-14", "entity": "Lead Scoring Agent", "type": "outage",
     "impact": "high", "owner": "Robert", "resolved_by": "Robert", "lesson": "No backup owner delayed recovery by 6 hours"},
    {"id": "inc_002", "date": "2026-04-02", "entity": "Payroll Agent", "type": "data_error",
     "impact": "critical", "owner": "Lisa", "resolved_by": "Lisa", "lesson": "Undocumented logic made root-cause slow"},
    {"id": "inc_003", "date": "2026-04-21", "entity": "Billing Agent", "type": "misconfiguration",
     "impact": "high", "owner": "Robert", "resolved_by": "Sarah", "lesson": "Knowledge transfer gap surfaced"},
    {"id": "inc_004", "date": "2026-05-09", "entity": "CRM Sync Agent", "type": "integration_failure",
     "impact": "medium", "owner": "Mike", "resolved_by": "Mike", "lesson": "Hidden dependency on ChatGPT quota"},
    {"id": "inc_005", "date": "2026-05-23", "entity": "Data Backup Agent", "type": "silent_failure",
     "impact": "critical", "owner": "David", "resolved_by": "David", "lesson": "No monitoring; failure unnoticed for days"},
    {"id": "inc_006", "date": "2026-06-11", "entity": "Inventory Agent", "type": "outage",
     "impact": "high", "owner": "Emma", "resolved_by": "Emma", "lesson": "Single owner, no runbook"},
])

# ---- decision log ----
data.setdefault("decisions_log", [
    {"id": "dec_001", "date": "2026-03-20", "owner": "Robert", "area": "Sales",
     "decision": "Adopt Lead Scoring Agent as primary", "factors": ["speed", "cost"], "outcome": "positive", "reversible": False},
    {"id": "dec_002", "date": "2026-04-05", "owner": "Sarah", "area": "Marketing",
     "decision": "Standardise on ChatGPT for content", "factors": ["quality", "adoption"], "outcome": "mixed", "reversible": True},
    {"id": "dec_003", "date": "2026-04-29", "owner": "Lisa", "area": "Finance",
     "decision": "Automate payroll via Payroll Agent", "factors": ["accuracy", "time"], "outcome": "positive", "reversible": False},
    {"id": "dec_004", "date": "2026-05-15", "owner": "Mike", "area": "Support",
     "decision": "Trial Claude for ticket triage", "factors": ["cost", "quality"], "outcome": "pending", "reversible": True},
    {"id": "dec_005", "date": "2026-06-02", "owner": "David", "area": "IT",
     "decision": "Defer backup-owner assignment", "factors": ["budget"], "outcome": "negative", "reversible": True},
])

# ---- external ecosystem entities ----
data.setdefault("external_entities", [
    {"id": "ext_001", "name": "OpenAI", "type": "vendor", "connects": ["ChatGPT"], "criticality": "critical"},
    {"id": "ext_002", "name": "Anthropic", "type": "vendor", "connects": ["Claude"], "criticality": "high"},
    {"id": "ext_003", "name": "GitHub", "type": "platform", "connects": ["GitHub Copilot"], "criticality": "high"},
    {"id": "ext_004", "name": "Supabase", "type": "infrastructure", "connects": ["CRM Sync Agent", "Data Backup Agent"], "criticality": "critical"},
    {"id": "ext_005", "name": "Stripe", "type": "vendor", "connects": ["Billing Agent"], "criticality": "critical"},
    {"id": "ext_006", "name": "Slack", "type": "platform", "connects": ["Scheduling Agent"], "criticality": "medium"},
])

# ---- knowledge areas (domains of org knowledge) ----
data.setdefault("knowledge_areas", [
    {"area": "Lead Scoring Logic", "holders": ["Robert"], "documented": False, "criticality": "critical"},
    {"area": "Payroll Rules", "holders": ["Lisa"], "documented": False, "criticality": "critical"},
    {"area": "Billing Configuration", "holders": ["Robert", "Sarah"], "documented": False, "criticality": "high"},
    {"area": "CRM Integration", "holders": ["Mike"], "documented": True, "criticality": "high"},
    {"area": "Backup & Recovery", "holders": ["David"], "documented": False, "criticality": "critical"},
    {"area": "Onboarding Process", "holders": ["Emma"], "documented": True, "criticality": "medium"},
])

with open(PATH, "w") as f:
    json.dump(data, f, indent=2)

print("Extended keys:", [k for k in ("history", "incidents", "decisions_log", "external_entities", "knowledge_areas")])
print("Top-level keys now:", list(data.keys()))
