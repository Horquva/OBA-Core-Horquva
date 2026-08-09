# Structured Logging

**Owner:** Affan
**Path:** `infrastructure/observability/`
**Applies to:** every OCOS capability

---

## Format

One JSON object per line. No multi-line output. No text banners.

```json
{"ts":"2026-08-09T14:22:07.481Z","level":"info","hop":"evidence.classification","signal_id":"9f2c8e14-...","event":"hop.exit","status":"ok","duration_ms":34}
```

## Required fields

Every line carries these.

| Field | Type | Notes |
|---|---|---|
| `ts` | ISO 8601 UTC, milliseconds | Always UTC. Never local time. |
| `level` | `debug` `info` `warn` `error` | |
| `hop` | string | The capability emitting the line, e.g. `perception.ingestion` |
| `event` | string | Dotted name, e.g. `hop.entry`, `hop.exit`, `source.auth_failed` |

## Required when a signal is in scope

| Field | Type | Notes |
|---|---|---|
| `signal_id` | uuid | The envelope identifier. Never a locally generated value. |

Any line emitted while handling a signal carries its `signal_id`. A line without one cannot be traced, and a signal that stops at a hop that logged without it cannot be diagnosed.

## Every hop emits exactly two lines

On entry:

```json
{"ts":"...","level":"info","hop":"evidence.classification","signal_id":"...","event":"hop.entry"}
```

On exit:

```json
{"ts":"...","level":"info","hop":"evidence.classification","signal_id":"...","event":"hop.exit","status":"ok","duration_ms":34}
```

On failure the exit line carries `status: "failed"` at `level: "error"`, with `reason`:

```json
{"ts":"...","level":"error","hop":"evidence.classification","signal_id":"...","event":"hop.exit","status":"failed","reason":"unrecognised event type","duration_ms":12}
```

These same three shapes are what `signal_trace` records. Emit both — the log line and the table row.

## Levels

| Level | Use for |
|---|---|
| `debug` | Local development only. Not enabled in staging. |
| `info` | Hop entry and exit. Normal operation. |
| `warn` | Degraded but proceeding — a retry, a fallback, a slow dependency. |
| `error` | The hop stopped. Always paired with `status: "failed"`. |

A hop that fails logs at `error` and stops. It does not log at `warn` and continue with a default value.

## Never log

- Secrets, tokens, passwords, connection strings.
- Raw source payloads. Log the envelope fields and identifiers, not the body.
- Any field from a signal classified `Restricted` or `Sensitive / Secret`, beyond its identifiers. Classification is defined in [`02_classification_contract.md`](../../applications/executive_workspace/integration/contracts/02_classification_contract.md).

If you need the payload to debug, retrieve it from storage by `signal_id`. Do not put it in the log.

## Configuration

| Variable | Dev | Staging |
|---|---|---|
| `LOG_LEVEL` | `debug` | `info` |
| `LOG_FORMAT` | `json` | `json` |

Both environments emit JSON. Do not add a pretty-printed mode for staging.

## What this covers, and what it does not

This is the T1 logging standard: structured lines, correlated by `signal_id`, sufficient to locate a stalled signal to a hop.

Metrics, tracing spans, dashboards and alerting are full observability and are T7. `infrastructure/monitoring/` and `infrastructure/tracing/` are RESERVED and are not used in T1.
