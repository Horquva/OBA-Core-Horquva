# DAY 4 — Frontend Architecture Review

**Platform:** Frontend Engineering · **Owner:** Dur Muhammad Khan
**Sprint:** Week 2 — Castor v1.0 (HEEP)

---

## Task Checklist

| # | What to Do | Covered in |
|---|---|---|
| 1 | Review project architecture | Architecture Review |
| 2 | Validate folder organisation | Folder Validation |
| 3 | Verify routing structure | Routing Verification |
| 4 | Review dependency management | Dependency Review |
| 5 | Audit engineering documentation | Documentation Audit |
| 6 | Prepare architecture diagrams | Architecture Diagrams |
| 7 | Publish Frontend Readiness Report | `FRONTEND-READINESS-REPORT.md` |

**Outcome:** The Frontend Engineering Platform is fully architected, documented, and prepared to
support the implementation of every future Castor experience.

---

## Method

Days 1–3 produced architecture. Day 4 asks whether it is coherent, complete, and safe to build on
before nine owners commit to it.

| Severity | Meaning | Action |
|---|---|---|
| **Blocking** | Week 3 cannot begin safely | Resolve before sprint start |
| **Material** | Will cause rework if unaddressed | Resolve in Week 3 Day 1 |
| **Deferred** | Known gap with an accepted plan | Tracked; no immediate action |

Recording findings against one's own architecture is the point. An audit that returns no findings
has usually not been performed.

---

## Architecture Review

### Boundary Ambiguity Test

The question that matters: for each responsibility, is there exactly one owner?

| Responsibility | Owner |
|---|---|
| HTTP request execution | Service |
| Endpoint path definition | `ApiEndpoints` |
| Auth header attachment | `AuthInterceptor` |
| Transport error → `AppException` | `ErrorInterceptor` |
| JSON → typed model, malformed response | Service |
| Caching policy, multi-service composition | Repository |
| Loading state | ViewModel |
| Display formatting | ViewModel — **F-01** |
| Navigation | View, via `AppRouter` |
| Route guarding | `RouteGenerator` |

**F-01 — Material.** Day 1 lists "no formatting rules" among the View's prohibitions while also
listing "no display formatting" among the Repository's prohibitions, leaving date and number
formatting without an explicit owner.

*Resolution:* Formatting belongs to the **ViewModel**, which transforms domain models into display
models. Day 1's View prohibition should be read as forbidding *business* formatting rules, not
string interpolation. Recorded rather than silently corrected, so the reasoning is visible.

### Cross-Document Consistency

An earlier draft contained two contradictions between Day 1 and Day 3, both introduced when the
repository tier became conditional. Both are resolved, and recorded because a reviewer comparing
drafts would otherwise find the change unexplained.

| Contradiction | Earlier draft | Resolved as |
|---|---|---|
| Where transport errors are mapped | `BaseRepository.guard` | `ErrorInterceptor` — must work whether or not a repository exists |
| What services return | Raw `Response` | Typed models — a ViewModel calling a service directly cannot parse JSON |

### Constitutional Alignment

| Principle | Verdict |
|---|---|
| 1 — Experience Before Interface | Pass — four-state model |
| 2 — Intelligence Before Interaction | Pass — repository composition |
| 3 — Human-Centered Engineering | Pass — `userMessage` split, retry on failure |
| 4 — Systems Before Features | Pass — `BaseViewModel`, `AppRouter`, interceptor chain |
| 5 — Platform Before Product | Pass — no WOBA-specific assumption |
| 6 — Consistency Before Creativity | Pass — one pattern per concern |
| 7 — Accessibility by Default | **Partial — F-02** |
| 8 — AI as a Native Experience | Pass — OBA service specified |
| 9 — Governance Enables Scale | Pass — ADR for every decision |
| 10 — Performance Is Experience | Pass — pre-await loading, scoped rebuilds |
| 11 — Every Interaction Improves Understanding | Pass — distinct empty / error / loading |
| 12 — Every Experience Strengthens Trust | Pass — encrypted credentials, no leaked detail |
| 13 — Experience Creates Trust | Pass — storage upholds Sentinel's guarantees |

**F-02 — Material.** Principle 7 states accessibility is *"integrated from the beginning of
engineering rather than added as a final review."* The architecture specifies loading and error
**states** but not how they are **announced** to assistive technology. A visually distinct error
that is silent to a screen reader satisfies the state model and fails the principle.

