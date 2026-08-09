# Health and Readiness

**Owner:** Affan (integration)
**Applies to:** every OCOS service

---

Two endpoints. Every service exposes both.

## `GET /health` — liveness

Is the process running.

Answers without touching any dependency. No database query, no downstream call. If this is slow, it is wrong.

**200** when the process is up:

```json
{
  "status": "ok",
  "service": "evidence.classification",
  "version": "1.0",
  "uptime_s": 4127
}
```

Never returns a non-200 while the process can respond. A dead process fails to answer at all — that is the signal.

## `GET /ready` — readiness

Can this service do its job right now.

Checks every dependency it needs. Returns the state of each one individually.

**200** when every dependency is reachable:

```json
{
  "status": "ready",
  "service": "evidence.classification",
  "checked_at": "2026-08-09T14:22:07.481Z",
  "dependencies": [
    {"name": "postgres",           "status": "ok",   "latency_ms": 3},
    {"name": "perception.ingestion","status": "ok",   "latency_ms": 11}
  ]
}
```

**503** when any dependency is unreachable. The body keeps the same shape, so the caller sees which one:

```json
{
  "status": "not_ready",
  "service": "evidence.classification",
  "checked_at": "2026-08-09T14:22:07.481Z",
  "dependencies": [
    {"name": "postgres",            "status": "ok"},
    {"name": "perception.ingestion","status": "failed", "error": "connection refused"}
  ]
}
```

## Rules

1. **`/ready` returns 503 when it is not ready.** It does not return 200 with a warning field. A caller must be able to decide from the status code alone.
2. **Every dependency appears in the list every time**, including the healthy ones. A dependency that only appears when broken cannot be distinguished from one that is not checked.
3. **Checks have a timeout.** A `/ready` that hangs is worse than one that reports failure. Two seconds per dependency.
4. **Neither endpoint requires authentication** in T1.
5. **Neither endpoint is logged at `info`.** They are polled; they would drown the log. Log failures only.

## Declare your dependencies

Each service owner lists what `/ready` checks. Fill in your row before your service is wired.

| Service | Depends on |
|---|---|
| `connectivity.github` | GitHub API |
| `perception.ingestion` | postgres |
| `evidence.classification` | postgres, perception.ingestion |
| `evidence.evidence_store` | postgres |
| `understanding.organizational` | postgres, evidence.evidence_store |
| `runtime.orchestrator` | understanding.organizational |
| `connectivity.api` | postgres, runtime.orchestrator |
| `executive_workspace.frontend` | connectivity.api |

## Why both

`/health` answers "restart me?". `/ready` answers "route to me?". A service can be alive and not ready — running fine, database unreachable. Collapsing them into one endpoint means a transient dependency failure looks like a crashed process, and the wrong thing gets fixed.

At wire-up, `/ready` across all services is the first check. If a signal will not flow, the failing dependency is visible before anyone reads a log.
