# Sentinel — Part 1: Existing Implementation Verification, Baseline & Critical-Path Reconciliation

**Owner:** Muhammad Bilal Askari — DevSecOps & Security Operations Platform
**Repository:** Horquva/OBA-Core-Horquva

---

## 1. Executive Summary

Per Part 1's objective, this report establishes the actual executable state of
Sentinel's existing DevSecOps implementation before any further work begins.
Rather than a fresh audit, this baseline is drawn directly from real,
controlled execution carried out over the preceding work session: every
applicable security control was run against the real repository, several were
deliberately exercised with positive and negative test conditions, and the
actual pass/fail behaviour was recorded rather than assumed from
configuration presence alone.

This process surfaced seven real implementation defects — none visible from
reading the configuration files, all only visible once genuinely executed.
Each is recorded in the Implementation-Drift Register (Section 5). This is
precisely the distinction Part 1 exists to draw: implemented work versus
merely configured work.

---

## 2. Existing DevSecOps Implementation Inventory

| Component | Location |
|---|---|
| CI workflow (build/test/lint + gate invocation) | `.github/workflows/ci.yml` |
| Reusable security gate (SAST/secrets/deps/IaC/container) | `.github/workflows/security-gate.yml` |
| CD workflow (staging/production, design-only) | `.github/workflows/cd-deploy.yml` |
| Scheduled rescan | `.github/workflows/scheduled-rescan.yml` |
| Finding-to-issue automation | `.github/workflows/finding-to-issue.yml` |
| Evidence package assembly | `.github/workflows/evidence-package.yml` |
| SBOM & provenance generation | `.github/workflows/sbom-and-provenance.yml` |
| Negative/resilience testing | `.github/workflows/negative-test.yml` |
| Metrics/dashboard generation | `.github/workflows/generate-metrics.yml` |
| SAST configuration (Semgrep) | `security-gates/sast/` |
| Secret detection configuration (Gitleaks) | `security-gates/secret-detection/` |
| Dependency scan configuration (OWASP Dependency-Check) | `security-gates/dependency-scan/` |
| Container scan configuration (Trivy) | `container-security/` |
| IaC scan configuration (Checkov) | `infra/terraform/policies/` |
| Artifact signing/verification (Cosign) | `artifact-signing/` |
| Vulnerability management schema/register | `vulnerability-management/` |
| Runtime security rules (Falco, design-only) | `runtime-security/` |
| Incident response templates | `incident-response/` |
| Governance/exception/drift tooling | `governance/` |
| Acceptance package and matrix | `acceptance/` |
| Repository verification script | `scripts/verify-architecture.sh` |

---

## 3. Security Tool Execution Matrix

Status classified per Part 1's own categories: **Working / Partially Working
/ Configured but Unproven / Implemented but Not Integrated / Broken /
Missing Critical Piece / Deferred**. A configuration file existing is never
treated as evidence of "Working" on its own.

