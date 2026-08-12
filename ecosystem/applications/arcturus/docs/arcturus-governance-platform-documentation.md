# Arcturus Governance Platform — Architecture, User Guide & Implementation Documentation

**Platform Name:** Arcturus Simulation Engineering Governance Platform  
**Governance Owner:** Hashim Ali Khan (`@Hashimali-khan`)  
**Scope:** Days 1–5 Compressed Vertical-Slice & Governance Integrity Layer  
**Repository Location:** `ecosystem/applications/arcturus/`  
**Status:** ✅ Fully Implemented, Verified (16/16 Pytest Suite Passing)

---

## 1. Executive Summary & Platform Mission

As Platform Owner and Governance Lead for **Arcturus**, Hashim Ali Khan is responsible for the platform integrity layer, automated quality gates, structural compliance scanners, shared test harness, contract drift detection, and continuous integration workflows.

While individual platform owners build domain services (Ontology, Enterprise, Scenarios, Workforce, Workflows, Simulation Runtime, Validation, Synthetic Data), the **Governance Platform** acts as the automated enforcement machinery. It guarantees that:
1. **Cross-Platform Coupling is Mediated strictly by Pydantic Contracts** (§2.1 — No direct `src/` cross-imports).
2. **Repository Paths follow the Plural Convention** (§2.2 — `ecosystem/applications/arcturus/`).
3. **No Hardcoded Secrets, Tokens, or API Keys** reach the repository.
4. **Working-Tree Hygiene and Deterministic Behavior** are maintained across all platform modules.
5. **Contract Drift** is automatically detected and blocked on every Pull Request.

---

## 2. Architectural Laws Enforced by Automation

### 2.1 No Coupling Without Contract (§2.1)
- **Law:** Platform owners are forbidden from importing another platform's internal `src/` modules directly (e.g. `from ecosystem.applications.arcturus.src.ontology import OntologyController`).
- **Enforcement:** `import_boundary_checker.py` uses Python's Abstract Syntax Tree (`ast`) to inspect import statements in all `.py` files. Cross-platform imports across `src/` boundaries trigger a blocking violation. All cross-platform interactions must be mediated via Pydantic models inside `contracts/` or `schemas/`.

### 2.2 Plural Path Enforcement (§2.2)
- **Law:** Every module, schema, contract, and test file must live under `ecosystem/applications/arcturus/`. The singular form (`ecosystem/application/arcturus/`) is strictly forbidden.
- **Enforcement:** `path_enforcer.py` performs recursive path scans and flags any file paths matching singular path variants.

### 2.3 Hardcoded Secret & Credential Scanning
- **Law:** No AWS keys, Bearer tokens, private keys, or API credentials may be committed.
- **Enforcement:** `import_boundary_checker.py` includes `scan_for_secret_patterns()`, executing regex pattern matching against `.py`, `.yml`, `.json`, `.env`, and `.cfg` files.

### 2.4 Contract Stability & Drift Lock
- **Law:** Undocumented breaking contract changes after the Day 2 contract freeze are forbidden.
- **Enforcement:** `test_contract_stability.py` computes SHA-256 schema fingerprints for registered outbound contracts, asserting that required fields are not added or removed without explicit governance review.

---

## 3. Comprehensive File Inventory & Module Reference

All 11 governance files generated across Days 1–5 are detailed below:

```
ecosystem/applications/arcturus/
├── .github/
│   └── workflows/
│       └── arcturus-governance-gate.yml               [Day 3] GitHub Actions CI Workflow
├── src/
│   ├── governance/
│   │   ├── __init__.py                                 [Package Marker]
│   │   ├── compliance_scanner.py                       [Day 2] Orchestration Scanner
│   │   ├── import_boundary_checker.py                  [Day 2] AST Import & Secret Scanner
│   │   ├── path_enforcer.py                            [Day 2] Plural Path Law Validator
│   │   └── reporting/
│   │       ├── __init__.py                             [Package Marker]
│   │       ├── markdown_reporter.py                    [Day 3] GFM Report Generator
│   │       └── pr_comment_payload.py                   [Day 3] GitHub PR Comment Builder
│   └── integration/
│       ├── __init__.py                                 [Package Marker]
│       └── governance_evidence.py                      [Day 5] Release Candidate Aggregator
└── tests/
    ├── conftest.py                                     [Day 1] Shared Pytest Fixtures
    ├── helpers/
    │   ├── __init__.py                                 [Package Marker]
    │   └── simulation_context_factory.py               [Day 1] Deterministic Context Factory
    ├── governance/
    │   ├── __init__.py                                 [Package Marker]
    │   └── test_compliance_engine.py                   [Day 4] Failure Injection Suite
    └── shared/
        ├── __init__.py                                 [Package Marker]
        └── test_contract_stability.py                  [Day 4] Contract Drift Suite
```

