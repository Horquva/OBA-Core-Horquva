# DAY 2 — Navigation & State Architecture

**Platform:** Frontend Engineering · **Owner:** Dur Muhammad Khan
**Sprint:** Week 2 — Castor v1.0 (HEEP)

---

## Task Checklist

| # | What to Build | Covered in |
|---|---|---|
| 1 | Navigation strategy | Navigation |
| 2 | Routing architecture | Navigation, Routing Flow |
| 3 | State management research | State Management |
| 4 | Dependency injection structure | Dependency Injection |
| 5 | Shared services layer | Services Layer |
| 6 | Configuration management | Configuration |
| 7 | Error handling strategy | Error Handling |

**Outcome:** A constitutional navigation and engineering framework prepared for scalable feature
implementation.

---

## Scope

Day 1 established how code is layered and where it lives. Day 2 establishes how state flows, how
users move between experiences, how dependencies reach the objects that need them, and how failure
is handled. Per the brief: *"without prematurely implementing application logic."*

---

## State Management

### Requirements

Learnable by a mixed-experience team in one sprint · compatible with MVVM (ViewModels testable
without a widget tree) · supports scoped rebuilds · officially supported · isolatable so
replacement does not touch feature logic.

### Evaluation

| | **Provider** | Riverpod | BLoC | GetX |
|---|---|---|---|---|
| Learning curve | **Low** | Moderate | High | Low |
| Boilerplate per screen | **Low** | Low | High | Very low |
| Official Flutter endorsement | **Yes** | No | No | No |
| Pairs with MVVM | **Yes** | Yes | Partly | No |
| Scoped rebuilds | **Yes** (`Selector`) | Yes | Yes | Yes |
| Team consistency risk | **Low** | Low | Low | **High** |

**BLoC** rejected on cost, not capability — its event-state separation is valuable for complex
state machines but requires roughly three files per screen. Imposing that on nine owners during
foundation week would slow every platform at once.

**Riverpod** is technically stronger — compile-safe, no `BuildContext` dependency, built-in DI. It
was seriously considered and declined because Castor's constitution prioritises
externally-documented standards over technically-optimal ones during the foundation phase.

**GetX** rejected outright: it bundles state, DI, routing, and utilities into one package,
encouraging a style that bypasses architectural boundaries.

### Decision — Provider with `ChangeNotifier`

Recorded as ADR-004. `ChangeNotifier` maps directly onto MVVM's ViewModel concept. Provider's main
weakness — `BuildContext`-dependent access — is irrelevant for ViewModels, which live in the widget
tree by design, and is addressed for services by the DI decision below.

### Usage Standards

| Pattern | Use for |
|---|---|
| `context.read<T>()` | Event callbacks. Reads once, does not subscribe. Never inside `build()` |
| `Consumer<T>` | Rebuilding a specific subtree on any ViewModel change |
| `Selector<T, R>` | Rebuilding on one field only, ignoring unrelated updates |

| Rule | Rationale |
|---|---|
| Never `context.watch<T>()` inside a large `build()` | Rebuilds the entire subtree on every notification |
| Wrap the smallest possible subtree in `Consumer` | Scoped rebuilds are a requirement, not an optimisation |
| Every `ViewState` case handled explicitly | No silent empty screens |
| Collections exposed as `List.unmodifiable` | A view cannot mutate ViewModel state |
| `setLoading()` before the `await`, never after | Interface responds within one frame |
| ViewModels never expose raw API models | Presentation-ready state only |

The exhaustive `ViewState` switch is not defensive coding — it is Principle 12 made structural. A
screen that silently shows nothing while loading teaches the user that the system is unreliable.

### Reference Pattern

```dart
class DashboardViewModel extends BaseViewModel {
  final InsightRepository _repository;
  DashboardViewModel(this._repository);

  List<OrganizationalInsight> _insights = [];
  List<OrganizationalInsight> get insights => List.unmodifiable(_insights);

  Future<void> loadInsights() async {
    setLoading();
    try {
      _insights = await _repository.fetchInsights();
      setSuccess();
    } on AppException catch (e) {
      setError(e.userMessage);
    }
  }
}
```

