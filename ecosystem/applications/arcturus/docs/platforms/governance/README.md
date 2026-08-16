# Governance Platform

**Owner:** Hashim Ali Khan (`@Hashimali-khan`)  
**Source:** `src/governance/`  
**Tests:** `tests/governance/`, `tests/shared/`

---

## Purpose

The Governance Platform is the **automated enforcement machinery** that runs across all Arcturus platforms. It guarantees that:

1. No cross-platform direct `src/` imports exist (§2.1)
2. All files live under the correct plural path (§2.2)
3. No hardcoded secrets or credentials are committed
4. Contract shapes don't drift silently after the Day 2 freeze

Unlike other platforms that produce business output, Governance produces **evidence** — compliance reports, violation lists, and review-ready bundles.

---

## Architectural Laws Enforced

| Law | Rule | Enforcer File |
|---|---|---|
| §2.1 | No cross-platform `src/` imports | `import_boundary_checker.py` |
| §2.2 | Plural path only (`applications/`, not `application/`) | `path_enforcer.py` |
| §2.3 | No hardcoded secrets | `import_boundary_checker.scan_for_secret_patterns()` |
| §2.4 | No silent contract drift after Day 2 freeze | `test_contract_stability.py` |

---

## Key Files

| File | Day | Purpose |
|---|---|---|
| `src/governance/compliance_scanner.py` | Day 2 | Orchestration scanner — runs all checks |
| `src/governance/import_boundary_checker.py` | Day 2 | AST-based import scanner + secret scanner |
| `src/governance/path_enforcer.py` | Day 2 | Plural path law validator |
| `src/governance/reporting/markdown_reporter.py` | Day 3 | Generates GFM compliance report |
| `src/governance/reporting/pr_comment_payload.py` | Day 3 | Builds GitHub PR comment body |
| `src/integration/governance_evidence.py` | Day 5 | Aggregates all evidence for release candidate |
| `tests/conftest.py` | Day 1 | Shared pytest fixtures |
| `tests/helpers/simulation_context_factory.py` | Day 1 | Deterministic context factory |
| `tests/governance/test_compliance_engine.py` | Day 4 | 8 governance enforcement tests |
| `tests/shared/test_contract_stability.py` | Day 4 | Contract drift detection tests |

---

## How the Import Scanner Works

```
1. Walk all .py files under ecosystem/applications/arcturus/
   (excluding __pycache__, .git, venv, and tests/)

2. For each file:
   a. Parse it with Python's ast module
   b. Walk the AST looking for import statements
   c. Check if the import starts with any forbidden prefix
   d. Determine if the file "owns" the prefix (self-imports are allowed)
   e. Integration and governance files are fully exempt

3. Return ImportBoundaryResult with:
   - Total files scanned
   - List of ImportViolation objects
   - Human-readable .summary() string
```

---

## Running Governance Checks

```bash
# Full governance test suite (8 tests)
pytest ecosystem/applications/arcturus/tests/governance/ -v

# Contract stability suite
pytest ecosystem/applications/arcturus/tests/shared/test_contract_stability.py -v

# Both in one command (run before every PR)
pytest ecosystem/applications/arcturus/tests/governance/ \
       ecosystem/applications/arcturus/tests/shared/ -v
```

Expected output for a healthy codebase:
```
8 passed in 0.21s
```

---

## Calling the Scanner Directly

```python
from pathlib import Path
from ecosystem.applications.arcturus.src.governance.import_boundary_checker import (
    check_forbidden_direct_imports,
    scan_for_secret_patterns,
)

# Check for forbidden imports
result = check_forbidden_direct_imports(Path("ecosystem/applications/arcturus"))
print(result.summary())
# ✅ Import Boundary: 87 file(s) checked — 0 forbidden imports, 0 secret patterns

# Check for secrets
result = scan_for_secret_patterns(Path("ecosystem/applications/arcturus"))
print(result.is_compliant)   # True
```

---

## CI Integration

The `arcturus-governance-gate.yml` GitHub Actions workflow runs automatically on every PR. It blocks merging if:
- Any `ImportViolation` is detected
- Any `PathViolation` is detected  
- Any `SecretHit` is detected
- Any contract stability test fails

---

## CODEOWNERS Enforcement

The `.github/CODEOWNERS` file maps every directory to its owner. GitHub enforces mandatory review by the listed owner before any PR in their scope can be merged.

Key ownership assignments:

| Path | Owner |
|---|---|
| `src/control_plane/ontology/` | `@MuhammadHamza-7035` |
| `src/control_plane/enterprise/` | `@AjwaZainab` |
| `src/control_plane/scenarios/` | `@Maryam-Yaqoob` |
| `src/execution_plane/workforce/` | `@Syeda-Dua-Farwa` |
| `src/execution_plane/workflows/` | `@javeria1234-aaly` |
| `src/simulation/` | `@Khan5002` |
| `src/evaluation_plane/` | `@Amina-Khan380` |
| `src/synthetic_data/` | `@4hmad69` |
| `constitution/`, `ownership/`, `src/causal_reality/` | `@Hashimali-khan` |
| `tests/` | `@Amina-Khan380 @Hashimali-khan` |
| `src/integration/` | `@Hashimali-khan @Khan5002` |
