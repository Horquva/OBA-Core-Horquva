# Frontend Readiness Report

**Platform:** Frontend Engineering · **Owner:** Dur Muhammad Khan
**Sprint:** Week 2 — Castor v1.0 (HEEP) · **Branch:** `platform/frontend-engineering`
**Submitted to:** CTO · Engineering Governance Platform

---

## Purpose

This report discharges Week 2 Deliverable 11. It states what the Frontend Engineering Platform
produced, what it decided and why, what it deliberately did not do, what remains unresolved, and
whether Week 3 may safely begin.

---

## Sprint Interpretation

The Sprint Objective states the goal is *"not to build a finished product, but to create the
reusable systems, architectural foundations, engineering standards, and experience components that
every future Horquva application will inherit."* Day 1 adds *"without implementing business
features"*; Day 2 adds *"without prematurely implementing application logic."*

This platform therefore produced **architecture and specification, not application code.** All
eleven deliverables are documentation artefacts; code samples are reference patterns defining the
shape of Week 3 implementation.

No Flutter project was scaffolded, consistent with the shared-monorepo structure in the Castor
repository README, where each owner contributes to `platforms/<platform-name>/`. `castor_app` is
used as a reference name in documentation.

---

## Deliverable Status

All eleven complete.

| # | Deliverable | Location |
|---|---|---|
| 1 | Constitutional frontend architecture established | Day 1 |
| 2 | Project folder structure finalised | Day 1 |
| 3 | Layered engineering architecture documented | Day 1 |
| 4 | Navigation strategy defined | Day 2 |
| 5 | State management selected and documented | Day 2, ADR-004 |
| 6 | Dependency injection architecture prepared | Day 2, ADR-006 |
| 7 | Service integration framework documented | Day 3 |
| 8 | Repository pattern established | Day 3 |
| 9 | Frontend engineering standards documented | Day 4 |
| 10 | Architecture diagrams completed | Day 4 |
| 11 | Frontend Readiness Report submitted | This document |

---

## Architectural Decisions

Nine decisions, each an ADR stating the options rejected, the rationale, the negative consequences,
and a review trigger.

| ADR | Decision | Rejected | Deciding factor |
|---|---|---|---|
| 001 | MVVM | Clean Architecture | Castor's reasoning lives in OBA; use-cases would forward calls without adding logic |
| 002 | Repository conditional, not mandatory | Mandatory everywhere | A repository forwarding one call adds indirection, not safety |
| 003 | Layer-first folders | Feature-first | The convention the team already uses; the layout Flutter's samples demonstrate |
| 004 | Provider with `ChangeNotifier` | Riverpod, BLoC | Externally-documented standard; lowest adoption cost |
| 005 | Navigator 1.0 behind `AppRouter` | `go_router` | Deep linking not a Week 3 need; abstraction keeps migration to one file |
| 006 | `get_it` (data) + Provider (UI) | Provider-only | Interceptors and router must work outside the widget tree |
| 007 | Typed exceptions, mapped in the interceptor | `Result` types; mapping in the repository | Mapping must work whether or not a repository exists |
| 008 | `dio` | `http` | No interception in `http` — auth headers duplicated across six platforms |
| 009 | Split storage by sensitivity | `shared_preferences` only | Plain-text credentials would contradict Sentinel |

### The decision that shaped the others

**ADR-002 — the conditional repository.** Making the tier conditional removed pass-through classes
but invalidated two placements from an earlier draft. Once a ViewModel may call a service directly,
error mapping cannot live in the repository and JSON parsing cannot either — the ViewModel would
have to import `dio` and decode responses, both forbidden by the Day 1 prohibitions.

Mapping therefore moved to `ErrorInterceptor` and parsing to the service. Both paths now surface
typed models and typed exceptions identically. Recorded in the Day 4 consistency audit rather than
left as an unexplained difference between drafts.

### The decision most likely to be challenged

