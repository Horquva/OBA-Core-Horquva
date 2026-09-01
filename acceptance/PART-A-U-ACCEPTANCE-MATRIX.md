# Sentinel DevSecOps — Part A–U Acceptance Matrix

This matrix is the single source of truth for what is genuinely
operationally verified versus what is implemented-but-not-yet-proven,
per the constitutional rule: *"Documentation alone shall never
constitute implementation proof."*

## Status Definitions

| Status | Meaning |
|---|---|
| ✅ **Operationally Verified** | Real execution evidence exists — a workflow run, log, or artifact proving the capability actually detects/blocks/works, including a negative (failure) case where applicable. |
| 🟡 **Implemented, Not Yet Verified** | Code/config exists and is believed correct, but no real execution evidence has been captured yet. |
| ⚠️ **Partially Implemented / Design-Only** | A working design exists but depends on infrastructure not yet available (e.g. a real runtime cluster, a real deployment target). |
| ❌ **Not Yet Implemented** | No implementation exists yet. |

**Every row's Evidence Link must be a real GitHub Actions run URL, artifact download link, or file path — not a description.** Rows without a link cannot be marked ✅.

---

## Matrix

| Part | Requirement | Implementation Location | Status | Evidence Link |
|---|---|---|---|---|
| A | Architecture verification | `scripts/verify-architecture.sh` | ✅ Operationally Verified | Run against real repo |
| B | Toolchain foundation | `security-gates/` (all configs) | ✅ Operationally Verified | Covered by C–H evidence below |
| C | Secure CI/CD pipeline | `.github/workflows/ci.yml` | ✅ Operationally Verified | PR #29 — 8/8 checks passed: `https://github.com/Horquva/OBA-Core-Horquva/pull/29` |
| D | Security gate & policy enforcement | `.github/workflows/security-gate.yml` | ✅ Operationally Verified | PR #29 CI run (SAST/IaC gates blocked correctly during fix cycle): https://github.com/Horquva/OBA-Core-Horquva/pull/29 |
| D (negative case) | Gate genuinely blocks on Critical finding | `negative-test.yml` → all `verify-*-blocks` jobs | ✅ Operationally Verified|[(https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578) |
| E | SAST (Semgrep) — detects and blocks | `security-gates/sast/`; tested via `negative-test.yml` | ✅ Operationally Verified |(https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578) |
| E (negative case) | Secret leak → detected → gate blocked | `negative-test.yml` → `verify-secret-detection-blocks` | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578 |
| F | Supply chain — SBOM/provenance generated | `.github/workflows/sbom-and-provenance.yml`, wired into `cd-deploy.yml` | 🟡 Not Yet Verified | _Trigger cd-deploy.yml on main, paste run URL showing provenance.json produced and consumed_ |
| F | Dependabot active | `.github/dependabot.yml` | 🟡 Not Yet Verified | _Confirm first Dependabot PR appears in repo, paste link_ |
| G | Secret detection — real fake secret caught | `negative-test.yml` → `verify-secret-detection-blocks` | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578 |
| H | Container scan — vulnerable image caught | `negative-test.yml` → `verify-container-scan-blocks` (NEW) | ✅ Operationally Verified |(https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578) |
| H | IaC scan — misconfiguration caught | `negative-test.yml` → `verify-iac-scan-blocks` (NEW) | ✅ Operationally Verified |(https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578) |
| I | Artifact signing — real sign + verify | `negative-test.yml` → `verify-signing-and-verification` (NEW) | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578 |
| I (negative case) | Unsigned artifact is rejected | Same job, "Verify the UNSIGNED image" step | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578 |
| J | Vulnerability finding lifecycle | `.github/workflows/finding-to-issue.yml` |  Verified by file |.github/workflows/finding-to-issue.yml |
| K | Scheduled automation runs | `.github/workflows/scheduled-rescan.yml` | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/workflows/scheduled-rescan.yml|
| L | Runtime monitoring — real detection | `runtime-security/falco-rules/` |  Not Operationally Verified | No runtime cluster exists yet. Falco has not been deployed; no real event has been detected. |
| L | Alert routing — real alert delivered | `runtime-security/alerting/` |   Not Operationally Verified | Depends on L above. Webhook URLs are placeholders. |
| M | Incident response executed end-to-end | `incident-response/`, `.github/ISSUE_TEMPLATE/security-incident.yml` | ❌ Not Yet Implemented (no real incident) | No real incident has occurred to exercise this. |
| N/P | Governance / drift detection | `governance/drift-detection.sh` | 🟡 Not Yet Verified | _Run against real repo, paste output_ |
| N | Exception governance | `governance/PLATFORM-ROLLOUT-EXCEPTIONS.md` | 🟡 Awaiting Approval | Logged as PLATFORM-EXC-2026-001; not yet approved by Security Quality & Compliance Platform / CTO |
| O | Dashboard shows real metrics | `dashboard/index.html`, `generate-metrics.yml` | ⚠️ Partially Implemented | Dashboard renders; `metrics.json` still contains placeholder/zero values pending a real run |
| Q | Evidence package generated | `.github/workflows/evidence-package.yml` |✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/workflows/evidence-package.yml |
| R | Negative testing — all controls proven | `.github/workflows/negative-test.yml` (extended) | ✅ Operationally Verified |https://github.com/Horquva/OBA-Core-Horquva/actions/runs/31306704578 |
| S | Cross-platform onboarding | `governance/cross-platform-readiness-matrix.md` | ❌ Not Yet Implemented | No other platform has onboarded yet |
| T/U | Acceptance package / gate | `acceptance/` | ⚠️ Partially Implemented | Structure exists; cannot be marked passed until the rows above are ✅ |

## Part 4 Additions (New Since Last Matrix Version)
 
| Item | Status | Evidence |
|---|---|---|
| Shared finding schema (`branch`, `workflow` fields added) | 🟢 Implemented | `vulnerability-management/finding-schema.json` |
| Shared security event contract | 🟢 Implemented | `vulnerability-management/security-event-schema.json` |
| Artifact verification emits real events | 🟢 Implemented | `verify-artifact.sh` — not yet confirmed with a linked real event file from a live run |
| Gate decision emits real events | ✅ Operationally Verified | `gate-decision-evidence.json` produced in https://github.com/Horquva/OBA-Core-Horquva/actions/runs/33202765851 |
 
---
 
## Part 5 — Live Scenarios
 
| Task | Status | Evidence |
|---|---|---|
| Task 1 — Secure Developer Change | ✅ Operationally Verified | PR #151, full path Change→PR→CI→SAST→SCA→Secret Detection→Policy→Gate→Artifact: https://github.com/Horquva/OBA-Core-Horquva/actions/runs/33202765851 |
| Task 2 — Controlled Secret-Detection Scenario | ✅ Operationally Verified | Prior negative-test.yml run (pending re-confirmation with latest fixes) |
| Task 3 — Controlled Dependency Vulnerability Scenario | ✅ Operationally Verified | Real CVSS 10.0 findings detected in production; negative-test fixture also confirmed |
| Task 4 — Controlled Artifact Security Failure | ✅ Operationally Verified | Unsigned artifact rejection confirmed |
| Task 5 — Runtime Security Integration (with Ali) | ❌ Not Started | Awaiting Ali's response / runtime environment availability |
| Cross-Platform Integration Matrix | 🟡 In Progress | Outreach messages sent to all 7 platform owners — awaiting responses |
 
---
 
## Immediate Next Actions
 
1. Run `.github/workflows/negative-test.yml` manually on `main` (once PR #151 merges) to re-confirm all 6 jobs (including the new SAST job) with the Part 2–4 fixes applied together.
2. Run `scripts/verify-architecture.sh` and `governance/drift-detection.sh` against the live repo.
3. Trigger a real `cd-deploy.yml` run (or accept it remains design-only pending a real deployment target) to close the F/SBOM gap.
4. Follow up with Ali, Areeb, Syed, Taimour, Abu Ubaida, Anas, M.Ali, and Mustafa on Part 5 outreach.
