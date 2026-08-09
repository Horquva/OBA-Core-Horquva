# Arcturus Week 3 Master Execution Guide & File-by-File Blueprint

**Platform:** Arcturus Simulation Engineering Governance Platform
**Owner:** Hashim Ali Khan
**Scope:** Week 3, 5-day compressed vertical-slice execution
**Repository Boundary:** All work must remain under `ecosystem/applications/arcturus/` using the plural `applications` directory only.

---

## 1. Ground Truth Alignment

This guide is grounded in the live repository structure and the Arcturus platform roadmaps:

- Ownership and review boundaries are defined in [.github/CODEOWNERS](../.github/CODEOWNERS) and [ecosystem/applications/arcturus/.github/CODEOWNERS](../.github/CODEOWNERS).
- Platform execution plans are in [ecosystem/applications/arcturus/docs](.) and include the ontology, enterprise, scenario, workforce, behavior, runtime, validation, and synthetic data plans.
- The shared runtime contract baseline is already present in [ecosystem/applications/arcturus/contracts/simulation/base_models.py](../contracts/simulation/base_models.py).
- All implementation work must remain inside the plural `applications` path and must never import sibling platform internals directly.
- The OBA/OCOS integration boundary is explicitly out of scope for this Week 3 sprint.

---

## 2. Absolute Architectural Laws

### 2.1 No Coupling Without Contract

Interns are forbidden from importing another platform’s internal implementation modules directly. All cross-platform communication must be mediated through Pydantic payloads housed in shared contracts or schemas.

Allowed:
- `from pydantic import BaseModel`
- payload exchange through `contracts/` and `schemas/`
- adapter functions that translate payloads between internal services and shared contracts

Forbidden:
- `from ...ontology import SomeService`
- `from ...workforce import AgentFactory`
- direct import of sibling platform source modules from `src/`

### 2.2 Plural Path Enforcement

Every Python module, schema, and test file must live under:

- `ecosystem/applications/arcturus/contracts/`
- `ecosystem/applications/arcturus/schemas/`
- `ecosystem/applications/arcturus/src/`
- `ecosystem/applications/arcturus/tests/`

Never use the singular `application` path.

### 2.3 AI Assists, Humans Engineer

AI may scaffold schemas, validators, boilerplate tests, and example adapters. Every line of committed code must be understood, defended, and reviewed by the assigned human platform owner.

---

## 3. Week 3 Execution Model

### North Star: a 5-day vertical slice, not a full platform rollout

The target is not to complete every roadmap Part-4→Part-8 capability. The sprint should produce a governance-backed, contract-driven, testable, repeatable platform slice that is close enough to production readiness that the team can defend its state with evidence while explicitly deferring larger ambitions.

#### Production-readiness scorecard for Day 5

| Dimension | Metric | Target |
| --- | --- | --- |
| Contract coverage | % of handoff payloads with a real Pydantic model (not a stub) | 100% |
| Test coverage | Line coverage for `/src/<platform>/` | ≥ 80% |
| Determinism | Same seed + same context → same serialized output; variance across different seeds is expected and evaluated separately | Pass/fail |
| Failure-safety | Documented negative tests that produce typed errors instead of crashes or silent passes | 100% |
| Contract stability | Undocumented breaking contract changes after the Day 2 lock | 0 |
| Governance compliance | Files under owned paths passing the scanner with zero manual overrides | 100% |

#### Production-readiness constraints for this sprint
- Deterministic execution: the same seed and context must yield the same result across repeated runs.
- Contract discipline: every cross-platform handoff is mediated by validated Pydantic payloads.
- Automated quality gates: CI blocks bad imports, bad paths, missing tests, and weak evidence.
- Reliability: invalid inputs fail safely with explicit validation errors and traceable logs.
- Observability: every run produces enough telemetry, evidence, and coverage output for review.
- Governance: CODEOWNERS, review ownership, branch discipline, and repository hygiene are enforced by automation.
- Documentation: each platform leaves behind a readable contract, test, and evidence trail that can be defended in review.

### Hashim Ali Khan — Governance Workstream (must run in parallel with every platform)

Hashim owns the platform integrity layer and must treat his work as a first-class production-readiness enabler, not a postscript.

