# Behavior & Workflow Platform

**Owner:** Javeria Rafhan (`@javeria1234-aaly`)  
**Plane:** Execution Plane  
**Source:** `src/execution_plane/workflows/`  
**Contracts:** `contracts/execution/workflows/`  
**Tests:** `tests/execution/`

---

## Purpose

The Behavior & Workflow Platform defines and compiles governance workflows — ordered sequences of activities, SLA constraints, and policy rules that agents execute during a simulation run.

---

## Key Contracts

| Contract | Description |
|---|---|
| `WorkflowDefinitionContract` | A complete workflow with activities and governance policies |
| `ActivityStateContract` | A single step in the workflow with status tracking |
| `PolicyGovernanceContract` | A policy constraint on workflow execution |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/execution/workflows/base_models.py` | Core workflow contracts |
| `src/execution_plane/workflows/workflow_service.py` | `WorkflowService.compile_workflow()` |
| `src/execution_plane/workflows/workflow_adapters.py` | Contract translation |

---

## Inbound → Outbound

**Inbound:** `OrganizationalContextPayload` from Ajwa, `AgentAssignmentPayload` from Syeda  
**Outbound:** `WorkflowDefinitionContract` → Maaz (Runtime), `WorkflowExecutionEvidence` → Amina (Validation)
