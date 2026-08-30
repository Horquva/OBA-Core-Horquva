# Static Data & Freshness Audit Report

**Date**: 2026-08-29  
**Auditor**: Hashim Ali Khan (Governance & QA)  
**Scope**: `ecosystem/applications/arcturus/src/` and `ecosystem/applications/arcturus/api/`  

## 1. Objective
Ensure that live orchestration paths do not rely on static fixtures, hardcoded IDs, or fixed artifact content. The architecture requires that running the same experiment with a different seed produces different results.

## 2. Findings: Hardcoded IDs

A grep scan for hardcoded entity prefixes (`AGENT|WF|ACT|EXP|RUN|ART|SCN`) returned the following violations in live non-test code:

### `src/integration/e2e_chain.py`
- Line 196: `workflow_id="WF-GOV-001"`
- Line 202: `activity_id="ACT-0001"`
- Line 205: `assigned_agent_id="AGENT-001"`
- Line 231: `scenario_id="SCN-GV-101"`
- Line 234: `participants=["AGENT-001"]`
- Line 341: `experiment_id: str = "EXP-DAY5-E2E"`

### `src/integration/experiment_orchestrator.py`
- Line 133: `workflow_id="WF-GOV-001"`
- Line 139: `activity_id="ACT-0001"`
- Line 142: `assigned_agent_id="AGENT-001"`
- Line 161: `scenario_id="SCN-GV-101"`
- Line 164: `participants=["AGENT-001"]`

### `api/routers/runtime.py`
- Line 66: `raw_scenario_id = config_dict.get("scenario_id", "SCN-BL-001")`
- Line 68: `raw_scenario_id = "SCN-BL-001"`

### `api/routers/workflows.py`
- Line 41: `workflow_id: str = Field(..., description="Workflow ID (e.g. WF-BHV-001)")` *(Note: This is a schema description, not a functional hardcode. Permitted.)*

## 3. Freshness Verification
**Result**: Failed.  
The orchestrator and E2E chain currently hardcode scenario and workflow parameters rather than passing dynamic instances. This prevents Experiment A (seed=7) and Experiment B (seed=42) from generating independent state. 

## 4. Remediation Required
Before the Day 7 golden run, all of the hardcoded variables in `experiment_orchestrator.py` must be replaced with dynamically generated IDs bound to the `SimulationContext` and random seed.