The dependency arrives by constructor — never constructed internally, never located from inside the
ViewModel. Only `AppException` is caught, and only `e.userMessage` reaches the UI.

### Migration Position

Provider is confined to `config/di/provider_registry.dart` and the `Consumer` / `Selector` widgets
inside `views/`. ViewModels depend only on `ChangeNotifier` from the Flutter SDK, not on the
`provider` package. A migration to Riverpod would touch registration and view widgets — not a
single line of ViewModel or repository logic.

---

## Navigation

### Evaluation

| | **Navigator 1.0** | go_router | auto_route |
|---|---|---|---|
| Learning curve | **Very low** | Moderate | Moderate |
| Deep linking | Manual | Excellent | Excellent |
| Web URL sync | Weak | Excellent | Good |
| Route guards | Manual | Built-in | Built-in |
| Extra dependency | **None** | Yes | Yes + build_runner |
| Team familiarity | **High** | Low | Low |

### Decision — Navigator 1.0 behind an `AppRouter` abstraction

Recorded as ADR-005. This is the decision most likely to be challenged, so the reasoning is stated
fully.

**Why Navigator 1.0.** Castor's Week 3 surface is an authenticated application shell, not a public
website. Deep linking and URL synchronisation — where `go_router` clearly wins — are not Week 3
requirements. Against that, `Navigator.pushNamed` is already familiar to every contributor, adds no
dependency, and requires no new mental model.

**Why the abstraction matters more than the choice.** Navigator 1.0's weaknesses are real: no
built-in guards, awkward web URLs, manual deep-link parsing. The mitigation is that **no view calls
`Navigator` directly.** All navigation passes through `AppRouter`. If deep linking becomes a
requirement, `AppRouter`'s internals are rewritten against `go_router` and every call site
continues to compile unchanged. This converts an architectural commitment into an implementation
detail.

### The `AppRouter` Abstraction

```dart
class AppRouter {
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  NavigatorState get _navigator => navigatorKey.currentState!;

  Future<T?> push<T>(String route, {Object? args}) =>
      _navigator.pushNamed<T>(route, arguments: args);

  /// Used after login and onboarding completion.
  Future<T?> replace<T>(String route, {Object? args}) =>
      _navigator.pushReplacementNamed<T, void>(route, arguments: args);

  /// Used on logout and session expiry.
  Future<T?> reset<T>(String route) =>
      _navigator.pushNamedAndRemoveUntil<T>(route, (_) => false);

  void pop<T>([T? result]) => _navigator.pop(result);
}
```

Four methods cover every navigation need. The `GlobalKey<NavigatorState>` lets `AppRouter` navigate
without a `BuildContext`, which is what makes context-free session expiry handling possible.

### Supporting Structures

| Structure | Purpose |
|---|---|
| `AppRoutes` | Route name constants. Route strings appear in this file only — a raw literal in a navigation call is a review rejection |
| `RouteGenerator` | `onGenerateRoute` implementation. Resolves routes, applies guards, and returns `RouteNotFoundScreen` for unknown names rather than throwing |
| Typed argument classes | One per parameterised route. Passing a bare `Map<String, dynamic>` is prohibited |

### Navigation Rules

| Rule | Rationale |
|---|---|
| Views call `AppRouter`, never `Navigator` | Single migration point; enforceable by lint |
| Route names from `AppRoutes` constants only | Compile-time checking; renaming is one edit |
| Parameterised routes use a declared argument class | Eliminates runtime cast errors |
| ViewModels never navigate | Preserves the dependency rule; keeps ViewModels testable |
| Views navigate in response to ViewModel state | Keeps flow control observable and testable |

### Navigation Without `BuildContext` in ViewModels

The ViewModel sets a state flag; the view observes it and navigates.

```dart
// In the view — never in the ViewModel
if (viewModel.authenticated) {
  WidgetsBinding.instance.addPostFrameCallback((_) {
    appRouter.replace(AppRoutes.executiveDashboard);
  });
}
```

The `addPostFrameCallback` is required, not stylistic: calling `Navigator` during a `build()` pass
throws. This is the most common mistake when adopting the pattern.

