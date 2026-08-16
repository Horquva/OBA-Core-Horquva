# Synthetic Workforce & Agent Platform

**Owner:** Syeda Dua e Farwa Gulzar (`@Syeda-Dua-Farwa`)  
**Plane:** Execution Plane  
**Source:** `src/execution_plane/workforce/`  
**Contracts:** `contracts/execution/workforce/`  
**Tests:** `tests/execution/workforce/`, `tests/integration/`

---

## Purpose

The Synthetic Workforce Platform materializes synthetic agents (employees) and assigns them roles within the enterprise. It transforms the abstract organizational chart from Ajwa's Enterprise platform into a collection of simulation-ready agent profiles that the Runtime Engine can execute.

---

## Key Contracts

| Contract | Description |
|---|---|
| `WorkforceAgentRoster` | The full collection of agents with role assignments |
| `AgentProfileContract` | A single synthetic agent's profile |
| `WorkforceRoleContract` | A role definition that agents can be assigned to |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/execution/workforce/base_models.py` | Core workforce contracts |
| `src/execution_plane/workforce/workforce_service.py` | `WorkforceService` — `materialize_agents()`, `build_roster()` |
| `src/execution_plane/workforce/workforce_adapters.py` | Contract translation |

---

## Inbound → Outbound

**Inbound:** `EnterpriseInstanceContract` from Ajwa  
**Outbound:** `WorkforceAgentRoster` → Maaz (Runtime), `AgentAssignmentPayload` → Javeria (Workflows)

---

## Running Workforce Tests

```bash
pytest ecosystem/applications/arcturus/tests/integration/test_workforce_service.py -v
```
