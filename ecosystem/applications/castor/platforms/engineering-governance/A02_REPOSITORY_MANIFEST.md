# CASTOR v2.0 — REPOSITORY MANIFEST (A02)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)  
**Status:** LOCKED / ENFORCED
**Root Path:** `ecosystem/applications/castor/` 

---

## 1. Directory Structure & Ownership Manifest

| Directory Path | Directory Purpose | Owner / Platform | Permitted Imports | Forbidden Imports | Validation Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `constitution/` | Architectural policies, DoD, ADRs | Sufyan Afzal | Governance Docs | Executable Code | Document Audit |
| `apps/mobile/` | Flutter mobile/web entry application | Sufyan Afzal / Dur M. | Runtimes, Packages | Direct OCOS DB | `flutter analyze` & CI |
| `platforms/` | 10 Sub-platform specifications & research | All Platform Owners | Local Docs | Cross-Platform Code | PR Code Review |
| `runtime/` | Execution runtimes (session, state, background) | Dur Muhammad Khan | Contracts, Packages | Direct OCOS DB | Integration Tests |
| `orchestration/` | Intent routing, lifecycle, & device mesh | Syed M Taha Zaidi | Runtimes, Contracts | Backend DB Calls | Unit & Router Tests |
| `surface-intelligence/` | Adaptive density & layout engines | Asfand Nadeem | Design System | Unapproved APIs | Responsive Tests |
| `contracts/` | Versioned JSON schemas & data models | Ahmad Ali Sultan | Types, Models | Direct DB Models | Contract Deserializer |
| `experiences/` | Executive workspace & UI surfaces | Gulshan / Taha / Hazam | Orchestration, UI | Direct OCOS DB | Widget & E2E Tests |
| `packages/` | Design tokens, UI widgets, icons | Syed Bilal Sajid | Primitives, Tokens | Apps, OCOS Internal | Unit & Visual Snapshot |
| `tooling/` | Linting, formatting, & release scripts | Sufyan Afzal | Scripts, Configs | App Business Logic | CI Workflow Checks |

---

## 2. Maintenance & Hygiene Rules

* Every empty directory in the repository MUST contain a `.gitkeep` file until active code or documentation is placed inside.
* Code from `apps/mobile` MUST NOT import files from outside `ecosystem/applications/castor/` without explicit contract adapters.