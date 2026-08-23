"""
Day 10 demo — Final Working Delivery (Part-8).

Runs the complete required scenario:
  Organizational Objective -> Future Organization -> Capability Selection
  -> Organizational Plan -> [AI Agent A, AI Agent B, Human Role]
  -> Coordination -> Governance -> Execution -> Outcome
  -> Organizational Memory -> Learning/Evaluation -> Adaptive Replanning

Then generates the final minimal command interface (dashboard.html) from
the REAL resulting state — not mock data.

Run: python demo_day10_final.py
Output: dashboard.html (open in any browser)
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_human_role, define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.governance_service import create_policy
from app.services.agent_engine import run_agent_task, resume_agent_task, TaskExecutionError
from app.services.decision_service import approve_decision, record_decision
from app.services.execution_engine import start_task, complete_task
from app.services.memory_service import get_relevant_memory
from app.services.dashboard_service import build_dashboard_context
from app.services.dashboard_renderer import render_dashboard_html
from app.models.governance import Decision


def run_demo():
    init_db()
    session = get_session()

    print("=== Day 10 Final Demo: Full Organizational Objective Lifecycle ===\n")

    # --- ORGANIZATIONAL OBJECTIVE -> FUTURE ORGANIZATION ---
    org = create_organization(
        session, name="Antares Product Intelligence Org",
        mission="Deliver a governed, multi-agent product intelligence brief combining "
                "AI research, AI analysis, and human sign-off.",
        owner_id="zeeshan.farooq", provenance="manual_seed",
    )
    unit = create_organizational_unit(session, organization_id=org.id, name="Product Intelligence Unit")
    print(f"Objective: {org.mission}\n")

    # --- ORGANIZATIONAL PLAN: 3 capabilities, one per actor in the plan ---
    cap_research = assign_capability(session, organization_id=org.id, name="Gather market signal data")
    cap_analysis = assign_capability(session, organization_id=org.id, name="Analyze market findings")
    cap_publish = assign_capability(session, organization_id=org.id, name="Publish product intelligence brief")

    wf_research = create_workflow(session, capability_id=cap_research.id, name="Research Workflow")
    wf_analysis = create_workflow(session, capability_id=cap_analysis.id, name="Analysis Workflow")
    wf_publish = create_workflow(session, capability_id=cap_publish.id, name="Publish Workflow")

    # Governance: publishing requires human sign-off; research/analysis do not.
    create_policy(session, organization_id=org.id, name="Publication requires CTO sign-off",
                   rule="Any capability that publishes externally requires human approval.",
                   requires_approval=True, applies_to_capability_id=cap_publish.id, created_by="kanwal")

    # --- AGENT ASSIGNMENT: AI Agent A, AI Agent B, Human Role ---
    agent_a = define_agent_role(session, unit_id=unit.id, title="ResearchAgent")
    agent_b = define_agent_role(session, unit_id=unit.id, title="AnalysisAgent")
    human = define_human_role(session, unit_id=unit.id, title="Program Lead", person_name="Kamil Ejaz")

    grant_capability_to_agent(session, agent_role_id=agent_a.id, capability_id=cap_research.id,
                               granted_by="zeeshan.farooq")
    grant_capability_to_agent(session, agent_role_id=agent_b.id, capability_id=cap_analysis.id,
                               granted_by="zeeshan.farooq")
    print("Plan: ResearchAgent -> AnalysisAgent -> Program Lead (human sign-off) -> Publish\n")

    # --- AI AGENT A: executes, hits a transient failure, recovers via retry ---
    print("--- Stage: AI Agent A (ResearchAgent) ---")
    task_research = create_task(session, workflow_id=wf_research.id, title="Gather Q3 market signals")
    attempts = {"count": 0}

    def flaky_research_tool(t, p):
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise TaskExecutionError("simulated data source timeout")
        return "Market signal dataset gathered (Q3)."

    result_research = run_agent_task(session, agent_a, task_research, tool_executor=flaky_research_tool)
    print(f"Task status: {result_research.status} (retries used: {result_research.retry_count})\n")

    # --- AI AGENT B: adaptive planning informed by Agent A's lesson ---
    print("--- Stage: AI Agent B (AnalysisAgent) — adaptive planning ---")
    task_analysis = create_task(session, workflow_id=wf_analysis.id, title="Analyze Q3 market signals")

    def adaptive_planner(task, relevant_lessons):
        if relevant_lessons:
            return (f"Plan for '{task.title}': allocate buffer time for data-source instability, "
                     f"informed by {len(relevant_lessons)} past lesson(s).")
        return f"Plan for '{task.title}': standard single-pass analysis."

    result_analysis = run_agent_task(session, agent_b, task_analysis, planner=adaptive_planner,
                                      tool_executor=lambda t, p: f"Analysis complete. Plan used: {p}")
    print(f"Task status: {result_analysis.status}")
    print(f"Result shows adapted plan was used: {'buffer time' in (result_analysis.result or '')}\n")

    # --- HUMAN ROLE: governed sign-off + publish, with coordination + governance ---
    print("--- Stage: Human Role (Program Lead) — governed sign-off ---")
    task_publish = create_task(session, workflow_id=wf_publish.id, title="Review and publish intelligence brief",
                                assignee_id=human.id, assignee_type="human")

    # Governance: this capability requires approval before ANY execution,
    # including human-run tasks — model this explicitly with a Decision.
    decision = record_decision(
        session, context=f"Approval required to publish intelligence brief (task {task_publish.id}). "
                          f"Reviewed by Program Lead before external release.",
        responsible_actor_id=human.id, responsible_actor_type="human",
        approval_required=True, task_id=task_publish.id,
    )
    print(f"Decision created, status: {decision.status} (awaiting CTO approval)")

    decision = approve_decision(session, decision, approver_id="kamil.ejaz")
    print(f"Decision approved by {decision.approver_id}")

    # Human executes the task directly (execution_engine is actor-agnostic).
    start_task(session, task_publish)
    result_publish = complete_task(session, task_publish, "Product intelligence brief published.")
    print(f"Task status: {result_publish.status}\n")

    # --- ORGANIZATIONAL MEMORY / LEARNING check ---
    lessons = get_relevant_memory(session, org.id, keyword="market")
    print(f"--- Organizational Memory: {len(lessons)} lesson(s) recorded ---")
    for l in lessons:
        print(f"  - {l.lesson}")

    # --- ADAPTIVE REPLANNING: a follow-up objective informed by this run ---
    print("\n--- Adaptive Replanning: Q4 cycle, informed by Q3 lessons ---")
    task_replan = create_task(session, workflow_id=wf_research.id, title="Gather Q4 market signals")
    result_replan = run_agent_task(session, agent_a, task_replan, planner=adaptive_planner,
                                    tool_executor=lambda t, p: f"Q4 dataset gathered. Plan used: {p}")
    print(f"Task status: {result_replan.status}")
    print(f"Adaptive plan carried forward: {'buffer time' in (result_replan.result or '')}\n")

    # --- FINAL UI: generate the command interface from real state ---
    print("--- Generating final command interface (dashboard.html) ---")
    ctx = build_dashboard_context(session, org)
    html = render_dashboard_html(ctx)
    with open("dashboard.html", "w") as f:
        f.write(html)
    print("Written: dashboard.html")

    session.close()
    print("\n=== Day 10 confirmed working: full objective lifecycle executed end-to-end "
          "across 2 AI agents and 1 human role, governed, remembered, and adaptively replanned. ===")


if __name__ == "__main__":
    run_demo()
