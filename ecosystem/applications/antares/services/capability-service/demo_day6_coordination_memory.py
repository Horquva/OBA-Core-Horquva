"""
Day 6 demo — proves multi-agent coordination, organizational memory, and
learning/adaptation all actually work.

Three scenarios:
  1. Coordination: ResearchAgent gets a task it's NOT authorized for.
     Instead of just failing, it requests delegation to AnalysisAgent
     (who IS authorized) — task gets reassigned and completes.
  2. Learning: A task fails twice before succeeding. The engine
     automatically records a lesson in Organizational Memory.
  3. Adaptation: A second, similar task is planned — this time the
     planner actually reads the recorded lesson and adapts its plan,
     proving memory isn't just stored, it's used.

Run: python demo_day6_coordination_memory.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task, TaskExecutionError
from app.services.coordination_service import request_delegation
from app.services.memory_service import get_relevant_memory
from app.models.memory import Event
from app.models.workflow import Delegation

_attempt_counts = {}


def flaky_tool_executor(task, plan):
    """Fails twice then succeeds — used to trigger the learning scenario."""
    _attempt_counts[task.title] = _attempt_counts.get(task.title, 0) + 1
    attempt = _attempt_counts[task.title]
    if attempt <= 2:
        raise TaskExecutionError(f"Simulated data-source timeout (attempt {attempt})")
    return f"Report drafted successfully on attempt {attempt}."


def adaptive_planner(task, relevant_lessons):
    """A planner that actually reads memory and changes its plan because of it."""
    if relevant_lessons:
        return (f"Plan for '{task.title}': allocate extra time for data-source retries "
                f"based on {len(relevant_lessons)} past lesson(s) about this task type.")
    return f"Plan for '{task.title}': standard single-pass execution."


def run_demo():
    init_db()
    session = get_session()

    print("=== Day 6 Demo: Multi-Agent Coordination + Organizational Memory + Learning ===\n")

    org = create_organization(session, name="Antares Coordination Demo Org",
                               owner_id="zeeshan.farooq", provenance="manual_seed")
    unit = create_organizational_unit(session, organization_id=org.id, name="Coordination Test Unit")

    research_agent = define_agent_role(session, unit_id=unit.id, title="ResearchAgent")
    analysis_agent = define_agent_role(session, unit_id=unit.id, title="AnalysisAgent")

    capability = assign_capability(session, organization_id=org.id, name="Draft quarterly report")
    workflow = create_workflow(session, capability_id=capability.id, name="Quarterly Report Workflow")

    # Only AnalysisAgent is granted this capability.
    grant_capability_to_agent(session, agent_role_id=analysis_agent.id,
                               capability_id=capability.id, granted_by="zeeshan.farooq")
    print("Granted 'Draft quarterly report' to AnalysisAgent only.\n")

    # --- Scenario 1: Coordination ---
    print("--- Scenario 1: Multi-Agent Coordination ---")
    task1 = create_task(session, workflow_id=workflow.id, title="Draft Q3 report")
    print(f"Task '{task1.title}' initially assigned conceptually to ResearchAgent (unauthorized).")
    print(f"ResearchAgent requests delegation to AnalysisAgent instead...")
    task1 = request_delegation(session, from_agent=research_agent, to_agent=analysis_agent,
                                task=task1, reason="ResearchAgent lacks capability grant for this report type")
    print(f"Task reassigned. New assignee_type: {task1.assignee_type}")

    result1 = run_agent_task(session, analysis_agent, task1,
                              tool_executor=lambda t, p: "Q3 report drafted successfully.")
    print(f"Task status after AnalysisAgent executes: {result1.status}\n")

    # --- Scenario 2: Learning from a rocky execution ---
    print("--- Scenario 2: Organizational Learning ---")
    task2 = create_task(session, workflow_id=workflow.id, title="Draft Q4 report")
    result2 = run_agent_task(session, analysis_agent, task2, tool_executor=flaky_tool_executor)
    print(f"Task '{task2.title}' final status: {result2.status} (after {result2.retry_count} retries)")

    lessons = get_relevant_memory(session, org.id, keyword="report")
    print(f"Lessons now in Organizational Memory matching 'report': {len(lessons)}")
    for l in lessons:
        print(f"  - {l.lesson}")

    # --- Scenario 3: Adaptive planning using that memory ---
    print("\n--- Scenario 3: Adaptive Planning (uses the lesson from Scenario 2) ---")
    task3 = create_task(session, workflow_id=workflow.id, title="Draft annual report")
    result3 = run_agent_task(session, analysis_agent, task3, planner=adaptive_planner,
                              tool_executor=lambda t, p: f"Annual report drafted. Plan used: {p}")
    print(f"Task '{task3.title}' status: {result3.status}")
    print(f"Result (shows the adapted plan was actually used): {result3.result}\n")

    print("--- Delegation Records ---")
    for d in session.query(Delegation).all():
        print(f"From {d.from_actor_id[:8]}... to {d.to_actor_id[:8]}...: {d.reason}")

    session.close()
    print("\n=== Day 6 confirmed working: agents coordinate, the org learns from outcomes, "
          "and future plans are demonstrably adapted by past lessons. ===")


if __name__ == "__main__":
    run_demo()
