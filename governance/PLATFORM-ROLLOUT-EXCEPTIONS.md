# Platform Rollout Exception Register

This file tracks **gate-level** exceptions (a whole security gate temporarily
running in non-blocking/report-only mode across the platform), as distinct
from `governance/exception-register-template.csv`, which tracks **individual
finding-level** waivers. Both are required per the Constitutional Acceptance
Gate: no security control may be "quietly" non-blocking without a logged,
owned, time-boxed exception.

---

## PLATFORM-EXC-2026-001 — Dependency Scan Gate: Report-Only Rollout

| Field | Value |
|---|---|
| **Gate affected** | `security-gate.yml` → `dependency-scan` job (OWASP Dependency-Check) |
| **Constitutional policy** | `security-gates/dependency-scan/policies/severity-policy.json` defines Critical/High as **blocking, no waiver allowed** |
| **Current implementation** | `continue-on-error: true` — gate runs and reports, does **not** block merge |
| **Reason** | At rollout time, the existing codebase already carries pre-existing dependency vulnerabilities (see finding list below) that predate this gate's introduction. Making the gate immediately blocking would block unrelated, already-in-flight PRs on legacy debt not introduced by those PRs. |
| **Known findings covered by this exception (must still be tracked to closure)** | `next@16.2.9` — 4× CVSS 10.0 (Critical); `js-yaml@4.2.0` — CVSS 7.5; `brace-expansion@1.1.15` — CVSS 7.5 (×2); `postcss@8.4.31` — CVSS 7.5 |
| **Compensating control** | Findings are still generated, uploaded as evidence (`dependency-check-report` artifact), and surfaced as a workflow warning on every run — they are visible, not hidden. |
| **Requested by** | Muhammad Bilal Askari (DevSecOps & Security Operations Platform Owner) |
| **Approval authority required** | Security Quality & Compliance Platform + CTO (per constitutional rule: Critical severity waivers are never self-approved) |
| **Approved by** | _PENDING — not yet approved_ |
| **Approved at** | _PENDING_ |
| **Expires at** | _To be set at approval — recommended: 30 days from approval, or upon remediation of the Critical `next` findings, whichever is sooner_ |
| **Exit condition (when this exception is removed)** | The `next@16.2.9` Critical findings are remediated (package upgraded) AND all other listed findings are resolved or individually waived via the standard finding-level exception process. `continue-on-error: true` is then removed from `dependency-scan`, restoring it to blocking. |
| **Status** | 🔴 **AWAITING APPROVAL — treat as NOT constitutionally authorized until the fields above are filled in and signed off** |

### Immediate action required (separate from this PR)
The `next@16.2.9` Critical (CVSS 10.0) findings should be reported to the
Tech Lead / CTO as an urgent item regardless of this PR's status — this
exception register entry does not substitute for that report.
