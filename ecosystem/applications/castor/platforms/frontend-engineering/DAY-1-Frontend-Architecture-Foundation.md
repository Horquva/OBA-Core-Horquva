# DAY 1 — Frontend Architecture Foundation

**Platform:** Frontend Engineering · **Owner:** Dur Muhammad Khan
**Sprint:** Week 2 — Castor v1.0 (HEEP)

---

## Task Checklist

| # | What to Build | Covered in |
|---|---|---|
| 1 | Flutter project architecture | Architecture Pattern, Layers |
| 2 | Folder structure | Folder Structure |
| 3 | Feature-based organisation | Feature Organisation |
| 4 | Layer separation | Layers, Dependency Rule |
| 5 | Core module | Folder Structure |
| 6 | Shared module | Folder Structure |
| 7 | Configuration module | Folder Structure |
| 8 | Environment setup | Environment |

**Outcome:** A documented frontend architecture supporting scalable development across WOBA and
every future Horquva application.

---

## Scope

Week 2 produces **architecture, not application code.** The Sprint Objective states the goal is
*"not to build a finished product,"* and the Day 1 brief adds *"without implementing business
features."* Everything below is a specification for Week 3. `castor_app` is the reference project
name.

---

## Architecture Pattern

| | Clean Architecture | Unlayered | **MVVM** |
|---|---|---|---|
| Layers | 3–4 | 1 | 2 |
| Boilerplate | High | None | Moderate |
| Official Flutter guidance | No | No | **Yes** |
| Testability | Excellent | Poor | Strong |
| Learning curve, mixed team | Steep | Flat | Moderate |

### Decision — MVVM

1. **Official guidance is governance.** Principle 9 says consistency *"cannot depend upon
   individual memory or personal preference."* Adopting the pattern Flutter itself documents gives
   the standard an external authority — contributors read public docs, not internal folklore.

2. **It matches where Castor's complexity is.** Clean Architecture's use-case layer earns its cost
   when business rules are dense and client-side. Castor's reasoning happens in OBA. What Castor
   must manage is six external platforms — which is what the data layer is for.

3. **It is teachable in one session.** An architecture nobody applies correctly is worth nothing
   regardless of theoretical merit.

Recorded as ADR-001.

---

## Layers

```
  UI LAYER
  ┌──────────┐   intent    ┌───────────────┐
  │   VIEW   │ ──────────► │   VIEWMODEL   │
  │ widgets  │ ◄────────── │  ViewState    │
  └──────────┘   state     └───────────────┘
                                   │
  ─────────────────────────────────┼──────────────────────
  DATA LAYER                       │
                     ┌─────────────┴──────────────┐
                     ▼                            ▼
              ┌──────────────┐             ┌─────────────┐
              │  REPOSITORY  │ ──────────► │   SERVICE   │
              │ cache        │             │ HTTP calls  │
              │ compose      │             │ 1 platform  │
              └──────────────┘             └─────────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │ HORQUVA PLATFORM │
                                        └──────────────────┘
```

Note the **two arrows out of ViewModel.** A repository is not always required.

| Layer | Responsibilities | Never |
|---|---|---|
| **View** | Widgets, layout, design tokens, user input, navigation via `AppRouter` | Network calls, business logic, data-layer imports |
| **ViewModel** | `ViewState`, display-ready data, intent handlers | `BuildContext`, `Navigator`, widget imports, `dio`, raw JSON |
| **Repository** | Caching, multi-service composition, write coordination | Widget imports, display formatting, direct HTTP |
| **Service** | One class per platform, one method per endpoint, returns typed models | Caching, business logic, knowledge of callers |

The "Never" column is what makes the architecture enforceable. A ViewModel importing
`BuildContext`, or a view importing a service, is a visible violation requiring no architectural
judgement to identify.

---

## When Is a Repository Required?

A repository that only forwards one call to one service adds indirection without value. It is
**conditional** — but the condition is stated so the exception does not become the default.

**Required when any of these is true:**

| Condition | Why |
|---|---|
| Data is cached | Two ViewModels reading the same data must share one cache, or they will disagree |
| More than one service is involved | Composition belongs in one place, not in each ViewModel |
| Data is written or mutated | Writes must invalidate cache and stay consistent across screens |
| More than one ViewModel needs the same data | Otherwise the mapping is duplicated |
| Mapping is non-trivial | Merging or reshaping is domain work, not presentation |

**Direct service access permitted only when all of these hold:** single service, single endpoint,
read-only, no caching, one model with no reshaping, only one ViewModel needs it.

### Why this stays safe

**Services throw `AppException`, not `DioException`.** Error mapping lives in `ErrorInterceptor`,
so both paths surface the same typed exception and a ViewModel never imports `dio`.

