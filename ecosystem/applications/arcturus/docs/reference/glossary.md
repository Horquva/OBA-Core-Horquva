# Glossary — Arcturus Key Terms

---

## A

**Adapter**  
A module in each platform that translates between a platform's internal data structures and the shared Pydantic contracts. Located at `src/<plane>/<platform>/<platform>_adapters.py`. Prevents tight coupling between platforms.

**ArcturusError**  
The base class for all typed exceptions in the Arcturus system. Subclasses include `SchemaViolation`, `BusinessRuleViolation`, and `IntegrationFailure`.

---

## B

**BusinessRuleViolation**  
A typed exception raised when data has a valid schema (Pydantic accepts it) but violates a domain-level rule (e.g., initializing a run that is already running).

---

## C

**Chain**  
An integration module in `src/integration/` that connects one or more platforms in sequence using contracts. The master chain is `e2e_chain.py`, which runs all 8 platforms.

**Checkpoint**  
A persisted JSON snapshot of the runtime engine's state at a given simulation tick. Enables recovery and replay. Managed by `checkpoint_store.py`.

**Contract**  
A Pydantic `BaseModel` that defines the exact shape of data passed between platforms. All contracts live in `contracts/`. The single source of truth for cross-platform communication.

**ContractEnvelope**  
The base wrapper class all platform contracts inherit from. Carries `SimulationContext` and a `contract_version` for drift detection.

**CODEOWNERS**  
A GitHub file at `.github/CODEOWNERS` that enforces mandatory code review by the appropriate platform owner. Prevents platform engineers from approving changes to code they do not own.

**Control Plane**  
The layer of Arcturus that defines the synthetic enterprise structure. Contains Ontology (Hamza), Enterprise (Ajwa), and Scenarios (Maryam).

---

## D

**Day 2 Contract Freeze**  
The point in the sprint after which no breaking changes may be made to outbound contracts without explicit governance approval. Enforced by `test_contract_stability.py`.

**Determinism**  
The property that the same `global_seed` + `experiment_id` always produces the same output across any number of repeated runs. Enforced throughout by using `context.subseed(namespace)` instead of raw random calls.

---

## E

**E2E Chain**  
The end-to-end integration chain (`execute_day5_e2e_chain()`) that runs all 8 platforms in sequence: Ontology → Enterprise → Workforce → Workflows → Scenarios → Synthetic Data → Runtime → Validation.

**EnterpriseInstanceContract**  
The Pydantic contract representing a fully generated synthetic company instance. Produced by Ajwa's `EnterpriseGenerator`.

**Execution Plane**  
The layer of Arcturus that operationalizes the enterprise structure. Contains Workforce (Syeda) and Workflows (Javeria).

**ExperimentResultPackage**  
The outbound contract from Maaz's Runtime Engine. Contains the full evidence of a completed simulation run, passed to Amina for validation.

---

## G

**global_seed**  
An integer field on `SimulationContext` that seeds all random operations in the simulation. The root of Arcturus's determinism guarantee.

**Governance Platform**  
The cross-cutting enforcement layer owned by Hashim Ali Khan. Runs automated scanners that enforce §2.1 import rules, §2.2 path rules, secret detection, and contract drift detection.

---

## I

**IntegrationFailure**  
A typed exception raised when a cross-platform contract could not be parsed or reconciled.

---

## O

**OntologySnapshotContract**  
The outbound contract from Hamza's Ontology platform. Defines the constitutional primitives of the synthetic organization (orgs, divisions, departments, roles, capabilities) at a point in time.

---

## P

**Platform**  
A self-contained engineering unit within Arcturus, owned by one engineer. Each platform has its own `contracts/`, `schemas/`, `src/`, and `tests/` directories.

**Pydantic**  
The Python validation library used throughout Arcturus for all data contracts. Provides automatic validation, serialization, and type enforcement.

---

## R

**RunHistoryRecord**  
An internal record kept by the Runtime Engine tracking the history of a simulation run. Stored internally by Maaz's platform.

**RuntimeEngine**  
The core simulation executor (`src/simulation/runtime_engine.py`) owned by Maaz. Provides `initialize_run()`, `step()`, and `finalize_run()`.

---

## S

**ScenarioDSLPayload**  
The canonical contract for defining what should happen in a simulation. Produced by Maryam's Scenario Engine. Consumed by the Runtime Engine.

**SchemaViolation**  
A typed exception raised when a Pydantic model rejects invalid input.

**SimulationContext**  
The root execution context shared by every platform. Contains `run_id`, `experiment_id`, `global_seed`, and `config`. All contracts carry a `SimulationContext`. Defined in `contracts/shared/base_models.py`.

**Subseed**  
A deterministic, namespaced integer derived from the `global_seed`. Computed via SHA-256: `context.subseed("workforce")` always returns the same integer for the same seed and namespace.

**SyntheticGenerationResult**  
The outbound contract from Ahmed's Synthetic Data platform. Contains a list of generated artifacts with provenance tracking. Fed into the Runtime Engine's `initialize_run()`.

---

## V

**ValidationResultContract**  
The final outbound contract from Amina's Validation & Evaluation platform. Contains the pass/fail status and evidence for each validation rule applied.

**Vertical Slice**  
A single, thin execution path that touches every layer of the system from top to bottom. The Week 3 goal was to produce one working vertical slice, not to complete every feature.

---

## W

**WorkforceAgentRoster**  
The outbound contract from Syeda's Workforce platform. Contains a collection of materialized, role-assigned synthetic agents ready for simulation.

**WorkflowDefinitionContract**  
The outbound contract from Javeria's Workflow platform. Contains an ordered sequence of activities, policies, and SLA constraints.
