# TDR-001: Selection of Flutter Monorepo Structure under ecosystem/applications/castor/

* **Status:** APPROVED
* **Author:** Sufyan Afzal (Engineering Governance Platform Owner)
* **Date:** 2026-08-07

## 1. Context & Problem Statement
The Castor Executive Experience Platform needs to co-exist cleanly with Horquva's wider ecosystem (including Sentinel, Arcturus, and OCOS backend engines) without coupling UI logic to internal backend database structures.

## 2. Decision
Integrate all Castor application code, runtimes, platform specifications, and packages under `ecosystem/applications/castor/` within the Horquva monorepo.

## 3. Consequences & Impact
* **Pros:** Clean separation of concerns, unified governance, and single-repository CI/CD execution.
* **Cons:** Requires strict boundary enforcement to prevent accidental cross-platform imports.
* **Impact:** All team members must keep their changes strictly inside `ecosystem/applications/castor/`.