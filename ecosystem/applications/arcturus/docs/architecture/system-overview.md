# System Overview — Arcturus Architecture

**Platform:** Arcturus Simulation Engineering Governance Platform  
**Owner:** Hashim Ali Khan  

---

## 1. What Arcturus Does

Arcturus is a **contract-driven, deterministic simulation engine** that generates and runs synthetic enterprises for Horquva's Organizational Brain (OBA). 

Given a seed and a scenario, Arcturus:
1. Builds a complete synthetic organization (org chart, departments, workforce)
2. Defines what should happen (scenarios, constraints, expectations)
3. Executes the simulation (runtime engine with checkpointing)
4. Produces validated, evidence-backed results

The same seed and context always produce the same results. This **determinism** is a first-class requirement, not an afterthought.

---

## 2. The 8-Platform Architecture

Arcturus is divided into 8 autonomous platforms. Each platform is independently owned, independently tested, and communicates with peers **only via shared Pydantic contracts**.

```
┌─────────────────────── CONTROL PLANE ────────────────────────┐
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  Ontology    │──▶│  Enterprise  │──▶│    Scenarios     │  │
│  │  (Hamza)     │   │  (Ajwa)      │   │    (Maryam)      │  │
│  └──────────────┘   └──────────────┘   └──────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────── EXECUTION PLANE ──────────────────────┐
│                                                               │
│  ┌──────────────────┐         ┌──────────────────────────┐   │
│  │ Synthetic        │         │   Behavior &             │   │
│  │ Workforce        │────────▶│   Workflows              │   │
│  │ (Syeda)          │         │   (Javeria)              │   │
│  └──────────────────┘         └──────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────── SIMULATION CORE ──────────────────────┐
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  Synthetic   │──▶│  Runtime     │──▶│  Validation &    │  │
│  │  Data        │   │  Engine      │   │  Evaluation      │  │
│  │  (Ahmed)     │   │  (Maaz)      │   │  (Amina)         │  │
│  └──────────────┘   └──────────────┘   └──────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────── GOVERNANCE (Cross-Cutting) ─────────────┐
│              Hashim Ali Khan — runs across all platforms       │
│   Import Boundary Checker │ Path Enforcer │ Compliance Scanner │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Platform Descriptions

### Control Plane

#### Enterprise Ontology (Muhammad Hamza)
- **Purpose:** Defines the constitutional primitives — Organization, Division, Department, Role, Capability. This is the blueprint that every other platform builds on.
- **Key Output:** `OntologySnapshotContract` — a versioned snapshot of the org's structural definition.
- **Files:** `src/control_plane/ontology/`

#### Synthetic Enterprise (Ajwa Zainab)
- **Purpose:** Takes an ontology snapshot and a template, then generates a fully populated synthetic company instance — departments, business units, teams, hierarchy.
- **Key Output:** `EnterpriseInstanceContract` — a structurally valid synthetic company.
- **Files:** `src/control_plane/enterprise/`

#### Scenario Engineering (Maryam Yaqoob)
- **Purpose:** Provides the DSL (Domain Specific Language) for defining what should happen in a simulation — the trigger, participants, constraints, and expected outcomes.
- **Key Output:** `ScenarioDSLPayload` — a compiled, validated scenario definition.
- **Files:** `src/control_plane/scenarios/`

---

### Execution Plane

#### Synthetic Workforce (Syeda Dua e Farwa)
- **Purpose:** Materializes synthetic agents (employees) and assigns them roles within the enterprise. Produces the agent roster that the runtime will work with.
- **Key Output:** `WorkforceAgentRoster` — a collection of simulation-ready agents.
- **Files:** `src/execution_plane/workforce/`

#### Behavior & Workflows (Javeria Rafhan)
- **Purpose:** Defines and compiles governance workflows — the ordered sequence of activities, SLA constraints, and policy rules that agents execute during the simulation.
- **Key Output:** `WorkflowDefinitionContract` — a compiled workflow with activities and policies.
- **Files:** `src/execution_plane/workflows/`

---

### Simulation Core

#### Synthetic Data (Ahmed Raza)
- **Purpose:** Generates structured synthetic data artifacts (reports, documents, meeting records) that populate the simulation with realistic, deterministic content.
- **Key Output:** `SyntheticGenerationResult` — a provenance-tracked bundle of generated artifacts.
- **Files:** `src/synthetic_data/`

#### Simulation Runtime (Muhammad Maaz Khan)
- **Purpose:** The operational core. Takes all upstream contracts, initializes a run, steps through simulation ticks, checkpoints state, and produces a finalized execution record.
- **Key Output:** `RunHistoryRecord` / `ExperimentResultPackage` — the complete evidence of what happened.
- **Files:** `src/simulation/`

#### Validation & Evaluation (Amina Khan)
- **Purpose:** Scientifically evaluates execution evidence against predefined rules. Determines pass/fail per validation rule and produces a final validation status.
- **Key Output:** `ValidationResultContract` — proof that the simulation met (or failed) its stated expectations.
- **Files:** `src/evaluation_plane/`

---

### Governance (Cross-Cutting)

#### Governance Platform (Hashim Ali Khan)
- **Purpose:** Automated enforcement machinery that runs across all platforms. Enforces architectural laws, blocks unsafe code, and produces the evidence package for review.
- **Enforces:**
  - §2.1 No cross-platform direct imports (`import_boundary_checker.py`)
  - §2.2 Plural path convention (`path_enforcer.py`)
  - No hardcoded secrets or credentials
  - Contract stability — no breaking changes after Day 2 freeze
- **Files:** `src/governance/`

---

## 4. The Shared Foundation — SimulationContext

Every single platform shares one object: `SimulationContext`. It is the root of the entire execution tree, passed through every contract in the chain.

```python
# contracts/shared/base_models.py
class SimulationContext(BaseModel):
    run_id: UUID          # Unique per run
    trace_id: UUID        # For distributed tracing
    experiment_id: str    # Human-readable label (e.g. "EXP-001")
    global_seed: int      # Guarantees determinism
    created_at: datetime  # When the simulation was created
    config: dict          # Optional overrides
