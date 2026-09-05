# Altair Architecture — Part 2: Establish

## Workflow categories

Existing catalog categories remain the source of truth. Runtime trigger classes are:
- Manual
- Self-service
- Approval-gated
- Event-triggered
- Scheduled
- Webhook-triggered
- Fully automated

## Workflow lifecycle

```text
Trigger
  -> queued
  -> processing
  -> approval (when governed)
  -> executing
  -> completed
  -> failed / timed_out
  -> retrying
  -> executing
```

Cancellation is cooperative: a cancellation request is persisted and the worker stops before the next side-effecting step.

## Workflow definition

A workflow contains:
- identity and owner
- category
- version
- trigger
- preconditions
- required/optional inputs
- approval policy
- ordered steps
- availability/governance state

## Execution requirements

Every execution has:
- unique execution ID
- initiator
- inputs
- current node
- status
- retry count
- events
- last error/result
- cancellation state
- idempotency protection

## Approval

Approval is enforced server-side with `approval:decide`. Protected actions must not be performed merely because a frontend button is visible.

## External integrations

Execution-phase steps are sent through an adapter registry. If an adapter is not configured, the runtime records an explicit `integration_not_configured` failure. It never reports a side effect as successful when no external system was contacted.