The benefit is that a `LoginViewModel` can be unit tested with a mock repository and no widget tree
— assert that `authenticated` becomes `true`, and the navigation contract is verified.

### Route Guards

Navigator 1.0 has no built-in guard mechanism. Castor implements guards inside `RouteGenerator`,
which consults `SessionService` from `get_it` and redirects unauthenticated requests for protected
routes to `LoginScreen`.

Guarding is centralised deliberately. Distributing authentication checks across individual screens
guarantees that one screen eventually forgets — and a Sentinel-protected experience reachable
without a session is a trust failure, not a bug.

---

## Routing Flow

```
  USER TAPS NAVIGATION ELEMENT
              │
              ▼
        ┌───────────┐
        │   VIEW    │  appRouter.push(AppRoutes.decisionWorkspace)
        └───────────┘
              ▼
        ┌───────────────────────────────┐
        │        APP ROUTER             │  push / replace / reset / pop
        └───────────────────────────────┘
              ▼
        ┌───────────────────────────────┐
        │      ROUTE GENERATOR          │
        │  1. Is route protected?       │
        │  2. Is session valid?         │
        │  3. Resolve typed arguments   │
        │  4. Build MaterialPageRoute   │
        └───────────────────────────────┘
              │                   │
      not authorised          authorised
              ▼                   ▼
      ┌──────────────┐     ┌──────────────┐
      │ LoginScreen  │     │ Target Screen│
      └──────────────┘     └──────────────┘
                                  ▼
                        ChangeNotifierProvider
                        supplies the ViewModel
```

---

## Dependency Injection

### The Problem

An object that constructs its own dependencies cannot be tested and cannot be reconfigured.
Injection inverts this. The remaining question is *who constructs the dependencies and how do they
reach the object that needs them.*

### Evaluation

| | Manual constructor | Provider-only | get_it only | **Hybrid** |
|---|---|---|---|---|
| Works outside widget tree | Yes | **No** | Yes | Yes |
| Scales past ~15 services | **No** | Moderate | Yes | Yes |
| Singleton lifecycle control | Manual | Moderate | Excellent | Excellent |
| Clear layer boundary | Weak | Weak | Weak | **Strong** |

**Provider-only** fails a hard requirement: it needs a `BuildContext`. Castor's interceptors,
session service, and router must run outside the widget tree — an auth interceptor cannot ask a
widget for the current token. **Manual injection** does not scale; with six external platforms
`main.dart` becomes an unmaintainable wiring block.

### Decision — `get_it` for the data layer, Provider for ViewModels

Recorded as ADR-006.

```
┌───────────────────────────────────────────────────────┐
│  PROVIDER SCOPE — ViewModels                          │
│  live in the widget tree, need lifecycle disposal     │
└───────────────────────────────────────────────────────┘
                      │ resolves from
                      ▼
┌───────────────────────────────────────────────────────┐
│  GET_IT SCOPE — Repositories, Services, Storage,      │
│  Session, Router, Dio, Interceptors                   │
│  plain Dart objects, no widget tree relationship      │
└───────────────────────────────────────────────────────┘
```

The split follows the Day 1 layer boundary exactly, so the DI mechanism reinforces the architecture
rather than cutting across it — a ViewModel resolving itself from `get_it` is immediately visible
as a boundary violation.

### Registration

`setupServiceLocator(env)` registers, in order: environment → storage (awaited) → session
(restored) → router → `DioClient` → platform services → repositories.

| Method | Lifetime | Use for |
|---|---|---|
| `registerSingleton` | Created immediately | Environment, initialised storage, router |
| `registerLazySingleton` | Created on first use | Services, repositories, session |
| `registerFactory` | New instance each call | Objects that must not be shared |

Repositories are lazy singletons because caching state must be shared. Two instances of
`InsightRepository` would maintain two independent caches and disagree — the exact failure the
"single source of truth" responsibility exists to prevent.

### ViewModel Scoping

| Scope | Registration site | Applies to |
|---|---|---|
| Application-wide | `ProviderRegistry` (root `MultiProvider`) | Session, theme |
| Screen-scoped | `ChangeNotifierProvider` inside the screen | Everything else |

