# CASTOR v2.0 — GOVERNANCE CONTROL MATRIX (B01)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)
**Status:** ACTIVE / ENFORCED 

---

## 1. Platform Governance Control Gates

| Gate ID | Control Gate Name | Enforcement Mechanism | Responsibility / Owner | Failure Action |
| :--- | :--- | :--- | :--- | :--- |
| **GATE-01** | **Constitutional Boundary Check** | Manual Review & Test Guard | Sufyan Afzal / Tech Lead | Block PR Merge |
| **GATE-02** | **Code Formatting & Style** | `dart format` / CI Script | All Platform Developers | Reject Build |
| **GATE-03** | **Static Code Analysis** | `flutter analyze` / Linter | All Platform Developers | Reject Build |
| **GATE-04** | **Test Pyramid Compliance** | `flutter test` (Unit/Widget) | Khubaib Ijaz / QA | Reject Build |
| **GATE-05** | **Accessibility Verification** | WCAG 2.2 AA Checklist | Ayla Sajid / A11y | Request Remediation |
| **GATE-06** | **Design System Alignment** | Token & Primitive Audit | Syed Bilal Sajid | Request Changes |
| **GATE-07** | **Evidence Package Sign-off** | Evidence Markdown File | Team Lead (Sufyan) | Block Merge |

---

## 2. Pull Request Review Checklist (For Team Lead & Tech Lead)

Before approving any incoming branch into `feature/castor` or `main`:

- [ ] All code changes are strictly confined to `ecosystem/applications/castor/`.
- [ ] No direct calls to internal OCOS databases or world models exist.
- [ ] Static analysis (`flutter analyze`) passes with 0 errors/warnings.
- [ ] All new UI components consume design tokens from `packages/design-tokens`.
- [ ] Relevant unit/widget tests are included and passing.
- [ ] Task is logged in the Castor Project Tracker Excel file.