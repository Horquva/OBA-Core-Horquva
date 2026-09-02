# TDR-002: Adoption of Strict Dart Analysis and Linter Rules

* **Status:** APPROVED
* **Author:** Sufyan Afzal (Engineering Governance Platform Owner)
* **Date:** 2026-08-07

## 1. Context & Problem Statement
To prevent code degradation, type errors, and style inconsistencies across a 10-member engineering team, Castor needs an automated quality baseline enforced at the linter level.

## 2. Decision
Enforce strict Dart 3.3+ type casting, null-safety rules, and `flutter_lints` rules via `apps/mobile/analysis_options.yaml`.

## 3. Consequences & Impact
* **Pros:** Prevents runtime type errors, enforces clean code style, and automates PR quality checks.
* **Cons:** Developers must fix all linter warnings before code can be merged.
* **Impact:** All PRs must pass `flutter analyze` with 0 issues.