**Screen-scoped is the default.** A root-registered ViewModel is constructed at app launch and
never disposed — it holds memory for the entire session and retains stale state when the user
returns.

### Testing Consequence

```dart
final viewModel = DashboardViewModel(MockInsightRepository());
await viewModel.loadInsights();
expect(viewModel.state, ViewState.success);
```

No widget tree. No `get_it`. No `BuildContext`. This is the practical payoff of the Day 1
dependency rule, and the strongest argument for it in review.

---

## Services Layer

`lib/services/` holds one class per external Horquva platform — `oba_service`, `sentinel_service`,
`altair_service`, `arcturus_service`, `antares_service`, `vega_service`.

### Contract

1. Receives `Dio` and `AppEnvironment` by constructor injection
2. One method per external operation
3. No caching, no business logic, no knowledge of callers
4. Returns **typed models** and lets `AppException` propagate

Services return typed models rather than raw responses. This is what allows a ViewModel to call a
service directly when the repository conditions do not apply — a ViewModel receiving a raw response
would have to decode JSON, which the Day 1 prohibitions forbid.

Endpoint paths live in `core/network/api_endpoints.dart` only. When an external platform changes a
path, exactly one line changes.

### Integration Boundary Register

| Platform | Castor consumes | Castor never does |
|---|---|---|
| **OBA** | Memory, knowledge, reasoning, insights, decision intelligence | Perform reasoning locally |
| **Sentinel** | Identity, authentication, session validity, permissions | Store credentials unencrypted; implement its own auth logic |
| **Altair** | Operational system state | Mutate operational systems directly |
| **Arcturus** | Simulation results | Run simulations client-side |
| **Antares** | Governance state | Make governance decisions |
| **Vega** | Identity and reliability standards | Define its own quality standards |

The right-hand column matters as much as the left. Each entry marks a boundary that, once crossed,
duplicates authority belonging to another constitutional platform.

---

## Configuration

Day 1 defined the environment contract and build-time selection. This section defines how
configuration reaches its consumers.

**Injection, not global access.** `EnvironmentConfig.current` is read exactly once, in
`setupServiceLocator`. Every consumer receives `AppEnvironment` by injection. A class reading
`EnvironmentConfig.current` directly is a review rejection — it makes the class untestable, since a
test cannot substitute a fake environment.

| Category | Location | Committed |
|---|---|---|
| Environment | `config/environment/` | Yes |
| Feature flags | `config/app_config.dart` | Yes |
| Storage keys | `core/constants/storage_keys.dart` | Yes |
| Secrets | `--dart-define` at build time | **Never** |

Feature flags are compile-time constants, so disabled features are tree-shaken out of release
builds rather than shipped inert.

---

## Error Handling

### Evaluation

| | **Typed exceptions** | `Result` / `Either` |
|---|---|---|
| Compiler enforces handling | No | **Yes** |
| Dart-idiomatic | **Yes** | No |
| Extra dependency | None | `dartz` / `fpdart` |
| Learning curve, mixed team | **Low** | Moderate |
| Risk of silently ignored failure | Moderate | Low |

### Decision — Typed exceptions, mapped in the interceptor

Recorded as ADR-007.

`Result` types are safer in the abstract: the compiler will not allow a failure branch to be
forgotten. That was weighed against a functional idiom unfamiliar to most of the team and an
additional dependency, during the sprint where nine owners must adopt the architecture correctly.

The decision is exceptions, **with a structural mitigation.** Since an unhandled exception is
invisible until it reaches a user, exceptions are only safe if catching is guaranteed somewhere.
Castor guarantees it at two points:

1. **`ErrorInterceptor` converts every `DioException` into a typed `AppException`.** No transport
   exception escapes the network layer.
2. **Every ViewModel data call is wrapped in `try/catch (AppException)`** and routed into
   `setError()`.

Placing mapping in the interceptor rather than the repository is what makes ADR-002 viable — both
paths surface the same typed exception, and a ViewModel never imports `dio`.

### Exception Hierarchy

`AppException` is abstract and carries two fields: `userMessage` (safe to display) and
`technicalDetail` (logged only).