**Promotion is expected.** When a second ViewModel needs the same data, or caching becomes
necessary, a repository is added in that same pull request. Starting without one is not permanent.

Recorded as ADR-002.

---

## Folder Structure

Files are grouped by architectural role — the standard MVVM layout, and the one Flutter's own
architecture samples use. Recorded as ADR-003.

```
lib/
├── main.dart          ← entry point
├── app.dart           ← root widget (MaterialApp + providers + router)
│
├── config/            ← routes, DI registration, environment
├── core/              ← network, errors, storage, base classes
│
├── models/            ← domain models
├── services/          ← one class per Horquva platform
├── repositories/      ← caching, composition, write coordination
├── viewmodels/        ← presentation logic
├── views/
│   ├── screens/       ← full pages, one per route
│   └── widgets/       ← reusable widgets
└── theme/             ← Design System tokens
```

Every file belongs to exactly one entry.

| Folder | Key contents |
|---|---|
| `config/` | `app_routes`, `app_router`, `route_generator`, `service_locator`, `provider_registry`, environment classes |
| `core/` | `dio_client`, interceptors, `app_exception`, `error_mapper`, secure & preferences storage, `session_service`, `base_view_model`, `view_state` |
| `models/` | `organizational_insight`, `decision_summary`, `auth_session` |
| `services/` | `oba_service`, `sentinel_service`, `altair_service`, `arcturus_service`, `antares_service`, `vega_service` |
| `repositories/` | `insight_repository`, `auth_repository`, `decision_repository` |
| `viewmodels/` | One per screen |
| `views/screens/` | One per route |
| `views/widgets/` | `castor_loader`, `castor_error_view`, `castor_empty_state`, shared widgets |
| `theme/` | `app_theme`, `app_colors`, `app_typography`, `app_spacing` |

`config/` and `core/` exist because their contents belong to no layer. A Dio client is not a
platform service; an exception class is not a domain model; a route table is not a view.

### Growth

At roughly fifteen screens, flat layer folders become hard to navigate. The scaling mechanism is
**subfolders by experience area inside each layer** — `views/screens/executive/`,
`viewmodels/executive/` — with **identical subfolder names across layers**, so a view and its
ViewModel stay findable from each other. Introduced when a layer exceeds roughly ten files.

---

## Feature Organisation

Under layer-first folders, a feature is not a directory — it is a **matched set of files across
layers**, tied together by a shared filename stem.

```
  FEATURE: Executive Dashboard
  ──────────────────────────────────────────────────────────
  views/screens/     executive_dashboard_screen.dart
  views/widgets/     insight_card.dart
  viewmodels/        executive_dashboard_view_model.dart
  repositories/      insight_repository.dart    (if conditions require)
  models/            organizational_insight.dart
  services/          oba_service.dart           (shared, existing)
```

### Adding a feature

1. Models → `models/`
2. Repository → `repositories/` **only if the conditions require one**; register in
   `service_locator.dart`
3. ViewModel → `viewmodels/`, extends `BaseViewModel`; register in `provider_registry.dart`
4. Screen → `views/screens/`; screen-specific widgets → `views/widgets/`
5. Route → `app_routes.dart` and `route_generator.dart`
6. Tests → `test/unit/viewmodels/`

Steps 2, 3, and 5 touch `config/` — the shared wiring layer, and the one place where two owners
adding screens on the same day may collide.

### Ownership

Layer-first means ownership is expressed by **file**, not folder. `CODEOWNERS` uses filename
patterns:

```
lib/views/screens/executive_*    @executive-workspace-owner
lib/viewmodels/executive_*       @executive-workspace-owner
lib/theme/                       @design-system-owner
lib/config/  lib/core/           @frontend-engineering-owner
```

This is the practical cost of layer-first organisation, and the reason the naming convention is a
governance rule rather than a style preference.

---

## Dependency Rule

```
  View ──► ViewModel ──► Repository ──► Service ──► Platform
                    └────────────────────►┘
                     (direct, when conditions allow)

  Nothing ever points upward.
```

| From → To | Allowed |
|---|---|
| View → ViewModel | Yes |
| View → Repository / Service | No |
| ViewModel → Repository | Yes |
| ViewModel → Service | Yes, under the conditions above |
| ViewModel → Flutter widgets / `BuildContext` | **No** |
| Repository → Service | Yes |
| Repository → ViewModel | No |
| Service → anything except `core/` and `models/` | No |
| `core/` → any other folder | No |

Every row is checkable by reading imports. This is the primary structural check in code review.

---

## Base Classes

```dart
enum ViewState { idle, loading, success, error }
```

Every async screen handles all four. A successful request returning zero results is **not** an
error — "No decisions require your attention" and "Something went wrong" are opposite messages,
and conflating them teaches users to distrust the interface (Principle 12).

