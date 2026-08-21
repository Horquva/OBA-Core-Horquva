# Altair — Workflow Automation Platform

Altair is a feature-based React workflow automation console backed by a Node.js API, asynchronous workflow worker, scheduler, authentication/RBAC layer, and operational management features.

The platform is designed around:

**UNDERSTAND → ESTABLISH → BUILD → INTEGRATE → OPERATE → HARDEN**

The original frontend structure and working views have been preserved while the platform has been extended with real API-backed execution, scheduling, integrations, governance, operational tooling, and functional management actions.

---

## Engineering Progression

Altair follows the engineering progression:

1. **Understand** — architecture, requirements, workflow concepts
2. **Establish** — authentication, RBAC, API and persistence
3. **Build** — workflow creation, versioning and execution
4. **Integrate** — adapters, webhooks, events and external services
5. **Operate** — schedules, incidents, runbooks, service health and monitoring
6. **Harden** — security, auditability, reliability and production readiness

---

# Run Locally

### Prerequisite

* Node.js 20+
* npm

Install dependencies:

```bash
npm install
```

### Recommended: Start Everything

```bash
npm run dev:all
```

This starts:

* Node.js API
* Workflow worker
* Scheduler
* Vite frontend

Open:

```text
http://localhost:5173
```

### Alternative: Two Terminals

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

The server automatically creates:

```text
server/data/store.json
```

on first start.

No database file needs to be manually created.

---

# Development Login

Default development account:

```text
Email: admin@altair.local
Password: AltairDemo123!
Role: admin
```

These credentials are for local development only.

Configure them with:

```bash
ALTAIR_DEMO_EMAIL=...
ALTAIR_DEMO_PASSWORD=...
ALTAIR_DEMO_ROLE=admin
```

See:

```text
.env.example
```

Production startup refuses to use the default demo credentials.

---

# Authentication and RBAC

Altair uses server-side authentication and permission-based authorization.

Authentication includes:

* Salted PBKDF2-SHA256 password hashes
* Opaque random session tokens
* HttpOnly cookies
* SameSite cookie protection
* Server-side session expiration
* Logout invalidation
* Permission-based API authorization

Permissions include:

```text
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
```

The frontend hides actions that the current user cannot perform.

The backend independently verifies every protected operation.

---

# Workflow Runtime

Workflow executions are persisted as queued jobs.

A background worker consumes and processes the jobs asynchronously.

The runtime supports:

* Processing steps
* Execution steps
* Approval gates
* Retries with backoff
* Step timeouts
* Cancellation requests
* Idempotency keys
* Failure recovery
* Execution events
* Audit events
* Workflow versioning
* Scheduled execution
* Webhook triggers
* Event triggers

There is no workflow progression timer controlling the application.

---

# Workflow Builder

The Workflow Builder allows users to create and publish workflow definitions.

Current builder capabilities include:

* Workflow name
* Description
* Category
* Trigger type
* Trigger source
* Ordered workflow steps
* Processing/execution phases
* Approval requirements
* Approval role
* Workflow versioning

### Functional Builder Actions

The builder includes functional actions such as:

* Add step
* Remove step
* Edit step
* Change execution phase
* Configure approval requirements
* Publish workflow
* Create workflow version

Publishing creates a new immutable workflow version.

---

# Workflow Triggers

Altair supports multiple trigger interfaces.

### Manual Execution

Authenticated users can start workflows through the API or Operations Center.

### Webhooks

```text
POST /api/webhooks/:workflowId
```

### Events

```text
POST /api/events
```

### Scheduled Workflows

The scheduler automatically evaluates enabled schedules and queues matching workflows.

A workflow must explicitly declare the corresponding trigger type before its trigger endpoint is accepted.

Webhook requests can be protected with:

```bash
ALTAIR_WEBHOOK_SECRET
```

---

# Real-Time Updates

Altair provides a Server-Sent Events stream:

```text
GET /api/stream
```

The frontend listens for events including:

```text
execution.updated
workflow.event
workflow.version.created
workflow.version.published
```

The frontend refreshes its read model when relevant state changes.

---

# Integrations

Execution-phase side effects use the adapter registry:

```text
server/adapters.js
```

Supported integration concepts include:

* HTTP
* Deployment systems
* Repository systems
* Issue trackers
* Incident systems
* Notification systems
* Documentation systems