| Exception | Trigger | User message |
|---|---|---|
| `NetworkException` | Connection error | Unable to reach Horquva services |
| `TimeoutException` | Connect / receive timeout | The request took too long |
| `UnauthorizedException` | 401 | Your session has expired |
| `ForbiddenException` | 403 | You do not have permission to view this |
| `NotFoundException` | 404 | The requested information could not be found |
| `ServerException` | 5xx | Horquva services are temporarily unavailable |
| `UnknownException` | Anything else, malformed response | Something went wrong |

The `userMessage` / `technicalDetail` separation is a constitutional requirement. Principle 12
states trust is built through *"clear communication."* A user shown `DioException: SocketException:
Failed host lookup` learns nothing and trusts less. A user shown "Unable to reach Horquva services"
understands the situation and knows what to try.

`ErrorMapper.fromDio()` performs the conversion, switching on `DioExceptionType` and then on status
code.

### Propagation Path

```
  EXTERNAL PLATFORM
        │  HTTP failure
        ▼
  ERROR INTERCEPTOR          ← mapping point
  401? attempt refresh once. If it fails, clear session
  and reset to login. Otherwise DioException → AppException.
        │
        ▼
  SERVICE — does not catch, lets it propagate
        │
        ▼
  REPOSITORY (if present) — catches only to degrade gracefully
        │
        ▼
  VIEW MODEL                 ← mandatory catch
  on AppException: setError(e.userMessage)
        │
        ▼
  VIEW — CastorErrorView with a retry affordance
```

The repository is **not** a mandatory catch point. Because mapping happens in the interceptor, the
ViewModel's catch is sufficient whether or not a repository exists in the path.

### Standards

| Rule | Rationale |
|---|---|
| `ErrorInterceptor` maps every `DioException` | No transport type escapes the network layer |
| Every ViewModel data call wrapped in `try/catch (AppException)` | No unhandled failure reaches the widget tree |
| Only `userMessage` displayed | Principle 12 — clear communication |
| `technicalDetail` logged, never rendered | Prevents credential and topology leakage |
| Bare `catch (e)` prohibited | Silently swallows programming errors |
| 401 handling in the interceptor only | Consistent session-expiry behaviour |

---

## Decision Records

### ADR-004 — Provider with `ChangeNotifier`

**Context.** Nine owners of varying Flutter experience must apply one state approach consistently.
It must pair with MVVM, support scoped rebuilds, and be replaceable later.

**Decision.** Provider with `ChangeNotifier`.

**Rationale.** `ChangeNotifier` maps directly onto the MVVM ViewModel concept; Provider is covered
by Flutter's own documentation, satisfying Principle 9's requirement that standards not rest on
individual preference; it imposes the least learning cost during foundation week. Riverpod is
technically stronger and was declined because an externally-documented standard was judged more
valuable than a technically optimal one while nine owners simultaneously adopt the architecture.

**Consequences.** Low onboarding cost; `Selector` provides field-level scoping; requires review
discipline against `context.watch` in large `build()` methods. Provider is confined to
`provider_registry.dart` and view widgets, so migration would not touch ViewModel or repository
logic.

**Review trigger.** Reconsider if state complexity grows to require formal state machines, or if
`BuildContext`-dependent access becomes a practical obstacle.

---

### ADR-005 — Navigator 1.0 behind `AppRouter`

**Context.** Navigation across multiple executive experiences with authentication boundaries
enforced, while keeping `Navigator` out of ViewModels.

**Decision.** Named routes on Navigator 1.0, accessed exclusively through `AppRouter` holding a
`GlobalKey<NavigatorState>`.

**Rationale.** Castor's Week 3 surface is an authenticated application shell. Deep linking and web
URL synchronisation — where `go_router` wins — are not Week 3 requirements. Navigator 1.0 requires
no new dependency and no new mental model. The abstraction is what makes this safe: because no view
imports `Navigator`, replacing the implementation later would rewrite one file and leave every call
site compiling unchanged.

**Consequences.** Guards implemented manually in `RouteGenerator` and centralised there. Deep
linking would require additional work if it becomes a requirement. In exchange: zero new
dependencies, immediate team fluency, single-file migration path.