*Resolution:* Requires the semantic contract from Accessibility Platform. Proposed for Week 3 Day 1:
`CastorErrorView` and `CastorLoader` must emit `Semantics` announcements, and the four-state rule
extends to "every state must be perceivable non-visually."

---

## Folder Validation

| Check | Result |
|---|---|
| Every folder has a single stated purpose | Pass |
| `core/` imports nothing from other folders | Pass by design |
| `config/` may import everything | Pass — it is the wiring layer |
| A contributor can place a new file from its type alone | Pass |
| A screen and its ViewModel are findable from each other | Pass — shared filename stem |

### Import Legality Matrix

```
                 │ core │ config │ theme │ models │ services │ repos │ vm │ views │
─────────────────┼──────┼────────┼───────┼────────┼──────────┼───────┼────┼───────┤
core/            │  ✓   │   ✗    │   ✗   │   ✗    │    ✗     │   ✗   │ ✗  │   ✗   │
config/          │  ✓   │   ✓    │   ✓   │   ✓    │    ✓     │   ✓   │ ✓  │   ✓   │
theme/           │  ✓   │   ✗    │   ✓   │   ✗    │    ✗     │   ✗   │ ✗  │   ✗   │
models/          │  ✓   │   ✗    │   ✗   │   ✓    │    ✗     │   ✗   │ ✗  │   ✗   │
services/        │  ✓   │   ✗    │   ✗   │   ✓    │    ✗     │   ✗   │ ✗  │   ✗   │
repositories/    │  ✓   │   ✗    │   ✗   │   ✓    │    ✓     │   ✗   │ ✗  │   ✗   │
viewmodels/      │  ✓   │   ✗    │   ✗   │   ✓    │    ✓     │   ✓   │ ✗  │   ✗   │
views/           │  ✓   │   ✓    │   ✓   │   ✓    │    ✗     │   ✗   │ ✓  │   ✓   │
```

Four rows deserve comment.

**`core/` imports nothing** — it is the foundation; importing a model or service would create a
cycle. **`services/` may import `models/` but not `repositories/`** — services parse into models,
which is what makes direct ViewModel access possible. **`viewmodels/` may import `services/`** —
the conditional-repository rule expressed in the matrix; the matrix says *may*, the condition table
says *when*. **`views/` may not import `services/` or `repositories/`** — the strictest row; a view
reaching the data layer bypasses the entire state model.

### Scalability

| Growth scenario | Impact |
|---|---|
| 5 → 30 screens | Layer folders need subfolder grouping by experience area |
| 6 → 10 platforms | One new file in `services/`, one base URL in `AppEnvironment` |
| 10 → 40 contributors | `config/` conflict frequency increases — F-03 |
| Add web / desktop target | None — no layer holds platform-specific assumptions |
| Extract a screen into a package | **Difficult** — accepted cost of layer-first, per ADR-003 |

**F-03 — Deferred.** `service_locator.dart`, `provider_registry.dart`, and `route_generator.dart`
are edited by every owner adding a screen. At forty contributors these become persistent conflict
points.

*Resolution:* Deferred deliberately. The mitigation is per-area registration files aggregated by a
barrel file, reducing conflicts to the aggregator's import list. Not adopted now because it adds
indirection before the problem exists. Trigger: three or more owners reporting conflicts within one
sprint.

---

## Routing Verification

| Check | Result |
|---|---|
| Every route is a constant in `AppRoutes` | Pass |
| No view imports `Navigator` directly | Pass by rule — enforceable by lint |
| Unknown routes degrade gracefully | Pass — `RouteNotFoundScreen`, not a throw |
| Guard logic exists in exactly one place | Pass — `RouteGenerator` |
| Parameterised routes use a typed argument class | Pass |
| ViewModels do not navigate | Pass |
| Session expiry works without `BuildContext` | Pass — `GlobalKey<NavigatorState>` |
| Migration to `go_router` is single-file | Pass — `AppRouter` is the only call surface |

### Route Coverage

| Experience Delivery surface | Route defined |
|---|---|
| Executive Workspace | `AppRoutes.executiveDashboard` |
| Organizational Explorer | `AppRoutes.organizationalMap` |
| Knowledge Explorer | `AppRoutes.knowledgeExplorer` |
| Memory Timeline | `AppRoutes.memoryTimeline` |
| Decision Workspace | `AppRoutes.decisionWorkspace` |
| Executive AI Experiences | `AppRoutes.aiConversation` |
| Operational Dashboards | **F-04** |
| Visualization Experiences | **F-04** |

