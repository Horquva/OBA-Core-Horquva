# ADR-003 — Control Plane Directory Refactoring

**Status:** Accepted  
**Date:** Week 3, Day 5  
**Deciders:** Hashim Ali Khan

---

## Context

`ontology`, `enterprise`, and `scenario_engineering` were placed directly under `src/` instead of `src/control_plane/` as specified in CODEOWNERS and governance documentation. `scenario_engineering` also needed to be renamed to `scenarios` to match CODEOWNERS paths.

## Decision

Move all three into `src/control_plane/` and rename `scenario_engineering` → `scenarios`. Move misplaced `test_generator.py` from `src/enterprise/` to `tests/control/enterprise/`. Update all import paths globally.

## Consequences

- Directory structure now exactly matches CODEOWNERS governance paths.
- All 171 tests continue to pass.
- Governance scanner passes with zero violations.
