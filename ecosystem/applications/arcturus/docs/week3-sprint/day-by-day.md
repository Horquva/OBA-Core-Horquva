# Week 3 — Day-by-Day Blueprint

This is the authoritative file-by-file delivery map for the Week 3 sprint. Each engineer's exact target files, expected classes, and payload contracts are listed per day.

---

## Day 1 — Contract Bootstrap & Dependency Ordering

**Goal:** Freeze the shared payload vocabulary. Break the Hamza↔Ajwa chicken-and-egg by giving Hamza a bootstrap ontology contract before Ajwa depends on it.

---

### Hashim Ali Khan — Governance

| Target File | Key Deliverable |
|---|---|
| `tests/conftest.py` | Shared pytest fixtures |
| `tests/helpers/simulation_context_factory.py` | `build_simulation_context()`, `seed_fixture()` |
| `.github/CODEOWNERS` | `load_codeowners_map()`, ownership baseline |

---

### Muhammad Hamza — Enterprise Ontology

| Target File | Key Classes |
|---|---|
| `contracts/control/ontology/base_models.py` | `OntologyEntityContract`, `RelationshipContract`, `ConstraintRuleContract`, `OntologySnapshotContract` |
| `schemas/control/ontology/base_schemas.py` | Schema enums and value types |

**Inbound:** None (bootstrap; ships first)  
**Outbound:** `OntologySnapshotContract` → Ajwa, Amina, Maaz

---

### Ajwa Zainab — Synthetic Enterprise

| Target File | Key Classes |
|---|---|
| `contracts/control/enterprise/base_models.py` | `EnterpriseTemplateContract`, `EnterpriseConfigurationContract`, `EnterpriseInstanceContract` |
| `schemas/control/enterprise/base_schemas.py` | Schema enums |

**Inbound:** `OntologySnapshotContract` from Hamza  
**Outbound:** `EnterpriseStateContract` → Maaz, `OrganizationalContextPayload` → Javeria

---

### Maryam Yaqoob — Scenario Engineering

| Target File | Key Classes |
|---|---|
| `contracts/control/scenarios/base_models.py` | `ScenarioDSLPayload`, `ScenarioConstraintContract`, `ScenarioExpectationContract` |
| `schemas/control/scenarios/base_schemas.py` | Schema enums |

**Inbound:** None (defines the canonical scenario contract)  
**Outbound:** `ScenarioDSLPayload` → Maaz, `ScenarioExpectedOutcome` → Amina

---

### Syeda Dua e Farwa — Synthetic Workforce

| Target File | Key Classes |
|---|---|
| `contracts/execution/workforce/base_models.py` | `WorkforceAgentRoster`, `AgentProfileContract`, `WorkforceRoleContract` |
| `schemas/execution/workforce/base_schemas.py` | Schema enums |

**Inbound:** `EnterpriseInstanceContract` from Ajwa  
**Outbound:** `WorkforceAgentRoster` → Maaz, `AgentAssignmentPayload` → Javeria

---

### Javeria Rafhan — Behavior & Workflows

| Target File | Key Classes |
|---|---|
| `contracts/execution/workflows/base_models.py` | `WorkflowDefinitionContract`, `ActivityStateContract`, `PolicyGovernanceContract` |
| `schemas/execution/workflows/base_schemas.py` | Schema enums |

**Inbound:** `OrganizationalContextPayload` from Ajwa, `AgentAssignmentPayload` from Syeda  
**Outbound:** `WorkflowDefinitionContract` → Maaz, `WorkflowExecutionEvidence` → Amina

---

### Muhammad Maaz Khan — Simulation Runtime

| Target File | Key Classes |
|---|---|
| `contracts/simulation/base_models.py` | `SimulationContext`, `CapabilityDependencyGraph`, `ExperimentResultPackage` |
| `schemas/simulation/base_schemas.py` | Schema enums |

**Inbound:** All upstream contracts (Hamza, Ajwa, Maryam, Syeda, Javeria, Ahmed)  
**Outbound:** `ExperimentResultPackage` → Amina

---

### Amina Khan — Validation & Evaluation

| Target File | Key Classes |
|---|---|
| `contracts/evaluation/base_models.py` | `ValidationRun`, `EvidenceContract`, `ValidationRuleContract`, `ValidationResultContract` |
| `schemas/evaluation/base_schemas.py` | Schema enums |

**Inbound:** `ExperimentResultPackage` from Maaz  
**Outbound:** `ValidationResultContract` → intelligence layer

---

### Ahmed Raza — Synthetic Data

| Target File | Key Classes |
|---|---|
| `contracts/synthetic_data/base_models.py` | `SyntheticGenerationRequest`, `SyntheticArtifactContract`, `SyntheticGenerationResult` |
| `schemas/synthetic_data/base_schemas.py` | Schema enums |

**Inbound:** `SimulationContext` from runtime  
**Outbound:** `SyntheticGenerationResult` → Maaz's `initialize_run()`

---

## Day 2 — Local Logic & Typed Failure Handling

