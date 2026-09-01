# Sentinel DevSecOps — Week 3 Implementation Package (Batch 1)

This folder contains **real, drop-in-ready** GitHub Actions workflows and
security tool configuration files implementing Parts B–I of the Week 3
"Mega Work" (DevSecOps Foundation Completion & Security Control
Implementation).

These are not descriptions of what *would* be built — they are the actual
files. Copy this structure into the real Sentinel repository once GitHub
org access is granted, adjust the placeholders noted below, and the
pipeline is immediately usable.

## What's implemented in this batch

| Mega Work Part | File(s) |
|---|---|
| Part A — Architecture verification | `scripts/verify-architecture.sh`, `docs/architecture-verification-checklist.md` |
| Part B — Toolchain foundation | All files below, collectively |
| Part C — Secure CI/CD pipeline | `.github/workflows/ci.yml`, `cd-deploy.yml` |
| Part D — Security gate & policy enforcement | `.github/workflows/security-gate.yml`, `security-gates/dependency-scan/policies/severity-policy.json` |
| Part E — Security scanning (SAST) | `security-gates/sast/` |
| Part F — Supply chain security | `.github/dependabot.yml`, `.github/workflows/sbom-and-provenance.yml` |
| Part G — Secret management | `security-gates/secret-detection/` |
| Part H — Container & infrastructure security | `container-security/`, `infra/terraform/policies/checkov-config.yaml` |
| Part I — Artifact security & build integrity | `artifact-signing/` |

## Before this runs for real, someone with repo access needs to

1. Create the GitHub Environments referenced in `cd-deploy.yml`:
   `staging`, `production-approval` (with required reviewers), `production`.
2. Create the GitHub Teams referenced in `.github/CODEOWNERS`
   (`@horquva/devsecops-platform`, etc.) or replace with real usernames.
3. Add a `Dockerfile` (container-scan and cd-deploy jobs expect one) —
   or remove those steps if the repository isn't containerized.
4. Confirm `npm ci` / `npm test` / `npm run build` match the real repo's
   package.json scripts (this template assumes Node.js — swap for the
   correct ecosystem otherwise).
5. Review and adjust severity thresholds in `severity-policy.json`
   with the Security Quality & Compliance Platform before enforcing.

## Batch 2 — Parts J–U

| Mega Work Part | File(s) |
|---|---|
| Part J — Vulnerability Management | `vulnerability-management/`, `.github/workflows/finding-to-issue.yml` |
| Part K — Security Automation & Orchestration | `.github/workflows/scheduled-rescan.yml`, `finding-to-issue.yml` |
| Part L — Runtime Security & Security Operations | `runtime-security/falco-rules/`, `runtime-security/alerting/` |
| Part M — Security Incident Response & Remediation | `incident-response/`, `.github/ISSUE_TEMPLATE/security-incident.yml` |
| Part N — Security Governance & Policy Compliance | `governance/exception-register-template.csv` |
| Part O — Security Operations Dashboard | `dashboard/`, `.github/workflows/generate-metrics.yml` |
| Part P — Governance, Drift Control & Cross-Platform Security | `governance/drift-detection.sh` |
| Part Q — Evidence, Auditability & Traceability | `.github/workflows/evidence-package.yml` |
| Part R — Negative Testing & Resilience Engineering | `.github/workflows/negative-test.yml`, `testing/negative-test-fixtures/` |
| Part S — Operational Readiness & Cross-Platform Enablement | `governance/cross-platform-readiness-matrix.md` |
| Part T — Acceptance Package | `acceptance/acceptance-package-readme.md` |
| Part U — Acceptance Gate | `acceptance/acceptance-gate-checklist.md` |

Parts V (Engineering Principles) and W (Delivery Model) are narrative/
diagram content already captured in the Week 2 reports and this
document's own prose — no separate config artifact is needed for them.

## Before Batch 2 runs for real, additionally

6. Set repository secret `SECURITY_ALERTS_WEBHOOK_URL` (and the SEV1/2/3
   variants) for `runtime-security/alerting/alertmanager-config.yml` and
   `scheduled-rescan.yml` notifications.
7. Deploy Falco (or equivalent) in the runtime cluster and load
   `runtime-security/falco-rules/sentinel-rules.yaml`.
8. Populate the `approved_egress_ips` and `approved_process_names` lists
   in the Falco rules per service before enabling in blocking mode.
9. Run `.github/workflows/negative-test.yml` manually once to confirm
   gates actually block — do this BEFORE relying on them in production.
10. Serve `dashboard/index.html` via GitHub Pages or an internal static host.

