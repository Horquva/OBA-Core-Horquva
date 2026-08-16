# Contract Design Patterns

**Arcturus Simulation Engineering Governance Platform**

This document explains how to correctly design, write, and use Pydantic contracts as the sole communication layer between Arcturus platforms.

---

## 1. The Contract-First Principle

Every piece of data that crosses a platform boundary **must** be encoded as a Pydantic model. There are no exceptions.

### Why?
- **Validation at the boundary** — Pydantic rejects malformed data before it corrupts downstream state.
- **Self-documenting** — a contract model is the authoritative definition of what data looks like.
- **Governance-enforced** — the import boundary checker blocks any code that tries to bypass contracts with direct `src/` imports.

---

## 2. The Three-Layer Model

All Arcturus contracts follow a consistent inheritance hierarchy:

```
SimulationContext
    └── ContractEnvelope (wraps the context)
            └── YourPlatformContract (adds platform-specific fields)
```

### 2.1 SimulationContext

The root object that every contract carries. Never re-define it — always import from shared:

```python
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
```

### 2.2 ContractEnvelope

A thin wrapper that adds a `contract_version` field for drift detection:

```python
from ecosystem.applications.arcturus.contracts.shared.base_models import ContractEnvelope

class MyPlatformPayload(ContractEnvelope):
    # Your fields go here
    my_field: str
```

### 2.3 Platform Contract

Your actual contract. Always inherits `ContractEnvelope` (which carries `SimulationContext`):

```python
# contracts/control/ontology/base_models.py
from ecosystem.applications.arcturus.contracts.shared.base_models import ContractEnvelope
from pydantic import Field

class OntologySnapshotContract(ContractEnvelope):
    snapshot_version: str = Field(..., min_length=1)
    organizations: list[OrganizationState] = Field(default_factory=list)
    departments: list[DepartmentState] = Field(default_factory=list)
```

---

## 3. Field Design Rules

### Required Fields

Use `Field(...)` for required fields. Pydantic will raise `ValidationError` if they are missing:

```python
scenario_id: str = Field(..., pattern=r"^SCN-[A-Z]{2}-\d{3}$")
```

### Optional Fields With Defaults

```python
variables: dict[str, Any] = Field(default_factory=dict)
participants: list[str] = Field(default_factory=list)
```

### Constrained Fields

```python
global_seed: int = Field(..., ge=0)           # must be >= 0
experiment_id: str = Field(..., min_length=3)  # at least 3 chars
```

---

## 4. The Subseed Pattern — Determinism

Every platform must derive its random seed from the `SimulationContext.global_seed` using the namespaced subseed helper. **Never use `random.seed()` or `random.Random()` with a hardcoded value.**

```python
# ✅ Correct — deterministic, namespaced
rng = random.Random(context.subseed("enterprise"))

# ❌ Wrong — breaks determinism
rng = random.Random(42)
rng = random.Random()
```

The subseed function uses SHA-256 to derive a stable integer from the combination of `global_seed + namespace`. Same seed, same namespace = same subseed every time.

---

## 5. Error Taxonomy

Always raise typed Arcturus exceptions rather than bare `ValueError` or `Exception`:

```python
from ecosystem.applications.arcturus.contracts.shared.errors import (
    ArcturusError,
    SchemaViolation,
    BusinessRuleViolation,
    IntegrationFailure,
)

# Use SchemaViolation for Pydantic-level failures
raise SchemaViolation("Missing required field: scenario_id")

# Use BusinessRuleViolation for valid schema but invalid domain state
raise BusinessRuleViolation("Cannot finalize a run that was never initialized")

# Use IntegrationFailure for cross-platform data reconciliation errors
raise IntegrationFailure("OntologySnapshot version mismatch")
```

---

## 6. Contract Stability — The Day 2 Freeze

After the Day 2 contract lock, **no breaking changes** may be made to outbound contracts without explicit governance approval.

A **breaking change** is:
- Removing a required field
- Renaming a required field
- Changing the type of a field
- Adding a new required field (existing consumers will break)

A **non-breaking change** is:
- Adding a new optional field with a default value
- Adding validators that don't change the field shape

The `test_contract_stability.py` suite computes SHA-256 fingerprints of each contract's required field set and will fail if the shape changes unexpectedly.

---

## 7. Contract Inventory by Platform

| Contract | Platform | Location |
|---|---|---|
| `SimulationContext` | Shared | `contracts/shared/base_models.py` |
| `ContractEnvelope` | Shared | `contracts/shared/base_models.py` |
| `OntologySnapshotContract` | Ontology | `contracts/control/ontology/base_models.py` |
| `EnterpriseTemplatePayload` | Enterprise | `contracts/control/enterprise/base_models.py` |
| `EnterpriseConfigurationPayload` | Enterprise | `contracts/control/enterprise/base_models.py` |
| `ScenarioDSLPayload` | Scenarios | `contracts/control/scenarios/base_models.py` |
| `WorkforceAgentRoster` | Workforce | `contracts/execution/workforce/base_models.py` |
| `WorkflowDefinitionContract` | Workflows | `contracts/execution/workflows/base_models.py` |
| `SyntheticGenerationRequest` | Synthetic Data | `contracts/synthetic_data/base_models.py` |
| `SyntheticGenerationResult` | Synthetic Data | `contracts/synthetic_data/base_models.py` |
| `ValidationRun` | Evaluation | `contracts/evaluation/base_models.py` |
| `ValidationResultContract` | Evaluation | `contracts/evaluation/base_models.py` |

---

## 8. Full Contract Example

Here is a complete, correct contract implementation following all rules:

```python
# contracts/control/scenarios/base_models.py
from __future__ import annotations

from typing import Any
from pydantic import Field, field_validator

from ecosystem.applications.arcturus.contracts.shared.base_models import ContractEnvelope


class ScenarioDSLPayload(ContractEnvelope):
    """
    Canonical scenario definition passed from Scenario Engineering
    to the Simulation Runtime.
    
    Owner: Maryam Yaqoob (@Maryam-Yaqoob)
    Consumer: Muhammad Maaz Khan (Runtime), Amina Khan (Validation)
    """

    scenario_id: str = Field(
        ...,
        pattern=r"^SCN-[A-Z]{2}-\d{3}$",
        description="Canonical scenario identifier, e.g. SCN-GV-101"
    )
    description: str = Field(..., min_length=5)
    trigger_event: str = Field(..., min_length=1)
    participants: list[str] = Field(..., min_length=1)
    organizational_scope: list[str] = Field(..., min_length=1)
    variables: dict[str, Any] = Field(default_factory=dict)
    preconditions: list[str] = Field(default_factory=list)

    @field_validator("participants")
    @classmethod
    def participants_must_not_be_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("A scenario must have at least one participant")
        return value
```
