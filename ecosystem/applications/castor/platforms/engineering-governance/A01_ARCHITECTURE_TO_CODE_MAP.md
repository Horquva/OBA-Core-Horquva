# CASTOR v2.0 — ARCHITECTURE-TO-CODE RESPONSIBILITY MAP (A01)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)  
**Status:** LOCKED / ENFORCED  
**Target Application:** `ecosystem/applications/castor/apps/mobile`  

---

## 1. Constitutional Layer Mappings

| Layer | Architecture Layer Name | Monorepo Directory | Component Owner | Permitted Dependencies | Forbidden Dependencies | Test Boundary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **L10** | Constitution & Governance | `constitution/` | Sufyan Afzal | None | External Runtime Code | Policy Audit |
| **L9** | Experience Foundation | `packages/` | Syed Bilal Sajid / Hazam M. | Tokens, Primitives | Apps, OCOS Internal | Unit & Visual |
| **L8** | Experience State & Session Graph | `runtime/state/` | Dur Muhammad Khan / Sufyan | Contracts, Foundation | OCOS Internal DB | State & Integration |
| **L7** | Experience Contract Layer | `contracts/` | Ahmad Ali Sultan | Schema Models | Direct DB / Models | Serialization / Contract |
| **L6** | Experience Runtime Layer | `runtime/` | Dur Muhammad Khan | Contracts, State | OCOS Internal DB | Integration & Mock |
| **L5** | Experience Orchestration | `orchestration/` | Syed M Taha Zaidi | Runtimes, Contracts | Direct Cognitive DB | Routing & Integration |
| **L4** | Surface Intelligence Layer | `surface-intelligence/` | Asfand Nadeem | Design System, Tokens | Unapproved APIs | Responsive / Layout |
| **L3** | Device & Continuity Runtime | `runtime/device/` | Asfand Nadeem | Platform Abstractions | Backend Core | Device Handoff Test |
| **L2** | Experience Surfaces Layer | `experiences/` | Gulshan / Taha / Hazam | Orchestration, UI | OCOS Database | Widget & E2E |
| **L1** | Human Interaction Layer | `apps/mobile/lib/` | Sufyan Afzal / Dur M. | Experiences, Runtimes | Direct OCOS Calls | Widget & E2E |

---

## 2. Boundary Enforcement Rules

1. **OCOS Sovereignty:** Flutter code in `apps/mobile` consumes approved experience contracts (`contracts/`). It **NEVER** calls OCOS internal databases, world models, or reasoning engines directly.
2. **Design Token Sovereignty:** All UI widgets MUST consume design tokens from `packages/design-tokens` or `platforms/design-system` rather than hardcoding colors or spacing.
3. **Evidence-Driven Completion:** A task is only complete when backed by: `Implementation + Unit/Widget Tests + Passed CI + Architecture Compliance Check`.