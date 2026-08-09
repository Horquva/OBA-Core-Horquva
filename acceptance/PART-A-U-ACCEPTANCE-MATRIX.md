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
| A | Architecture verification | `scripts/verify-architecture.sh` | 🟡 Not Yet Verified | _Run against real repo, paste output/link here_ |
| B | Toolchain foundation | `security-gates/` (all configs) | 🟡 Not Yet Verified | _Covered by C–H evidence below_ |
| C | Secure CI/CD pipeline | `.github/workflows/ci.yml` | ✅ Operationally Verified | PR #8 — 8/8 checks passed: `<paste run URL>` |
| D | Security gate & policy enforcement | `.github/workflows/security-gate.yml` | ✅ Operationally Verified | PR #8 CI run (SAST/IaC gates blocked correctly during fix cycle): `<paste run URL>` |
| D (negative case) | Gate genuinely blocks on Critical finding | `negative-test.yml` → all `verify-*-blocks` jobs | 🟡 Not Yet Verified | _Run `negative-test.yml` manually, paste run URL_ |
| E | SAST (Semgrep) — detects and blocks | `security-gates/sast/`; tested via `negative-test.yml` | 🟡 Not Yet Verified | _Run negative test — no dedicated SAST negative fixture yet; PR #8 positive run: `<url>`_ |
| E (negative case) | Secret leak → detected → gate blocked | `negative-test.yml` → `verify-secret-detection-blocks` | 🟡 Not Yet Verified | _Run negative-test.yml, paste run URL_ |
| F | Supply chain — SBOM/provenance generated | `.github/workflows/sbom-and-provenance.yml`, wired into `cd-deploy.yml` | 🟡 Not Yet Verified | _Trigger cd-deploy.yml on main, paste run URL showing provenance.json produced and consumed_ |
| F | Dependabot active | `.github/dependabot.yml` | 🟡 Not Yet Verified | _Confirm first Dependabot PR appears in repo, paste link_ |
| G | Secret detection — real fake secret caught | `negative-test.yml` → `verify-secret-detection-blocks` | 🟡 Not Yet Verified | _Run negative-test.yml, paste run URL_ |
| H | Container scan — vulnerable image caught | `negative-test.yml` → `verify-container-scan-blocks` (NEW) | 🟡 Not Yet Verified | _Run negative-test.yml, paste run URL_ |
| H | IaC scan — misconfiguration caught | `negative-test.yml` → `verify-iac-scan-blocks` (NEW) | 🟡 Not Yet Verified | _Run negative-test.yml, paste run URL_ |
| I | Artifact signing — real sign + verify | `negative-test.yml` → `verify-signing-and-verification` (NEW) | 🟡 Not Yet Verified | _Run negative-test.yml, paste run URL_ |
| I (negative case) | Unsigned artifact is rejected | Same job, "Verify the UNSIGNED image" step | 🟡 Not Yet Verified | _Same run — confirm this step shows expected failure_ |
| J | Vulnerability finding lifecycle | `.github/workflows/finding-to-issue.yml` | 🟡 Not Yet Verified | _No real Critical/High finding has triggered this yet — trigger one and paste the created Issue link_ |
| K | Scheduled automation runs | `.github/workflows/scheduled-rescan.yml` | 🟡 Not Yet Verified | _Wait for first scheduled run (daily) or trigger manually, paste run URL_ |
| L | Runtime monitoring — real detection | `runtime-security/falco-rules/` | ❌ Design-Only / Not Operationally Verified | No runtime cluster exists yet. Falco has not been deployed; no real event has been detected. |
| L | Alert routing — real alert delivered | `runtime-security/alerting/` | ❌ Design-Only / Not Operationally Verified | Depends on L above. Webhook URLs are placeholders. |
| M | Incident response executed end-to-end | `incident-response/`, `.github/ISSUE_TEMPLATE/security-incident.yml` | ❌ Not Yet Implemented (no real incident) | No real incident has occurred to exercise this. |
| N/P | Governance / drift detection | `governance/drift-detection.sh` | 🟡 Not Yet Verified | _Run against real repo, paste output_ |
| N | Exception governance | `governance/PLATFORM-ROLLOUT-EXCEPTIONS.md` | 🟡 Awaiting Approval | Logged as PLATFORM-EXC-2026-001; not yet approved by Security Quality & Compliance Platform / CTO |
| O | Dashboard shows real metrics | `dashboard/index.html`, `generate-metrics.yml` | ⚠️ Partially Implemented | Dashboard renders; `metrics.json` still contains placeholder/zero values pending a real run |
| Q | Evidence package generated | `.github/workflows/evidence-package.yml` | 🟡 Not Yet Verified | _Trigger after a real CI run, paste evidence package artifact link_ |
| R | Negative testing — all controls proven | `.github/workflows/negative-test.yml` (extended) | 🟡 Not Yet Verified — **run this now** | _Run workflow, paste run URL here once green_ |
| S | Cross-platform onboarding | `governance/cross-platform-readiness-matrix.md` | ❌ Not Yet Implemented | No other platform has onboarded yet |
| T/U | Acceptance package / gate | `acceptance/` | ⚠️ Partially Implemented | Structure exists; cannot be marked passed until the rows above are ✅ |

---

## Immediate Next Action

Run `.github/workflows/negative-test.yml` manually (Actions tab → select
workflow → **Run workflow**). A green run populates real evidence for
rows **D, E, G, H (×2), I (×2), R** in one pass — the largest single
jump in verified status available right now without new infrastructure.

After that run completes, paste its URL into every row above that
references it, and this matrix becomes the honest, evidence-linked
record the review asked for.
