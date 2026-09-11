# Altair Architecture — Part 1: Understand

## Existing repository

Altair is a Vite + React frontend with a feature-based structure. The existing UI was preserved:
- `src/domain` — pure workflow concepts.
- `src/data` — catalog and seed data.
- `src/context` — integration seam consumed by features.
- `src/components` — reusable UI/domain components.
- `src/features` — page-level views.
- `src/navigation` — route and navigation definitions.

The original context used browser timers as a mock execution simulator. That simulator is no longer the production execution path.

## Ownership boundaries

| Responsibility | Owner |
|---|---|
| Workflow presentation, forms, dashboards, accessibility | Frontend |
| Workflow definitions and versions | Workflow registry/API |
| Queueing, workers, retries, timeouts, cancellation | Workflow runtime |
| Approval decisions and authorization | Backend/RBAC/governance |
| Audit event persistence | Backend audit subsystem |
| Notifications | Backend notification subsystem + frontend inbox |
| External side effects | Integration adapter layer |
| Metrics/logging/traces | Operations/observability layer |
| Authentication/session lifecycle | Backend identity/session layer |

The frontend never executes external side effects or advances a workflow by itself.

## Runtime

```text
Browser
  -> Vite frontend
  -> /api
  -> Altair API
      -> durable development store
      -> workflow queue
      -> workflow worker
      -> integration adapters
      -> audit + notifications
      -> SSE event stream
```

The development persistence layer is file-backed JSON. It is intentionally dependency-light, but it is **not a production multi-instance database**. Production deployment must replace it with PostgreSQL (or an approved equivalent) and a shared queue.

## Real-time

SSE (`GET /api/stream`) publishes execution and audit-related updates. The frontend refreshes its read model when events arrive. There is no frontend timer-based workflow simulation.

## Security

Passwords use salted PBKDF2-SHA256. Sessions use random opaque HttpOnly cookies. Production refuses to start with the default demo credentials. API authorization is permission-based, not merely UI-based.
