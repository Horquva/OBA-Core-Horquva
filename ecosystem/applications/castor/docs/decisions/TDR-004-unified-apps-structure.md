# TDR-004: Consolidation of Device-Specific App Folders into Unified Flutter App Root

* **Status:** APPROVED (Authorized by Natasha)
* **Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead)
* **Date:** August 10, 2026

## 1. Context & Problem Statement
The original repository scaffold included separate target directories (`apps/mobile`, `apps/tablet`, `apps/wearable`, `apps/companion`). Since Flutter natively supports cross-device responsive rendering (mobile, tablet, desktop, web) from a single unified codebase, maintaining redundant subfolders added structure overhead.

## 2. Decision
With explicit authorization from Natasha, delete `apps/tablet`, `apps/wearable`, and `apps/companion`, and locate the unified Flutter baseline application directly inside `ecosystem/applications/castor/apps/`.

## 3. Consequences & Impact
* **Pros:** Simplified directory structure, single CI target, zero duplicated configuration.
* **Cons:** Requires updating path references in CI scripts and documentation.
* **Impact:** CI workflow updated to run `flutter pub get`, `flutter analyze`, and `flutter test` directly inside `ecosystem/applications/castor/apps/`.