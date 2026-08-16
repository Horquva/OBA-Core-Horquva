# Coding Standards

**Arcturus Simulation Engineering Governance Platform**  
*Consistency improves readability and maintainability.*

---

## 1. Naming Conventions

### Python — Follow PEP 8

| Construct | Convention | Example |
|---|---|---|
| Variables | `snake_case` | `agent_count`, `run_id` |
| Functions / methods | `snake_case` | `build_roster()`, `compile_scenario()` |
| Classes | `PascalCase` | `EnterpriseGenerator`, `WorkforceService` |
| Constants | `UPPER_SNAKE_CASE` | `CONTRACT_SCHEMA_VERSION` |
| Modules / files | `snake_case` | `enterprise_generator.py`, `base_models.py` |
| Private helpers | `_snake_case` (leading underscore) | `_resolve_own_prefixes()` |

### Use Descriptive Names

Names must communicate intent without needing a comment to explain them:

```python
# ✅ Good
def materialize_agents(context: SimulationContext, enterprise_instance_id: str, agent_count: int) -> list[AgentProfile]:
    ...

# ❌ Bad
def mat_ag(ctx, eid, n):
    ...
```

---

## 2. Docstrings

Every public class, method, and function must have a docstring. Use the **Google-style** docstring format:

```python
def compile_scenario(self, payload: ScenarioDSLPayload) -> ScenarioDSLPayload:
    """
    Compile and validate a raw ScenarioDSLPayload.

    Validates preconditions, evaluates constraints, and returns
    a fully compiled payload ready for runtime dispatch.

    Args:
        payload: The raw scenario DSL payload from the contract layer.

    Returns:
        A validated, compiled ScenarioDSLPayload with all preconditions evaluated.

    Raises:
        BusinessRuleViolation: If any precondition fails evaluation.
        SchemaViolation: If the payload does not match the required shape.
    """
```

---

## 3. Type Hints

All function signatures must include type hints. Use `from __future__ import annotations` at the top of every file:

```python
from __future__ import annotations

def build_roster(
    self,
    context: SimulationContext,
    enterprise_instance_id: str,
    agents: list[AgentProfile],
    roles: list[WorkforceRoleContract],
) -> WorkforceAgentRoster:
    ...
```

---

## 4. Testing Standards

Every PR must include tests. Depending on the change:

| Test Type | When Required |
|---|---|
| Unit tests | Always — for every service method |
| Negative tests | Always — for every contract field constraint |
| Integration tests | When wiring two platforms together |
| E2E tests | On Day 5 / when adding new chain steps |

**Minimum bar:** every field with a `Field(...)` constraint (pattern, min_length, ge, etc.) must have a test that proves the constraint fires.

---

## 5. Error Handling

**Never use bare `Exception` or generic `ValueError`.** Always raise from the Arcturus error taxonomy:

```python
from ecosystem.applications.arcturus.contracts.shared.errors import (
    SchemaViolation,        # Pydantic-level failures
    BusinessRuleViolation,  # Valid schema, invalid domain state
    IntegrationFailure,     # Cross-platform reconciliation failures
)

# ✅ Correct
raise BusinessRuleViolation(f"Cannot step() before initialize_run() — run_id: {run_id}")

# ❌ Wrong
raise Exception("not initialized")
raise ValueError("error")
```

---

## 6. Logging

Use Python's standard `logging` module. Never use `print()` in production code:

```python
import logging

logger = logging.getLogger(__name__)

# ✅ Use structured log messages
logger.info("▶ Compiling scenario — scenario_id=%s", payload.scenario_id)
logger.warning("⚠ Precondition skipped — %s", condition)
logger.error("❌ Scenario failed to compile — %s: %s", scenario_id, exc)

# ❌ Don't use print()
print("starting scenario compilation")
```

**Never log sensitive data** — no seeds, no auth tokens, no personally identifiable information.

---

## 7. Contract Imports — Where to Import From

| What You Need | Import From |
|---|---|
| `SimulationContext`, `ContractEnvelope` | `contracts/shared/base_models.py` |
| Error types | `contracts/shared/errors.py` |
| Your platform's contract | `contracts/<plane>/<platform>/base_models.py` |
| Another platform's contract (consuming) | `contracts/<plane>/<platform>/base_models.py` |
| Enum / schema types | `schemas/<plane>/<platform>/base_schemas.py` |
| Your own service (internal) | `src/<plane>/<platform>/your_service.py` |
| Never | `src/<any-other-platform>/` |

---

## 8. File Headers

Every source file should open with a short docstring identifying its purpose and owner:

```python
"""
Arcturus — <Module Name>
========================
Platform: <Platform Name>
Owner: <Engineer Name> (@<github_handle>)
Day: <Day delivered>

<One-paragraph description of what this module does.>
"""
from __future__ import annotations
```

---

## 9. Documentation Evolves With Code

Every time you change a contract or service interface, update the corresponding doc in `docs/platforms/<your-platform>/`.

If you add a new exported class or function, add it to the contract inventory in `docs/reference/contract-inventory.md`.
