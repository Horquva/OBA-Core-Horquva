# Engineering Operations Platform — Din 1-7 Evidence Package
**Owner:** Kamil Ejaz | **Platform:** Engineering Operations (`eng-ops`) | **Repo:** HORQUVA OCOS → `ecosystem/applications/antares/`
**Generated from a real, running system on:** 2026-08-23

---

## Executive Summary

7-day real-integration audit of the Antares Engineering Operations platform, verifying that all cross-platform claims are backed by actual running code — not assumptions, mocks, or hand-written JSON. **Two real defects were found and left unfixed by design** (they belong to other platforms' domains); **two real defects were found and fixed** (within Engineering Ops's own domain). All findings are evidence-linked to real job IDs in `services/lifecycle-service/store/state.json`.

**Release recommendation: CONDITIONAL GO.** See Sign-off Checklist.

---

## Din 1 — Repo Evidence Audit

| Component | Status | Evidence |
|---|---|---|
| Startup | ✅ Real | `node src/server.js`, port 4001, verified via process log |
| APIs | ✅ Real (read-only) | `/health`, `/api/observability` — live HTTP, no write endpoints |
| Web UI | ✅ Real | `apps/web/dashboard/index.html` live-fetches gateway, no static fallback |
| CI/CD | 🔴 Found broken → ✅ Fixed | No `.github/workflows/` file existed for lifecycle-service; lint was also failing on `server.js`. Both fixed Din 1, verified 51/51 tests + `ALL STAGES PASSED` |
| Observability | ✅ Real | `observability.js` computes 3 real metrics from live state |
| AI layer (`askAssistant`) | ⚠️ Mock | Rule-based keyword matcher, not an LLM call — name is misleading, logic is real but not "AI" |

## Din 2 — Producer→Consumer Matrix (frozen)

8 platforms tracked via `gateway.js`. 3 live (lifecycle, integration, governance), 3 down-but-real (capability, validation, research — Python services, real code, not running by default), 2 not_implemented (intelligence-service, operationalization-service — README-only stubs, honestly reported, not faked).

## Din 3 — Live-Data Rule Verification

Real job (`J-ENGOPS-02`) pushed through the actual CLI (`QUEUED → RUNNING → VALIDATING → PASSED → INTEGRATED`). Confirmed observed at 3 independent layers: raw `state.json`, CLI dashboard, live HTTP API. No hand-written JSON used.

## Din 4 — End-to-End Real Paths (2 platforms)

- **Governance (Kanwal):** Real `/api/evaluate` calls — one correctly `REJECT`ed (unregistered actor), one correctly `HUMAN_REVIEW`'d (unknown action, fail-safe default). Both decisions traced into `J-ENGOPS-03` with real decision/evidence/audit IDs.
- **AI/ML (Hasnain/Zeeshan, capability-service):** 🔴 **Real gap found.** Underlying SQLAlchemy/SQLite layer is genuinely real and persists correctly (verified: 9→10 orgs after a real insert). But `/api/summary` does not read from the DB — it reseeds an identical hardcoded demo record on every restart, disconnected from real state. Flagged in `J-ENGOPS-04`, not fixed (outside eng-ops domain).

## Din 5 — Unified Shell, No Fake Numbers

- Fixed hardcoded `"6 services"` badge bug in the web shell — now genuinely counts real sources (verified: correctly showed "3/6 live (+2 not yet implemented)" against real gateway output).
- Added an honest per-platform **Platform Status panel** to the Overview tab.
- Fixed a misleading label in the CLI dashboard (`GATE PASS RATE 100%` sitting next to a `67%` CI bar, implying contradiction) — now labeled `JOB QUALITY-GATE PASS RATE` vs `CI PIPELINE HEALTH`, explicitly noted as separate metrics.

## Din 6 — Chaos / Failure Testing

