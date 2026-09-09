# DAY 3 — Integration Foundation

**Platform:** Frontend Engineering · **Owner:** Dur Muhammad Khan
**Sprint:** Week 2 — Castor v1.0 (HEEP)

---

## Task Checklist

| # | What to Create | Covered in |
|---|---|---|
| 1 | API architecture | API Architecture |
| 2 | Repository pattern | Repository Pattern |
| 3 | Service abstraction layer | Service Abstraction |
| 4 | Authentication integration structure | Authentication |
| 5 | Error response handling | Error Response Handling |
| 6 | Loading state management | Loading State |
| 7 | Network architecture | Network Architecture |
| 8 | Configuration strategy | Configuration |

**Outcome:** A reusable frontend integration architecture capable of connecting every
constitutional platform through standardised engineering patterns.

---

## Problem Statement

Castor communicates with six constitutional platforms — OBA, Sentinel, Altair, Arcturus, Antares,
Vega. Each has an independent contract, failure modes, and release cadence.

Without a standardised integration architecture, each of nine platform owners would implement HTTP
calls in their own style. The result is predictable: authentication headers attached in six
different ways, five of them eventually forgotten; error handling duplicated per screen and
inconsistent; a change to OBA's response shape requiring edits across a dozen files.

---

## API Architecture

```
  VIEW MODEL — requests domain data, knows nothing about HTTP
        │                                  │
   (when conditions require)         (simple read)
        ▼                                  │
  REPOSITORY — caching · composition       │
               write coordination          │
        │                                  │
        ▼                                  ▼
  SERVICE — one class per platform, returns typed models,
            throws AppException
        │
        ▼
  DIO CLIENT + INTERCEPTORS
  base config · timeouts · auth header · logging
  401 refresh-and-retry · DioException → AppException
        │
        ▼
  EXTERNAL HORQUVA PLATFORMS
```

The repository tier is conditional per the Day 1 rule. The other three are always present.

### Where Each Concern Lives

The central design question in any integration layer is *where does each concern belong.* Too high
and it duplicates across screens; too low and it becomes invisible.

| Concern | Tier | Reason |
|---|---|---|
| Auth header injection | Interceptor | Applies to every request; no caller should remember it |
| Request/response logging | Interceptor | Cross-cutting; must be disabled in production centrally |
| Timeout configuration | Dio client | Environment-dependent, not caller-dependent |
| 401 refresh and retry | Interceptor | Session expiry is global; per-screen handling would diverge |
| Transport error → `AppException` | Interceptor | Must work whether or not a repository exists |
| JSON → typed model | Service | Allows a ViewModel to call a service directly without parsing |
| Caching policy | Repository | Per-domain decision; a service cannot know staleness rules |
| Multi-service composition | Repository | One place, not repeated in each ViewModel |
| Loading state | ViewModel | A presentation concern, not a transport one |
| Endpoint paths | `ApiEndpoints` | Single registry; one edit per external change |

Two placements changed from an earlier draft, and the reason is worth stating: error mapping and
JSON parsing were originally assigned to the repository. Once repositories became conditional
(ADR-002), that no longer worked — a ViewModel calling a service directly would have received a raw
`DioException` and unparsed JSON, forcing it to import `dio` and decode responses, both forbidden
by the Day 1 prohibitions. Mapping moved to the interceptor and parsing to the service.

---

## Network Architecture

### HTTP Client Decision

| | `http` | **`dio`** |
|---|---|---|
| Interceptors | **No** | Yes |
| Base URL / timeout configuration | Manual | Built-in |
| Automatic JSON decoding | Manual | Built-in |
| Request cancellation, retry | No | Yes |
| Official Dart team package | Yes | No |

**Decision: `dio`.** Recorded as ADR-008.

`http` is the officially maintained package, and elsewhere official support has been the deciding
factor. It is not decisive here, for a specific reason: `http` offers no interception mechanism, so
every cross-cutting concern above would be implemented per-service.

