# Contributing to Arcturus

Welcome to the Arcturus Synthetic Enterprise Platform. We are building this platform as one team, and this document outlines the exact workflow we use to keep our codebase clean, secure, and scalable. 

Remember our core philosophy: **Individual ownership creates accountability. Shared ownership creates a platform.**

## 1. Git Workflow & Branching
Git is our single source of truth. No production code may exist outside of the official repositories. 
* **Branching Strategy:** We strictly follow the Horquva branching model.
  * `main`: Production-ready code only.
  * `develop`: The active integration branch.
  * `feature/<feature-name>`: For new capabilities. Keep it focused on a single objective.
  * `bugfix/<bug-name>`: For standard defect corrections.
  * `hotfix/<issue-name>`: For critical production fixes only.
  * `release/<version>`: For release preparation.
* **Commits:** Commit frequently. Use clear, descriptive commit messages that explain the *purpose* of the change, not just what files were touched.

## 2. Pull Request (PR) Policy
No engineer may merge significant code directly into shared branches (`main` or `develop`) without review.
* Submit all changes through a Pull Request.
* Use the official PR Template provided in this repository.
* Ensure your PR includes testing evidence, documentation updates, and any relevant screenshots.
* Verify your work meets the complete **Definition of Done (DoD)** before requesting a review.

## 3. Code Reviews
Code reviews are a collaborative learning process, not a personal criticism. 
* **Reviewers:** You must evaluate PRs for correctness, readability, maintainability, security, performance, and architectural alignment.
* **Authors:** Be open to feedback. If your code is difficult to understand or lacks documentation, it is not complete.

## 4. AI Engineering Policy
AI is a tool to accelerate your workflow, but it does not replace your engineering judgment.
* You are responsible for understanding every single line of code you submit.
* AI-generated work must be thoroughly reviewed, tested, and validated against Horquva's Ground Truth (official architecture docs, schemas, and standards).
* Whenever AI conflicts with Ground Truth, Ground Truth wins.