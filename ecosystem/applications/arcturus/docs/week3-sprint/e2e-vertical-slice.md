# E2E Vertical Slice Guide

**Running and Interpreting the Arcturus End-to-End Chain**

---

## Overview

The Day 5 E2E chain is the ultimate integration test for Arcturus. It runs all 8 platforms in sequence, using only shared contracts as the communication layer, and produces a structured result you can inspect.

The chain is implemented in:
```
src/integration/e2e_chain.py → execute_day5_e2e_chain()
```

---

## Running the Chain

### Option 1 — Python Script (Recommended for Manual Testing)

```python
# Save as demo.py in the repo root, then: python demo.py
import json
from datetime import datetime
from ecosystem.applications.arcturus.src.integration.e2e_chain import execute_day5_e2e_chain

def serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

result = execute_day5_e2e_chain(
    experiment_id="YOUR-EXP-001",
    global_seed=42            # change this to get a different but still deterministic run
)

print("Status:", "SUCCESS" if result["success"] else "FAILED")
print("\nSteps:")
for step in result["steps_executed"]:
    print(f"  {step}")

print("\nPayloads:")
print(json.dumps(result["results"], indent=2, default=serializer))
```

### Option 2 — Integration Test Suite

```bash
pytest ecosystem/applications/arcturus/tests/integration/ -v
```

### Option 3 — Full Test Suite (All 171 Tests)

```bash
pytest ecosystem/applications/arcturus/tests/ -q
```

---

## Understanding the Output

A successful run produces output like this:

```json
{
  "context": {
    "run_id": "a1b2c3d4-...",
    "experiment_id": "YOUR-EXP-001",
    "global_seed": 42
  },
  "success": true,
  "steps_executed": [
    "Ontology (Hamza)",
    "Enterprise (Ajwa)",
    "Workforce (Syeda)",
    "Workflows (Javeria)",
    "Scenarios (Maryam)",
    "Synthetic Data (Ahmed)",
    "Runtime (Maaz)",
    "Validation (Amina)"
  ],
  "results": {
    "ontology": {
      "snapshot_version": "1.0",
      "org_name": "Arcturus Enterprise Systems",
      "department_count": 1
    },
    "enterprise": {
      "org_name": "Arcturus Enterprise Systems",
      "is_valid": true,
      "department_count": 1
    },
    "workforce": {
      "agent_count": 5,
      "enterprise_instance_id": "ENT-001"
    },
    "workflows": {
      "workflow_id": "WF-GOV-001",
      "activity_count": 1
    },
    "scenarios": {
      "scenario_id": "SCN-GV-101",
      "is_compiled": true
    },
    "synthetic_data": {
      "artifact_count": 100,
      "provenance_hash": "c75ab8cf..."
    },
    "runtime": {
      "status": "completed",
      "ended_at": "2026-08-16T17:45:51.107445+00:00"
    },
    "validation": {
      "validation_status": "validated"
    }
  }
}
```

### What Each Field Means

| Field | Platform | What It Tells You |
|---|---|---|
| `ontology.snapshot_version` | Hamza | Ontology schema version used |
| `ontology.org_name` | Hamza | Name of the synthetic org |
| `enterprise.is_valid` | Ajwa | Whether the enterprise instance passed structural validation |
| `enterprise.department_count` | Ajwa | How many departments were generated |
| `workforce.agent_count` | Syeda | How many synthetic agents were materialized |
| `workflows.activity_count` | Javeria | How many activities in the governance workflow |
| `scenarios.is_compiled` | Maryam | Whether the scenario DSL compiled without errors |
| `synthetic_data.artifact_count` | Ahmed | Total artifacts generated |
| `synthetic_data.provenance_hash` | Ahmed | SHA-256 fingerprint — same seed = same hash |
| `runtime.status` | Maaz | `"completed"` = all ticks ran successfully |
| `validation.validation_status` | Amina | `"validated"` = all rules passed |

---

## Determinism Check

The same `global_seed` must always produce the same `provenance_hash`. This is a hard requirement:

```python
# These two calls must produce identical provenance_hash values
result_a = execute_day5_e2e_chain(experiment_id="TEST", global_seed=42)
result_b = execute_day5_e2e_chain(experiment_id="TEST", global_seed=42)

assert result_a["results"]["synthetic_data"]["provenance_hash"] == \
       result_b["results"]["synthetic_data"]["provenance_hash"]
```

---

## Diagnosing a Failed Step

If a step fails, `success` will be `False` and the failing step name will include `[FAILED]`:

```json
{
  "success": false,
  "steps_executed": [
    "Ontology (Hamza)",
    "Enterprise (Ajwa) [FAILED]",
    "Workforce (Syeda)",
    ...
  ],
  "results": {
    "enterprise": {
      "error": "BusinessRuleViolation: Enterprise template requires at least one business unit"
    }
  }
}
```

The chain is designed to be **fault-tolerant per step** — a failure in one step does not abort the entire chain. This lets you see the full failure map in one run.

---

## Checking Governance Compliance

Before any integration test, run the compliance gate:

```bash
# Import boundary check (§2.1)
pytest ecosystem/applications/arcturus/tests/governance/ -v

# Contract stability (§2.4)
pytest ecosystem/applications/arcturus/tests/shared/test_contract_stability.py -v
```

All 8 governance tests must pass. Any failure indicates a structural violation in the codebase that must be fixed before merging.
