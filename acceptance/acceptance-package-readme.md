# DevSecOps Acceptance Package
### Part T — DevSecOps Acceptance Package

This is the index of evidence required before the DevSecOps & Security
Operations Platform can be declared operationally complete for Week 3.
Each row must link to a real artifact once the pipeline has run for real
(workflow run URL, uploaded artifact, or completed checklist).

| Evidence category | Produced by | Link |
|---|---|---|
| Architecture Validation Report | `docs/architecture-verification-checklist.md` | |
| Repository Validation Report | `scripts/verify-architecture.sh` output | |
| Pipeline Validation Report | `.github/workflows/ci.yml` run history | |
| SAST Report | `security-gate.yml` → sast job artifact | |
| Dependency Report | `security-gate.yml` → dependency-scan job artifact | |
| Secret Detection Report | `security-gate.yml` → secret-detection job artifact | |
| IaC Security Report | `security-gate.yml` → iac-scan job artifact | |
| Container Security Report | `security-gate.yml` → container-scan job artifact | |
| SBOM Report | `sbom-and-provenance.yml` artifact | |
| Provenance Report | `sbom-and-provenance.yml` artifact | |
| Pipeline Execution Reports | `evidence-package.yml` output | |
| Security Gate Reports | `security-gate.yml` gate-summary job | |
| Runtime Security Reports | Falco / alertmanager logs (once deployed) | |
| Incident Response Reports | `incident-response/` completed runbooks | |
| Dashboard Validation Report | `dashboard/metrics.json` + `dashboard/index.html` | |
| Risk Register | `vulnerability-management/vulnerability-register-template.csv` (filled) | |
| Exception Register | `governance/exception-register-template.csv` (filled) | |
| Architecture Drift Report | `governance/drift-detection.sh` output | |
| Control Effectiveness Report | `negative-test.yml` run output | |

No row above may be marked complete without a real, linked artifact —
per the Mega Work's constitutional rule: *"Documentation alone shall
never constitute implementation proof."*