**Goal:** Each platform implements its local service engine. No cross-platform imports. All failures use typed `ArcturusError` subclasses.

---

| Engineer | Target File | Key Classes/Methods |
|---|---|---|
| Hashim | `src/governance/compliance_scanner.py` | `ArcturusComplianceScanner` |
| Hashim | `src/governance/path_enforcer.py` | `validate_path_boundaries()` |
| Hashim | `src/governance/import_boundary_checker.py` | `check_forbidden_direct_imports()`, `scan_for_secret_patterns()` |
| Hamza | `src/control_plane/ontology/ontology_service.py` | `OntologyService`, `resolve_relationships()`, `validate_constraints()`, `build_snapshot()` |
| Ajwa | `src/control_plane/enterprise/enterprise_generator.py` | `EnterpriseGenerator`, `generate()`, `resolve_hierarchy()`, `validate_structure()` |
| Maryam | `src/control_plane/scenarios/scenario_engine.py` | `ScenarioEngine`, `compile_scenario()`, `evaluate_preconditions()`, `build_expected_outcome()` |
| Syeda | `src/execution_plane/workforce/workforce_service.py` | `WorkforceService`, `materialize_agents()`, `assign_roles()`, `build_roster()` |
| Javeria | `src/execution_plane/workflows/workflow_service.py` | `WorkflowService`, `compile_workflow()`, `evaluate_sla()`, `build_execution_trace()` |
| Maaz | `src/simulation/runtime_engine.py` | `RuntimeEngine`, `initialize_run()`, `step()`, `finalize_run()` |
| Amina | `src/evaluation_plane/validation_engine.py` | `ValidationEngine`, `run_validation()`, `evaluate_logic_rule()` |
| Ahmed | `src/synthetic_data/generation_service.py` | `SyntheticGenerationService`, `generate_snapshot()`, `build_provenance()` |

---

## Day 3 — Adapters & Integration Wiring

**Goal:** Add the translator layer. Connect the vertical slice. Internal structures get mapped to shared contracts and back without coupling to sibling implementations.

---

| Engineer | Target Adapter File |
|---|---|
| Hashim | `src/governance/reporting/markdown_reporter.py` |
| Hashim | `src/governance/reporting/pr_comment_payload.py` |
| Hamza | `src/control_plane/ontology/ontology_adapters.py` |
| Ajwa | `src/control_plane/enterprise/enterprise_adapters.py` |
| Maryam | `src/control_plane/scenarios/scenario_adapters.py` |
| Syeda | `src/execution_plane/workforce/workforce_adapters.py` |
| Javeria | `src/execution_plane/workflows/workflow_adapters.py` |
| Maaz | `src/simulation/runtime_adapters.py` |
| Amina | `src/evaluation_plane/validation_adapters.py` |
| Ahmed | `src/synthetic_data/generation_adapters.py` |

---

## Day 4 — Failure Injection & Governance Gates

**Goal:** Prove contracts fail safely. Prove governance blocks unsafe changes.

---

| Engineer | Target Test File | Key Tests |
|---|---|---|
| Hashim | `tests/governance/test_compliance_engine.py` | `test_forbidden_import_is_blocked()`, `test_dirty_tree_is_rejected()` |
| Hashim | `tests/shared/test_contract_stability.py` | `test_outbound_contract_has_not_silently_drifted()` |
| Hamza | `tests/ontology/test_ontology_contracts.py` | Schema violation and negative tests |
| Ajwa | `tests/control/enterprise/test_enterprise_generation.py` | Structure failure injection |
| Maryam | `tests/scenarios/test_scenario_payloads.py` | Constraint and participant validation |
| Syeda | `tests/execution/workforce/test_workforce_payloads.py` | Role assignment failures |
| Javeria | `tests/execution/workflows/test_workflow_contracts.py` | SLA and policy violations |
| Maaz | `tests/simulation/test_runtime_contracts.py` | State machine violations |
| Amina | `tests/evaluation/test_validation_engine.py` | Evidence and rule failures |
| Ahmed | `tests/synthetic_data/test_generation_contracts.py` | Provenance and artifact failures |

---

## Day 5 — End-to-End Slice & Evidence Package

**Goal:** One integrated execution path with telemetry, governance evidence, and a review-ready bundle.

---

| Engineer | Integration Chain File |
|---|---|
| Hashim | `src/integration/governance_evidence.py` |
| Hamza | `src/integration/ontology_chain.py` |
| Ajwa | `src/integration/enterprise_chain.py` |
| Maryam | `src/integration/scenario_chain.py` |
| Syeda | `src/integration/workforce_chain.py` |
| Javeria | `src/integration/workflow_chain.py` |
| Maaz | `src/integration/runtime_chain.py` |
| Amina | `src/integration/validation_chain.py` |
| Ahmed | `src/integration/synthetic_data_chain.py` |
| **All** | `src/integration/e2e_chain.py` |

**The complete chain:**
```
Ontology → Enterprise → Workforce → Workflows → Scenarios
       → Synthetic Data → Runtime → Validation
```
