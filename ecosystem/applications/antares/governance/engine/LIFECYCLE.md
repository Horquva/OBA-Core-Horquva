# Governance Decision Lifecycle

Every proposed action moves through the same 7 stages before it is allowed to happen (or not).

```
Event -> Governance Context -> Policy Check -> Analysis -> Decision -> Evidence -> Audit
```

## 1. Event
- **Input:** a proposed action from anywhere in Antares (mainly Zeeshan's agent platform) —
  e.g. "agent X wants to delete customer record Y".
- **Output:** a structured Action Request object (who, what, on what target, when).
- **Consumed by:** Governance Context stage.

## 2. Governance Context
- **Input:** the Action Request.
- **What happens:** load everything needed to judge the request — actor identity, actor's
  claimed authority, platform of origin, target resource, current org/policy state.
- **Output:** an enriched Governance Context object.
- **Consumed by:** Policy Check.

## 3. Policy Check
- **Input:** Governance Context.
- **What happens:** static rule lookup — "is this class of action allowed at all, for this
  actor/role, under current Governance Rules?" No trust or history considered yet.
- **Output:** pass / fail / conditional, with which rule(s) applied.
- **Consumed by:** Analysis.

## 4. Analysis
- **Input:** Governance Context + Policy Check result.
- **What happens:** Trust Intelligence Engine runs — trust assessment, decision confidence
  (model confidence is NOT the same as org trust — kept separate), oversight need, risk level.
- **Output:** a Trust/Risk Assessment.
- **Consumed by:** Decision.

## 5. Decision
- **Input:** Policy Check result + Trust/Risk Assessment.
- **What happens:** the two are combined into one final call.
- **Output:** ALLOW / REJECT / ESCALATE / HUMAN_REVIEW, plus a human-readable reason and
  which accountable party owns this decision.
- **Consumed by:** Evidence, and by whichever platform proposed the action (enforcement).

## 6. Evidence
- **Input:** the full Decision object plus everything that led to it.
- **What happens:** package it into a standardized, machine-readable evidence record (per
  governance/evidence-standards/).
- **Output:** an Evidence record with a stable ID.
- **Consumed by:** Audit, and any platform that wants to inspect why a decision was made.

## 7. Audit
- **Input:** Evidence record.
- **What happens:** append-only write to the audit log. Never edited, only appended.
- **Output:** a permanent, queryable audit trail entry.
- **Consumed by:** anyone doing after-the-fact review, adversarial testing (Din 8-9), or
  compliance checks.

## Fail-safe principle (expanded in Din 6)
If any stage cannot get the information it needs (missing context, unverifiable identity,
unknown actor), the lifecycle does NOT default to ALLOW. It defaults to REJECT or
HUMAN_REVIEW — silence/missing-data is treated as risk, never as permission.
