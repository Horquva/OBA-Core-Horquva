# Sentinel — Part 4: Security Findings, Events, Evidence & Runtime Integration

**Owner:** Muhammad Bilal Askari — DevSecOps & Security Operations Platform
**Repository:** Horquva/OBA-Core-Horquva

---

## Objective

Connect DevSecOps security results to Sentinel's shared security operating
model instead of allowing security findings to remain isolated inside
CI/CD.

---

## Task-by-Task Status

### 1. Normalize security findings — 🟢 Done

`vulnerability-management/finding-schema.json` defines the shared finding
shape. Updated this Part to add `branch` and `workflow` — two fields Task 1
explicitly requires that were missing from the original schema.

### 2. Verify the complete finding lifecycle — 🟡 Partially Working

`Detect → Normalize → Classify → Prioritize → Assign → Remediate → Validate
→ Close` is implemented as: automated Detect/Normalize/Classify (SARIF →
GitHub Issue via `finding-to-issue.yml`, fixed trigger bug from Part 1),
with Assign/Remediate/Validate/Close deliberately left to GitHub Issue
lifecycle (labels, assignees, closure) rather than over-automated — this
matches how engineering teams actually work. Not yet exercised end-to-end
with a real Critical/High finding (same open item from Part 1's P0 list).

### 3. Integrate security events — 🟢 Done (new this Part)

Previously, different controls produced different, inconsistent evidence
shapes with no shared "event" concept. Added
`vulnerability-management/security-event-schema.json` — one shared contract
covering `secret_detected`, `critical_vulnerability_detected`,
`security_gate_blocked/passed`, `artifact_rejected/approved`,
`policy_violation`, `deployment_security_failure`, and
`runtime_security_event`. Wired into two real producers:
- `security-gate.yml`'s gate decision now emits an event conforming to this schema (in addition to the raw control results).
- `verify-artifact.sh` now emits a real event on every artifact accept/reject decision — this is the same script already proven to correctly reject unsigned artifacts (Part 3), now producing a traceable, machine-readable record of that decision rather than only a workflow log line.

### 4. Build evidence relationships — 🟢 Done

Every event above carries `repository`, `branch`, `commit`, `workflow`,
`run_id`, `run_url`, and a `decision` — answering Part 4's required
questions (what happened, where, why blocked, which control decided, what
evidence proves it) from the event record alone, without needing to dig
through logs.

### 5. Integrate runtime security events with Ali's platform — ⚪ Deferred (infrastructure-blocked, contract ready)

Per Part 4's own instruction, Bilal does not implement Kubernetes/runtime
infrastructure. The `runtime_security_event` type in the new shared event
schema is the contract Ali's platform can emit into once a real runtime
environment and Falco deployment exist (`runtime-security/falco-rules/`,
already design-complete per Part 1). No change of status from Part 1 — this
remains correctly deferred, not hidden.

### 6. Connect operational visibility to real backend state — 🟡 Partially Working

`dashboard/index.html` + `generate-metrics.yml` query real GitHub API data
(open/closed Issues, workflow run history) — no simulated security state is
used, satisfying the "no simulated state" requirement. Not yet confirmed
with a real production run producing non-placeholder numbers (same open
item from Part 1's matrix, row O).

### 7. Perform second implementation-drift review — 🟢 Done

Re-checked workflows, thresholds, gates, permissions, evidence, policies,
and scanner configs for regressions introduced while building Parts 2–4.

| Area | Result |
|---|---|
| Workflow permissions | No regressions — `gate-summary` job's new evidence-writing step uses only `contents: read`, already granted. |
| Blocking thresholds | Unchanged — dependency-scan remains deliberately report-only per the logged exception; all others remain blocking. |
| Action pinning (Part 3 fix) | Confirmed still pinned to `v0.36.0` / `v12.1347.0` after Part 4 edits — not accidentally reverted. |
| Schema consistency | `finding-schema.json` and new `security-event-schema.json` deliberately kept as two distinct, related shapes (finding = a specific vulnerability; event = any security decision/occurrence, findings included via `related_finding_id`) — not merged into one overloaded schema. |
| Evidence retention | Both new event-emitting points use the same 365-day retention pattern as existing evidence artifacts — consistent. |

No regressions identified. Pending: confirming all of the above on a real,
clean CI run once pushed (consistent with this project's standing rule that
code review alone is not execution evidence).

---

## Part 4 Exit Condition — Assessment

Part 4 requires demonstrating `Detection → Finding → Security Event →
Evidence → Operational Visibility` using real backend data for a controlled
issue.

**Currently demonstrable:** Detection → Finding → Security Event → Evidence
is fully wired end-to-end (IaC/container/secret negative tests already
produce findings; the gate decision and artifact verification now also
produce shared-schema events with full evidence linkage).

**Not yet demonstrable:** the final "→ Operational Visibility" hop — the
dashboard needs one real production run to move from placeholder to real
data. This is the same, single open item carried from Part 1 (row O) and
Part 3 (SBOM/provenance real-run gap) — all three converge on the same
underlying next step: **one clean, real run of the full pipeline on main.**