**ADR-005 — Navigator 1.0.** `go_router` is stronger on deep linking, web URL synchronisation, and
nested shells. It was declined because none is a Week 3 requirement, and because a new navigation
mental model during the week nine platforms are being established carries its own cost.

The mitigation is architectural rather than rhetorical: no view imports `Navigator`. All navigation
passes through `AppRouter`, whose four methods are the entire navigation surface. Replacing the
implementation would rewrite one file and leave every call site compiling unchanged. F-05 is the
one scenario that would trigger that migration.

### The decision that departs from the pattern

Most decisions favoured official or lowest-cost options. **ADR-008 chose `dio` over the
officially-maintained `http`.** `http` provides no interception mechanism, so every cross-cutting
concern would be implemented per-service. Across six platforms the authorization header would be
attached in six places, five correct and one eventually forgotten. A Sentinel-protected request
sent without a token is a trust failure rather than an inconvenience.

A second reason emerged from ADR-002: because repositories are conditional, error mapping must
happen somewhere always in the path. Only an interceptor satisfies that.

### The decision that was reversed

**ADR-003 — layer-first folders.** An earlier draft chose feature-first, partly on the argument
that it prevents merge conflicts among nine owners sharing layer directories.

That argument was overstated and is withdrawn in the ADR rather than quietly dropped. Git conflicts
occur at file level, not directory level; two contributors adding different files to
`views/screens/` do not conflict. The genuine conflict surface is `config/` under either option.

Layer-first was adopted because it is the convention the team already uses and the layout Flutter's
own samples demonstrate. Its honest cost is recorded: a feature becomes a set of files rather than
a folder, cohesion rests on the naming convention, and extracting a screen into a package becomes
difficult.

---

## What Was Built

**Layer architecture.** Four components across two layers, dependencies downward only. Each has
documented responsibilities and, more importantly, documented **prohibitions** — which is what
makes the architecture enforceable without architectural judgement. A complete import legality
matrix makes the rule mechanically checkable.

**Conditional repository tier.** Required when data is cached, more than one service is involved,
data is written, more than one ViewModel needs it, or mapping is non-trivial. Five stated
conditions rather than a blanket rule — the consistency is in the condition, not the shape.

**Project structure.** Ten entries inside `lib/`: `main.dart`, `app.dart`, `config/`, `core/`,
`models/`, `services/`, `repositories/`, `viewmodels/`, `views/` (with `screens/` and `widgets/`),
and `theme/`. `config/` and `core/` exist because their contents belong to no layer.

**State management.** Provider with `ChangeNotifier`, standardised through `BaseViewModel` and a
four-state `ViewState`. All four states must be handled explicitly — including the distinction
between a failed request and a successful request returning no results, since conflating those two
messages teaches users to distrust the interface.

**Navigation.** Named routes on Navigator 1.0 through `AppRouter`. Route names are constants;
parameterised routes require typed argument classes; guards are centralised; unknown routes degrade
to a navigable screen. ViewModels do not navigate — views navigate in response to state, which is
what keeps ViewModels testable without a widget tree.

**Dependency injection.** `get_it` for the data layer, Provider for ViewModels. The split follows
the layer boundary precisely, so a ViewModel resolving itself from `get_it` is immediately visible
as a violation. ViewModels default to screen scope.

**Integration architecture.** Three interceptors in a documented order: auth, logging (development
and staging only), and error handling with single-attempt 401 refresh plus `DioException` to
`AppException` conversion. Production omits the logging interceptor from the chain entirely rather
than silencing it. Services return typed models; repositories own caching, composition, and write
coordination when present.

**Authentication and storage.** Credentials in `flutter_secure_storage`; preferences in
`shared_preferences`. Keys carry `secure` and `pref` naming segments so misplacement is visible in
review. `SessionService` is the sole reader and writer of credential keys, giving one place to
audit credential handling.

**Error handling.** Typed `AppException` carrying separate `userMessage` and `technicalDetail`.
Three mandatory catch points — interceptor, service, ViewModel. The repository is the only optional
one, which is what allows the tier to be skipped without weakening error handling.

