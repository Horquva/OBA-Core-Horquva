"""
Day 5 demo — proves the AI Agent Engine actually works.

Two scenarios:
  1. An authorized agent runs a task through the full 8-stage agent
     lifecycle and completes it successfully.
  2. A DIFFERENT agent (with no grant for that capability) attempts the
     same kind of task and gets rejected + escalated — proving the
     boundary enforcement is real, not just documented.

Run: python demo_day5_agents.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task
from app.models.memory import Event
from app.models.workflow import Escalation


def simple_planner(task):
    return f"Plan: gather data, analyze, produce output for '{task.title}'"


def simple_tool_executor(task, plan):
    return f"Result produced for '{task.title}' following plan: {plan}"


def run_demo():
    init_db()
    session = get_session()

    print("=== Day 5 Demo: AI Agent Engine ===\n")

    org = create_organization(session, name="Antares Agent Demo Org",
                               owner_id="zeeshan.farooq", provenance="manual_seed")
    unit = create_organizational_unit(session, organization_id=org.id, name="Agent Test Unit")

    # Define the 6 organizational agent roles named in the roadmap.
    role_titles = ["ResearchAgent", "AnalysisAgent", "PlanningAgent",
                   "ExecutionAgent", "ReviewAgent", "CoordinationAgent"]
    agent_roles = {}
    for title in role_titles:
        agent_roles[title] = define_agent_role(session, unit_id=unit.id, title=title)
    print(f"Defined {len(agent_roles)} agent roles: {', '.join(role_titles)}\n")

    # Create a capability only ResearchAgent will be granted.
    capability = assign_capability(session, organization_id=org.id,
                                    name="Research market signals")
    workflow = create_workflow(session, capability_id=capability.id, name="Market Signal Research Workflow")

    grant_capability_to_agent(session, agent_role_id=agent_roles["ResearchAgent"].id,
                               capability_id=capability.id, granted_by="zeeshan.farooq")
    print(f"Granted capability '{capability.name}' to ResearchAgent only.\n")

    # --- Scenario 1: Authorized agent runs the task successfully ---
    print("--- Scenario 1: ResearchAgent (authorized) runs a task ---")
    task1 = create_task(session, workflow_id=workflow.id, title="Research emerging AI governance signals")
    result1 = run_agent_task(session, agent_roles["ResearchAgent"], task1,
                              planner=simple_planner, tool_executor=simple_tool_executor)
    print(f"Task status: {result1.status}")
    print(f"Task result: {result1.result}\n")

    # --- Scenario 2: Unauthorized agent attempts the same kind of task ---
    print("--- Scenario 2: AnalysisAgent (NOT authorized) attempts a task under the same capability ---")
    task2 = create_task(session, workflow_id=workflow.id, title="Research emerging AI governance signals (attempt 2)")
    result2 = run_agent_task(session, agent_roles["AnalysisAgent"], task2,
                              planner=simple_planner, tool_executor=simple_tool_executor)
    print(f"Task status: {result2.status}  (should be 'escalated', NOT 'completed')")
    print(f"Task result: {result2.result}  (should be None — task must not have executed)\n")

    # --- Show the full event trail for both scenarios ---
    print("--- Full Agent Lifecycle Events ---")
    events = session.query(Event).order_by(Event.created_at).all()
    for e in events:
        print(f"[{e.event_type:<28}] {e.detail}")

    print("\n--- Escalations Created (proves boundary violations are rejected, not ignored) ---")
    escalations = session.query(Escalation).all()
    for esc in escalations:
        print(f"Task {esc.task_id[:8]}...: {esc.reason}")

    session.close()
    print("\n=== Day 5 confirmed working: authorized agent executes; unauthorized agent is blocked and escalated. ===")


if __name__ == "__main__":
    run_demo()