```dart
abstract class BaseViewModel extends ChangeNotifier {
  ViewState _state = ViewState.idle;
  String? _errorMessage;
  bool _disposed = false;

  ViewState get state => _state;
  String? get errorMessage => _errorMessage;
  bool get isLoading => _state == ViewState.loading;

  void setLoading() { _state = ViewState.loading; _errorMessage = null; safeNotify(); }
  void setSuccess() { _state = ViewState.success; _errorMessage = null; safeNotify(); }
  void setError(String m) { _state = ViewState.error; _errorMessage = m; safeNotify(); }

  /// Guards against "setState() called after dispose()" during navigation.
  void safeNotify() { if (!_disposed) notifyListeners(); }

  @override
  void dispose() { _disposed = true; super.dispose(); }
}
```

Every ViewModel extends this. Standard, not suggestion.

---

## Environment

`AppEnvironment` is an abstract contract exposing six platform base URLs (OBA, Sentinel, Altair,
Arcturus, Antares, Vega), connect and receive timeouts, and diagnostic flags. Three
implementations:

| | Development | Staging | Production |
|---|---|---|---|
| Network logging | On | On | **Off** |
| Crash reporting | Off | On | On |
| Timeouts | Generous | Production-like | Strict |

Production logging is off deliberately: interceptor logs contain authorization headers, and
shipping them would expose credentials in device logs.

**Selection is build-time, not runtime:**

```bash
flutter run --dart-define=ENV=development
flutter build apk --dart-define=ENV=production
```

A production binary then contains no code path pointing at a development server. A runtime toggle
would leave that path present and reachable.

**No secret is committed.** Environment classes hold base URLs and flags only; secrets come from
`--dart-define` and CI secret management.

### Bootstrap

`main.dart` does four things in order: initialise the Flutter binding, resolve the environment,
`await setupServiceLocator(env)`, then `runApp`. The order is a hard dependency chain — services
need the environment, ViewModels need the services, the widget tree needs the ViewModels.

---

## Naming

Under layer-first organisation, naming is what ties a feature together and makes ownership
expressible. It is a governance rule, not a style preference.

| Element | Convention | Example |
|---|---|---|
| Folders, files | `lowercase_with_underscores` | `insight_repository.dart` |
| Classes | `PascalCase` | `DashboardViewModel` |
| Screens | `<feature>_screen.dart` | `executive_dashboard_screen.dart` |
| ViewModels | `<feature>_view_model.dart` | `executive_dashboard_view_model.dart` |
| Repositories | `<domain>_repository.dart` | `insight_repository.dart` |
| Services | `<platform>_service.dart` | `oba_service.dart` |
| Models | `<noun>.dart`, no suffix | `organizational_insight.dart` |
| Route constants | `camelCase` | `AppRoutes.executiveDashboard` |

**A screen and its ViewModel must share a stem.** Without this, layer-first folders become
unnavigable and `CODEOWNERS` patterns stop working.

Folder names are lowercase per Effective Dart. Capitalised names (`Models/`, `Views/`) are common
in practice but non-conformant.

---

## Decision Records

### ADR-001 — MVVM as the constitutional architecture

**Context.** One architecture must serve nine platform owners in parallel and outlive WOBA. The
team is mixed-experience; complexity sits in presentation, not domain logic; six external
platforms must be integrated.

**Options.** Clean Architecture (high ceremony, likely applied partially); unlayered (no answer to
where logic belongs); MVVM.

**Decision.** MVVM, with an explicit and enforced dependency rule.

**Consequences.** *Positive:* one architecture across nine platforms; ViewModels testable with no
widget tree; external contract changes touch one service file. *Negative:* more files than an
unlayered approach; the `BuildContext` prohibition is unintuitive and will be violated.
*Mitigation:* the dependency table is a PR check; `BaseViewModel` removes boilerplate.

**Review trigger.** If Castor begins performing substantial client-side reasoning rather than
presenting reasoning performed by OBA, a domain layer should be evaluated. It would sit between
ViewModel and Repository without moving any existing boundary.

---

### ADR-002 — Repository is conditional, not mandatory

**Context.** Flutter's guidance recommends repositories but does not require them for every call.
A repository forwarding one call adds indirection without value. Left unstated, however, "skip it
when convenient" becomes the default across nine owners, and caching, composition, and mapping
scatter into ViewModels.

**Options.** (A) Mandatory everywhere — uniform, but generates pass-through classes. (B) Free
choice — minimal ceremony, guaranteed inconsistency. (C) Conditional, with stated conditions.

**Decision.** Option C. Five triggers; any one makes a repository mandatory.

**Enabling change.** Error mapping lives in `ErrorInterceptor`, not the repository, and services
return typed models rather than raw responses. Without both, a ViewModel calling a service
directly would have to import `dio` and parse JSON — forbidden by the layer prohibitions.

