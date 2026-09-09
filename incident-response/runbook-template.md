# Incident Response Runbook Template
### Part M — Security Incident Response & Remediation

Copy this template into the incident's tracking issue once opened via the
`Security Incident` issue form.

## 1. Detection
- **Detected at:** _(timestamp)_
- **Detected by:** _(person / alert / scan)_
- **Source:** _(runtime alert / SAST / dependency scan / secret detection / manual report)_

## 2. Triage
- **Confirmed severity:** SEV-1 / SEV-2 / SEV-3
- **Category:** _(vulnerability / secret / dependency / supply chain / infrastructure / runtime / container / identity)_
- **Scope / blast radius:** _(which repos, services, environments affected)_
- **On-call engineer:** _(name)_

## 3. Escalation (per Day 3 §8.3)
| Severity | Escalation path | Notified |
|---|---|---|
| SEV-1 | On-call + Platform Owner + CTO | ☐ |
| SEV-2 | On-call + Engineering Team lead | ☐ |
| SEV-3 | Logged, reviewed within 48h | ☐ |

## 4. Containment
- **Action taken:** _(isolate service / revoke credential / block IP / disable workflow)_
- **Taken by:** _(name)_
- **Taken at:** _(timestamp)_

## 5. Eradication
- **Root cause:** _(what allowed this to happen)_
- **Fix applied:** _(patch / rotation / redeploy / config change)_
- **PR/commit reference:** _(link)_

## 6. Recovery
- **Service restored at:** _(timestamp)_
- **Verification steps performed:** _(smoke tests, monitoring confirmation)_
- **Stability confirmed by:** _(name)_

## 7. Evidence
- Link every piece of evidence (logs, scan reports, screenshots, alert payloads):
  -
  -

## 8. Post-Incident Review
Complete `incident-response/post-incident-review-template.md` and link it here
before closing this incident. No incident is closed without a linked review.
