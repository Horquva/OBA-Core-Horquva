# Enterprise Ontology Platform

**Owner:** Muhammad Hamza (`@MuhammadHamza-7035`)  
**Plane:** Control Plane  
**Source:** `src/control_plane/ontology/`  
**Contracts:** `contracts/control/ontology/`  
**Schemas:** `schemas/control/ontology/`  
**Tests:** `tests/ontology/`, `tests/control/`

---

## Purpose

The Enterprise Ontology Platform is the **constitutional foundation** of Arcturus. It defines the abstract organizational primitives that every other platform builds on — the "DNA" of every synthetic enterprise.

Before any enterprise can be generated, a scenario defined, or an agent materialized, the Ontology platform must produce a snapshot that describes what kinds of things can exist in the simulation.

---

## Core Concepts

Arcturus's synthetic enterprise architecture is organized into 9 interconnected layers:

1. Synthetic Enterprise Layer
2. Organizational Digital Twin Layer
3. Synthetic Workforce Layer
4. Workflow Simulation Layer
5. Agent-Based Simulation Layer
6. Scenario Generation Layer
7. Simulation Execution Engine
8. Validation and Evaluation Layer
9. Confidence and Evidence Layer

The Ontology platform is the backbone that defines the entities that flow through all layers.

---

## Primary Entities

### Organization
The root entity. Every simulation has exactly one Organization.

| Field | Type | Required | Notes |
|---|---|---|---|
| `org_id` | int | Yes | Unique identifier |
| `org_name` | str | Yes | e.g., "Horquva" |
| `address` | str | No | Physical location |
| `leader` | str | No | Head of the organization |

### Division
An operational segment within an Organization.

| Field | Type | Required |
|---|---|---|
| `div_id` | int | Yes |
| `div_name` | str | Yes |
| `org_id` | int | Yes |

### Department
A functional unit within a Division.

| Field | Type | Required |
|---|---|---|
| `dept_id` | int | Yes |
| `dept_name` | str | Yes |
| `div_id` | int | Yes |
| `readiness_score` | float | Yes |

### Role
A position within the organization that agents can occupy.

| Field | Type | Required |
|---|---|---|
| `role_id` | int | Yes |
| `role_title` | str | Yes |
| `access_level` | float | Yes |

### Capability
A skill or resource that departments or roles can possess.

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/control/ontology/base_models.py` | `OntologySnapshotContract`, `OntologyEntityContract`, `ConstraintRuleContract` |
| `schemas/control/ontology/base_schemas.py` | Enums for entity types and constraint categories |
| `src/control_plane/ontology/ontology_service.py` | `OntologyService` — core service logic |
| `src/control_plane/ontology/ontology_runtime.py` | `OntologyRuntime` — execution-time context |
| `src/control_plane/ontology/ontology_adapters.py` | Contract ↔ internal model translation |
| `src/control_plane/ontology/constraint_engine.py` | `ConstraintEngine` — validates ontology rules |
| `src/control_plane/ontology/ontology_controller.py` | Orchestration layer |

---

## Outbound Contracts

The Ontology platform produces one primary outbound payload:

**`OntologySnapshotContract`** → consumed by:
- Ajwa (Synthetic Enterprise) — to bootstrap enterprise generation
- Maaz (Simulation Runtime) — to initialize run context
- Amina (Validation) — to validate organizational structure

---

## Usage Example

```python
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.control.ontology.base_models import (
    OntologySnapshotContract,
    DepartmentState,
    OrganizationState,
)

ctx = SimulationContext(experiment_id="EXP-001", global_seed=42)

org = OrganizationState(org_id=1, org_name="Horquva", leader="CEO")
dept = DepartmentState(dept_id=1, div_id=1, dept_name="Engineering", readiness_score=1.0)

snapshot = OntologySnapshotContract(
    context=ctx,
    snapshot_version="1.0",
    organizations=[org],
    departments=[dept],
)
```

---

## Running Ontology Tests

```bash
pytest ecosystem/applications/arcturus/tests/ontology/ -v
```