**Review trigger.** Reconsider when deep linking, web URL synchronisation, or nested navigation
shells become requirements.

---

### ADR-006 — Hybrid dependency injection

**Context.** Some dependencies — interceptors, session service, router — must be reachable outside
the widget tree.

**Decision.** `get_it` for the data layer; Provider for ViewModels.

**Rationale.** Provider-only fails a hard requirement — an auth interceptor cannot obtain a
`BuildContext`. Manual injection does not scale past a handful of services. The hybrid split
follows the Day 1 layer boundary precisely, so the DI mechanism reinforces the architecture rather
than cutting across it.

**Consequences.** Two registration sites with a clear rule for which is which. ViewModels
unit-testable by direct construction with mocks. Requires discipline: `get_it` must never be called
from inside a ViewModel or view.

**Review trigger.** Reconsider if registration volume becomes burdensome, at which point
`injectable` code generation would be evaluated.

---

### ADR-007 — Typed exceptions, mapped in the interceptor

**Context.** Six external platforms fail independently. Errors must reach users as comprehensible
messages without exposing technical detail, and no failure may be silently lost. Because
repositories are conditional (ADR-002), mapping cannot depend on a repository being present.

**Decision.** A typed `AppException` hierarchy carrying separate `userMessage` and
`technicalDetail`, mapped from `DioException` inside `ErrorInterceptor`.

**Rationale.** `Result` types are safer in principle. That was weighed against an unfamiliar
functional idiom and an added dependency. Exceptions are Dart-idiomatic and immediately legible.
The known weakness — an unhandled exception is invisible until a user encounters it — is closed
structurally: the interceptor guarantees typing, and the ViewModel catch is a review checklist
item.

Mapping in the interceptor rather than the repository is the change that makes ADR-002 viable. If
mapping lived in the repository, a ViewModel calling a service directly would receive a raw
`DioException` and would have to import `dio` to catch it.

**Consequences.** The ViewModel catch must be verified in every review — a real ongoing cost,
accepted explicitly. In exchange: no new dependency, a pattern every contributor understands, one
mapping point rather than one per repository.

**Review trigger.** Reconsider if audit reveals repeated missing catch blocks, indicating
convention is insufficient and compiler enforcement is warranted.

---

## Constitutional Compliance

| Principle | Mechanism |
|---|---|
| 3 — Human-Centered Engineering | `userMessage` guarantees comprehensible failure communication |
| 4 — Systems Before Features | `AppRouter`, `BaseViewModel`, `ErrorInterceptor` are inherited |
| 6 — Consistency Before Creativity | One state pattern, one navigation authority, one exception hierarchy |
| 9 — Governance Enables Scale | Provider and exception standards are review-enforceable |
| 10 — Performance Is Experience | `Selector` scoping and pre-await loading state |
| 12 — Every Experience Strengthens Trust | Centralised route guards; technical detail never reaches users |
| 13 — Experience Creates Trust | Session expiry produces one predictable experience |

---

## Coordination with Engineering Governance

| Item | Confirmation required from Engineering Governance Platform |
|---|---|
| Dependency additions (`provider`, `get_it`) | Approval against repository dependency policy |
| `config/` as a shared-edit directory | Accepted as the expected merge-conflict surface |
| Mandatory ViewModel catch | Added to the PR review checklist |
| `AppRouter`-only navigation | Enforceable via lint rule banning `Navigator` in `views/` |

---

## Open Questions

1. **Session refresh concurrency.** If three requests receive 401 simultaneously, the interceptor
   must refresh once and queue the rest. Requires the Sentinel token refresh contract.
2. **Global shell navigation.** Will the Executive Workspace use a persistent navigation shell with
   nested navigators? This affects whether Navigator 1.0 remains adequate. Requires alignment with
   Executive Workspace Platform.
3. **Error presentation ownership.** Should `CastorErrorView` live in `views/widgets/`, or be
   supplied by the Design System Platform? Requires alignment with Design System Platform.

---

**Next:** `DAY-3-Integration-Foundation.md`