| Test | Result |
|---|---|
| 1. Platform down (5/6 services killed) | ✅ PASS — honestly reported down, no crash, no fake data |
| 2. Invalid contract (missing field, unknown platform, duplicate job ID) | ✅ PASS — all 3 rejected cleanly, zero state corruption (minor: raw stack traces, not clean user-facing errors) |
| 3. CI/CD fail (real `console.log` bug injected) | ✅ PASS — CI stopped at lint stage (exit 1), recovered cleanly to 51/51 after fix |
| 4. Duplicate input (same governance action POSTed twice) | 🔴 **FAIL** — no idempotency check; two identical `actionRequestId`s produced two separate `ALLOW` decisions. **Bigger bug found in the same test:** `GET /api/decisions` is non-idempotent — it mutates the audit trail on every read (3 → 6 → 9 entries across 3 identical GETs), which is a REST semantics violation. Flagged, not fixed — governance is Kanwal's domain. |

## Din 7 — Final Audits

- **Architecture audit:** all 19 official top-level folders present and match the repo diagram.
- **Repo audit:** `engineering-ops-ci.yml` confirmed live in `.github/workflows/` (committed Din 1).
- **Ownership audit:** 🔴 **1 mismatch found.** Platform `knowledge-ops` is registered to "Laiba Mahboob" in `state.json`, but the official repo diagram assigns Knowledge Operationalization to **Ammara Nasir** (Laiba's actual platform is Enterprise Futures Intelligence, on a separate branch, not yet reviewed). Registry correction is a Team Lead / Tech Lead call, not made unilaterally here.
- **Live demo:** full stack run — lifecycle + integration + governance + gateway — real aggregate response captured, all numbers traceable to source.
- **Controlled failure demo:** re-run of Din 6's 4 tests, same results reproduced.

---

## Open Items (not fixed — outside Engineering Ops's domain by design)

| # | Platform | Owner | Issue |
|---|---|---|---|
| 1 | AI/ML (capability-service) | Hasnain / Zeeshan | `/api/summary` doesn't read from its own DB; reseeds static duplicate data every restart |
| 2 | Trust & Governance | Kanwal | No idempotency check on `/api/evaluate`; `GET /api/decisions` has a read-time side effect (audit trail grows on every GET) |
| 3 | Registry | Team Lead / Tech Lead | `knowledge-ops` platform owner mismatch (Laiba registered, Ammara official) |
| 4 | Capability Validation | Zara | No aggregate/list endpoint exposed — Engineering Ops can only show liveness (`/health`), not real validation data |
| 5 | Intelligence-service, Operationalization-service | Unassigned / Ammara | Zero code — README-only scaffolds |

## Fixed Items (within Engineering Ops's own domain)

| # | Fix | Verified |
|---|---|---|
| 1 | `scripts/lint.js` — `server.js` wrongly flagged for its startup log | 51/51 tests pass |
| 2 | Missing `.github/workflows/engineering-ops-ci.yml` | Committed, live on `antares-team` |
| 3 | `gateway.js` — hardcoded "6 services", `not_implemented` mislabeled as "down" | Verified against real aggregate output |
| 4 | Web shell — same hardcoded count bug, plus new honest Platform Status panel | Verified |
| 5 | CLI dashboard — confusing `GATE PASS RATE` vs CI health label | Verified |

---

## Release Sign-off Checklist

- [x] All 6 real platforms verified running or confirmed real-but-not-running
- [x] Producer→consumer matrix frozen and documented
- [x] Live-data rule proven (no fabricated JSON anywhere in this audit)
- [x] At least 2 end-to-end real paths demonstrated (governance, AI/ML)
- [x] Unified shell shows only real numbers, no fake health %
- [x] System fails honestly under 3/4 chaos conditions
- [ ] **Chaos test 4 (duplicate input) still fails** — governance-engine defect, owned by Kanwal
- [ ] **Ownership mismatch (`knowledge-ops`)** needs Team Lead / Tech Lead decision
- [x] Architecture and repo structure match official diagram

**Recommendation:** Engineering Ops platform itself is release-ready. Full-system release should be **conditional** on items #2 and #3 in Open Items being triaged by Kanwal and the Tech Lead — these are correctness/data-integrity issues, not Engineering Ops defects, and this audit's job was to surface them honestly, not silently ship around them.

— Kamil Ejaz, Engineering Operations, Antares