---

### 📄 Detailed Component Breakdown

#### Day 1 — Shared Test Harness & Context Factories
1. **[conftest.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/tests/conftest.py)**
   - **Role:** Central Pytest configuration.
   - **Key Fixtures:**
     - `simulation_context`: Session-scoped deterministic `SimulationContext` (seed=42).
     - `seed_fixture`: Function-scoped access to the default seed (`42`).
     - `codeowners_map`: Session-scoped parsed dictionary of `.github/CODEOWNERS`.

2. **[simulation_context_factory.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/tests/helpers/simulation_context_factory.py)**
   - **Role:** Factory functions for context and configuration.
   - **Key Functions:**
     - `build_simulation_context(experiment_id, global_seed, config)`: Creates validated `SimulationContext` objects.
     - `seed_fixture()`: Returns default seed (`42`).
     - `load_codeowners_map(path)`: Parses GitHub `CODEOWNERS` lines into `{path_pattern: [owners]}` maps.

---

#### Day 2 — Compliance Scanner & Boundary Enforcers
3. **[path_enforcer.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/governance/path_enforcer.py)**
   - **Role:** Enforces the Plural Path Law (§2.2).
   - **Key Functions & Classes:**
     - `validate_path_boundaries(scan_root)`: Scans for forbidden `ecosystem/application/arcturus/` paths.
     - `PathEnforcerResult`: Data structure holding `scanned_root`, `total_files_checked`, and `violations`.

4. **[import_boundary_checker.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/governance/import_boundary_checker.py)**
   - **Role:** AST-based import parser and secret detector.
   - **Key Functions & Classes:**
     - `check_forbidden_direct_imports(scan_root)`: AST inspection preventing cross-platform `src/` imports.
     - `scan_for_secret_patterns(scan_root)`: Regex scanner matching AWS keys, bearer tokens, and passwords.
     - `ImportBoundaryResult`: Aggregates import violations and secret hits.

5. **[compliance_scanner.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/governance/compliance_scanner.py)**
   - **Role:** Unified scanner coordinator.
   - **Key Classes:**
     - `ArcturusComplianceScanner`: Runs path checks, import checks, secret scans, and `git status` dirtiness checks.
     - `ComplianceScanReport`: Evaluates `is_compliant` property and produces unified summary logs.

---

#### Day 3 — Markdown Reporting & CI Integration
6. **[markdown_reporter.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/governance/reporting/markdown_reporter.py)**
   - **Role:** GitHub Flavored Markdown renderer.
   - **Key Functions:**
     - `emit_markdown_report(report, output_path)`: Renders `ComplianceScanReport` into structured GFM tables and writes report files.

7. **[pr_comment_payload.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/governance/reporting/pr_comment_payload.py)**
   - **Role:** Converts scan reports into REST API payloads.
   - **Key Functions:**
     - `build_pr_comment_payload(report)`: Generates JSON payloads for GitHub PR comments with hidden tracking tags (`<!-- arcturus-governance-gate -->`).