With six platforms, that means the authorization header is attached in six places rather than one.
Five will eventually be correct and one will be forgotten — and a Sentinel-protected request sent
without a token is a trust failure, not a convenience issue. The interceptor makes correctness
structural rather than dependent on each contributor's memory.

### Interceptor Chain

`DioClient` configures one shared `Dio` instance with timeouts from `AppEnvironment` and three
interceptors in a deliberate order:

| # | Interceptor | Responsibility |
|---|---|---|
| 1 | `AuthInterceptor` | Attaches `Authorization: Bearer <token>` from `SessionService` |
| 2 | `LoggingInterceptor` | Method, URI, status code only. **Present only when the environment permits** |
| 3 | `ErrorInterceptor` | 401 refresh-and-retry, then `DioException` → `AppException` |

The order matters. Auth must run before anything logs the request. Logging is *absent from the
chain* in production, not merely silenced — its output would otherwise expose authorization
headers in device logs. Error handling must run last so it observes the final outcome after any
retry.

Headers and bodies are not logged even in development. Bearer tokens in a development console
still end up pasted into issue trackers.

A single shared `Dio` instance is used deliberately: one interceptor chain then governs every
outbound request. Six instances would require six registrations, reintroducing the duplication the
interceptor eliminates.

### 401 Handling

```dart
// core/network/interceptors/error_interceptor.dart — core logic
if (err.response?.statusCode == 401 && !_isRefreshRequest(err)) {
  final refreshed = await serviceLocator<SessionService>().attemptRefresh();
  if (refreshed) {
    return handler.resolve(await _retry(err.requestOptions));
  }
  await serviceLocator<SessionService>().clear();
  serviceLocator<AppRouter>().reset(AppRoutes.login);
}
handler.reject(/* DioException carrying ErrorMapper.fromDio(err) */);
```

The `_isRefreshRequest` guard prevents infinite recursion: if the refresh call itself returns 401,
attempting to refresh again would loop indefinitely. This is the failure mode most commonly missed
in token-refresh implementations, and it manifests as an application that hangs rather than one
that reports an error.

Because `dio` wraps thrown values, a small `send()` extension unwraps once so callers see the
`AppException` directly. Every service method wraps its call in it. From that point on, nothing
above the network layer sees `DioException`.

### Known Gap — Concurrent 401

If three requests receive 401 simultaneously, this implementation triggers three refresh attempts.
Two will fail, potentially invalidating the token the first obtained.

The correct pattern is a single-flight refresh lock: the first 401 initiates refresh, subsequent
401s await the same `Future`. Documented as an open question rather than implemented, because the
correct implementation depends on whether Sentinel refresh tokens are single-use — not yet defined.

An undocumented known weakness becomes a production incident; a documented one becomes a Week 3
task.

---

## Service Abstraction

### Contract

Every service in `lib/services/`:

1. Receives `Dio` and `AppEnvironment` by constructor injection
2. Exposes one method per external operation
3. Contains no caching, no business logic, no knowledge of callers
4. Returns **typed models** and lets `AppException` propagate

```dart
class ObaService {
  final Dio _dio;
  final AppEnvironment _env;
  ObaService(this._dio, this._env);

  Future<List<OrganizationalInsight>> fetchInsights({int limit = 20}) async {
    final res = await _dio.send(() => _dio.get(
      '${_env.obaBaseUrl}${ApiEndpoints.obaInsights}',
      queryParameters: {'limit': limit},
    ));
    try {
      return (res.data['insights'] as List)
          .map(OrganizationalInsight.fromJson)
          .toList();
    } on TypeError catch (e) {
      throw UnknownException(detail: 'Unexpected OBA response shape: $e');
    }
  }
}
```

### Why Services Return Typed Models

An earlier draft had services return raw `Response`, on the reasoning that parsing is a repository
responsibility and a service should not know about domain models.

That reasoning does not survive the conditional-repository rule. If a ViewModel may call a service
directly, and the service returns a raw response, the ViewModel must decode JSON — which the Day 1
prohibitions forbid. Returning typed models is what makes both paths work identically.

