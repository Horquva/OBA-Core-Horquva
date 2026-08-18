# Core Concepts: Rules vs Trust Signals vs Accountability vs Enforcement

These four ideas are easy to blur together. They are kept strictly separate in this platform
because each answers a different question.

## 1. Governance Rule
**Question it answers:** "Is this action allowed at all, as a general policy?"
**Nature:** static, explicit, changes rarely, written by humans (constitutional authority).
**Example:** "Agents may never delete a customer record without a REJECT/ESCALATE override
being possible — deletion always requires HUMAN_REVIEW."

## 2. Trust Signal
**Question it answers:** "How much should we trust THIS actor, in THIS specific instance,
right now?"
**Nature:** dynamic, evidence-based, recalculated per action. Made of things like: actor's
track record, how often its past decisions were overturned, anomaly indicators, and model
confidence.
**Important distinction:** model confidence (the AI's own certainty in its output) is NOT the
same as organizational trust (how much the org has learned to trust this actor's decisions
over time). They are tracked as two separate numbers and never collapsed into one.
**Example:** "This agent has a 98% historical accuracy on similar actions, but this specific
request has an unusual target — trust score is lowered for this instance only."

## 3. Accountability
**Question it answers:** "If this decision turns out to be wrong, who answers for it?"
**Nature:** every decision the engine makes must be attached to a responsible party — the
approving human, the policy owner, or the system itself (with a named owner behind it).
**Example:** "Decision D-2031 was auto-ALLOWed by the engine under Policy P-14; Policy P-14's
accountable owner is the Trust & Governance platform lead."

## 4. Enforcement
**Question it answers:** "How does the decision actually get carried out?"
**Nature:** the mechanical/runtime step — blocking the action, letting it proceed, or routing
it to a human. Enforcement does not decide anything; it only executes what Decision already
determined.
**Example:** "Runtime blocks the delete API call and returns REJECTED to the calling agent
platform."

## Why the separation matters
A rule can say an action is allowed, but a trust signal can still push it to ESCALATE. Trust
can be high, but if no rule permits the action, it's still REJECTED. Accountability makes sure
a name is attached to every outcome. Enforcement never improvises — it only carries out what
the first three already settled. Mixing these together is what makes governance systems either
too rigid (rules only) or too unpredictable (trust only) — Kanwal's engine keeps them as four
separate, auditable steps.