- Day 1: author or update `.github/CODEOWNERS`, establish the shared test harness and fixtures, and confirm the OBA/OCOS boundary is out of scope.
- Day 2: implement the initial compliance scanner, import-path checks, and a secret-pattern scan.
- Day 3: wire the governance workflow, basic markdown reporting, and PR-facing evidence output.
- Day 4: add failure-injection and contract-drift tests.
- Day 5: finalize the evidence package, verify the merge checklist, and publish the review bundle.

### Critical contract fixes for this 5-day sprint

- Hamza must ship a bootstrap `OntologySnapshotContract` before Ajwa’s `EnterpriseTemplateContract` is required as an input. Ajwa can then consume that bootstrap in Day 2 and feed enterprise context back to Hamza later in the sprint.
- Ahmed’s `SyntheticGenerationResult` must be wired into Maaz’s `RuntimeEngine.initialize_run()` as an explicit inbound payload, or the platform must be marked as isolated and deferred from runtime wiring.
- The Day 5 E2E chain must be: `Ontology → Enterprise → Workforce → Behavior → Scenario → Runtime → Validation`.
- Maaz’s `RunHistoryRecord` should flow to Maaz’s own run registry (internal), not to an undefined external registry.

### Phase A — Day 1: Contract Bootstrap & Dependency Ordering

Goal: freeze the shared payload vocabulary and break the Day 1–2 chicken-and-egg loop by giving Hamza a bootstrap ontology contract before Ajwa depends on it.

### Phase B — Day 2: Local Logic & Typed Failure Handling

Goal: each platform implements its local service logic using shared contracts, typed errors, and minimal tests. Maaz adds a checkpoint store and a simple run registry, while every platform uses the shared error taxonomy instead of ad-hoc exceptions.

### Phase C — Day 3: Adapters & Integration Wiring

Goal: each platform adds the minimal translator layer and connects the vertical slice. Ahmed’s synthetic output feeds Maaz’s runtime initialization, and Maaz emits the result package to Amina.

### Phase D — Day 4: Failure Injection & Governance Gates

Goal: prove that contracts fail safely, that governance gates block unsafe changes, and that the evidence package captures pass/fail status per platform.

### Phase E — Day 5: End-to-End Slice & Evidence Package

Goal: run one end-to-end chain with telemetry, governance evidence, and a review-ready evidence bundle. The sprint remains single-threaded/synchronous by design.

---

## 4. Day-by-Day Master Blueprint

## Day 1 — Contract Bootstrap & Dependency Ordering

### Daily Core Objective

Freeze the shared contract vocabulary, resolve the Hamza↔Ajwa dependency order, and establish the technical baseline for review. Every platform owner must create or update the contract modules required for the sprint and ensure their payloads inherit or reference the shared `SimulationContext` model.

### Hashim Ali Khan — Governance Delivery for Day 1

- Target file path: `ecosystem/applications/arcturus/tests/conftest.py`
- Target file path: `ecosystem/applications/arcturus/tests/helpers/simulation_context_factory.py`
- Target file path: `.github/CODEOWNERS`
- Expected classes/methods:
  - `build_simulation_context()`
  - `seed_fixture()`
  - `load_codeowners_map()`
- Inbound payloads:
  - repository file inventory from all platforms
- Outbound payloads:
  - a shared fixture package, a CODEOWNERS baseline, and a governance report

### Muhammad Hamza (@MuhammadHamza-7035) — Enterprise Ontology Platform

- Target file path: `ecosystem/applications/arcturus/contracts/control/ontology/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/control/ontology/base_schemas.py`
- Expected classes/models:
  - `OntologyEntityContract`
  - `RelationshipContract`
  - `ConstraintRuleContract`
  - `OntologySnapshotContract`
- Inbound payloads:
  - none; ship a bootstrap ontology snapshot first
- Outbound payloads:
  - `OntologySnapshotContract` to Ajwa, Amina, and Maaz
- Deferred to later parts: semantic query capability, temporal/lifecycle modeling, and provenance-heavy ontology evolution (Part-3/4+).

### Ajwa Zainab — Synthetic Enterprise Platform

