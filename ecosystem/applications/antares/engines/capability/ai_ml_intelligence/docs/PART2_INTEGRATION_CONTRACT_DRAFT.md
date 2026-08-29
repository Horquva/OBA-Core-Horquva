# AI/ML Integration Contract — Part 2 (DRAFT, pending Zeeshan approval)

**Status: PROPOSAL — not yet frozen.** This cannot be marked "frozen" unilaterally.
Per Part 2's own exit gate, there must be exactly one legitimate AI/ML
integration boundary, and it must be approved by the platform owner (Zeeshan)
who will actually call it. This document is what gets sent to him for review.

---

## 1. Legitimate Producer

**Proposed:** Zeeshan's AI Agents & Autonomous Organizations runtime is the
only legitimate caller of this AI/ML layer. No other Antares subsystem should
call it directly — this keeps one integration boundary, not several.

**Open question for Zeeshan:** Confirm this is correct, and confirm which
specific service/module inside his platform will be the caller.

---

## 2. Proposed Request Contract

Based on what the current implementation actually accepts:

```json
{
  "request_id": "string (caller-generated, for traceability)",
  "capability": "planning | experiment_evaluation",
  "goal": "string (required for capability=planning)",
  "context": "string (optional)",
  "correlation_id": "string (optional, for tracing across systems)"
}
```

This maps directly to the real function signatures that exist today:
`ReasoningEngine.plan(goal, context)`. Nothing here is invented beyond what
the implementation can actually receive.

---

## 3. Proposed Response Contract

```json
{
  "request_id": "string (echoed back)",
  "capability_id": "string (registry ID, e.g. cap_4f8f9ac610a)",
  "result": {
    "plan_id": "string",
    "steps": [{"description": "string", "action": "string"}],
    "confidence": "float 0.0-1.0"
  },
  "evaluation_state": "viable | not_viable",
  "execution_state": "completed | failed",
  "failure_state": "null | {\"type\": \"string\", \"message\": \"string\"}",
  "telemetry_reference": "string (points to persisted result in results/)"
}
```

---

## 4. Evaluation Behavior (already implemented, restated for the contract)

The implementation already distinguishes these two ideas:

```
INFERENCE COMPLETED   → the model returned text without error
INTELLIGENCE ACCEPTED → evaluate_plan() or evaluator.py scored it as passing
```

A response with `execution_state: completed` but `evaluation_state: not_viable`
is a **real, valid, non-success outcome** — it must not be treated as a
usable result by the consumer.

---

## 5. Proposed Failure States

Based on what's actually testable today:

| Failure type | Currently handled? |
|---|---|
| Invalid input (empty/malformed goal) | Partially — `plan()` will attempt it and Gemini will likely produce a low-confidence or empty result; not explicitly validated before sending |
| Inference failure (API error, bad key, network down) | Yes — `model_adapter.run()` returns `{"error": "..."}` instead of crashing |
| Timeout | Yes — 60-second timeout implemented in `model_adapter.py` |
| Evaluation failure (plan judged not viable) | Yes — `evaluate_plan()` |
| Dependency failure (Gemini service down) | Same as inference failure — not separately distinguished yet |
| Resource failure | Not implemented / not applicable at this scale yet |

**Honest gap:** invalid input isn't rejected up-front before hitting the model
— this should be added before Part 6 (failure testing) if we want a clean pass.

---

## 6. Proposed Traceability Chain

```
request_id → capability_id → model (gemini-2.5-flash) → plan_id
  → execution_state → evaluation_state → result → results/*.json
```

**Gap:** there's currently no `correlation_id` propagated from an external
caller — because there is no external caller yet. This field is proposed,
not yet exercised.

---

## 7. Integration Contract Tests — Status

| Test | Status |
|---|---|
| Valid request → valid processing path | Exercised manually via demo, not as an automated contract test |
| Invalid request → correct rejection | **Not implemented yet** |
| Valid result → correct response structure | Response shape matches Part 3 above informally; no automated schema validation test yet |
| Failure → correct failure structure | Partially — bad API key tested manually, not as an automated test |

---

## Next Action (not a Part 2 exit — this is still a draft)

Send this document to Zeeshan. Ask him directly:
1. Does this request/response shape work for what his runtime needs to send/receive?
2. What does HE want the `capability` field values to be, exactly?
3. Where in his codebase would the actual call to this AI/ML layer happen?

Only after his answers can this be marked "frozen." Contract testing (item 7
above) should be built once the real shape is confirmed — writing tests
against an unconfirmed contract risks testing the wrong thing.
