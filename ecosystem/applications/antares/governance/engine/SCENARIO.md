# Scenario Walkthrough: Agent Requests Customer Data Deletion

This is a manual (no-code) walk of one example request through all 7 lifecycle stages. This
becomes the blueprint for the Governance Evaluation Engine built on Din 3-4.

**Scenario:** An autonomous agent on Zeeshan's platform proposes deleting a customer record
because it believes the customer requested it.

## 1. Event
```
{
  "action": "delete_customer_record",
  "actor": "agent-zeeshan-047",
  "target": "customer_record:CR-88213",
  "claimed_authority": "customer_deletion_request",
  "timestamp": "2026-08-13T09:02:00Z"
}
```

## 2. Governance Context
- Actor identity verified: yes, agent-zeeshan-047 is a registered agent.
- Actor's claimed authority: "customer_deletion_request" — needs to be checked against what
  this agent is actually authorized to invoke.
- Platform of origin: Zeeshan's Agent Platform.
- Target resource: CR-88213, classified as sensitive PII.

## 3. Policy Check
- Rule R-09: "Deletion of sensitive PII records always requires HUMAN_REVIEW, regardless of
  actor or claimed authority."
- Result: **conditional** — action is not outright rejected, but cannot be auto-approved.

## 4. Analysis (Trust Intelligence Engine)
- Model confidence (agent's own certainty it interpreted the customer correctly): 91%.
- Organizational trust score for this agent (based on history): 0.87 (high, but not perfect).
- Risk evaluation: high — irreversible action on sensitive data.
- Oversight determination: required, because Rule R-09 already mandates it and risk is high.

## 5. Decision
```
{
  "decision": "HUMAN_REVIEW",
  "reason": "Rule R-09 requires human review for PII deletion; risk level HIGH confirms this is not a fast-track case.",
  "accountable_owner": "governance-platform-lead"
}
```

## 6. Evidence
```
{
  "evidence_id": "EV-2026-0813-0091",
  "decision_ref": "D-2026-0813-0091",
  "inputs_snapshot": { "event": "...", "context": "...", "policy_check": "...", "analysis": "..." },
  "created_at": "2026-08-13T09:02:04Z"
}
```

## 7. Audit
- Appended to the audit log, immutable, queryable by `evidence_id` or `actor`.
- Any later reviewer (or the Din 8-9 adversarial test) can reconstruct exactly why this
  request was sent to a human instead of auto-approved or auto-rejected.

## What this proves
The engine never let trust alone override a hard policy rule (R-09), and it never let the
policy rule alone decide without also weighing risk — both checks had to independently agree
before a final call was made. That's the core behavior Din 3-4's engine needs to reproduce in
code.