**F-04 — Material.** Two surfaces named in the constitutional Experience Delivery Layer have no
route defined.

*Resolution:* Requires input from Visualization Platform on whether these are standalone routes or
components embedded within the Executive Workspace. Standalone routes need entries in `AppRoutes`
and `RouteGenerator`; embedded components need only `views/widgets/` placement. A two-line change
either way, so not blocking — but leaving it undecided until Week 3 means discovering it
mid-feature.

### Navigation Weakness Register

Stated plainly, because Navigator 1.0 was chosen with known limitations.

| Weakness | Present? | Mitigation |
|---|---|---|
| No built-in route guards | Yes | Manual guard in `RouteGenerator`, centralised |
| Deep linking requires manual parsing | Yes | Not a Week 3 requirement; `AppRouter` permits migration |
| Web URL synchronisation weak | Yes | Web is not a Week 3 target |
| Nested navigation shells awkward | Yes | **Open — F-05** |
| Route arguments untyped by default | Mitigated | Typed argument classes required |

**F-05 — Material.** If the Executive Workspace uses a persistent navigation shell with
independently-navigable regions, Navigator 1.0 becomes materially harder to work with and
`go_router`'s `StatefulShellRoute` would be the appropriate tool.

*Resolution:* Requires confirmation from Executive Workspace Platform before Week 3. This is the
finding with the largest potential rework cost, which is why it is raised explicitly to the CTO
rather than tracked quietly. The `AppRouter` abstraction was designed precisely so that this answer
changing does not invalidate the rest of the architecture.

---

## Dependency Review

| Package | Purpose | Confined to | ADR |
|---|---|---|---|
| `provider` | State management, ViewModel injection | `config/di/`, `views/` | 004 |
| `get_it` | Service locator, data layer | `config/di/` | 006 |
| `dio` | HTTP client with interceptors | `core/network/`, `services/` | 008 |
| `flutter_secure_storage` | Encrypted credential storage | `core/storage/` | 009 |
| `shared_preferences` | Non-sensitive settings | `core/storage/` | 009 |
| `intl` | Date, number, locale formatting | `viewmodels/`, `core/utils/` | — |
| `logger` | Structured development logging | `core/utils/` | — |

### Confinement Audit

The question that determines whether a dependency is a liability: **if this package were abandoned
tomorrow, how many files would change?**

Every package is confined to one or two directories except `provider`, whose `Consumer` and
`Selector` appear throughout `views/`. That is accepted: ViewModels depend only on `ChangeNotifier`
from the Flutter SDK, not on the `provider` package, so a migration would rewrite view widgets
while leaving all business logic and every repository untouched.

### Exclusions

| Excluded | Reason | Review trigger |
|---|---|---|
| `freezed`, `json_serializable` | `build_runner` in every workflow during foundation week | Week 4 |
| `injectable` | Registration volume does not yet justify code generation | Registrations exceed ~40 |
| `retrofit` | Service classes are already thin | Not anticipated |
| `dartz` / `fpdart` | Functional error handling rejected in ADR-007 | Audit finds missing catch blocks |
| `go_router` | Deep linking not a Week 3 requirement | F-05 resolution, or web target |
| `flutter_bloc` | Ceremony disproportionate to Castor's state complexity | Formal state machines needed |

### Policy

New dependencies require Engineering Governance approval · every dependency confined to a stated
folder · every dependency needs an ADR or manifest entry · caret ranges with `pubspec.lock`
committed · no dependency added to satisfy a single screen.

---

## Documentation Audit

| # | Deliverable | Location | Status |
|---|---|---|---|
| 1 | Constitutional frontend architecture established | Day 1 | Complete |
| 2 | Project folder structure finalised | Day 1 | Complete |
| 3 | Layered engineering architecture documented | Day 1 | Complete |
| 4 | Navigation strategy defined | Day 2 | Complete |
| 5 | State management selected and documented | Day 2, ADR-004 | Complete |
| 6 | Dependency injection architecture prepared | Day 2, ADR-006 | Complete |
| 7 | Service integration framework documented | Day 3 | Complete |
| 8 | Repository pattern established | Day 3 | Complete |
| 9 | Frontend engineering standards documented | Day 4 | Complete |
| 10 | Architecture diagrams completed | Day 4 | Complete |
| 11 | Frontend Readiness Report submitted | Report | Complete |

