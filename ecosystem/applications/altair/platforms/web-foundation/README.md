# Altair Web Foundation

This directory establishes the reusable web application foundation for Horquva Altair without depending on root-level frontend or backend implementation.

## Purpose

The foundation covers:

- presentation boundaries
- app state ownership
- domain contracts
- route metadata
- UI primitives
- loading and empty/error states
- configuration expectations
- accessibility and responsive patterns

## Scope

This foundation is intentionally contract-safe and reusable. It does not claim authoritative backend behavior or business logic. Any upstream service contract that is not approved must remain an interface boundary only.

## Architectural Rules

- Presentation logic stays decoupled from authoritative backend logic.
- State ownership must be explicit: component, shared UI, or request-derived state.
- Client-side code must never contain secrets.
- Route metadata is descriptive and future-facing rather than authoritative feature implementation.
- UI primitives are reusable and do not embed business-specific logic.

## Included artifacts

- `theme.js`: design tokens and semantic theme values
- `state.js`: application-state and request-state patterns
- `routes.js`: approved route catalog for future experiences
- `ui-primitives.js`: accessible reusable UI helper patterns
- `types.d.ts`: contract-safe TypeScript interfaces
- `index.js`: central export surface
