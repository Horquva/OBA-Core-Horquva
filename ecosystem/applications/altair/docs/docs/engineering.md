# Engineering and Hardening

## Implemented

- Real API boundary replacing the browser timer simulator.
- Durable queued jobs and a worker loop.
- Approval-gated execution.
- Webhook/event trigger endpoints with trigger validation.
- Scheduled trigger polling.
- SSE real-time updates.
- External adapter registry with explicit configuration failures.
- Workflow version persistence and builder UI.
- Execution history, operations, notifications, and audit data served by the API.
- Structured JSON startup/error logs.
- Basic metrics endpoint.
- RBAC permissions enforced on API and relevant UI actions.
- Secure password hashing and session cookies.
- Login, logout, protected application shell, and session persistence.
- Idempotency keys for initiation.
- Retry with exponential backoff.
- Step timeouts.
- Cooperative cancellation.
- Unit and integration tests.

## Testing

Run:

```bash
npm test
```

The suite covers password hashing/RBAC and API authentication/protected-route behavior.

A browser E2E suite should be run in CI with Playwright/Cypress after the project's approved browser-test dependency is selected. It is intentionally not added as an unapproved dependency here.

## Production hardening still required

The current JSON store is development persistence. For production:
1. Replace it with PostgreSQL or another approved transactional database.
2. Replace the in-process queue with a shared durable queue such as Redis/BullMQ, SQS, RabbitMQ, or the organization's standard.
3. Run workers separately from API instances.
4. Add distributed locks/leases for job claiming.
5. Add OpenTelemetry traces and a metrics backend.
6. Add CSRF protection if the deployment topology requires it.
7. Add rate limiting and account lockout/abuse controls.
8. Store secrets in the approved secret manager.
9. Add real adapter implementations and contract tests for each external dependency.
10. Add browser E2E coverage in CI.