- Target file path: `ecosystem/applications/arcturus/contracts/control/enterprise/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/control/enterprise/base_schemas.py`
- Expected classes/models:
  - `EnterpriseTemplateContract`
  - `EnterpriseConfigurationContract`
  - `EnterpriseInstanceContract`
- Inbound payloads:
  - bootstrap `OntologySnapshotContract` from Hamza
- Outbound payloads:
  - `EnterpriseStateContract` to Maaz and `OrganizationalContextPayload` to Javeria
- Deferred to later parts: variation engine, scale profiles, industry adaptation, and digital-twin evolution (Part-4/6).

### Maryam Yaqoob (@Maryam-Yaqoob) — Scenario Engineering Platform

- Target file path: `ecosystem/applications/arcturus/contracts/control/scenarios/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/control/scenarios/base_schemas.py`
- Expected classes/models:
  - `ScenarioDSLPayload`
  - `ScenarioConstraintContract`
  - `ScenarioExpectationContract`
- Inbound payloads:
  - none; define the canonical scenario contract
- Outbound payloads:
  - `ScenarioDSLPayload` to Maaz and `ScenarioExpectedOutcome` to Amina
- Deferred to later parts: scenario lifecycle state machine and probability-model integration (Part-2/4).

### Syeda Dua e Farwa Gulzar (@Syeda-Dua-Farwa) — Synthetic Workforce & Agent Platform

- Target file path: `ecosystem/applications/arcturus/contracts/execution/workforce/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/execution/workforce/base_schemas.py`
- Expected classes/models:
  - `WorkforceAgentRoster`
  - `AgentProfileContract`
  - `WorkforceRoleContract`
- Inbound payloads:
  - `EnterpriseInstanceContract` from Ajwa
- Outbound payloads:
  - `WorkforceAgentRoster` to Maaz and `AgentAssignmentPayload` to Javeria
- Deferred to later parts: agent cognition, goals, memory, and multi-agent coordination (Part-4/6).

### Javeria Rafhan — Behavior & Workflow Platform

- Target file path: `ecosystem/applications/arcturus/contracts/execution/workflows/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/execution/workflows/base_schemas.py`
- Expected classes/models:
  - `WorkflowDefinitionContract`
  - `ActivityStateContract`
  - `PolicyGovernanceContract`
- Inbound payloads:
  - `OrganizationalContextPayload` from Ajwa and `AgentAssignmentPayload` from Syeda
- Outbound payloads:
  - `WorkflowDefinitionContract` to Maaz and `WorkflowExecutionEvidence` to Amina
- Deferred to later parts: the organizational behavior engine and emergent collaboration patterns (Part-4/5).

### Muhammad Maaz Khan — Simulation Runtime & Experiment Platform

- Target file path: `ecosystem/applications/arcturus/contracts/simulation/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/simulation/base_schemas.py`
- Expected classes/models:
  - `SimulationContext`
  - `EnterpriseStateContract`
  - `CapabilityDependencyGraph`
  - `WorkflowDefinitionContract`
  - `ScenarioDSLPayload`
  - `WorkforceAgentRoster`
  - `ExperimentResultPackage`
- Inbound payloads:
  - upstream contracts from Hamza, Ajwa, Maryam, Syeda, and Javeria plus Ahmed’s `SyntheticGenerationResult`
- Outbound payloads:
  - `ExperimentResultPackage` to Amina and `RunHistoryRecord` to Maaz’s own run registry (internal)
- Deferred to later parts: full experiment engine, scheduler/event-model separation, and replay/recovery (Part-5/6).

### Amina Khan — Validation & Evaluation Platform

- Target file path: `ecosystem/applications/arcturus/contracts/evaluation/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/evaluation/base_schemas.py`
- Expected classes/models:
  - `ValidationRun`
  - `EvidenceContract`
  - `ValidationRuleContract`
  - `ValidationResultContract`
- Inbound payloads:
  - `ExperimentResultPackage` from Maaz
- Outbound payloads:
  - `ValidationResultContract` to the intelligence layer
- Deferred to later parts: metrics-engine configuration, benchmarking, and organizational-fidelity evaluation (Part-4/5).

### Ahmed Raza (@4hmad69) — Synthetic Data Platform

