# ADR-001 — Initial Repository & Governance Setup

**Status:** Accepted  
**Date:** Week 3, Day 1  
**Deciders:** Hashim Ali Khan  

---

## Context

Arcturus requires a shared governance baseline before individual platform engineers can begin work. The risk of engineers starting in parallel with no shared conventions is import chaos, path drift, and untestable code by Day 5.

## Decision

1. Establish `.github/CODEOWNERS` before any platform code is written, so every file has a defined reviewer.
2. Create a shared `tests/conftest.py` with a deterministic `SimulationContext` fixture so all tests start from a common baseline.
3. Create `tests/helpers/simulation_context_factory.py` to encapsulate deterministic context creation.
4. Define `contracts/shared/base_models.py` with `SimulationContext` and `ContractEnvelope` as the foundation every other contract builds on.

## Consequences

- All platform engineers have a common test fixture on Day 1.
- CODEOWNERS ensures no platform's files can be merged without the right reviewer.
- `SimulationContext` is the single source of truth for execution context — no platform redefines it.

---

# ADR-002 — No Cross-Platform Direct Imports (§2.1)

**Status:** Accepted  
**Date:** Week 3, Day 1  
**Deciders:** Hashim Ali Khan  

---

## Context

If platform engineers import each other's `src/` modules directly, Arcturus becomes a tightly coupled monolith. Any internal refactor in one platform breaks all consumers. This is the most common failure mode in multi-team codebases.

## Decision

Enforce §2.1: all cross-platform communication must be mediated exclusively by Pydantic models in `contracts/` or `schemas/`. Direct `src/` imports across platform boundaries are forbidden and enforced by AST-based scanning in `import_boundary_checker.py`.

**Exemptions:** `src/integration/` and `src/governance/` files are explicitly permitted to import across boundaries — they are the wiring layer.

## Consequences

- Every platform can evolve its internal implementation without breaking consumers.
- The contract layer is the public API of each platform.
- The governance scanner automatically blocks violations in CI.
- Slightly more boilerplate (adapters) required per platform, but significantly higher resilience.

---

# ADR-003 — Control Plane Directory Refactoring

**Status:** Accepted  
**Date:** Week 3, Day 5  
**Deciders:** Hashim Ali Khan  

---

## Context

The original implementation placed `ontology`, `enterprise`, and `scenario_engineering` directly under `src/` (e.g., `src/ontology/`). The CODEOWNERS file and governance blueprint specified these should live under `src/control_plane/` (e.g., `src/control_plane/ontology/`). This structural drift meant the codebase did not match its own governance documentation.

Additionally, `scenario_engineering` was renamed to `scenarios` to align with the CODEOWNERS path `src/control_plane/scenarios/`.

## Decision

Move all three directories into `src/control_plane/` and rename `scenario_engineering` to `scenarios`:

- `src/ontology/` → `src/control_plane/ontology/`
- `src/enterprise/` → `src/control_plane/enterprise/`
- `src/scenario_engineering/` → `src/control_plane/scenarios/`

Additionally, move Ajwa's misplaced `test_generator.py` from `src/control_plane/enterprise/` to `tests/control/enterprise/` where it belongs.

Update all import paths throughout the codebase accordingly.

## Consequences

- Directory structure now exactly matches CODEOWNERS governance paths.
- All 171 tests continue to pass post-refactor.
- Governance scanner continues to pass with zero violations.
- Import paths in all files updated via global search-and-replace.
- `import_boundary_checker.py` `_FORBIDDEN_CROSS_PLATFORM_PREFIXES` updated to remove old stale entries.