An unconfigured external adapter fails explicitly with:

```text
integration_not_configured
```

Altair does not falsely report an external action as successful.

### Demo Mode

The project starts in demo mode by default.

Demo mode allows local development without requiring private external services.

To require real external integrations:

```bash
ALTAIR_DEMO_MODE=false
```

Then configure the required adapter variables:

```bash
ALTAIR_ADAPTER_<ACTION>_URL
```

Production deployments should use approved adapters and secure secret management.

---

# Operational Management

Altair includes an extended operational console.

The sidebar includes:

* Overview
* Workflow Builder
* Workflow Catalog
* Approval Center
* Operations Center
* Execution History
* Notifications
* Audit Timeline
* Integrations
* Schedules
* System Health
* Access Control
* Settings
* Incident Center
* Change Calendar
* Runbooks
* Service Map
* Reports & Insights

These features are designed around workflow automation and operational management rather than being simple placeholder pages.

---

# Functional Actions and Buttons

Interactive actions are connected to application state and/or API operations.

### Workflow Builder

```text
+ Add Step
```

Creates a real workflow step.

### Approval Center

```text
Request Approval
Approve
Reject
```

These actions update approval state through the application/API.

### Operations Center

```text
Run Workflow
Cancel
Retry
```

These actions interact with the workflow execution runtime.

### Execution History

```text
Export History
```

Generates and downloads execution history as CSV.

### Notifications

```text
Add Alert Rule
Enable
Disable
Delete
```

Alert rules can be created and managed from the UI.

### Audit Timeline

```text
Export Audit Log
```

Generates an audit-log CSV export.

---

# Schedules

The Schedules screen provides recurring workflow execution management.

Supported operations include:

* Create schedule
* Enable schedule
* Pause schedule
* Run schedule immediately
* Edit schedule
* Delete schedule

Schedules are evaluated by the scheduler loop and matching workflows are queued for execution.

---

# Integrations Management

The Integrations screen provides a connector registry.

Supported management actions include:

* Add integration
* Configure integration
* Test integration
* Enable integration
* Disable integration
* Remove integration

Demo-mode integrations can be tested locally without external credentials.

---

# Incident Center

The Incident Center provides operational incident management.

Capabilities include:

* Create incident
* Assign severity
* Assign owner
* Track incident status
* Resolve incident
* Archive incident

Typical severity levels:

```text
Critical
High
Medium
Low
```

---

# Change Calendar

The Change Calendar provides operational visibility into planned changes.

Capabilities include:

* Schedule a change
* Define affected service
* Set change window
* Define risk
* Review change
* Remove change

This provides a centralized view of planned operational activity.

---

# Runbooks

Runbooks provide reusable operational procedures.

Examples include:

* Deployment recovery
* Failed workflow recovery
* Webhook troubleshooting
* Service restart procedure
* Incident response
* Integration recovery

Runbook actions include:

* Create runbook
* Edit runbook
* Run runbook
* Duplicate runbook
* Delete runbook

---

# Service Map

The Service Map provides a visual operational view of:

* Services
* Dependencies
* Service health
* Latency
* Operational relationships

This helps operators understand the potential impact of workflow and deployment operations.

---

# System Health

The System Health screen provides visibility into platform components:

* API
* Worker
* Scheduler
* Event stream
* Datastore
* Audit subsystem
* Workflow runtime

The health screen is intended for local operational monitoring and troubleshooting.

---

# Access Control

The Access Control screen manages users and roles.

Supported actions include:

* Add/invite user
* View user
* Manage role
* Change permissions
* Remove user

The backend continues to enforce RBAC independently of the frontend.

---

# Settings

The Settings screen provides configuration for local and operational behavior.

Settings include:

* Demo mode
* Approval behavior
* Realtime updates
* Timezone
* Execution preferences
* Safe local-demo configuration

---

# Reports & Insights

Reports provide operational metrics such as:

* Workflow success rate
* Failed execution count
* Retry rate
* Execution duration
* Workflow activity
* Operational trends

Reports can be exported for further analysis.

---

# Observability

The API emits structured JSON startup and error logs.

Basic metrics are available at:

```text
GET /api/metrics
```

Production deployments should connect these signals to the organization's centralized observability platform.

Recommended production additions include:

* Distributed tracing
* Centralized logging
* Metrics collection
* Alerting
* Error tracking
* Service-level objectives

---

# Execution History

Execution History provides visibility into workflow runs.

Execution records include information such as:

* Workflow
* Version
* Status
* Start time
* Completion time
* Duration
* Trigger source
* Failure information
* Retry information

Available actions include:

```text
Retry
Cancel
View Details
Export History
```

---

# Audit Timeline

Altair records important platform events in the audit trail.

Audit events can include:

* Login/logout
* Workflow creation
* Workflow publication
* Workflow execution
* Approval decisions
* Execution retries
* Execution cancellation
* Configuration changes
* Access-control changes
* Operational actions

The audit log can be exported as CSV.

---

# Notifications

The Notifications system provides operational alerts.

Notification functionality includes:

* View notifications
* Create alert rules
* Enable/disable alert rules
* Delete alert rules
* Track operational events

---

# Data Persistence

The current development persistence layer is:

```text
server/data/store.json
```

It is intentionally dependency-light and suitable for:

* Local development
* Demonstrations
* Single-process environments
* Testing

It is **not recommended as a production database**.

Before production deployment, replace it with an approved transactional database such as PostgreSQL.

The in-process queue should also be replaced with a shared durable queue/worker architecture.

---

# Production Hardening

Before production deployment, consider:

* PostgreSQL or another transactional database
* Durable queue infrastructure
* Multiple worker processes
* Secure secret management
* TLS/HTTPS
* Centralized authentication
* Rate limiting
* CSRF protection where applicable
* Distributed tracing
* Centralized logs
* Metrics and alerting
* Backup and disaster recovery
* Formal workflow governance
* Draft/review/approval/publish lifecycle
* External integration security reviews

See:

```text
docs/engineering.md
docs/deployment.md
```

---

# Tests

Run the backend test suite:

```bash
npm test
```

Current tests cover:

* Password hashing
* Password verification
* RBAC permissions
* Login/session persistence
* Protected-route authorization
* Unauthenticated access handling

---

# Architecture Documentation

Additional documentation is available under:

```text
docs/
```

### Architecture

```text
docs/architecture.md
```

Covers the Understand stage.

### Workflows

```text
docs/workflows.md
```

Covers workflow establishment and execution concepts.

### Engineering

```text
docs/engineering.md
```

Covers hardening and production gaps.

### Deployment

```text
docs/deployment.md
```

Covers deployment prerequisites.

---

# Project Architecture

At a high level:

```text
React Frontend
      │
      ▼
Node.js API
      │
      ├── Authentication / RBAC
      ├── Workflow API
      ├── Approval API
      ├── Operations API
      ├── Integration API
      ├── Schedule API
      ├── Audit API
      └── Event Stream
              │
              ▼
        Workflow Queue
              │
              ▼
        Async Worker
              │
              ▼
     External Integrations
```

The frontend does not independently simulate workflow progression.

Workflow state is controlled by the backend runtime.

---

# External Dependencies

Real workflow side effects may depend on:

* Deployment platforms
* Source repositories
* Secret stores
* Issue trackers
* Incident-management platforms
* Documentation systems
* CDN systems
* Paging systems
* Chat/notification platforms

No external service should be represented as successfully completed unless the configured adapter confirms the operation.

---

# Demo Mode

For local development:

```bash
ALTAIR_DEMO_MODE=true
```

Demo mode provides a safe local environment for demonstrating:

* Workflows
* Scheduling
* Integrations
* Approvals
* Incidents
* Runbooks
* Operations
* Reports
* Notifications

No private external credentials are required for the local demo.

For real integrations:

```bash
ALTAIR_DEMO_MODE=false
```

and configure the required adapter/environment variables.

---

# GitHub

GitHub is intentionally not required for the local setup.

The project can be:

1. Extracted from the ZIP
2. Installed with `npm install`
3. Started with `npm run dev:all`
4. Tested locally
5. Committed to Git
6. Published to GitHub when ready

---

# Quick Start

```bash
npm install
npm run dev:all
```

Then open:

```text
http://localhost:5173
```

Development login:

```text
admin@altair.local
```

```text
AltairDemo123!
```

Altair is intended to demonstrate a complete workflow automation platform architecture covering **workflow creation, execution, approvals, integrations, scheduling, operations, incidents, runbooks, observability, governance, and auditability**.