```

The `global_seed` is what makes Arcturus deterministic. Every platform derives its own subseed:

```python
context.subseed("enterprise")  # deterministic, namespaced seed for enterprise
context.subseed("workforce")   # deterministic, namespaced seed for workforce
```

---

## 5. End-to-End Data Flow

```
SimulationContext (seed=42, experiment_id="EXP-001")
    │
    ├──▶ OntologySnapshotContract
    │         │
    │         └──▶ EnterpriseInstanceContract
    │                   │
    │                   └──▶ WorkforceAgentRoster
    │                             │
    │                             └──▶ WorkflowDefinitionContract
    │                                       │
    ├──▶ ScenarioDSLPayload ────────────────┤
    │                                       │
    ├──▶ SyntheticGenerationResult ─────────┤
    │                                       ▼
    │                              RuntimeEngine.initialize_run()
    │                                       │
    │                              step() × N ticks
    │                                       │
    │                              finalize_run()
    │                                       │
    │                                       ▼
    └────────────────────────▶  ValidationEngine.run_validation()
                                            │
                                            ▼
                                  ValidationResultContract
                                  ("validated" | "failed")
```

---

## 6. Key Architectural Laws

These are non-negotiable rules enforced by automation:

| Law | Rule | Enforcer |
|---|---|---|
| §2.1 | No cross-platform `src/` imports | `import_boundary_checker.py` |
| §2.2 | Plural path (`applications`, not `application`) | `path_enforcer.py` |
| §2.3 | AI assists, humans engineer — every line must be understood | Code review |
| §2.4 | Same seed → same output (determinism) | Test suite |
| §2.5 | No hardcoded secrets | `scan_for_secret_patterns()` |

---

## 7. Related Documents

- [Data Flow Detail](data-flow.md)
- [Contract Design Patterns](contract-design.md)
- [Governance Model](governance-model.md)
- [Onboarding Guide](../getting-started/onboarding.md)
