# Arcturus Engineering Governance 

This document defines the methodology, tools, and standards that power the Simulation Engineering Governance Platform. Every engineer contributing to this repository is expected to understand and strictly adhere to these rules.

## 1. Engineering Philosophy & AI Policy
Artificial Intelligence is an engineering accelerator, not an engineering authority. It is here to speed up research and boilerplate, but accountability always stays with the human engineer.
* **Understand the Problem First:** Never use AI before you actually understand the business and technical objectives.
* **Verify Everything:** Every AI-generated output must be verified through manual review and testing. You must understand every line of code you submit.
* **Ground Truth Wins:** Whenever AI conflicts with official architecture documents or database schemas, the Ground Truth always wins.

## 2. Standard Folder Structure
To maintain architectural consistency, this repository strictly adheres to the following directory structure:
* `src/`: Source code and application logic.
* `tests/`: Test suites (unit, integration, e2e).
* `docs/`: Documentation, including Architecture Decision Records (ADRs).
* `config/`: Configuration files.
* `scripts/`: Automation and CI/CD scripts.
* `assets/`: Static resources.

## 3. Git Branching Strategy
Git is our single source of truth. We utilize a strict branching model to isolate workspaces:
* `main`: Production-ready code only.
* `develop`: Active integration branch.
* `feature/<name>`: New features, kept focused on a single objective.
* `bugfix/<name>`: Defect corrections.
* `hotfix/<name>`: Critical production fixes.
* `release/<version>`: Release preparation.

## 4. Pull Requests & Code Reviews
No engineer is allowed to merge significant code directly into shared branches without a review. 
* Every PR must include the purpose of the change, testing evidence, and documentation updates.
* Reviewers must check for correctness, security, architectural alignment, and ensure no unnecessary complexity was introduced.

## 5. The Definition of Done (DoD)
A task is not complete just because it works on your machine. Before closing any task, you must confidently answer "Yes" to the following:
* Requirements are completed.
* Code is reviewed by a Team Lead.
* Tests are passing.
* Documentation (including ADRs) is updated.
* Security is validated (no hardcoded credentials).
* AI output is fully verified.
* Integration is successful.