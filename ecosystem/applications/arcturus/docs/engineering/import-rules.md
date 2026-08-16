# Import Rules — §2.1 Boundary Enforcement

**Arcturus Simulation Engineering Governance Platform**

This document explains the §2.1 No Coupling Without Contract law, what it means in practice, and how the enforcement machinery works.

---

## The Rule

> **Interns and platform engineers are forbidden from importing another platform's internal `src/` modules directly. All cross-platform communication must be mediated through Pydantic payloads housed in `contracts/` or `schemas/`.**

This is not a suggestion. It is an architectural law enforced by automated tooling on every commit.

---

## Why This Matters

Without this rule, platforms would become tightly coupled. Changing an internal implementation in one platform (e.g., renaming a class in `ontology_service.py`) would silently break every other platform that imports it directly. The result is a fragile codebase where no one can safely refactor anything.

By enforcing contract-mediated communication, each platform can evolve its internal implementation freely as long as it preserves the shape of its outbound contracts.

---

## Allowed vs Forbidden

### ✅ Allowed — Import from `contracts/` or `schemas/`

```python
# This is correct — you're consuming a shared Pydantic model
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.control.ontology.base_models import OntologySnapshotContract
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import ActivityStatus
```

### ✅ Allowed — Import your own platform's `src/` internally

```python
# This is correct — Ajwa importing from her own enterprise src/
from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import EnterpriseGenerator
```

### ✅ Allowed — Integration and Governance orchestrators

```python
# Integration files (src/integration/) and governance files (src/governance/)
# are exempt from §2.1 — they are explicitly permitted to import
# across platform boundaries to wire the full chain together.
```

### ❌ Forbidden — Direct cross-platform src/ import

```python
# This is a violation — Ajwa importing Hamza's internal service directly
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_service import OntologyService

# This is a violation — Syeda importing Ajwa's internal generator
from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import EnterpriseGenerator
```

---

## How the Enforcement Works

The `import_boundary_checker.py` module uses Python's `ast` (Abstract Syntax Tree) library to statically analyze every `.py` file in the repository.

For each file, it:
1. Parses the file into an AST
2. Walks the AST looking for `import` and `from ... import` statements
3. Checks if the imported module path starts with any entry in `_FORBIDDEN_CROSS_PLATFORM_PREFIXES`
4. Determines if the importing file is the _owner_ of that prefix (self-imports are allowed)
5. Reports any violations

**Integration and governance files are explicitly exempted** — they are the wiring layer that connects all platforms.

---

## Forbidden Prefixes (Current)

These module paths are monitored by the scanner. Any file importing from these paths (and not being the platform that owns them) will trigger a violation:

```python
_FORBIDDEN_CROSS_PLATFORM_PREFIXES = [
    "ecosystem.applications.arcturus.src.control_plane.ontology",
    "ecosystem.applications.arcturus.src.control_plane.enterprise",
    "ecosystem.applications.arcturus.src.control_plane.scenarios",
    "ecosystem.applications.arcturus.src.execution_plane.workforce",
    "ecosystem.applications.arcturus.src.execution_plane.workflows",
    "ecosystem.applications.arcturus.src.simulation",
    "ecosystem.applications.arcturus.src.synthetic_data",
    "ecosystem.applications.arcturus.src.evaluation_plane",
]
```

---

## Running the Import Check Manually

```bash
# Run just the governance/compliance tests
pytest ecosystem/applications/arcturus/tests/governance/ -v

# Or invoke the checker directly in Python
python -c "
from pathlib import Path
from ecosystem.applications.arcturus.src.governance.import_boundary_checker import check_forbidden_direct_imports
result = check_forbidden_direct_imports(Path('ecosystem/applications/arcturus'))
print(result.summary())
"
```

---

## What Happens When a Violation is Found

The CI pipeline (`arcturus-governance-gate.yml`) blocks the PR from merging. The output will look like:

```
❌ Import Boundary: 1 forbidden import(s):
  • src/control_plane/enterprise/enterprise_generator.py:8
    → ecosystem.applications.arcturus.src.control_plane.ontology.ontology_service
```

To fix: replace the direct import with a contract import from `contracts/`.

---

## The §2.2 Plural Path Rule

A second rule enforced by `path_enforcer.py`:

> Every file must live under `ecosystem/applications/arcturus/` — never under the singular `ecosystem/application/arcturus/`.

This is enforced by scanning all file paths in the repository and flagging any that match the singular pattern.
