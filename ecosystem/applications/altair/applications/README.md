# Altair — Workflow Automation Platform

Altair is a feature-based React workflow console backed by a small Node API and asynchronous workflow worker.

## Engineering progression

**UNDERSTAND → ESTABLISH → BUILD → INTEGRATE → OPERATE → HARDEN**

The original frontend structure and working views were preserved. The browser-side timer simulator was replaced by an API/queue/worker integration seam.

## Run locally

Prerequisite: Node.js 20+.

Install dependencies once:

```bash
npm install
Recommended: start everything with one command
npm run dev:all

This starts both the Node API/worker and the Vite frontend. Open http://localhost:5173.

Alternative: two terminals

Terminal 1:

npm run server

Terminal 2:

npm run dev

The server automatically creates server/data/store.json on first start, so no database file is required in the ZIP.

Development login

Default demo account:

Email: admin@altair.local
Password: configure locally with ALTAIR_DEMO_PASSWORD
Role: admin

These are development defaults only. Configure them with:

ALTAIR_DEMO_EMAIL=admin@altair.local
ALTAIR_DEMO_PASSWORD=your-local-demo-password
ALTAIR_DEMO_ROLE=admin

Keep the actual password in your local .env file and do not commit that file to GitHub.

See .env.example.

Production startup refuses to use the default demo credentials.

Authentication and RBAC

Authentication uses:

salted PBKDF2-SHA256 password hashes
opaque random session tokens
HttpOnly, SameSite cookies
server-side session expiration
logout invalidation
permission-based API authorization

Permissions include:

workflow:read
workflow:execute
workflow:write
approval:decide
execution:retry
execution:cancel
audit:read
operations:read
notification:manage
governance:manage

The frontend hides actions the current user cannot perform, and the backend independently rejects unauthorized requests.

Real execution runtime

New executions are persisted as queued jobs. A worker consumes jobs asynchronously.

The runtime supports:

processing and execution steps
approval gates
retries with backoff
step timeouts
cancellation requests
idempotency keys
failure recovery
structured execution/audit events

There is no workflow progression timer in the frontend.

Triggers

Supported runtime trigger interfaces:

manual/self-service through the authenticated API
webhook: POST /api/webhooks/:workflowId
event: POST /api/events
scheduled workflows through the scheduler loop

Webhook requests can be protected with ALTAIR_WEBHOOK_SECRET.

A workflow must explicitly declare the corresponding trigger type before its trigger endpoint is accepted.

Real-time updates

GET /api/stream exposes an authenticated Server-Sent Events stream.

The frontend listens for:

execution.updated
workflow.event
workflow version events

and refreshes its read model when state changes.

Integrations

Execution-phase side effects use the adapter registry in:

server/adapters.js

An unconfigured external adapter fails explicitly with integration_not_configured. Altair never pretends that an external action succeeded.

The generic HTTP adapter is a development integration seam. Production systems should use dedicated approved adapters/services and secrets.

Workflow builder and versioning

Workflow definitions retain their existing version field. The API stores immutable version records and the Workflow Builder publishes a new version.

Current builder scope includes:

identity
category
trigger type/source
description
ordered steps
processing/execution phase
approval requirement and role

A production governance process should add formal draft/review/approval/publish controls before allowing unrestricted editing.

Operations

The existing UI screens remain:

Overview
Workflow Catalog
Workflow Builder
Approval Center
Operations Center
Execution History
Notifications
Audit Timeline
Execution Detail

Their data now comes from the API rather than browser-local execution state.

Observability

The API emits structured JSON startup/error logs and exposes basic operational metrics at:

GET /api/metrics

Production should connect these signals to the organization's centralized observability stack and add distributed tracing.

Tests

Run:

npm test

Current tests cover:

password hashing
password verification
RBAC permissions
login/session persistence
unauthenticated protected-route handling
Architecture documentation

See:

docs/architecture.md — Part 1, Understand
docs/workflows.md — Part 2, Establish
docs/engineering.md — hardening and production gaps
docs/deployment.md — deployment prerequisites
Important production dependency

The current development persistence layer is:

server/data/store.json

It is intentionally dependency-light and suitable for local development/single-process use.

It is not a production database.

Before production deployment, replace it with an approved transactional database such as PostgreSQL and replace the in-process queue with a shared durable queue/worker architecture. See docs/engineering.md.

External dependencies

Real workflow side effects depend on external systems such as:

deployment platforms
repositories
secret stores
incident/issue trackers
documentation/CDN systems
paging/chat systems

No external service is falsely simulated. Configure an adapter explicitly or the execution will fail with a documented dependency error.

GitHub

GitHub is intentionally not part of the local setup instructions. The project can be developed and tested locally first.

Demo mode and external integrations

The project starts in demo mode by default, so scheduled workflows and execution steps do not require private external services. Execution-phase adapter calls are simulated locally and are recorded as successful demo actions.

To require real integrations instead, set ALTAIR_DEMO_MODE=false and configure the corresponding ALTAIR_ADAPTER_<ACTION>_URL variables before starting the server.

Platform management screens

The sidebar now includes additional operational screens designed for the Altair workflow platform:

Integrations — connector registry, connection testing, and local demo-mode status.
Schedules — recurring workflow schedules with pause/enable and run controls.
System Health — API, worker, event stream, datastore, audit, and runtime checks.
Access Control — team members, roles, and protected-action policy.
Settings — execution, approvals, realtime updates, timezone, and safe local-demo configuration.

These screens are self-contained UI features and do not require external credentials for the local demo.


