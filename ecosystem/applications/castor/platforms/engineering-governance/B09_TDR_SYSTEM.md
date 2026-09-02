# CASTOR v2.0 — TECHNICAL DECISION RECORD (TDR/ADR) SYSTEM (B09)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)  
**Status:** ACTIVE / ENFORCED  

---

## 1. TDR Lifecycle & Governance Workflow

All significant architectural and engineering decisions must be documented using a TDR before implementation:
- Problem Identified ➔ Draft TDR ➔ Team Review ➔ Architecture Review ➔ Decision Approved ➔ Implementation

---

## 2. Standard TDR Template

Every TDR logged in `docs/decisions/` must follow this structure:

* **TDR ID & Title:** `TDR-XXX: Short Description`
* **Status:** `DRAFT` | `APPROVED` | `REJECTED` | `DEPRECATED`
* **Owner / Author:** Platform Owner Name
* **Context & Problem Statement:** What technical problem or architectural challenge are we addressing?
* **Considered Options:**
  1. Option A (Pros & Cons)
  2. Option B (Pros & Cons)
* **Decision:** Selected option and clear rationale.
* **Consequences & Impact:** Expected benefits, trade-offs, testing impact, and security considerations.

---

## 3. Approved Technical Decision Index

| TDR ID | Decision Title | Status | Owner | Date |
| :--- | :--- | :--- | :--- | :--- |
| **TDR-001** | Selection of Flutter Monorepo Structure under `ecosystem/applications/castor/` | APPROVED | Sufyan Afzal | 2026-08-07 |
| **TDR-002** | Adoption of Strict Dart Analysis & `flutter_lints` for Quality Control | APPROVED | Sufyan Afzal | 2026-08-07 |
| **TDR-003** | Use of GitHub Actions for Automated Quality Gate Validation | APPROVED | Sufyan Afzal | 2026-08-07 |