The cost is real and worth naming: a service now knows about a model, so a change to that model's
shape touches the service file. In exchange, every caller receives usable data and no caller parses
JSON.

The `TypeError` catch handles a platform returning HTTP 200 with an unexpected shape — a genuine
failure mode when six contracts evolve independently. Without it, a missing field surfaces to the
user as an unexplained crash.

### Endpoint Registry

`core/network/api_endpoints.dart` holds every path as a constant, grouped by platform — OBA
(insights, memory, knowledge, reasoning, decisions), Sentinel (login, refresh, logout, profile,
permissions), and one entry each for Altair, Arcturus, Antares, and Vega. Paths appear nowhere else.

### Integration Boundary Register

| Platform | Castor consumes | Castor never does |
|---|---|---|
| **OBA** | Memory, knowledge, reasoning, insights, decision intelligence | Perform reasoning locally |
| **Sentinel** | Identity, authentication, session validity, permissions | Store credentials unencrypted; implement its own auth logic |
| **Altair** | Operational system state | Mutate operational systems directly |
| **Arcturus** | Simulation results | Run simulations client-side |
| **Antares** | Governance state | Make governance decisions |
| **Vega** | Identity and reliability standards | Define its own quality standards |

The right-hand column is the more important one. Each entry marks a boundary that, once crossed,
duplicates authority belonging to another constitutional platform — the outcome Principle 5 exists
to prevent.

---

## Repository Pattern

Per the Day 1 rule, a repository exists when data is cached, more than one service is involved,
data is written, more than one ViewModel needs it, or mapping is non-trivial. This section defines
what one looks like when it does exist.

### Responsibilities

Own caching policy · combine multiple services into one answer · coordinate writes and invalidate
cache · reshape or merge beyond a single model parse.

It does **not**: import widgets, format for display, map transport errors (the interceptor does),
or parse raw JSON (the service does).

### Caching

```dart
class InsightRepository {
  final ObaService _oba;
  InsightRepository(this._oba);

  List<OrganizationalInsight>? _cache;
  DateTime? _cachedAt;
  static const _ttl = Duration(minutes: 5);

  Future<List<OrganizationalInsight>> fetchInsights({bool forceRefresh = false}) async {
    if (!forceRefresh && _isFresh) return _cache!;
    _cache = await _oba.fetchInsights();
    _cachedAt = DateTime.now();
    return _cache!;
  }

  bool get _isFresh => _cache != null &&
      DateTime.now().difference(_cachedAt!) < _ttl;
}
```

No `try/catch` here. The service already throws `AppException`; the ViewModel catches it. A
repository catches only when it has domain context to add or a graceful degradation to perform.

`forceRefresh` exists because a user pulling to refresh is explicitly stating they want current
data. Serving a cached response — even a technically fresh one — contradicts the action they just
took, and Principle 12 makes predictable response to user intent a trust requirement.

### Composition

The pattern that most clearly justifies the repository tier. A decision summary needs reasoning
from OBA and permission context from Sentinel. The repository classifies each call:

- **Essential** — failure propagates. The decision itself.
- **Enhancing** — failure degrades gracefully, logged and returned as `null`. Permission context.

The ViewModel calls one method and receives one model. It never learns that two platforms were
involved. Where both calls are essential, `Future.wait` runs them concurrently — sequential calls
would double perceived latency, and Principle 10 treats that as an experience defect.

This essential/enhancing judgement is one the repository is uniquely positioned to make. A service
cannot know; a ViewModel should not need to.

### Caching Standards

| Data character | Policy | Example |
|---|---|---|
| Reference data, rarely changes | Long TTL (30 min) | Vega standards, permission sets |
| Organizational insight | Short TTL (5 min) | OBA insights, dashboards |
| User-initiated action result | No cache | Decision submission |
| Session and identity | In-memory for session | Access token, profile |
| Live operational state | No cache | Altair operations |

Every repository states its policy explicitly. An unstated caching policy becomes an inconsistent
one.

