# Executive Summary — Frontend Engineering Platform

**Week 2 · Castor v1.0 (HEEP) · Dur Muhammad Khan**
For: CTO · Engineering Governance Platform

---

## Status

**All eleven Week 2 deliverables complete. No blocking findings. Week 3 may begin.**

Week 2 produced architecture and specification, not application code — as the Sprint Objective and
the Day 1–2 briefs explicitly require. No Flutter project was scaffolded; `castor_app` is used as a
reference name in documentation.

---

## Nine Decisions

| Area | Decision | Rejected | Deciding factor |
|---|---|---|---|
| Architecture | MVVM | Clean Architecture | Castor's reasoning lives in OBA; use-cases would forward calls without adding logic |
| Repository | Conditional, not mandatory | Mandatory everywhere | A repository forwarding one call adds indirection, not safety |
| Folders | Layer-first | Feature-first | The convention the team already uses; the layout Flutter's samples show |
| State | Provider | Riverpod, BLoC | Externally-documented standard; lowest adoption cost |
| Navigation | Navigator 1.0 behind `AppRouter` | `go_router` | Deep linking not a Week 3 need; migration stays one file |
| DI | `get_it` (data) + Provider (UI) | Provider-only | Interceptors and router must work outside the widget tree |
| Errors | Typed exceptions, mapped in the interceptor | `Result` types | Mapping must work whether or not a repository exists |
| HTTP | `dio` | `http` | No interception in `http` — auth headers duplicated across six platforms |
| Storage | Secure storage for credentials | `shared_preferences` only | Plain-text credentials would contradict Sentinel |

Each is an ADR with options rejected, negative consequences, and a review trigger.

---

## Architecture

```
View ──► ViewModel ──► Repository ──► Service ──► Horquva Platform
                  └────────────────────►┘
                   (direct, when conditions allow)
```

Two layers, four components, dependencies downward only. Each component has documented
**prohibitions** as well as responsibilities — which is what makes the rule enforceable in review
without architectural judgement.

Inside `lib/`: `config/`, `core/`, `models/`, `services/`, `repositories/`, `viewmodels/`, `views/`
(with `screens/` and `widgets/`), `theme/`, plus `main.dart` and `app.dart`.

**The repository is conditional** — required when data is cached, more than one service is
involved, data is written, more than one ViewModel needs it, or mapping is non-trivial. Otherwise
the ViewModel calls the service directly.

---

## Six Findings — None Blocking

| ID | Finding | Owner |
|---|---|---|
| F-01 | Display formatting had no owning layer | **Resolved** — assigned to ViewModel |
| F-02 | Loading and error states lack an assistive-technology announcement contract | Accessibility Platform |
| F-03 | `config/` becomes a shared-edit conflict point at scale | Deferred, trigger stated |
| F-04 | Two Experience Delivery surfaces have no route defined | Visualization Platform |
| F-05 | Nested navigation shell requirement unconfirmed | Executive Workspace Platform |
| F-06 | Testing strategy and CI configuration not documented | Experience Quality, Engineering Governance |

Two cross-document contradictions were also found and resolved: error mapping moved from the
repository to the interceptor, and services now return typed models rather than raw responses. Both
were required once the repository became conditional.

---

## Three Items for CTO Attention

**1. F-05 — the highest rework risk.** If the Executive Workspace requires a persistent navigation
shell with independently-navigable regions, Navigator 1.0 becomes materially harder to work with
and `go_router` would be the right tool. The cost is bounded to one file by design, but the answer
should be known before features are built rather than discovered during them. Recommended for the
first Week 3 planning session.

**2. F-02 — a genuine gap against Principle 7.** Accessibility is meant to be *"integrated from the
beginning of engineering."* The architecture specifies loading and error states but not how they
are announced non-visually. A visually distinct error that is silent to a screen reader satisfies
the state model and fails the principle. Requires the semantic contract from the Accessibility
Platform.

**3. A reversed decision.** Folder organisation was changed from feature-first to layer-first
mid-sprint. ADR-003 records the reversal and withdraws the argument originally used to justify
feature-first — that it prevents merge conflicts — as overstated, since Git conflicts occur at file
level, not directory level. The honest cost of layer-first is recorded: a feature becomes a set of
files rather than a folder, and cohesion rests on the naming convention.

Twelve of thirteen constitutional principles are fully satisfied. Principle 7 is partial, pending
F-02.

---

## Week 3 Recommendation

Resolve F-05, then build **one screen vertically** — view through ViewModel through repository
through service to OBA — and publish it as the reference implementation before the other eight
platforms commit to the architecture.

The architecture is documented but unproven against a live platform. One vertical slice will
surface any remaining gap at the cost of one screen rather than nine platforms.

---

**Full detail:** `FRONTEND-READINESS-REPORT.md` · `DAY-1` through `DAY-4`