- Target file path: `ecosystem/applications/arcturus/contracts/synthetic_data/base_models.py`
- Target file path: `ecosystem/applications/arcturus/schemas/synthetic_data/base_schemas.py`
- Expected classes/models:
  - `SyntheticGenerationRequest`
  - `SyntheticArtifactContract`
  - `SyntheticGenerationResult`
- Inbound payloads:
  - `SimulationContext` from runtime
- Outbound payloads:
  - `SyntheticGenerationResult` to Maaz’s runtime initialization
- Deferred to later parts: simulation intelligence and any deeper predictive reasoning (explicitly deferred for this sprint).

---

## Day 2 — Local Logic & Typed Failure Handling

### Daily Core Objective

Each platform implements its local engine or service layer while preserving a strict contract boundary. No platform may call another platform’s engine directly, and every implementation must leave behind testable, reviewable evidence.

### Hashim Ali Khan — Governance Delivery for Day 2

- Target file path: `ecosystem/applications/arcturus/src/governance/compliance_scanner.py`
- Target file path: `ecosystem/applications/arcturus/src/governance/path_enforcer.py`
- Target file path: `ecosystem/applications/arcturus/src/governance/import_boundary_checker.py`
- Expected classes/methods:
  - `ArcturusComplianceScanner`
  - `validate_path_boundaries()`
  - `check_forbidden_direct_imports()`
  - `scan_for_secret_patterns()`
- Inbound payloads:
  - repository tree snapshots and import inventories
- Outbound payloads:
  - compliance findings and path/import violations

### Muhammad Hamza (@MuhammadHamza-7035)

- Target file path: `ecosystem/applications/arcturus/src/control_plane/ontology/ontology_service.py`
- Expected classes/methods:
  - `OntologyService`
  - `resolve_relationships()`
  - `validate_constraints()`
  - `build_snapshot()`

### Ajwa Zainab

- Target file path: `ecosystem/applications/arcturus/src/control_plane/enterprise/enterprise_generator.py`
- Expected classes/methods:
  - `EnterpriseGenerator`
  - `generate_enterprise()`
  - `resolve_hierarchy()`
  - `validate_structure()`

### Maryam Yaqoob (@Maryam-Yaqoob)

- Target file path: `ecosystem/applications/arcturus/src/control_plane/scenarios/scenario_engine.py`
- Expected classes/methods:
  - `ScenarioEngine`
  - `compile_scenario()`
  - `evaluate_preconditions()`
  - `build_expected_outcome()`

### Syeda Dua e Farwa Gulzar (@Syeda-Dua-Farwa)

- Target file path: `ecosystem/applications/arcturus/src/execution_plane/workforce/workforce_service.py`
- Expected classes/methods:
  - `WorkforceService`
  - `materialize_agents()`
  - `assign_roles()`
  - `build_roster()`

### Javeria Rafhan

- Target file path: `ecosystem/applications/arcturus/src/execution_plane/workflows/workflow_service.py`
- Expected classes/methods:
  - `WorkflowService`
  - `compile_workflow()`
  - `evaluate_sla()`
  - `build_execution_trace()`

### Muhammad Maaz Khan

- Target file path: `ecosystem/applications/arcturus/src/simulation/runtime_engine.py`
- Expected classes/methods:
  - `RuntimeEngine`
  - `initialize_run()`
  - `step()`
  - `finalize_run()`

### Amina Khan

- Target file path: `ecosystem/applications/arcturus/src/evaluation_plane/validation_engine.py`
- Expected classes/methods:
  - `ValidationEngine`
  - `run_validation()`
  - `evaluate_logic_rule()`
  - `evaluate_consistency_rule()`

### Ahmed Raza (@4hmad69)

- Target file path: `ecosystem/applications/arcturus/src/synthetic_data/generation_service.py`
- Expected classes/methods:
  - `SyntheticGenerationService`
  - `generate_snapshot()`
  - `link_relationships()`
  - `build_provenance()`

---

## Day 3 — Adapters & Integration Wiring

### Daily Core Objective

Add the translator layer and connect the vertical slice. Each platform maps its internal structure into the shared contract shape and back again without coupling to sibling implementations.