| Quality check | Result |
|---|---|
| Every decision has a recorded rationale | Pass — ADR-001 to ADR-009 |
| Every ADR records options rejected | Pass |
| Every ADR states negative consequences | Pass |
| Every ADR has a review trigger | Pass |
| Known gaps recorded rather than omitted | Pass — F-01 to F-06 |
| Withdrawn arguments recorded rather than deleted | Pass — ADR-003 |
| Cross-document contradictions resolved and recorded | Pass |
| A contributor can add a screen from documentation alone | Pass |

**F-06 — Deferred.** Widget testing strategy, integration testing approach, and CI pipeline
configuration are documented as patterns but have no worked example.

*Resolution:* Testing strategy belongs jointly to this platform and the Experience Quality
Platform; CI configuration to Engineering Governance. The architecture is testable by
construction — Day 2 demonstrates a ViewModel test requiring no widget tree — but the formal
strategy is a Week 3 deliverable, correctly owned elsewhere.

---

## Frontend Engineering Standards

Deliverable 9. The rules code review enforces.

### Architecture

| # | Rule |
|---|---|
| A1 | Imports comply with the legality matrix |
| A2 | ViewModels never import Flutter widgets or `BuildContext` |
| A3 | Views never import `services/` or `repositories/` |
| A4 | Direct service access only under the five repository conditions |
| A5 | Every ViewModel extends `BaseViewModel` |
| A6 | `core/` imports nothing from other folders |
| A7 | A screen and its ViewModel share a filename stem |

### Navigation

| # | Rule |
|---|---|
| N1 | Views call `AppRouter`, never `Navigator` |
| N2 | Route names from `AppRoutes` constants |
| N3 | Parameterised routes use a typed argument class |
| N4 | Navigation from state uses `addPostFrameCallback` |

### State

| # | Rule |
|---|---|
| S1 | `context.read` in callbacks; never `watch` in a large `build()` |
| S2 | `Consumer` wraps the smallest possible subtree |
| S3 | All four `ViewState` cases handled explicitly |
| S4 | Collections exposed as `List.unmodifiable` |
| S5 | `setLoading()` before `await`, never after |
| S6 | ViewModels screen-scoped unless application-wide state is required |

### Integration

| # | Rule |
|---|---|
| I1 | `ErrorInterceptor` maps every `DioException` to `AppException` |
| I2 | Services wrap calls in `send` and catch `TypeError` / `FormatException` |
| I3 | Every ViewModel data call wrapped in `try/catch (AppException)` |
| I4 | Bare `catch (e)` prohibited |
| I5 | Only `userMessage` displayed; `technicalDetail` logged |
| I6 | Endpoint paths from `ApiEndpoints` |
| I7 | Tokens written only via `SecureStorageService` |
| I8 | Tokens never logged, never placed in URLs |
| I9 | Every repository states its caching policy |

### Code Style

100-character lines · imports grouped Dart / Flutter / package / relative, alphabetical within
groups · `const` constructors wherever possible · `Future<void>` never `void` for async methods ·
sound null safety, `!` only where nullability is structurally impossible · comments explain *why*,
not *what* · extract widgets at roughly 100 lines or three nesting levels.

### Pull Request Checklist

Proposed for adoption into the repository PR template.

```
[ ] Imports comply with the legality matrix
[ ] ViewModel has no BuildContext, Navigator, or widget import
[ ] View imports no service or repository
[ ] Direct service access justified against the five conditions
[ ] Screen and ViewModel share a filename stem
[ ] Navigation goes through AppRouter; route names from AppRoutes
[ ] All four ViewState cases handled
[ ] setLoading() called before await
[ ] Service wraps its call in send() and catches TypeError
[ ] ViewModel catches AppException; no bare catch
[ ] Only userMessage reaches the UI
[ ] No credential written outside SecureStorageService
[ ] New decision has an ADR; new dependency approved by Governance
```

---

## Architecture Diagrams

### 1. Castor in the Horquva Ecosystem

