# CASTOR v2.0 — FLUTTER RUNTIME ARCHITECTURE (C02)

**Author:** Sufyan Afzal (Engineering Governance Platform Owner & Castor Team Lead) 
**Status:** LOCKED / ENFORCED  

---

## 1. Runtime Ingress & Execution Pipeline

The Castor Flutter runtime ingresses approved experience payloads and manages application lifecycle through an explicit, unidirectional state pipeline:
* OCOS Payloads ➔ Experience Contract ➔ Castor Ingress ➔ Context Hydration ➔ Session Management ➔ Experience State ➔ Flutter UI

---

## 2. Core Runtime Subsystems

| Subsystem | Monorepo Directory | Purpose & Responsibility | Primary Owner |
| :--- | :--- | :--- | :--- |
| **Bootstrap & Init** | `apps/mobile/lib/main.dart` | App initialization, environment loading, service registration | Sufyan Afzal |
| **Session Lifecycle** | `runtime/lifecycle/` | Handles session creation, restoration, backgrounding, & destruction | Dur Muhammad Khan |
| **Context Hydration**| `runtime/state/` | Persists & hydrates selected executive context across views | Dur Muhammad Khan |
| **Notification Engine**| `runtime/notification/` | Ingresses urgency & priority notifications from OCOS | Dur Muhammad Khan |
| **Offline Sync** | `runtime/offline/` | Manages local caching and graceful offline retries | Dur Muhammad Khan |

---

## 3. Explicit State Categories

To prevent global state chaos, Castor strictly isolates state into 6 explicit categories:
1. **UI State:** Temporary widget-local interaction states.
2. **Experience State:** Active view models (briefings, dashboards, search).
3. **Session State:** Authenticated session identity and restoration tokens.
4. **Context State:** Active organizational context (department, project, timeframe).
5. **Synchronization State:** Network connectivity, loading, and retry states.
6. **Device State:** Surface responsiveness, viewport size, and orientation.