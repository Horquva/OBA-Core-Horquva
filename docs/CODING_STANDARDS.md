# Arcturus Coding Standards

Consistency improves readability and maintainability. Every engineer working on the Simulation Engineering Governance Platform is expected to write clean, predictable, and fully tested code. 

## 1. Naming Conventions
Engineers must use clear, descriptive names. Avoid abbreviations, ambiguous terminology, and inconsistent capitalization. Good naming reduces the need for additional explanation.
* **Use Descriptive Names For:** Variables, Functions, Classes, APIs, Database tables, Files, Branches, and Repositories.
* **Casing Guidelines:** Stick to the industry standard for the language you are using (e.g., camelCase for variables/functions, PascalCase for classes and UI components).

## 2. Testing Standards
Every feature must include appropriate testing to verify expected behavior and reduce the risk of regressions. Depending on the feature being built, your PR should include:
* Unit tests
* Integration tests
* End-to-end (E2E) tests
* Security tests
* Performance tests
* AI evaluation tests

## 3. Logging Standards
Applications must produce meaningful logs that help diagnose issues without exposing sensitive information. Logging exists to improve observability, not to generate unnecessary output.
* **Logs Should:** Explain important events, record failures, capture execution flow, and support troubleshooting.
* **Strict Prohibition:** Never store passwords, tokens, or confidential data in logs.

## 4. Documentation Evolves With Code
Engineering documentation must remain synchronized with implementation. Architectural intent, engineering decisions, and platform behavior must always be accurately documented alongside the source code.