---

## Authentication

### Storage Decision

| | `shared_preferences` | **`flutter_secure_storage`** |
|---|---|---|
| Storage | Plain XML / plist | Android Keystore / iOS Keychain |
| Encryption | **None** | OS-level |
| Readable on rooted device | **Yes** | No |
| Appropriate for | Settings, flags | Tokens, credentials |

**Decision: both, split by sensitivity.** Recorded as ADR-009.

Credentials — access tokens, refresh tokens, identity claims — go in `flutter_secure_storage`.
Theme, locale, and onboarding state go in `shared_preferences`.

The reasoning is constitutional rather than technical. Sentinel exists to protect organizational
trust, and Principle 13 states that *"trust is secured by Sentinel; trust is experienced through
Castor."* Storing Sentinel-issued credentials in plain text would place Castor in direct
contradiction with the platform whose trust it exists to express. The implementation cost is near
zero: an identical read/write API over a different backing store.

### Storage Key Registry

```dart
abstract class StorageKeys {
  // Secure only
  static const accessToken  = 'castor.secure.access_token';
  static const refreshToken = 'castor.secure.refresh_token';

  // Non-sensitive
  static const themeMode = 'castor.pref.theme_mode';
  static const locale    = 'castor.pref.locale';
}
```

The `secure` / `pref` naming segment is a deliberate safeguard. A contributor writing
`StorageKeys.accessToken` into `PreferencesService` produces a key visibly reading `castor.secure.*`
inside a plain-text store — a mistake a reviewer sees at a glance rather than one buried in an
import.

### Session Service

`SessionService` is the only reader and writer of credential keys, giving one place to audit
credential handling. It exposes `restore()` (called at bootstrap), `persist()`, `attemptRefresh()`,
and `clear()`.

Tokens are read from secure storage once at bootstrap and held in memory for the session. The auth
interceptor runs on every request; reading from the OS keystore each time would add measurable
latency to every call. They are never written to any unencrypted store.

### Flow

```
  APP LAUNCH → setupServiceLocator() → session.restore()
        │
        ▼
  session.isAuthenticated ?
        │
    NO ─┴─ YES
    │       │
    ▼       ▼
  Login   Executive Dashboard
    │
    │ credentials submitted
    ▼
  LoginViewModel → AuthRepository → SentinelService → POST /sentinel/auth/login
    │
    │ 200 + tokens
    ▼
  session.persist() → secure storage
  viewModel.authenticated = true → view observes → appRouter.replace(dashboard)


  DURING SESSION
  Any request → AuthInterceptor attaches Bearer token
        │
      401 ?
        │
        ▼
  session.attemptRefresh()
        │
  SUCCESS ─┴─ FAILURE
     │           │
  retry      session.clear()
  request    appRouter.reset(login)
```

### Standards

| Rule | Rationale |
|---|---|
| Tokens written only to `flutter_secure_storage` | Sentinel-issued credentials require OS-level encryption |
| Tokens never logged, never placed in URLs | Query strings appear in server logs and browser history |
| `SessionService` is the only reader of token keys | One place to audit credential handling |
| Refresh attempted once per failure | Prevents infinite loops |
| Logout clears secure storage entirely | Partial clearing leaves a resumable session |
| Route guards consult `SessionService` centrally | Per-screen checks eventually get forgotten |

---

## Error Response Handling

Day 2 defined the `AppException` hierarchy and mapper. This section covers integration-specific
handling.

### Platform Error Envelope

External platforms return structured errors. The mapper extracts the platform's own message when
present, in preference to a generic fallback — but only for **400 and 409**, where the platform
knows something Castor does not, such as which field failed validation.

For 401, 403, and 5xx the generic message is used deliberately: platform error text in those cases
tends to describe internal topology, and showing it to a user leaks architecture while explaining
nothing.

### Where Catching Happens