**Consequences.** *Positive:* no pass-through classes; the layer appears where it earns its place.
*Negative:* two valid shapes rather than one, so reviewers apply a condition table rather than a
blanket rule; a path of lower resistance now exists that bypasses caching. *Mitigation:* the table
is five rows and is a PR checklist item.

**Review trigger.** If audit finds caching or composition logic inside ViewModels, tighten toward
Option A.

---

### ADR-003 — Layer-first folder organisation

**Context.** Deliverable 2 requires a finalised folder structure. Two conventions exist:
layer-first (group by role) and feature-first (group by capability).

**Options.** *(A) Layer-first* — the standard MVVM layout; a contributor knows where a file goes
from its type alone. *(B) Feature-first* — related code sits together; a feature can be moved or
removed as a unit; ownership is expressible by directory.

**Decision.** Option A.

**Rationale.** It is the convention the team already uses and the layout Flutter's official
samples demonstrate — consistent with ADR-001's reasoning that externally-documented conventions
provide governance that internal invention does not. Option B's cohesion advantage is real but
grows with codebase size, while its cost — deeper nesting and an unfamiliar convention — is paid
immediately during the sprint where nine owners must adopt the architecture correctly.

**An argument previously advanced for Option B and now withdrawn.** An earlier draft claimed
feature-first prevents merge conflicts among nine owners sharing layer directories. That was
overstated: Git conflicts occur at file level, not directory level, and two contributors adding
different files to `views/screens/` do not conflict. The genuine conflict surface is `config/`
under either option. The claim is withdrawn rather than quietly dropped, since it was used to
justify a decision now reversed.

**Consequences.** *Positive:* familiar; shallow hierarchy; no cross-feature import rule needed.
*Negative:* a feature is a set of files rather than a folder, so cohesion depends entirely on the
naming convention; ownership must be expressed by filename pattern; extracting a screen into a
separate package becomes difficult. *Mitigations:* naming becomes a governance rule; subfolders by
experience area when a layer exceeds ten files.

**Review trigger.** Reconsider if a layer exceeds roughly thirty files despite grouping, or if a
feature ever needs extracting into a package.

---

## Deliberate Exclusions

| Excluded | Reason | Revisit when |
|---|---|---|
| Domain layer / use-cases | Castor's reasoning lives in OBA; use-cases would forward calls | Client-side rules accumulate |
| `Result` / `Either` types | Typed exceptions are Dart-idiomatic and need no dependency | Audit finds missing catch blocks |
| Code generation (`freezed`, `injectable`) | A broken `build_runner` during foundation week blocks the team | Week 4 |
| Modular pub packages (`melos`) | Layer-first makes package extraction impractical anyway | Structure moves to feature-first |

---

## Constitutional Compliance

| Principle | Mechanism |
|---|---|
| 3 — Human-Centered Engineering | Four-state model; users are never left guessing |
| 4 — Systems Before Features | `BaseViewModel` and the layer model are inherited, not rewritten |
| 5 — Platform Before Product | No layer holds WOBA-specific assumptions |
| 6 — Consistency Before Creativity | One folder convention, one naming rule, one state model |
| 9 — Governance Enables Scale | Repository conditions, dependency table, naming rule are mechanical checks |
| 10 — Performance Is Experience | Loading state emitted before the network call |
| 12 — Every Experience Strengthens Trust | Production logging off; no secrets committed |

---

## CTO Presentation Notes

**"Why not Clean Architecture?"** Its domain layer earns its cost where client-side rules are
dense. Castor's reasoning is in OBA — use-cases would forward calls without adding logic. A domain
layer can be inserted later without moving any boundary.

**"Why is the repository optional?"** A repository forwarding one call adds indirection, not
safety. The consistency is in the *condition*, not the shape. Error typing — needed on every path
— lives in the interceptor, so correctness does not depend on which shape is used.

**"Layer-first — does that scale?"** To Castor's expected size, yes, with subfolder grouping. The
honest cost is recorded in ADR-003: a feature becomes a set of files, cohesion rests on naming,
and package extraction becomes difficult. The review trigger is explicit.

**"How is consistency enforced across nine owners?"** Three mechanical checks: the import table,
the repository conditions, and the naming convention. None requires architectural judgement.

---

## Open Questions

1. **Repository threshold.** Are the five conditions the right line? Needs CTO confirmation, since
   it is the rule reviewers apply most often.
2. **Subfolder trigger.** Adopt experience-area grouping from Week 3, or wait until a layer
   exceeds ten files? Early adoption avoids a later repository-wide move.
3. **Design System coupling.** Should `views/widgets/` re-export Design System components, or
   should screens import the Design System package directly? Needs alignment with the Design
   System Platform.

---

**Next:** `DAY-2-Navigation-and-State-Architecture.md`
