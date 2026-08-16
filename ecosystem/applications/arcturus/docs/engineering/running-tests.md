# Running Tests — Pytest Commands & Coverage

**Arcturus Simulation Engineering Governance Platform**

---

## Quick Reference

```bash
# Run all tests (most common command)
pytest ecosystem/applications/arcturus/tests/ -q

# Run with verbose output (shows each test name)
pytest ecosystem/applications/arcturus/tests/ -v

# Run a specific platform's tests
pytest ecosystem/applications/arcturus/tests/governance/ -v
pytest ecosystem/applications/arcturus/tests/simulation/ -v
pytest ecosystem/applications/arcturus/tests/evaluation/ -v

# Run a single file
pytest ecosystem/applications/arcturus/tests/shared/test_contract_stability.py -v

# Run a single test function
pytest ecosystem/applications/arcturus/tests/governance/test_compliance_engine.py::test_forbidden_import_is_blocked -v
```

---

## Expected Output

After a clean run, you should see:

```
171 passed in 1.26s
```

No failures. No warnings that shouldn't be there.

---

## Test Suite Layout

```
tests/
├── conftest.py                        # Shared fixtures (SimulationContext, seeds)
├── helpers/
│   └── simulation_context_factory.py  # build_simulation_context() helper
│
├── control/                           # Control Plane tests
│   ├── enterprise/
│   │   ├── test_enterprise_generation.py
│   │   └── test_generator.py          # Ajwa's generator tests
│   ├── ontology/
│   │   └── test_ontology_contracts.py
│   └── scenarios/
│       └── (scenario contract tests)
│
├── evaluation/                        # Amina's validation tests
│   └── test_validation_engine.py
│
├── execution/                         # Execution plane tests
│   └── workforce/
│
├── governance/                        # Governance enforcement tests
│   └── test_compliance_engine.py
│
├── integration/                       # E2E integration tests
│   ├── test_scenario_chain.py
│   └── test_workforce_service.py
│
├── ontology/                          # Ontology contract tests
│   └── test_ontology_contracts.py
│
├── scenarios/                         # Scenario DSL tests
│   └── test_scenario_payloads.py
│
├── shared/                            # Cross-platform contract stability
│   └── test_contract_stability.py
│
├── simulation/                        # Maaz's runtime tests
│   └── test_runtime_contracts.py
│
└── synthetic_data/                    # Ahmed's data generation tests
    ├── test_generation_adapters.py
    ├── test_generation_contracts.py
    └── test_generation_service.py
```

---

## Key Tests to Know

### Governance Compliance (Run Before Every PR)

```bash
pytest ecosystem/applications/arcturus/tests/governance/ -v
```

These 8 tests prove the entire governance machinery works:
- `test_forbidden_import_is_blocked` — §2.1 import scanner catches violations
- `test_clean_tree_has_no_import_violations` — clean code passes
- `test_path_violation_is_reported` — §2.2 path scanner catches bad paths
- `test_compliant_path_passes_enforcer` — correct paths pass
- `test_dirty_tree_is_rejected` — governance blocks bad code
- `test_clean_tree_is_accepted` — clean code is accepted
- `test_hardcoded_secret_is_flagged` — secret scanner catches credentials
- `test_clean_file_has_no_secret_hits` — clean files pass

### Contract Stability (Run After Any Contract Change)

```bash
pytest ecosystem/applications/arcturus/tests/shared/test_contract_stability.py -v
```

These tests compute SHA-256 fingerprints of each outbound contract's required fields. If any contract's shape changes unexpectedly, the test fails — protecting downstream consumers.

---

## Coverage Reporting

The Week 3 target is **≥ 80% line coverage** for each `src/<platform>/` module.

```bash
# Install coverage if not already present
pip install pytest-cov

# Run with coverage
pytest ecosystem/applications/arcturus/tests/ --cov=ecosystem/applications/arcturus/src --cov-report=term-missing

# Generate an HTML report
pytest ecosystem/applications/arcturus/tests/ --cov=ecosystem/applications/arcturus/src --cov-report=html
```

---

## Writing Good Tests

Every platform must have **both** positive and negative tests:

### Positive Test (Happy Path)
```python
def test_enterprise_is_generated_with_valid_inputs(seed_ctx):
    gen = EnterpriseGenerator()
    template = EnterpriseTemplatePayload(
        context=seed_ctx,
        template_id="TPL-001",
        ...
    )
    instance = gen.generate(template, config)
    assert instance.is_structurally_valid
```

### Negative Test (Failure Injection)
```python
def test_enterprise_rejects_empty_org_name(seed_ctx):
    with pytest.raises(ValidationError):
        EnterpriseTemplatePayload(
            context=seed_ctx,
            template_id="TPL-001",
            org_name="",   # empty string should fail validation
        )
```

> The rule: **every contract field that has a constraint must have a negative test that proves the constraint is enforced.**

---

## Using Shared Fixtures

The `conftest.py` provides ready-made fixtures for all tests:

```python
# In any test file, just declare the parameter name
def test_something(seed_ctx):
    # seed_ctx is a pre-built SimulationContext with seed=42
    assert seed_ctx.global_seed == 42

def test_determinism(seed_ctx):
    # Run twice with the same seed — must produce the same output
    result_a = MyService().process(seed_ctx)
    result_b = MyService().process(seed_ctx)
    assert result_a == result_b
```
