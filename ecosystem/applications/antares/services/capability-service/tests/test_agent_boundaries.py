"""Agent Tests — Part-7. Capability boundaries, execution, escalation."""
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task, TaskExecutionError
from app.models.workflow import Escalation


def _setup(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="Agent")
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="WF")
    return org, unit, agent, cap, wf


def test_unauthorized_agent_is_rejected_and_escalated_not_executed(session):
    org, unit, agent, cap, wf = _setup(session)
    task = create_task(session, workflow_id=wf.id, title="Do work")
    executed = {"called": False}

    def tool(t, p):
        executed["called"] = True
        return "should not happen"

    result = run_agent_task(session, agent, task, tool_executor=tool)

    assert result.status == "escalated"
    assert executed["called"] is False, "Unauthorized agent must NEVER execute the tool"
    assert result.result is None

    escalations = session.query(Escalation).filter(Escalation.task_id == task.id).all()
    assert len(escalations) == 1
    assert "boundary violation" in escalations[0].reason.lower()


def test_authorized_agent_executes_successfully(session):
    org, unit, agent, cap, wf = _setup(session)
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap.id)
    task = create_task(session, workflow_id=wf.id, title="Do work")

    result = run_agent_task(session, agent, task, tool_executor=lambda t, p: "done")

    assert result.status == "completed"
    assert result.result == "done"


def test_agent_cannot_execute_capability_it_was_never_granted_even_if_similar_one_was(session):
    """Granting capability A must not implicitly grant capability B."""
    org, unit, agent, cap_a, wf_a = _setup(session)
    cap_b = assign_capability(session, organization_id=org.id, name="Different capability")
    wf_b = create_workflow(session, capability_id=cap_b.id, name="WF B")

    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap_a.id)

    task_b = create_task(session, workflow_id=wf_b.id, title="Task under ungranted capability")
    result = run_agent_task(session, agent, task_b, tool_executor=lambda t, p: "should not run")

    assert result.status == "escalated"
    assert result.result is None


def test_task_execution_error_triggers_retry_then_escalation(session):
    org, unit, agent, cap, wf = _setup(session)
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap.id)
    task = create_task(session, workflow_id=wf.id, title="Flaky task")

    def always_fails(t, p):
        raise TaskExecutionError("simulated failure")

    result = run_agent_task(session, agent, task, tool_executor=always_fails)

    assert result.status == "escalated"  # after retries exhausted, auto-escalates
    assert result.retry_count == result.max_retries
    escalations = session.query(Escalation).filter(Escalation.task_id == task.id).all()
    assert len(escalations) == 1