| Control | Status | Basis for status |
|---|---|---|
| SAST (Semgrep) | 🟠 Partially Working | Community rulesets execute and pass. Custom Sentinel rules were confirmed NOT loading (config wiring defect, Drift #1); fix applied but not yet re-confirmed with a clean positive+negative run. |
| Secret detection (Gitleaks) | 🟠 Partially Working | Detection confirmed genuinely working against a real fixture (positive proof obtained). Production/test config separation needed so the tool doesn't permanently block on its own known fixture — in progress (Drift #4). |
| Dependency scan (OWASP Dependency-Check) | 🟢 Working (report-only by policy) | Confirmed detecting real Critical (CVSS 10.0) findings in production dependencies. Deliberately non-blocking during rollout — logged as a formal, unapproved platform exception (`governance/PLATFORM-ROLLOUT-EXCEPTIONS.md`), not a silent gap. |
| IaC scan (Checkov) | 🟢 Working | Confirmed blocking on a deliberately misconfigured Terraform fixture (public S3 bucket, open security group). |
| Container scan (Trivy) | 🟢 Working | Confirmed blocking on a deliberately old/vulnerable base image fixture. Gracefully skips when no Dockerfile exists (verified, not assumed). |
| Artifact signing/verification (Cosign) | 🟢 Working | Confirmed: real image signed, real signature+provenance verified successfully; a separate unsigned image was confirmed rejected by verification (negative case proven). |
| SBOM/provenance generation | 🟡 Configured but Unproven | Schema defect found and fixed (provenance predicate shape was invalid for Cosign's strict validator, Drift #3). Not yet exercised via a full, clean production run. |
| Security gate policy evaluation | 🟢 Working | `gate-summary` job correctly aggregates and fails on any non-success blocking job result; confirmed during multiple real runs. |
| Scheduled rescan automation | 🟢 Working (after fix) | Initially Broken — Startup failure due to missing job-level permissions on the reusable workflow call (Drift #6). Fixed and confirmed running. |
| Finding-to-issue automation | 🔴 Implemented but Not Integrated | Never triggered even once prior to this review — was listening for a workflow name that never independently runs (Drift #7). Trigger fixed; end-to-end issue creation not yet confirmed with a real finding. |
| Evidence package assembly | 🟡 Configured but Unproven | Designed to trigger automatically on CI/CD completion; existence of a real successful run with a downloadable artifact not yet confirmed. |
| Runtime security (Falco rules) | ⚪ Deferred | No runtime cluster exists. Design-only, explicitly marked as such. |
| CD deployment (staging/production) | ⚪ Deferred | Explicitly marked `[DESIGN-ONLY]` in workflow — no real deployment target configured yet. |
| Repository governance (branch protection, CODEOWNERS) | 🟡 Configured but Unproven | `verify-architecture.sh` exists to check this automatically but has not yet been run against the live repository. |

---

## 4. Current Pipeline Baseline

The real, currently executable path, as observed:

| Stage | Executes? | Blocks on failure? |
|---|---|---|
| Commit / PR opened | Yes | n/a |
| Build, lint, unit test | Yes (app-owned, not DevSecOps scope) | No — informational only, by design |
| SAST | Yes (partially — see Section 3) | Yes, for findings it does catch |
| Secret detection | Yes | Yes |
| Dependency scan | Yes | No — deliberate rollout exception |
| IaC scan | Yes | Yes |
| Container scan | Yes (or cleanly skips) | Yes, when applicable |
| Security gate decision | Yes | Yes |
| Artifact build/sign/SBOM/provenance | Not yet exercised on main | n/a — unproven |
| Staging/production deployment | No — design-only placeholder | n/a |
| Finding → Issue automation | Now wired, unproven end-to-end | n/a |

---

## 5. Security Integration Gap Register

- Finding-to-issue automation has never successfully created a tracked Issue — the finding lifecycle (Part 4's territory) is not yet connected end-to-end.
- Evidence package generation has not been confirmed to produce a real, linked, downloadable artifact.
- SBOM/provenance is not yet proven on a real production build — only the schema defect is confirmed fixed.
- Runtime security and deployment are both explicitly infrastructure-blocked, not implementation gaps — correctly deferred rather than hidden.
- Repository governance (branch protection, CODEOWNERS enforcement) has not yet been verified against the live repository with linked evidence.

---

## 6. Implementation-Drift Register

Seven real defects found only through actual execution — none were visible
from reading the configuration alone.

| # | Defect & Resolution |
|---|---|
| 1 | SAST custom rules never loaded — workflow used a non-existent `SEMGREP_RULES` environment variable that semgrep-action does not support. Fixed by passing all configs (registry + custom rules) directly via the action's `config` input. |
| 2 | Secret detection blocked on GitHub Actions Marketplace licensing — `gitleaks/gitleaks-action` now requires a paid license for organizations. Fixed by running the open-source Gitleaks CLI directly instead of the Action wrapper. |
| 3 | Cosign signing rejected `provenance.json` — the SLSA provenance predicate's `builder` field was a plain string; Cosign's schema validator requires an object with an `id` field. Fixed in both the production (`sbom-and-provenance.yml`) and test-evidence generation paths. |
| 4 | Own negative-test fixture began blocking real PRs once merged to main — the full-repository production secret scan correctly detected the team's own deliberately-fake test credential, with no way to distinguish "intentional test fixture" from "real leak." Resolution in progress: separate production vs. test-only Gitleaks configs so real PRs aren't perpetually blocked while the dedicated resilience test still genuinely proves detection. |
| 5 | Docker/GHCR image tags failed on repository name casing — GitHub org name ("Horquva") contains uppercase characters, which Docker/GHCR reject in image references. Fixed by lower-casing the repository name before constructing any image tag. |
| 6 | Scheduled rescan failed to start at all ("Startup failure") — the calling job did not grant the reusable security-gate workflow the job-level permissions it requires (`pull-requests: write`), which GitHub Actions requires explicitly, not inherited from workflow-level permissions alone. Fixed by adding explicit job-level permissions matching the reusable workflow's needs. |
| 7 | Finding-to-issue automation had never run once — it was configured to trigger on completion of "Reusable Security Gate," which is a called/reusable workflow (`on: workflow_call` only) and therefore never generates its own independent `workflow_run` event. Fixed by pointing the trigger at the actual top-level, independently-triggered workflows ("CI - Build, Test & Security Gate" and "Scheduled Security Rescan") that call it as a sub-job. |

---

## 7. P0 / P1 / P2 Prioritization

### P0 — Release/Security Blocker
- Confirm Drift #4 fully resolved (production Gitleaks scan must not perpetually block real PRs) — currently in progress.
- Confirm finding-to-issue automation actually creates a real Issue from a real finding at least once (Drift #7 fix is unproven end-to-end).

### P1 — Required for Seven-Part Product Readiness
- Confirm SBOM/provenance generation on a real production build (not yet exercised).
- Confirm `evidence-package.yml` produces a real, linked artifact.
- Run `scripts/verify-architecture.sh` against the live repository and record the result (governance verification currently unproven).
- Get formal approval for the logged dependency-scan rollout exception (`PLATFORM-EXC-2026-001`), currently unapproved.

### P2 — Important but Non-Blocking
- Report the real Critical (CVSS 10.0) `next.js` dependency findings to the Team Lead/CTO as a standalone urgent item.
- Add a dedicated SAST negative-test job to `negative-test.yml` (currently the only control without its own isolated proof job).

### Deferred — Outside Current Critical Path
- Runtime security (Falco) — blocked on infrastructure availability, not implementation.
- Real staging/production deployment — blocked on infrastructure/hosting target availability.
- Cross-platform onboarding (Atlas, Vega, Castor, Altair) — explicitly a later phase per the existing readiness matrix.

---

## 8. Seven-Part Critical-Path Definition

Based on the above, the path to a genuinely closed Part 1 — and readiness to
begin Part 2 in earnest — requires resolving the two P0 items and making
meaningful progress on the P1 items. Part 2 itself ("Convert the existing
CI/CD pipeline into a real enforceable security control") is already
substantially underway: the security gate demonstrably blocks on IaC,
container, and secret findings today, with real positive and negative
evidence. What remains before Part 2 can be considered proven rather than
partially proven is closing Drift Register items #1 (SAST) and #4
(secret-scan production/test separation), and completing the currently-open
evidence generation for SBOM/provenance and finding-to-issue.

---

## 9. Part 1 Exit Condition — Current Assessment

Part 1 requires being able to demonstrate what actually works, what does
not, what is missing, and exactly which gaps must close during Parts 2–7.
This report satisfies that requirement as a baseline: three controls
(dependency scan, IaC scan, container scan, artifact signing) are confirmed
Working with real positive and negative evidence; two (SAST, secret
detection) are Partially Working with fixes applied but not fully
re-confirmed; three (SBOM/provenance, evidence package, finding-to-issue)
are Configured but Unproven or Implemented but Not Integrated; and two
(runtime security, deployment) are correctly Deferred pending
infrastructure. No control in this report is marked complete solely because
its configuration exists.
