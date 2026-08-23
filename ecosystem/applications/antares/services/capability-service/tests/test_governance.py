"""
Governance Tests — Part-7.

Deliberately attempts unauthorized actions, privilege escalation, policy
bypass, invalid delegation, and unsafe autonomy. Every test here asserts
the system REJECTS or ESCALATES — never silently allows.
"""
import pytest

from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.governance_service import create_policy
from app.services.agent_engine import run_agent_task, resume_agent_task
from app.services.decision_service import record_decision, approve_decision, reject_decision
from app.models.governance import Decision


def _setup_gated_capability(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="Agent")
    cap = assign_capability(session, organization_id=org.id, name="Sensitive capability")
    wf = create_workflow(session, capability_id=cap.id, name="WF")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap.id)
    create_policy(session, organization_id=org.id, name="Requires approval",
                   rule="Sensitive actions require human sign-off",
                   requires_approval=True, applies_to_capability_id=cap.id)
    return org, agent, cap, wf


def test_policy_gated_task_cannot_execute_without_approval(session):
    """Attempted policy bypass: even though the agent IS authorized
    (capability granted), a policy still blocks execution until approved."""
    org, agent, cap, wf = _setup_gated_capability(session)
    task = create_task(session, workflow_id=wf.id, title="Sensitive action")

    executed = {"called": False}
    result = run_agent_task(session, agent, task,
                             tool_executor=lambda t, p: executed.update(called=True) or "done")

    assert result.status == "blocked"
    assert executed["called"] is False, "Policy-gated task must NOT execute before approval"


def test_resume_refuses_to_run_on_unapproved_decision(session):
    """Privilege escalation attempt: try to resume a task whose decision
    was never approved (still 'proposed'). Must raise, not execute."""
    org, agent, cap, wf = _setup_gated_capability(session)
    task = create_task(session, workflow_id=wf.id, title="Sensitive action")
    run_agent_task(session, agent, task, tool_executor=lambda t, p: "done")

    decision = session.query(Decision).filter(Decision.task_id == task.id).first()
    assert decision.status == "proposed"  # never approved

    with pytest.raises(ValueError):
        resume_agent_task(session, decision, agent, tool_executor=lambda t, p: "should not run")


def test_resume_refuses_to_run_on_rejected_decision(session):
    """Invalid delegation / unsafe autonomy attempt: a human explicitly
    REJECTED the decision — resuming must still refuse to execute."""
    org, agent, cap, wf = _setup_gated_capability(session)
    task = create_task(session, workflow_id=wf.id, title="Sensitive action")
    run_agent_task(session, agent, task, tool_executor=lambda t, p: "done")

    decision = session.query(Decision).filter(Decision.task_id == task.id).first()
    reject_decision(session, decision, approver_id="kamil.ejaz", reason="Not appropriate right now")

    executed = {"called": False}
    with pytest.raises(ValueError):
        resume_agent_task(session, decision, agent,
                           tool_executor=lambda t, p: executed.update(called=True) or "done")
    assert executed["called"] is False


def test_approval_by_one_decision_does_not_authorize_a_different_task(session):
    """Conflicting instructions / cross-task privilege leakage attempt:
    approving decision X must not let you resume a DIFFERENT task's work
    through it."""
    org, agent, cap, wf = _setup_gated_capability(session)
    task1 = create_task(session, workflow_id=wf.id, title="Task 1")
    task2 = create_task(session, workflow_id=wf.id, title="Task 2")

    run_agent_task(session, agent, task1, tool_executor=lambda t, p: "done1")
    run_agent_task(session, agent, task2, tool_executor=lambda t, p: "done2")

    decision1 = session.query(Decision).filter(Decision.task_id == task1.id).first()
    approve_decision(session, decision1, approver_id="kamil.ejaz")

    # Resuming decision1 must only ever affect task1, never task2.
    result = resume_agent_task(session, decision1, agent, tool_executor=lambda t, p: "executed")
    assert result.id == task1.id

    task2_fresh = session.get(type(task1), task2.id)
    assert task2_fresh.status == "blocked"  # task2 must remain untouched


def test_agent_with_capability_grant_for_different_org_capability_cannot_bypass(session):
    """Unauthorized memory/capability access attempt: an agent granted
    capability A must not be able to touch capability B's tasks, even
    within the same organization."""
    org, agent, cap_a, wf_a = _setup_gated_capability(session)
    cap_b = assign_capability(session, organization_id=org.id, name="Different capability")
    wf_b = create_workflow(session, capability_id=cap_b.id, name="WF B")
    task_b = create_task(session, workflow_id=wf_b.id, title="Task under different capability")

    result = run_agent_task(session, agent, task_b, tool_executor=lambda t, p: "should not run")
    assert result.status == "escalated"
    assert result.result is None
