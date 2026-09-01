# Sentinel — Part 3: Supply Chain, SBOM, Artifact Integrity & Provenance

**Owner:** Muhammad Bilal Askari — DevSecOps & Security Operations Platform
**Repository:** Horquva/OBA-Core-Horquva

---

## Objective

Secure the transition from source code to trusted deployable artifact:
`Source → Build → Dependency Security → SCA → SBOM → Provenance → Policy → Artifact Validation → Approved Artifact`

Most of Part 3 was already substantiated through real, controlled execution
during Part 1/2 verification. This report consolidates that evidence
against Part 3's specific tasks and adds one new finding (Task 7) discovered
during this review.

---

## Task-by-Task Status

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | Dependency security across the product | 🟢 Working | OWASP Dependency-Check confirmed detecting real Critical (CVSS 10.0) findings in `next.js` and other High findings, in report-only mode per logged platform exception. No unnecessary upgrades performed. |
| 2 | Real SBOM generation | 🟡 Configured, schema-fixed, unproven end-to-end | Syft/CycloneDX generation wired via `sbom-and-provenance.yml`. Not yet exercised on a real production build via `cd-deploy.yml` (design-only deploy path). |
| 3 | Container security (delivery-time) | 🟢 Working | Trivy confirmed blocking a real deliberately-vulnerable image (negative test). Base-image, package, and config-level scanning all covered by Trivy's standard scan surface. Runtime/K8s security remains Ali's ownership, not duplicated here. |
| 4 | Artifact integrity | 🟢 Working | Full lifecycle (Build → Sign → Verify) exercised with Cosign; uses the already-approved, free/open-source mechanism (Sigstore/Cosign keyless signing) rather than introducing an external paid service. |
| 5 | Provenance | 🟢 Working (schema fixed) | SLSA provenance predicate schema defect found and fixed (Drift Register #3, Part 1). Provenance now correctly wired into the CD signing step (was previously disconnected — Drift Register item found during Tech Lead review of PR #8). |
| 6 | Controlled artifact rejection | 🟢 Working — already proven | A deliberately unsigned test image was confirmed **rejected** by `verify-artifact.sh` in the same run where a signed image was confirmed **accepted** — this is the exact `Invalid/Untrusted Artifact → Validation Failure → BLOCK → Evidence` path Task 6 requires. |
| 7 | Supply-chain inputs (immutable references) | 🟠 Partially Working — new finding, partially remediated | See below. |

---

## Task 7 Finding — Mutable Action References (New)

While reviewing Part 3's explicit requirement to verify security-sensitive
workflow dependencies are not silently mutable, three GitHub Actions used
in the security gate were found pinned to **mutable branch names**
(`@master` / `@main`) rather than immutable version tags:

| Action | Was | Now |
|---|---|---|
| `aquasecurity/trivy-action` | `@master` | `@v0.36.0` (verified current stable release) |
| `bridgecrewio/checkov-action` | `@master` | `@v12.1347.0` (verified current stable release) |
| `dependency-check/Dependency-Check_Action` | `@main` | **Still `@main`** — this action publishes no version tags upstream; only `@main` is documented/supported by its maintainers. Flagged as a known, documented exception rather than silently left unaddressed. |

**Why this matters:** `trivy-action`'s own release history documents a real
past supply-chain compromise, which is why the project changed its tagging
convention. A workflow pinned to `@master` would have silently pulled
whatever code existed on that branch at build time — including a
compromised version, had one been merged there. Pinning to a specific
released version closes that gap for two of the three affected actions.

**Remaining gap:** `Dependency-Check_Action` has no tagged releases to pin
against. The safer long-term fix is pinning to a specific commit SHA
(requires periodic manual re-verification since there's no tag to track),
or evaluating a maintained alternative. Logged as a P2 follow-up in the
Part 1 Implementation-Drift Register rather than left unaddressed.

---

## Part 3 Exit Condition — Assessment

Part 3 requires being able to reconstruct:
`Source → Build → Security Evaluation → SBOM → Provenance → Policy → Trusted/Rejected Artifact`
with evidence connecting each stage.

This is substantially demonstrable today:
- **Source → Build:** confirmed via CI build jobs.
- **Security Evaluation:** confirmed via dependency, container, IaC, and secret scanning, all with real positive and negative evidence.
- **SBOM → Provenance:** schema-correct and wired into signing; not yet exercised on a real end-to-end production build (the one remaining unproven link).
- **Policy → Trusted/Rejected Artifact:** fully proven — a signed artifact was accepted, an unsigned one was rejected, in the same controlled test.

**Remaining before Part 3 can be marked fully closed:** one real, clean
`cd-deploy.yml` run producing a real SBOM against a real build (currently
blocked only by the design-only deployment target, not by any known code
defect).
