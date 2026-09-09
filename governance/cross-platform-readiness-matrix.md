# Cross-Platform Readiness Matrix
### Part S — DevSecOps Operational Readiness & Cross-Platform Enablement

Tracks whether each Sentinel-consuming platform has inherited the standard
DevSecOps security baseline built in this package.

| Platform | Security workflows adopted | Security policies inherited | Security gates active | Automation connected | Evidence flowing | Overall status |
|---|---|---|---|---|---|---|
| Atlas | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |
| Vega | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |
| Castor | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |
| Altair | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |
| Sentinel Core | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |
| Shared Engineering Services | ☐ | ☐ | ☐ | ☐ | ☐ | Not started |

## Onboarding Steps Per Platform

1. Copy `.github/workflows/ci.yml`, `security-gate.yml`, `sbom-and-provenance.yml`, `cd-deploy.yml` into the platform's repository.
2. Copy the `security-gates/`, `container-security/`, `infra/terraform/policies/`, `artifact-signing/` config folders.
3. Configure GitHub Environments (`staging`, `production-approval`, `production`) with the correct reviewers for that platform team.
4. Update `.github/CODEOWNERS` with the platform's actual team handles.
5. Run `scripts/verify-architecture.sh <owner>/<repo>` to confirm the baseline is active.
6. Mark the platform's row above as complete once all five columns are checked.

## Readiness Review Notes

_(Record maturity/readiness observations per platform here as onboarding proceeds.)_
