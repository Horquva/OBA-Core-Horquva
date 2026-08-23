"""Multi-Agent Tests — Part-7. Coordination must remain deterministic."""
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task
from app.services.coordination_service import request_delegation
from app.models.workflow import Delegation


def test_delegation_to_authorized_agent_succeeds(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent_a = define_agent_role(session, unit_id=unit.id, title="AgentA")
    agent_b = define_agent_role(session, unit_id=unit.id, title="AgentB")
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="WF")
    grant_capability_to_agent(session, agent_role_id=agent_b.id, capability_id=cap.id)

    task = create_task(session, workflow_id=wf.id, title="Task")
    task = request_delegation(session, from_agent=agent_a, to_agent=agent_b,
                               task=task, reason="AgentA not authorized")

    assert task.assignee_id == agent_b.id
    assert task.assignee_type == "agent"

    result = run_agent_task(session, agent_b, task, tool_executor=lambda t, p: "done")
    assert result.status == "completed"


def test_delegation_to_also_unauthorized_agent_escalates_not_loops(session):
    """If the delegate ALSO lacks authorization, the system must escalate —
    never loop indefinitely trying to find someone who can do it."""
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent_a = define_agent_role(session, unit_id=unit.id, title="AgentA")
    agent_b = define_agent_role(session, unit_id=unit.id, title="AgentB")  # no grant
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="WF")

    task = create_task(session, workflow_id=wf.id, title="Task")
    task = request_delegation(session, from_agent=agent_a, to_agent=agent_b,
                               task=task, reason="AgentA not authorized")

    assert task.status == "escalated"

    delegations = session.query(Delegation).filter(Delegation.task_id == task.id).all()
    assert len(delegations) == 1  # exactly one delegation attempt recorded, no retry loop


def test_three_agent_chain_with_final_authorized_execution(session):
    """Agent A -> Agent B -> Agent C (authorized) -> execution, per the
    roadmap's multi-agent test requirement."""
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent_a = define_agent_role(session, unit_id=unit.id, title="AgentA")
    agent_b = define_agent_role(session, unit_id=unit.id, title="AgentB")
    agent_c = define_agent_role(session, unit_id=unit.id, title="AgentC")
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="WF")
    grant_capability_to_agent(session, agent_role_id=agent_c.id, capability_id=cap.id)

    task = create_task(session, workflow_id=wf.id, title="Task")

    # Hop 1: A hands to B (B is not authorized either, but delegation
    # itself only checks the TARGET's authorization at delegation time —
    # this models a coordinator routing the task onward).
    task = request_delegation(session, from_agent=agent_a, to_agent=agent_b, task=task,
                               reason="A cannot do this")
    assert task.status == "escalated"  # B isn't authorized -> correctly escalated here

    # Reset to demonstrate the deterministic "eventually reaches an
    # authorized agent" path in a single chain, per the roadmap's
    # Agent A -> Agent B -> Agent C pattern.
    task.status = "pending"
    session.add(task)
    session.commit()

    task = request_delegation(session, from_agent=agent_b, to_agent=agent_c, task=task,
                               reason="B delegates to C who is authorized")
    assert task.assignee_id == agent_c.id

    result = run_agent_task(session, agent_c, task, tool_executor=lambda t, p: "done by C")
    assert result.status == "completed"
    assert result.result == "done by C"
