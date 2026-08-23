"""
Agent Coordination — Part-5.

Lets one agent hand work to another when it can't (or shouldn't) do it
itself. This is real delegation, not a fire-and-forget reassignment: the
target agent's authorization is checked exactly the same way a normal
task assignment would be, and if the target isn't authorized either, it
escalates to a human rather than looping forever or silently failing.
"""
from app.models import Task, AgentRole, LifecycleState
from app.models.workflow import Delegation
from app.services.role_service import agent_has_capability
from app.services.event_service import emit_event
from app.services.execution_engine import _get_organization_id_for_task, escalate_task
from app.services.agent_engine import _get_capability_id_for_task
from app.models.audit import AuditLog


def request_delegation(session, from_agent: AgentRole, to_agent: AgentRole,
                        task: Task, reason: str) -> Task:
    """
    from_agent hands task to to_agent. Checks to_agent's capability grant
    before reassigning — delegation does not bypass the boundary rules
    from Part-4, it just moves the task to a different bounded actor.
    """
    org_id = _get_organization_id_for_task(session, task)
    capability_id = _get_capability_id_for_task(session, task)

    delegation = Delegation(
        task_id=task.id, from_actor_id=from_agent.id, to_actor_id=to_agent.id,
        reason=reason, lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(delegation)
    session.flush()

    emit_event(session, org_id, "delegation_requested", "Task", task.id,
               f"'{from_agent.title}' requests delegation to '{to_agent.title}': {reason}")

    if not agent_has_capability(session, to_agent.id, capability_id):
        emit_event(session, org_id, "delegation_rejected", "Task", task.id,
                   f"'{to_agent.title}' also lacks capability grant; escalating instead")
        session.add(AuditLog(entity_type="Delegation", entity_id=delegation.id, action="rejected",
                              detail=f"Target agent '{to_agent.title}' not authorized either"))
        session.commit()
        escalate_task(session, task, reason=f"Delegation from '{from_agent.title}' to "
                                             f"'{to_agent.title}' failed: neither agent authorized")
        return task

    task.assignee_id = to_agent.id
    task.assignee_type = "agent"
    session.add(task)
    session.add(AuditLog(entity_type="Delegation", entity_id=delegation.id, action="accepted",
                          detail=f"Task reassigned from '{from_agent.title}' to '{to_agent.title}'"))
    emit_event(session, org_id, "delegation_accepted", "Task", task.id,
               f"Task reassigned to '{to_agent.title}'")
    session.commit()
    return task