### Hashim Ali Khan — Governance Delivery for Day 3

- Target file path: `ecosystem/applications/arcturus/src/governance/reporting/markdown_reporter.py`
- Target file path: `ecosystem/applications/arcturus/src/governance/reporting/pr_comment_payload.py`
- Target file path: `.github/workflows/arcturus-governance-gate.yml`
- Expected classes/methods:
  - `emit_markdown_report()`
  - `build_pr_comment_payload()`
  - `run_governance_gate()`

### Platform adapter targets

- Hamza: `ecosystem/applications/arcturus/src/control_plane/ontology/ontology_adapters.py`
- Ajwa: `ecosystem/applications/arcturus/src/control_plane/enterprise/enterprise_adapters.py`
- Maryam: `ecosystem/applications/arcturus/src/control_plane/scenarios/scenario_adapters.py`
- Syeda: `ecosystem/applications/arcturus/src/execution_plane/workforce/workforce_adapters.py`
- Javeria: `ecosystem/applications/arcturus/src/execution_plane/workflows/workflow_adapters.py`
- Maaz: `ecosystem/applications/arcturus/src/simulation/runtime_adapters.py`
- Amina: `ecosystem/applications/arcturus/src/evaluation_plane/validation_adapters.py`
- Ahmed: `ecosystem/applications/arcturus/src/synthetic_data/generation_adapters.py`

---

## Day 4 — Failure Injection & Governance Gates

### Daily Core Objective

Prove that the contracts fail safely and that the governance pipeline blocks unsafe changes before they reach merge. Every platform must add tests covering schema violations, missing fields, invalid transitions, and cycle detection where relevant.

### Hashim Ali Khan — Governance Delivery for Day 4

- Target file path: `ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py`
- Target file path: `ecosystem/applications/arcturus/tests/shared/test_contract_stability.py`
- Expected classes/methods:
  - `test_forbidden_import_is_blocked()`
  - `test_path_violation_is_reported()`
  - `test_dirty_tree_is_rejected()`
  - `test_outbound_contract_has_not_silently_drifted()`

### Platform test targets

- Hamza: `ecosystem/applications/arcturus/tests/control/ontology/test_ontology_contracts.py`
- Ajwa: `ecosystem/applications/arcturus/tests/control/enterprise/test_enterprise_generation.py`
- Maryam: `ecosystem/applications/arcturus/tests/control/scenarios/test_scenario_payloads.py`
- Syeda: `ecosystem/applications/arcturus/tests/execution/workforce/test_workforce_payloads.py`
- Javeria: `ecosystem/applications/arcturus/tests/execution/workflows/test_workflow_contracts.py`
- Maaz: `ecosystem/applications/arcturus/tests/simulation/test_runtime_contracts.py`
- Amina: `ecosystem/applications/arcturus/tests/evaluation/test_validation_engine.py`
- Ahmed: `ecosystem/applications/arcturus/tests/synthetic_data/test_generation_contracts.py`

---

## Day 5 — End-to-End Slice & Evidence Package

### Daily Core Objective

Run one integrated execution path using the shared contract layer. The goal is not merely feature completeness; it is execution coherence and evidence completeness for production-style review.

### Hashim Ali Khan — Governance Delivery for Day 5

- Target file path: `ecosystem/applications/arcturus/src/integration/governance_evidence.py`
- Expected classes/methods:
  - `aggregate_evidence()`
  - `build_release_candidate_report()`

### Integration targets

- Hamza: `ecosystem/applications/arcturus/src/integration/ontology_chain.py`
- Ajwa: `ecosystem/applications/arcturus/src/integration/enterprise_chain.py`
- Maryam: `ecosystem/applications/arcturus/src/integration/scenario_chain.py`
- Syeda: `ecosystem/applications/arcturus/src/integration/workforce_chain.py`
- Javeria: `ecosystem/applications/arcturus/src/integration/workflow_chain.py`
- Maaz: `ecosystem/applications/arcturus/src/integration/runtime_chain.py`
- Amina: `ecosystem/applications/arcturus/src/integration/validation_chain.py`
- Ahmed: `ecosystem/applications/arcturus/src/integration/synthetic_data_chain.py`

### Day 5 E2E chain

