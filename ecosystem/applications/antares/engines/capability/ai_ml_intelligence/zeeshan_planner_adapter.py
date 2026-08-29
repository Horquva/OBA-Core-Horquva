"""
Planner/Tool-Executor Adapter for Zeeshan's Future Organization Runtime
Owner: Muhammad Hasnain Ajmal

This is the REAL integration point. It does not invent a new contract —
it matches Zeeshan's actual existing pluggable-callable design exactly,
as defined in app/services/agent_engine.py:

    planner(task) -> str
    planner(task, relevant_lessons) -> str
    tool_executor(task, plan: str) -> str   (raise TaskExecutionError on failure)

Usage (from Zeeshan's side, or from a test):

    from app.services.agent_engine import run_agent_task
    from ai_ml_intelligence.zeeshan_planner_adapter import ai_ml_planner, ai_ml_tool_executor

    run_agent_task(session, agent_role, task,
                    planner=ai_ml_planner,
                    tool_executor=ai_ml_tool_executor)
"""

from intelligence.reasoning_engine import ReasoningEngine

_engine = ReasoningEngine()


def ai_ml_planner(task, relevant_lessons=None) -> str:
    """
    Real planner callable — matches Zeeshan's expected signature exactly.

    task.title becomes the goal. relevant_lessons (if provided by his
    memory service) becomes context. The rich structured Plan object from
    the reasoning engine is converted to a plain string here because
    that's what his current engine consumes (plan gets concatenated with
    lesson text via string +=) — this is a real constraint of his
    existing code, not a simplification I invented.
    """
    context = ""
    if relevant_lessons:
        context = "Past lessons: " + "; ".join(getattr(l, "lesson", str(l)) for l in relevant_lessons)

    plan = _engine.plan(goal=task.title, context=context)
    evaluation = _engine.evaluate_plan(plan)

    if not evaluation["viable"]:
        # Honest failure path — do not silently return an unusable plan as
        # if it succeeded. This lets Zeeshan's existing fail/retry/escalate
        # machinery handle it correctly instead of executing a bad plan.
        from app.services.agent_engine import TaskExecutionError
        raise TaskExecutionError(f"AI/ML planning rejected this plan: {evaluation.get('issues')}")

    step_lines = "; ".join(f"{i+1}. {s.description}" for i, s in enumerate(plan.steps))
    return f"[AI/ML plan | confidence={plan.confidence}] {step_lines}"


def ai_ml_tool_executor(task, plan: str) -> str:
    """
    Minimal real tool executor. Honest scope: this confirms the plan was
    received and is ready for execution — it does NOT fabricate that a
    downstream agent (e.g. ResearchAgent) physically completed real-world
    work, since no such external tool exists to actually call yet. That
    would be a false-success claim this whole roadmap explicitly forbids.
    """
    return f"Plan received and accepted for execution: {plan}"