```
                          ORGANIZATIONAL BRAIN (OBA)
                   memory · knowledge · reasoning · decisions
                                     │
                                     ▼
                   EXPERIENCE INTEGRATION PLATFORM
              identity · auth · session · API gateway · search
                                     │
                                     ▼
        ═════════════════════════════════════════════════════
              CASTOR v1.0 — FRONTEND ENGINEERING PLATFORM
        ═════════════════════════════════════════════════════
                                     │
             services/ connects to six constitutional platforms
             OBA · Sentinel · Altair · Arcturus · Antares · Vega
                                     │
                                     ▼
                       EXPERIENCE DELIVERY LAYER
        Executive Workspace     Decision Workspace
        Organizational Explorer Knowledge Explorer
        Memory Timeline         AI Experiences
        Operational Dashboards  Visualization Experiences
```

### 2. Layer Architecture

```
═══════════════════════════ UI LAYER ═══════════════════════════

   ┌──────────────────┐  observes  ┌──────────────────────┐
   │      VIEW        │ ◄───────── │      VIEW MODEL      │
   │ widgets · layout │            │ ViewState            │
   │ design tokens    │ ─────────► │ display models       │
   │ AppRouter        │   intent   │ extends ChangeNotifier│
   └──────────────────┘            └──────────────────────┘
        │                              │            │
        │ Provider              (conditional)   (direct)
        │                              ▼            │
        │                   ┌────────────────────┐  │
        │                   │    REPOSITORY      │  │
        │                   │ cache · compose    │  │
        │                   └────────────────────┘  │
        │                              │            │
        │                              ▼            ▼
        │                   ┌────────────────────────┐
        │                   │       SERVICE          │
        │                   │ typed models           │
        │                   └────────────────────────┘
        │                              │
        │                              ▼
        │                   ┌────────────────────────┐
        │                   │ DIO + INTERCEPTORS     │
        │                   │ 1 Auth  2 Log  3 Error │
        │                   └────────────────────────┘
        ▼                              ▼
   ┌──────────┐            ┌────────────────────────┐
   │  theme/  │            │  HORQUVA PLATFORMS     │
   └──────────┘            └────────────────────────┘

════════ DEPENDENCY RULE: downward only ════════
```

### 3. Dependency Injection

```
              main.dart
                  │ 1. ensureInitialized()
                  │ 2. EnvironmentConfig.current
                  │ 3. await setupServiceLocator(env)
                  │ 4. runApp(CastorApp())
                  ▼
  ┌───────────────────────────────────────────────┐
  │  GET_IT — data layer, no widget tree          │
  │  AppEnvironment · SecureStorage · Preferences │
  │  SessionService · AppRouter · DioClient       │
  │  Services · Repositories                      │
  └───────────────────────────────────────────────┘
                  │ serviceLocator<T>()
                  ▼
  ┌───────────────────────────────────────────────┐
  │  PROVIDER — UI layer, in widget tree          │
  │  Root: SessionViewModel · ThemeViewModel      │
  │  Screen-scoped (default): all others          │
  └───────────────────────────────────────────────┘
                  │ Consumer / Selector
                  ▼
              ┌────────┐
              │  VIEW  │
              └────────┘
```

### 4. Request Lifecycle

```
  USER ACTION
      ▼
  VIEW ── context.read<VM>().load() ──► VIEW MODEL
                                            │ setLoading()
      ◄──── ViewState.loading ───────────────┤
   spinner                                   ▼
                              REPOSITORY (if present)
                              cache fresh? ─yes─► return cached
                                            │ no
                                            ▼
                                        SERVICE
                                            ▼
                              AuthInterceptor + Bearer token
                                            ▼
                                  EXTERNAL PLATFORM
                                            │
        ┌───────────┬────────────┬──────────┴─────┬──────────────┐
       200         401        4xx / 5xx        timeout      bad shape
        │           │            │                │              │
        ▼           ▼            ▼                ▼              ▼
    parse to  ErrorInterceptor   ErrorInterceptor → AppException  Service →
    typed     attemptRefresh()                                    Unknown
    model         │                                               Exception
        │   ┌─────┴─────┐
        │ success    failure
        │     │          │
        │  retry    clear session
        │           reset(login)
        ▼                        ▼
  ┌──────────────────┐   ┌──────────────────────────────┐
  │ VIEW MODEL       │   │ VIEW MODEL                   │
  │ setSuccess()     │   │ on AppException: setError()  │
  └──────────────────┘   └──────────────────────────────┘
        ▼                        ▼
     content            CastorErrorView + retry
```

### 5. One Feature Across Layer Folders