`Ontology → Enterprise → Workforce → Behavior → Scenario → Runtime → Validation`

---

## 5. Code Examples for Interns

## 5.1 Shared Base Contract Foundation (Days 1-2)

Every platform must import the shared contract base from `ecosystem/applications/arcturus/contracts/shared/base_models.py` rather than redefining its own copy of `SimulationContext`.

```python
# ecosystem/applications/arcturus/contracts/shared/base_models.py
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator

CONTRACT_SCHEMA_VERSION = "1.0.0"


def derive_subseed(global_seed: int, namespace: str) -> int:
    digest = hashlib.sha256(f"{global_seed}:{namespace}".encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


class SimulationContext(BaseModel):
    run_id: UUID = Field(default_factory=uuid4)
    trace_id: UUID = Field(default_factory=uuid4)
    experiment_id: str = Field(..., min_length=3)
    global_seed: int = Field(..., ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    config: dict[str, Any] = Field(default_factory=dict)

    def subseed(self, namespace: str) -> int:
        return derive_subseed(self.global_seed, namespace)


class ContractEnvelope(BaseModel):
    context: SimulationContext
    contract_version: str = Field(default=CONTRACT_SCHEMA_VERSION)

    @field_validator("context")
    @classmethod
    def context_must_be_valid(cls, value: SimulationContext) -> SimulationContext:
        if value.global_seed < 0:
            raise ValueError("global_seed cannot be negative")
        return value
```

## 5.2 Shared Error Taxonomy (Days 3-5)

All platform services should raise typed exceptions instead of ad-hoc `ValueError` or bare `Exception` cases.

```python
# ecosystem/applications/arcturus/contracts/shared/errors.py
class ArcturusError(Exception):
    """Base class for every typed Arcturus failure."""


class SchemaViolation(ArcturusError):
    """Pydantic-level validation failure."""


class BusinessRuleViolation(ArcturusError):
    """Valid schema, invalid domain state."""


class IntegrationFailure(ArcturusError):
    """A cross-platform contract could not be parsed or reconciled."""
```

## 5.3 Minimal Checkpoint Store for Maaz (Days 3-5)

```python
# ecosystem/applications/arcturus/src/simulation/checkpoint_store.py
from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID

from ecosystem.applications.arcturus.contracts.shared.errors import IntegrationFailure


class CheckpointStore:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, run_id: UUID, step: int, state: dict) -> Path:
        path = self.root / f"{run_id}__{step:06d}.json"
        path.write_text(json.dumps(state, default=str, indent=2))
        return path

    def load_latest(self, run_id: UUID) -> dict:
        checkpoints = sorted(self.root.glob(f"{run_id}__*.json"))
        if not checkpoints:
            raise IntegrationFailure(f"No checkpoints found for run {run_id}")
        return json.loads(checkpoints[-1].read_text())

    def rollback_to(self, run_id: UUID, step: int) -> dict:
        path = self.root / f"{run_id}__{step:06d}.json"
        if not path.exists():
            raise IntegrationFailure(f"No checkpoint at step {step} for run {run_id}")
        return json.loads(path.read_text())
```

## 5.4 Days 1-2 Base Schema Boilerplate

```python
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, ValidationError, field_validator


class SimulationContext(BaseModel):
    """Master execution context inherited by every Arcturus contract."""

    run_id: UUID = Field(default_factory=uuid4)
    experiment_id: str = Field(..., min_length=3)
    global_seed: int = Field(..., ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    config: dict[str, Any] = Field(default_factory=dict)


class ContractEnvelope(BaseModel):
    """Shared envelope for every platform-owned payload."""

    context: SimulationContext

    @field_validator("context")
    @classmethod
    def context_must_be_valid(cls, value: SimulationContext) -> SimulationContext:
        if value.global_seed < 0:
            raise ValueError("global_seed cannot be negative")
        return value


class EnterpriseTemplatePayload(ContractEnvelope):
    enterprise_id: str = Field(..., min_length=3)
    business_functions: list[str] = Field(default_factory=list)
    hierarchy: dict[str, Any] = Field(default_factory=dict)


class OntologySnapshotPayload(ContractEnvelope):
    snapshot_id: str = Field(..., min_length=3)
    entities: list[str] = Field(default_factory=list)
    relationships: list[tuple[str, str]] = Field(default_factory=list)


class ScenarioDSLPayload(ContractEnvelope):
    scenario_id: str = Field(..., pattern=r"^SCN-[A-Z]{2}-\d{3}$")
    variables: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)


if __name__ == "__main__":
    good = EnterpriseTemplatePayload(
        context=SimulationContext(
            experiment_id="EXP-001",
            global_seed=42,
        ),
        enterprise_id="ENT-001",
        business_functions=["finance", "hr"],
    )
    print(good.model_dump())
```