8. **[arcturus-governance-gate.yml](file:///c:/data/Horquva/OBA-Core-Horquva/.github/workflows/arcturus-governance-gate.yml)**
   - **Role:** GitHub Actions workflow.
   - **Trigger:** Pull Requests targeting `initiative/arcturus` with changes under `ecosystem/applications/arcturus/**`.
   - **Action:** Runs scanner, uploads artifacts, posts/updates PR comments, and blocks non-compliant merges.

---

#### Day 4 — Failure Injection & Stability Tests
9. **[test_compliance_engine.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py)**
   - **Role:** Failure-injection test suite for the scanner.
   - **Key Tests:**
     - `test_forbidden_import_is_blocked()`
     - `test_path_violation_is_reported()`
     - `test_dirty_tree_is_rejected()`
     - `test_hardcoded_secret_is_flagged()`

10. **[test_contract_stability.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/tests/shared/test_contract_stability.py)**
    - **Role:** Contract drift prevention suite.
    - **Key Tests:**
      - `test_outbound_contract_has_not_silently_drifted()`: Parameterized check over contract schema fingerprints.
      - `test_simulation_context_global_seed_must_be_non_negative()`

---

#### Day 5 — Evidence Aggregation & Release Candidate Report
11. **[governance_evidence.py](file:///c:/data/Horquva/OBA-Core-Horquva/ecosystem/applications/arcturus/src/integration/governance_evidence.py)**
    - **Role:** End-to-end evidence bundler.
    - **Key Functions & Classes:**
      - `aggregate_evidence()`: Scans all 8 team platform manifests for required files (`contracts/`, `schemas/`, `src/`, `tests/`), executes compliance checks, and runs Pytest.
      - `build_release_candidate_report(bundle)`: Emits final Release Candidate Markdown review bundle.

---

## 4. How-To Guide for Team Members

### 🏃 Running Governance Checks Locally

#### 1. Execute full Pytest suite (Governance + Contract Stability)
```bash
python -m pytest ecosystem/applications/arcturus/tests/governance/ ecosystem/applications/arcturus/tests/shared/ -v
```

#### 2. Run the Compliance Scanner in Python
```python
from ecosystem.applications.arcturus.src.governance.compliance_scanner import ArcturusComplianceScanner

scanner = ArcturusComplianceScanner()
report = scanner.run_full_scan()

print(report.summary())
print(f"Compliant: {report.is_compliant}")
```

#### 3. Generate a Markdown Compliance Report
```python
from ecosystem.applications.arcturus.src.governance.compliance_scanner import ArcturusComplianceScanner
from ecosystem.applications.arcturus.src.governance.reporting.markdown_reporter import emit_markdown_report

scanner = ArcturusComplianceScanner()
report = scanner.run_full_scan()
md = emit_markdown_report(report, output_path="governance_report.md")
```

#### 4. Generate the Day 5 Release Candidate Evidence Package
```python
from ecosystem.applications.arcturus.src.integration.governance_evidence import (
    aggregate_evidence,
    build_release_candidate_report,
)

bundle = aggregate_evidence()
report_md = build_release_candidate_report(bundle, output_path="release_candidate_report.md")
print("Release Candidate Report written to release_candidate_report.md")
```

---

## 5. Verification & Test Suite Status

All governance components have been verified locally against Python 3.13 / 3.11 runtimes:

```
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\data\Horquva\OBA-Core-Horquva
collected 16 items

ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_forbidden_import_is_blocked PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_clean_tree_has_no_import_violations PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_path_violation_is_reported PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_compliant_path_passes_enforcer PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_dirty_tree_is_rejected PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_clean_tree_is_accepted PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_hardcoded_secret_is_flagged PASSED
ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_clean_file_has_no_secret_hits PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_outbound_contract_has_not_silently_drifted[SimulationContext] PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_outbound_contract_has_not_silently_drifted[ContractEnvelope] PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_outbound_contract_has_not_silently_drifted[ScenarioDSLPayload] PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_outbound_contract_has_not_silently_drifted[SimulationContext (runtime copy)] PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_outbound_contract_has_not_silently_drifted[SyntheticGenerationRequest] PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_simulation_context_global_seed_must_be_non_negative PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_simulation_context_experiment_id_min_length PASSED
ecosystem/applications/arcturus/tests/shared/test_contract_stability.py::test_simulation_context_is_deterministic_for_same_seed PASSED

============================= 16 passed in 0.76s ==============================
```

---

## 6. Guidelines for Teammates & PR Reviewers

1. **Importing shared models:** Always import from `ecosystem.applications.arcturus.contracts.shared.base_models` or your platform's `contracts/` directory. Never import from another platform's `src/` directory.
2. **Pathing:** Ensure all newly created files are inside `ecosystem/applications/arcturus/`.
3. **Tests:** Use the `simulation_context` fixture from `tests/conftest.py` for deterministic test setup.
4. **Contract Updates:** If you must update a Pydantic contract model, notify `@Hashimali-khan` to review the corresponding baseline entry in `test_contract_stability.py`.