**Loading state.** Four states with specified presentation. Refresh preserves visible content.
Independently loading regions get independent flags. `setLoading()` before the `await`.

**Engineering standards.** Twenty-six enforceable rules plus a code style specification and a
proposed pull-request checklist.

---

## Review Findings

Six findings, plus two cross-document contradictions found and resolved.

| ID | Severity | Finding | Owner | Status |
|---|---|---|---|---|
| F-01 | Material | Display formatting had no owning layer | Frontend Engineering | **Resolved** |
| F-02 | Material | State model lacks assistive-technology announcement | Accessibility + Frontend | Week 3 Day 1 |
| F-03 | Deferred | `config/` becomes a conflict point at scale | Frontend Engineering | Trigger-based |
| F-04 | Material | Two Experience Delivery surfaces have no route | Visualization Platform | Confirm before Week 3 |
| F-05 | Material | Nested navigation shell requirement unconfirmed | Executive Workspace Platform | **Highest rework risk** |
| F-06 | Deferred | Testing strategy and CI not documented | Experience Quality + Engineering Governance | Week 3, owned elsewhere |

**No blocking findings.**

**On F-02** — Principle 7 states accessibility is *"integrated from the beginning of engineering."*
The architecture specifies loading and error states but not how they are announced to assistive
technology. A visually distinct error that is silent to a screen reader satisfies the state model
and fails the principle. A genuine gap in the Week 2 output, found by audit rather than assumed
absent.

**On F-05** — the largest potential rework cost. The cost is bounded to `AppRouter` by design, but
the answer should be known before features are built rather than discovered during them.

**Carried forward from Day 3** — concurrent 401 single-flight locking (blocked on whether Sentinel
refresh tokens are single-use), certificate provisioning, response envelope confirmation, offline
policy, and the OBA pagination contract.

---

## Deliberate Exclusions

| Excluded | Reason | Review trigger |
|---|---|---|
| Domain layer / use-cases | Castor's reasoning lives in OBA | A repository method exceeds ~40 lines, or a rule appears twice |
| `Result` / `Either` types | Unfamiliar functional idiom; safety closed structurally instead | Audit reveals missing catch blocks |
| Code generation (`freezed`, `injectable`, `retrofit`) | A broken `build_runner` during foundation week blocks the team | Week 4 |
| Modular pub packages (`melos`) | Layer-first makes package extraction impractical regardless | Structure moves to feature-first |
| `go_router` | Deep linking not a Week 3 requirement | F-05 resolution, or a web target |
| `flutter_bloc` | Ceremony disproportionate to Castor's state complexity | Formal state machines needed |
| A Flutter project scaffold | Contradicts the sprint's explicit instruction and the monorepo structure | Week 3 |

---

## Constitutional Compliance

Twelve of thirteen principles fully satisfied. Principle 7 (Accessibility by Default) is **partial**
— states are specified but the assistive-technology announcement contract is missing, recorded as
F-02 with an owner and a Week 3 resolution.

---

## Cross-Platform Coordination

### Interfaces established

| Platform | Interface |
|---|---|
| Design System | Tokens consumed by `theme/`; components in `views/widgets/` |
| Executive Workspace | Builds on the layer structure and naming convention |
| AI Experience | Consumes the OBA service contract |
| Visualization | Supplies widgets consumed by screens |
| Mobile Experience | Responsive patterns build on `core/utils/` |
| Accessibility | Semantic requirements enter the engineering standards |
| Experience Quality | Reviews against Day 4 standards and PR checklist |
| Engineering Governance | Owns repository standards this platform complies with |
| AI Experience Engineering | Consumes the same service and repository abstractions |

### Confirmations required from Engineering Governance

Dependency additions (`provider`, `get_it`, `dio`, `flutter_secure_storage`, `shared_preferences`,
`intl`, `logger`) · `config/` as an expected shared-edit surface · three mandatory catch points
added to the PR checklist · `AppRouter`-only navigation enforced by lint · filename-pattern
`CODEOWNERS` entries as the ownership mechanism under layer-first folders · adoption of the
proposed PR checklist.