---

## 5.2 Day 8 Pytest Test Suite

```python
# ecosystem/applications/arcturus/tests/test_contracts.py

import pytest
from pydantic import BaseModel, ValidationError, Field, field_validator


class SimulationContext(BaseModel):
    run_id: str
    experiment_id: str
    global_seed: int = Field(ge=0)


class ContractEnvelope(BaseModel):
    context: SimulationContext


class ExamplePayload(ContractEnvelope):
    enterprise_id: str
    state: str


class DependencyGraph(BaseModel):
    nodes: list[str]
    edges: list[tuple[str, str]] = Field(default_factory=list)

    @field_validator("edges")
    @classmethod
    def validate_acyclic(cls, value):
        # Minimal cycle check for the example. Real Arcturus logic should
        # enforce this for ontology and reporting hierarchies.
        for a, b in value:
            if a == b:
                raise ValueError("self-loop is not allowed")
        return value


def test_positive_payload_validates():
    payload = ExamplePayload(
        context=SimulationContext(
            run_id="run-001",
            experiment_id="exp-001",
            global_seed=7,
        ),
        enterprise_id="ent-001",
        state="initialized",
    )
    assert payload.enterprise_id == "ent-001"


def test_negative_payload_missing_field_raises_validation_error():
    with pytest.raises(ValidationError):
        ExamplePayload(
            context=SimulationContext(
                run_id="run-002",
                experiment_id="exp-002",
                global_seed=11,
            ),
            state="initialized",
        )


def test_acyclic_graph_accepts_valid_edges():
    graph = DependencyGraph(
        nodes=["A", "B", "C"],
        edges=[("A", "B"), ("B", "C")],
    )
    assert graph.nodes == ["A", "B", "C"]


def test_cycle_rejected_by_validation():
    with pytest.raises(ValidationError):
        DependencyGraph(
            nodes=["A", "B", "C"],
            edges=[("A", "B"), ("B", "C"), ("C", "A")],
        )
```

---

## 6. Engineering Hygiene

### 6.1 Branching and Sync

```bash
git checkout initiative/arcturus
git pull --ff-only origin initiative/arcturus
git checkout -b feature/<platform-name> initiative/arcturus
```

### 6.2 Selective Staging Only

```bash
git status --short
git add ecosystem/applications/arcturus/contracts/<platform>/
git add ecosystem/applications/arcturus/schemas/<platform>/
git add ecosystem/applications/arcturus/src/<platform>/
git add ecosystem/applications/arcturus/tests/<platform>/
```

Do not use `git add .` blindly. Avoid committing logs, caches, `.pyc`, or local environment artifacts.

### 6.3 Local Execution and Coverage

```bash
pytest -q ecosystem/applications/arcturus/tests
coverage run -m pytest ecosystem/applications/arcturus/tests
coverage report -m
```

### 6.4 Commit and Push

```bash
git commit -m "feat(arcturus): <clear intent>"
git push -u origin feature/<platform-name>
```

### 6.5 Review Gate

- Open the PR against `initiative/arcturus`
- Keep the review focused on contract correctness, deterministic behavior, and test evidence
- Be prepared to defend every line of AI-assisted code in review

---

## 7. Final Execution Rule Set

1. All code lives under `ecosystem/applications/arcturus/`.
2. All platform communication uses contracts and schemas only.
3. Every contract inherits or references the shared `SimulationContext` semantics.
4. Every invalid input must fail safely with a clear validation error.
5. Every platform must produce evidence for the Day 5 review bundle.
6. Every line of code must be explainable by the assigned human engineer.
