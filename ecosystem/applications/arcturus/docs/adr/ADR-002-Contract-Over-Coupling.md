# ADR-002 — No Cross-Platform Direct Imports (§2.1)

**Status:** Accepted  
**Date:** Week 3, Day 1  
**Deciders:** Hashim Ali Khan

---

## Context

If engineers import each other's `src/` modules directly, Arcturus becomes a tightly coupled monolith where any internal refactor in one platform breaks all consumers. This is the most common failure mode in multi-team codebases.

## Decision

Enforce §2.1: all cross-platform communication must use Pydantic models from `contracts/` or `schemas/` only. Direct `src/` imports across platform boundaries are forbidden and enforced by AST-based scanning in `import_boundary_checker.py`. Exemptions: `src/integration/` and `src/governance/` files.

## Consequences

- Each platform can freely evolve its internal implementation without breaking consumers.
- The governance scanner automatically blocks violations in CI.
- Slightly more boilerplate (adapters) required, but significantly higher resilience.
