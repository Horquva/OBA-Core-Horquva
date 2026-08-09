# Service Boundaries — T1

**Owner:** Affan
**Source of truth:** `Horquva_OCOS_Repository_Tree.pdf`

---

## The rule

A capability owns its domain logic. An `api/` directory owns transport only.

The frozen tree marks most `api/` paths **TRANSPORT / EXPOSURE ONLY**. Code in those paths receives a request, calls the capability, and returns the result. It does not decide anything about the domain.

| Path | Owner | Role |
|---|---|---|
| `connectivity/api/` | Haroon | Transport only. Domain logic stays with Umer. |
| `perception/api/` | Haroon | Transport only. |
| `evidence/api/` | Haroon | Transport only. |
| `understanding/api/` | Haroon | Transport only. |
| `runtime/api/` | Saad | Orchestration contract. Haroon is transport. |
| `world_model/api/` | Janita | Query design. Haroon is transport. |

Where the tree names two people, the capability owner designs the interface and the transport owner exposes it. The transport owner does not redesign it.

## What "transport only" excludes

An `api/` path does not:

- Reshape a payload it received from its capability.
- Apply a default when its capability returned nothing.
- Classify, score, filter, rank, or enrich.
- Decide what a caller is allowed to see beyond enforcing the `classification` already on the record.

If an API path needs any of the above, the need belongs to the capability, and the capability owner implements it.

## Backend and frontend

| | |
|---|---|
| **Frontend** | `applications/executive_workspace/frontend/` — Zoya, Mushtaq, Fatima |
| **Application backend** | `applications/executive_workspace/backend/` — Haroon |
| **OCOS capabilities** | `connectivity/`, `perception/`, `evidence/`, `understanding/`, `runtime/`, … |

**The frontend calls the application backend. It does not call OCOS capabilities directly, and it does not reach a database.**

The bridge between OCOS and the workspace is `applications/executive_workspace/integration/` — Affan. Capability responses reach the workspace through that path, not by the frontend importing from a capability directory.

## Transport between capabilities

| Boundary | Transport |
|---|---|
| `connectivity/connector_platform/github/` → `perception/ingestion/` | in-process |
| `perception/ingestion/` → `evidence/classification/` | in-process |
| `evidence/classification/` → `evidence/evidence_store/` | SQL |
| `evidence/evidence_store/` → `understanding/organizational/` | SQL |
| `understanding/organizational/` → `runtime/orchestrator/langgraph/` | HTTP |
| `runtime/orchestrator/langgraph/` → `connectivity/api/` | HTTP |
| `connectivity/api/` → frontend | HTTP / JSON |

`runtime/orchestrator/langgraph/` is a separate Python service. Every other T1 hop runs in the same process or reaches the database directly.

T1 is synchronous. `runtime/queues/` and `runtime/messaging/` are RESERVED and are not used.

## Directory rules

1. Build inside a path assigned to you in §3 of the [integration map](T1_INTEGRATION_MAP.md).
2. Do not create top-level directories. CI fails the build.
3. Do not create a capability directory that is not in the frozen tree.
4. Do not import across capability boundaries. Cross a boundary through its `api/` or through the database, per the table above.
5. `RESERVED` directories stay empty until their phase.

## Configuration

| | |
|---|---|
| Secrets | Environment variables. Never committed, never in code, never in logs. |
| Database | `PG*` variables. See `infrastructure/databases/`. |
| Logging | `LOG_LEVEL`, `LOG_FORMAT`. See `infrastructure/observability/`. |
| Ports | Each service declares its own. Record it in `04_api_contract.md`. |

Each service reads its own configuration at startup and fails immediately with a clear message if a required variable is missing. A service does not start with a default connection string.
