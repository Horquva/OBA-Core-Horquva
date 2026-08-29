"""
Zeeshan Runtime Connector — INTEGRATION-READY, NOT YET LIVE-WIRED
Owner: Muhammad Hasnain Ajmal

STATUS: This module is built and unit-testable, but the actual endpoint/
function it should call on Zeeshan's runtime is not yet confirmed. The
placeholder below (ZEESHAN_ENDPOINT) must be replaced with the real address
or function reference once Zeeshan confirms it. Until then, calling this
against a real runtime will fail — that is expected and correct, not a bug.

Do not present this as "integration complete." It is "integration prepared,
pending the actual endpoint."
"""

import json
from intelligence.reasoning_engine import ReasoningEngine
from intelligence.capability_registry import CapabilityRegistry

# PLACEHOLDER — replace once Zeeshan confirms his real entry point
ZEESHAN_ENDPOINT = None  # e.g. "https://..." or a direct function reference


def handle_agent_request(request: dict) -> dict:
    """
    This is the function Zeeshan's runtime would call, per the contract
    drafted in PART2_INTEGRATION_CONTRACT_DRAFT.md.

    Input shape (per the draft contract):
    {
        "request_id": "...",
        "capability": "planning",
        "goal": "...",
        "context": "..."
    }

    Output shape (per the draft contract):
    {
        "request_id": "...",
        "capability_id": "...",
        "result": {...},
        "evaluation_state": "viable" | "not_viable",
        "execution_state": "completed" | "failed",
        "failure_state": null | {...}
    }

    This function is real and testable on its own. What's NOT yet real is
    Zeeshan's runtime actually calling it — that requires his confirmation
    of where this should be wired in.
    """
    request_id = request.get("request_id", "unknown")
    capability = request.get("capability")

    if capability != "planning":
        return {
            "request_id": request_id,
            "capability_id": None,
            "result": None,
            "evaluation_state": "not_viable",
            "execution_state": "failed",
            "failure_state": {"type": "unsupported_capability", "message": f"'{capability}' not supported"},
        }

    goal = request.get("goal")
    if not goal:
        return {
            "request_id": request_id,
            "capability_id": None,
            "result": None,
            "evaluation_state": "not_viable",
            "execution_state": "failed",
            "failure_state": {"type": "invalid_input", "message": "goal is required"},
        }

    engine = ReasoningEngine()
    plan = engine.plan(goal, context=request.get("context", ""))
    evaluation = engine.evaluate_plan(plan)

    if not evaluation["viable"]:
        return {
            "request_id": request_id,
            "capability_id": plan.id,
            "result": {"plan_id": plan.id, "steps": [], "confidence": plan.confidence},
            "evaluation_state": "not_viable",
            "execution_state": "completed",
            "failure_state": None,
        }

    return {
        "request_id": request_id,
        "capability_id": plan.id,
        "result": {
            "plan_id": plan.id,
            "steps": [{"description": s.description, "action": s.action} for s in plan.steps],
            "confidence": plan.confidence,
        },
        "evaluation_state": "viable",
        "execution_state": "completed",
        "failure_state": None,
    }


if __name__ == "__main__":
    # Local self-test — this proves the FUNCTION works correctly.
    # It does NOT prove Zeeshan's runtime is calling it, because it isn't yet.
    test_request = {
        "request_id": "test-001",
        "capability": "planning",
        "goal": "Coordinate a research task between a ResearchAgent and a ReviewAgent",
        "context": "Organization has ResearchAgent and ReviewAgent roles.",
    }
    response = handle_agent_request(test_request)
    print(json.dumps(response, indent=2, default=str))