```
  FEATURE: Executive Dashboard
  ══════════════════════════════════════════════════════════

  views/screens/     executive_dashboard_screen.dart
                              ▼ Consumer
  viewmodels/        executive_dashboard_view_model.dart
                              ▼
  repositories/      insight_repository.dart      ← caching required
                              ▼
  services/          oba_service.dart             ← shared, existing
                              ▼
  models/            organizational_insight.dart

  views/widgets/     insight_card.dart
  config/routes/     app_routes.dart              ← route constant
  config/di/         service_locator.dart         ← repository registered
                     provider_registry.dart       ← ViewModel registered

  ──────────────────────────────────────────────────────────
  A feature is a SET OF FILES, not a folder. The shared stem
  (executive_dashboard_*) makes the set discoverable and makes
  CODEOWNERS patterns work.
```

---

## Findings Register

| ID | Severity | Finding | Owner | Resolution |
|---|---|---|---|---|
| F-01 | Material | Display formatting had no owning layer | Frontend Engineering | **Resolved** — assigned to ViewModel |
| F-02 | Material | State model lacks assistive-technology announcement | Accessibility + Frontend | Week 3 Day 1 |
| F-03 | Deferred | `config/` files are shared-edit conflict points at scale | Frontend Engineering | Per-area registration files on trigger |
| F-04 | Material | Two Experience Delivery surfaces have no route | Visualization Platform | Confirm before Week 3 |
| F-05 | Material | Nested navigation shell requirement unconfirmed | Executive Workspace Platform | **Highest rework risk** |
| F-06 | Deferred | Testing strategy and CI not documented | Experience Quality + Engineering Governance | Week 3, owned elsewhere |

Carried forward from Day 3: concurrent 401 locking, certificate provisioning, response envelope
confirmation, offline policy, pagination contract.

**Blocking findings: none.** Week 3 implementation may begin. F-05 carries the highest rework cost
and should be resolved in the first Week 3 planning session.

---

## Readiness Determination

| Criterion | Verdict |
|---|---|
| Architecture coherent; one owner per responsibility | Yes |
| Cross-document contradictions resolved | Yes — two |
| Structure supports parallel work by nine owners | Yes, with `config/` as the known conflict surface |
| Routing covers every named Experience Delivery surface | Two pending — F-04 |
| Dependencies confined and replaceable | Yes |
| Every decision documented with rejected options | Yes — ADR-001 to ADR-009 |
| Standards mechanically enforceable | Yes |
| Known gaps recorded, not concealed | Yes |
| Blocking findings open | **No** |

**Determination: ready to support Week 3 implementation.**

---

## CTO Review Notes

**"Why Navigator 1.0 on a platform meant to last?"** Because the abstraction outlasts the library.
No view imports `Navigator` — all navigation goes through `AppRouter`. If deep linking or a nested
shell becomes a requirement, `AppRouter`'s implementation is rewritten and every call site compiles
unchanged. F-05 is the one scenario that would trigger that migration.

**"Provider rather than Riverpod or BLoC — does that scale?"** Provider scales to Castor's state
complexity, which is presentational rather than state-machine-shaped. Riverpod is technically
stronger and was declined because externally-documented standards were prioritised while nine
owners adopt the architecture simultaneously. ViewModels depend on `ChangeNotifier` from the SDK,
not the package — migration would rewrite view widgets and leave business logic untouched.

**"The repository is optional — how is that not inconsistent?"** The consistency is in the
condition, not the shape. Five triggers; any one makes a repository mandatory. Error typing —
needed on every path — was moved to the interceptor precisely so correctness does not depend on
which shape a screen uses.

**"Layer-first rather than feature-first — was that reconsidered?"** Yes, and reversed. ADR-003
records the decision and withdraws an argument previously advanced for feature-first as overstated.
The honest cost is recorded: extracting a screen into a package becomes difficult, and cohesion
rests entirely on the naming convention.

**"What is the largest risk to Week 3?"** F-05. The cost is bounded to `AppRouter` by design, but
the answer should be known before features are built rather than discovered during them.

**"Are six findings a sign of incomplete work?"** They are the output of the audit the Day 4 brief
asked for. Four are cross-platform dependencies that cannot be resolved unilaterally; one was found
and resolved during review; one is a deliberate deferral with a stated trigger. An audit returning
no findings would indicate it had not been performed.

---

**Deliverables:** `FRONTEND-READINESS-REPORT.md` · `EXECUTIVE-SUMMARY.md`
