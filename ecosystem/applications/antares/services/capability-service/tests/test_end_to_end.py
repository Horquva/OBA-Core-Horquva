"""
End-to-End Test — Part-7.

Exercises the full required chain in one test:
  Organizational Objective -> Planning -> Agent Assignment -> Task Execution
  -> Decision -> Human Governance -> Outcome -> Memory -> Adaptive Replanning

This is the single test that proves every prior day's work actually
composes into one working system, not just isolated pieces that each
pass their own unit tests.
"""
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.governance_service import create_policy
from app.services.agent_engine import run_agent_task, resume_agent_task, TaskExecutionError
from app.services.decision_service import approve_decision
from app.services.memory_service import get_relevant_memory
from app.services import query_service
from app.models.governance import Decision


def test_full_organizational_objective_lifecycle(session):
    # --- Organizational Objective -> Capability ---
    org = create_organization(session, name="E2E Org", owner_id="zeeshan.farooq")
    unit = create_organizational_unit(session, organization_id=org.id, name="E2E Unit")
    capability = assign_capability(session, organization_id=org.id,
                                    name="Publish quarterly market analysis")
    workflow = create_workflow(session, capability_id=capability.id, name="Analysis Workflow")

    # Governance rule: publishing requires human approval.
    create_policy(session, organization_id=org.id, name="External publication sign-off",
                   rule="Publishing requires human approval", requires_approval=True,
                   applies_to_capability_id=capability.id)

    # --- Agent Assignment ---
    agent = define_agent_role(session, unit_id=unit.id, title="AnalysisAgent")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=capability.id,
                               granted_by="zeeshan.farooq")

    # --- Task Execution attempt #1 — hits a transient failure, recovers via retry ---
    task1 = create_task(session, workflow_id=workflow.id, title="Draft Q3 market analysis")
    attempts = {"count": 0}

    def flaky_tool(t, p):
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise TaskExecutionError("simulated data feed timeout")
        return "Q3 analysis drafted."

    result1 = run_agent_task(session, agent, task1, tool_executor=flaky_tool)

    # --- Decision / Human Governance ---
    # Since this capability requires approval, the task should be BLOCKED,
    # not completed, regardless of the retry outcome above happening
    # inside execute_agent_action (which only runs post-approval).
    assert result1.status == "blocked"
    decision = session.query(Decision).filter(Decision.task_id == task1.id).first()
    assert decision is not None
    assert decision.status == "proposed"

    pending = query_service.get_pending_decisions(session, org.id)
    assert len(pending) == 1

    approved_decision = approve_decision(session, decision, approver_id="kamil.ejaz")
    final_task1 = resume_agent_task(session, approved_decision, agent, tool_executor=flaky_tool)

    # --- Outcome ---
    assert final_task1.status == "completed"
    assert final_task1.retry_count >= 1  # proves the retry actually happened during resume

    # --- Memory ---
    lessons = get_relevant_memory(session, org.id, keyword="Draft")
    assert len(lessons) >= 1, "A retried-but-successful task should produce a lesson"

    # --- Adaptive Replanning: a second, similar task should be informed by that lesson ---
    task2 = create_task(session, workflow_id=workflow.id, title="Draft Q4 market analysis")

    def adaptive_planner(task, relevant_lessons):
        if relevant_lessons:
            return f"Plan for '{task.title}': allow extra retry buffer based on past experience."
        return f"Plan for '{task.title}': standard execution."

    result2 = run_agent_task(session, agent, task2, planner=adaptive_planner,
                              tool_executor=lambda t, p: f"Q4 analysis drafted using: {p}")

    # This capability requires approval too — task2 is also blocked, but we
    # can inspect the plan that was embedded in ITS decision to confirm
    # adaptive planning happened before the governance gate.
    assert result2.status == "blocked"
    decision2 = session.query(Decision).filter(Decision.task_id == task2.id).first()
    assert "extra retry buffer" in decision2.context, \
        "Plan must show it was adapted using the recorded lesson, proving memory informed planning"

    # --- Final organization state sanity check ---
    state = query_service.get_organization_state(session, org)
    assert state["completed_tasks"] == 1
    assert state["blocked_tasks"] == 1
    assert state["active_agents"] == 1
    assert state["organizational_health"]["task_success_rate"] == 1.0