| Tier | Catches | Purpose |
|---|---|---|
| `ErrorInterceptor` | `DioException` | Convert to `AppException` — **mandatory** |
| Service | `TypeError`, `FormatException` | Malformed response shape — **mandatory** |
| Repository | `AppException` | Only to degrade gracefully — **optional** |
| ViewModel | `AppException` | Route to `setError()` — **mandatory** |

The repository is the only optional catch point. This is what allows the tier to be skipped
entirely without weakening error handling.

---

## Loading State

### Four States, Always

| State | Condition | Presentation |
|---|---|---|
| `idle` | Nothing requested yet | Nothing, or a prompt to act |
| `loading` | Request in flight, no prior data | Skeleton or spinner |
| `success` | Data available | Content — or an empty state if the result is empty |
| `error` | Request failed | `userMessage` plus a retry affordance |

The `success` row contains the distinction most often collapsed. A successful request returning
zero results is **not** an error. "No decisions require your attention" and "Something went wrong"
are opposite messages, and conflating them teaches users to distrust the interface.

### Refresh Versus Initial Load

A pull-to-refresh must not replace existing content with a spinner. The user is looking at data;
removing it to show a loading indicator is a regression in their experience.

The ViewModel therefore holds two flags: `state` for the initial load (full `ViewState.loading`),
and a separate `isRefreshing` boolean that drives only the refresh indicator while content remains
on screen. On refresh failure, existing content is preserved.

### Granular Loading

A screen with independently loading regions must not be gated on a single boolean. One slow widget
should not delay four fast ones. An `ExecutiveDashboardViewModel` holds `insightsLoading`,
`decisionsLoading`, and `timelineLoading` separately, and `loadAll()` runs them via `Future.wait`.

Paired with `Selector`, each region rebuilds independently. Principle 10 is expressed here as the
difference between a dashboard that fills in progressively and one that stays blank until its
slowest call returns.

### Standards

| Rule | Rationale |
|---|---|
| `setLoading()` before `await`, never after | Guarantees feedback within one frame |
| Empty success is not an error | Distinct, accurate messages build trust |
| Refresh preserves visible content | Never regress what the user is already reading |
| Independently loading regions get independent flags | One slow call must not gate a whole screen |
| Every error state offers a retry affordance | A dead end is a trust failure |
| Skeletons preferred over spinners for known layouts | Communicates what is arriving, not merely that something is |

---

## Configuration

| Setting | Development | Staging | Production |
|---|---|---|---|
| Base URLs | Local / dev | Staging | Production |
| Connect timeout | 30s | 15s | 15s |
| Receive timeout | 30s | 20s | 20s |
| Network logging | Enabled | Enabled | **Disabled** |
| Certificate pinning | Disabled | Enabled | Enabled |
| Cache TTL | Short (1 min) | Standard | Standard |

Development uses a short cache TTL so contributors see backend changes without restarting, and
disables certificate pinning, since local instances use self-signed certificates.

`AppEnvironment` exposes six platform base URLs, three durations (connect, receive, default cache
TTL), and three flags (network logging, certificate pinning, crash reporting).

**No credential, API key, certificate, or token is committed.** Environment classes contain base
URLs and behavioural flags only. Secrets are supplied via `--dart-define` at build time and held in
CI secret management.

---

## Decision Records

### ADR-008 — `dio` as HTTP client

**Context.** Six external platforms, each requiring authentication headers, consistent timeouts,
error normalisation, and 401 refresh-and-retry.

**Options.** `http` (official Dart team package) or `dio` (third-party, interceptor-based).

**Decision.** `dio`.

**Rationale.** Elsewhere in this architecture official support has been the deciding factor — MVVM
and Provider were both chosen partly on that basis. It is not decisive here: `http` provides no
interception mechanism, so every cross-cutting concern would be implemented per-service. With six
platforms the authorization header would be attached in six places, five correct and one eventually
forgotten. A Sentinel-protected request sent without a token is a trust failure, not an
inconvenience.

A second reason emerged from ADR-002: because repositories are conditional, error mapping must
happen somewhere always in the path. Only an interceptor satisfies that.