### Answers required before Week 3

| Question | Owner | Consequence if unresolved |
|---|---|---|
| Does the Executive Workspace need a nested navigation shell? (F-05) | Executive Workspace Platform | Navigation rework mid-sprint |
| Are Operational Dashboards standalone routes or embedded? (F-04) | Visualization Platform | Route registration discovered mid-feature |
| Semantic announcement contract for loading and error states (F-02) | Accessibility Platform | Principle 7 remains partial |
| Are Sentinel refresh tokens single-use? | Sentinel / Governance | Concurrent 401 handling cannot be implemented correctly |
| Does OBA reasoning require streaming responses? | AI Experience Platform | Service return type would change |
| What is the OBA pagination convention? | OBA / AI Experience | List-heavy screens would need retrofitting |

---

## Week 3 Readiness

### Available from Day 1

Complete folder structure specification · `BaseViewModel`, `ViewState`, `AppException` hierarchy,
`ErrorMapper` · `AppRouter`, `RouteGenerator`, `AppRoutes` · `DioClient` and three interceptors ·
service shape for all six platforms · `SessionService`, `SecureStorageService`,
`PreferencesService` · environment configuration for three environments · twenty-six standards and
a PR checklist · the five repository conditions · a documented procedure for adding a screen.

### Recommended sequence

| Order | Task | Rationale |
|---|---|---|
| 1 | Resolve F-05 with Executive Workspace | Determines whether the navigation foundation holds |
| 2 | Scaffold the project and `core/` | Everything else depends on it |
| 3 | Implement `DioClient` and interceptors | Every service depends on it |
| 4 | Implement auth flow end to end | Validates the full path against a real platform |
| 5 | Implement one screen vertically | Proves the architecture before nine owners commit |
| 6 | Publish the vertical slice as the reference implementation | Gives every owner a working example, not only documentation |

Step 5 is the important one. The architecture is documented but unproven against a live platform.
One complete path — view through ViewModel through repository through service to OBA — will surface
any remaining gap at a cost of one screen rather than nine platforms.

### Residual risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| F-05 requires navigation migration | Medium | Medium | Bounded to `AppRouter` by design |
| External contracts differ from assumptions | Medium | Medium | Services are thin; changes are single-file |
| Concurrent 401 causes session loss | Low | High | Documented; single-flight lock is a Week 3 task |
| Direct service access becomes the default, bypassing caching | Medium | Medium | Five stated conditions; PR checklist item |
| Team applies the architecture inconsistently | Medium | High | PR checklist plus a reference vertical slice |
| Provider proves insufficient | Low | Medium | ViewModels depend on the SDK, not the package |

The fourth row is the risk introduced by ADR-002 and is stated explicitly. Making the repository
conditional removes pass-through classes but creates a path of lower resistance that bypasses
caching. The review trigger is stated in ADR-002.

---

## Determination

| Criterion | Verdict |
|---|---|
| All eleven deliverables complete | Yes |
| Every decision documented with rejected options | Yes — ADR-001 to ADR-009 |
| Architecture coherent; no ambiguous ownership | Yes |
| Cross-document contradictions found and resolved | Yes — two |
| Structure supports parallel work by nine owners | Yes, with `config/` as the known conflict surface |
| Dependencies confined and replaceable | Yes |
| Standards mechanically enforceable | Yes |
| Known gaps recorded rather than concealed | Yes |
| A reversed decision documented with the withdrawn argument | Yes — ADR-003 |
| Blocking findings outstanding | **None** |

**The Frontend Engineering Platform is architected, documented, and ready to support Week 3
implementation and the development of every future Castor experience.**

Six findings require cross-platform input; none prevents Week 3 from beginning. F-05 carries the
highest rework cost and is recommended for resolution in the first Week 3 planning session.

---

**Submitted by:** Dur Muhammad Khan, Frontend Engineering Platform Owner
**Status:** Week 2 complete · Week 3 ready
