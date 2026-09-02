# CASTOR v2.0 — OCOS ARCHITECTURAL BOUNDARY GUARDS (C08)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)
**Status:** LOCKED / ENFORCED 

---

## 1. Constitutional Boundary Rule

Flutter code inside `ecosystem/applications/castor/` is **strictly an experience layer**. It displays approved intelligence and captures executive intent.

$$\text{Flutter UI} \xrightarrow{\text{Captures Intent}} \text{Experience Contract} \xrightarrow{\text{Secure Ingress}} \text{OCOS Engine}$$

---

## 2. Forbidden Boundary Violations

The following actions are strictly prohibited in Castor code and will cause immediate PR rejection:

* ❌ **NO Direct Database Access:** Castor code MUST NOT query OCOS internal databases (PostgreSQL, Neo4j, Vector DBs) directly.
* ❌ **NO Cognitive Duplication:** Castor MUST NOT attempt to recreate organizational reasoning, world models, or memory logic inside Flutter.
* ❌ **NO Unapproved Imports:** Castor packages MUST NOT import modules from outside `ecosystem/applications/castor/` without contract adapters.

---

## 3. Automated Guard Enforcement

Architectural boundary tests are integrated into `apps/mobile/test/` to verify that no forbidden imports or direct backend calls are introduced during feature development.