**Consequences.** *Positive:* auth, logging, 401 handling, and error mapping implemented once;
timeouts configured centrally; production logging removed from the chain entirely. *Negative:* a
third-party dependency on a critical path; interceptor order becomes significant; `dio`'s error
wrapping requires the `send` extension so callers see `AppException`. *Mitigation:* `dio` is
confined to `core/network/` and service constructors — no view or ViewModel imports it.

**Review trigger.** Reconsider if `dio` maintenance lapses, or if `http` gains a comparable
interception mechanism.

---

### ADR-009 — Split storage by sensitivity

**Context.** Castor persists both Sentinel-issued credentials and non-sensitive preferences.
`shared_preferences` stores data in plain text; `flutter_secure_storage` uses Android Keystore and
iOS Keychain.

**Options.** `shared_preferences` only (simplest), secure storage only (uniform but slower for
high-frequency reads), or both split by sensitivity.

**Decision.** Both.

**Rationale.** Constitutional rather than technical. Sentinel exists to protect organizational
trust, and Principle 13 states that *"trust is secured by Sentinel; trust is experienced through
Castor."* Storing Sentinel-issued credentials in a plain-text store would place Castor in direct
contradiction with the platform whose trust it exists to express — a failure no amount of interface
quality compensates for. The implementation cost is effectively zero.

Secure storage was not adopted for everything because keystore access is measurably slower than a
plain-text read, and a theme preference does not warrant encryption.

**Consequences.** Two storage services, both in `get_it`. The key registry uses `secure` and `pref`
naming segments so misplacement is visible in review. Tokens cached in memory for the session to
avoid keystore reads on every request.

**Review trigger.** Reconsider if any additional data category is identified as sensitive.

---

## Constitutional Compliance

| Principle | Mechanism |
|---|---|
| 2 — Intelligence Before Interaction | Repository composition delivers OBA reasoning as one coherent answer |
| 3 — Human-Centered Engineering | Empty results, failures, and refreshes present distinctly |
| 4 — Systems Before Features | Interceptor chain and service contract inherited by every screen |
| 5 — Platform Before Product | Integration boundaries recorded per platform, not per product |
| 9 — Governance Enables Scale | Endpoint and storage-key registries make external changes single-edit |
| 10 — Performance Is Experience | Concurrent composition, granular loading, progressive rendering |
| 12 — Every Experience Strengthens Trust | Credential encryption, no logged tokens, retry on every failure |
| 13 — Experience Creates Trust | Storage architecture upholds Sentinel's guarantees |

---

## Open Questions and Known Gaps

Recorded so each becomes a Week 3 task rather than a production incident.

1. **Concurrent 401 refresh.** Requires single-flight locking. Blocked on whether Sentinel refresh
   tokens are single-use.
2. **Certificate pinning.** Enabled in staging and production, but the provisioning process is
   undefined. Requires Sentinel and Engineering Governance input.
3. **Response envelope shape.** The mapper assumes `{error: {message: …}}`. Requires confirmation
   from each platform owner; it falls back safely if the shape differs.
4. **Offline behaviour.** Repositories hold in-memory caches only. Whether disk-backed offline
   capability is required is unresolved.
5. **Pagination contract.** Services accept `limit` but no cursor. Requires the OBA pagination
   convention before list-heavy screens are built.

---

## Coordination Notes

| Platform | Coordination item |
|---|---|
| AI Experience | OBA reasoning contract; whether streaming responses are required, which would change the service return type |
| Executive Workspace | Dashboard composition needs; confirms granular loading as a requirement |
| Visualization | Data volume and shape for charts; affects pagination and caching policy |
| Accessibility | Error and loading states must be announced to screen readers, not conveyed visually alone |
| Experience Quality | Mandatory catch points and the four-state rule become review checklist items |
| Engineering Governance | Dependency approval for `dio`, `flutter_secure_storage`, `shared_preferences` |

---

**Next:** `DAY-4-Frontend-Architecture-Review.md`
