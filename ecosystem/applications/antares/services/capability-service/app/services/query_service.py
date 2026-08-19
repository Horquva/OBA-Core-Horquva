"""
Working Query / Control Interface — Part-6.

Provides controlled, machine-readable access to organization state, so
other Antares platforms (and eventually OBA) can observe what this
runtime is doing without touching internal tables directly. Every
function here is READ-ONLY — this module deliberately does not expose
any way to mutate state; that only happens through the proper service
functions (execution_engine, agent_engine, governance_service, etc.),
which enforce the actual rules.
"""
from app.models import Task, AgentRole, Organization
from app.models.governance import Decision
from app.models.workflow import Escalation
from app.models.memory import Event, Outcome, OrganizationalMemory
from app.models.capability import OrganizationalCapability


def get_agent_status(session, agent_role: AgentRole) -> dict:
    active_tasks = session.query(Task).filter(
        Task.assignee_id == agent_role.id, Task.assignee_type == "agent",
        Task.status.in_(["pending", "in_progress"]),
    ).count()
    completed_tasks = session.query(Task).filter(
        Task.assignee_id == agent_role.id, Task.assignee_type == "agent",
        Task.status == "completed",
    ).count()
    return {
        "agent_id": agent_role.id,
        "title": agent_role.title,
        "lifecycle_state": agent_role.lifecycle_state.value,
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks,
        "constraints": agent_role.constraints,
    }


def get_task_status(session, task_id: str) -> dict:
    task = session.get(Task, task_id)
    if not task:
        return {"error": f"No task with id {task_id}"}
    return {
        "task_id": task.id,
        "title": task.title,
        "status": task.status,
        "assignee_id": task.assignee_id,
        "assignee_type": task.assignee_type,
        "retry_count": task.retry_count,
        "max_retries": task.max_retries,
        "result": task.result,
        "last_failure_reason": task.last_failure_reason,
    }


def get_pending_decisions(session, organization_id: str) -> list[dict]:
    """Decisions awaiting human approval — the primary governance queue."""
    decisions = session.query(Decision).filter(
        Decision.status == "proposed", Decision.approval_required == True,  # noqa: E712
    ).all()
    # Decision has no organization_id directly; filter via its task's org.
    from app.services.execution_engine import _get_organization_id_for_task
    result = []
    for d in decisions:
        if d.task_id:
            task = session.get(Task, d.task_id)
            if task and _get_organization_id_for_task(session, task) == organization_id:
                result.append({"decision_id": d.id, "context": d.context, "task_id": d.task_id,
                                "responsible_actor_id": d.responsible_actor_id})
    return result


def get_unresolved_escalations(session, organization_id: str) -> list[dict]:
    escalations = session.query(Escalation).filter(Escalation.resolved == False).all()  # noqa: E712
    from app.services.execution_engine import _get_organization_id_for_task
    result = []
    for e in escalations:
        if e.task_id:
            task = session.get(Task, e.task_id)
            if task and _get_organization_id_for_task(session, task) == organization_id:
                result.append({"escalation_id": e.id, "task_id": e.task_id, "reason": e.reason})
    return result


def get_organizational_memory(session, organization_id: str) -> list[str]:
    memories = session.query(OrganizationalMemory).filter(
        OrganizationalMemory.organization_id == organization_id
    ).all()
    return [m.lesson for m in memories]


def get_organization_state(session, organization: Organization) -> dict:
    """
    The primary observable-state snapshot required by Part-6:
    active objectives, active agents, current tasks, blocked tasks,
    decisions, escalations, resource usage, outcomes, organizational health.
    """
    capabilities = session.query(OrganizationalCapability).filter(
        OrganizationalCapability.organization_id == organization.id
    ).all()
    active_capabilities = [c for c in capabilities if c.lifecycle_state.value == "active"]

    from app.models.organization import OrganizationUnit
    units = session.query(OrganizationUnit).filter(
        OrganizationUnit.organization_id == organization.id
    ).all()
    unit_ids = [u.id for u in units]
    agents = session.query(AgentRole).filter(AgentRole.unit_id.in_(unit_ids)).all() if unit_ids else []

    all_tasks = []
    from app.models.workflow import Workflow
    workflows = session.query(Workflow).filter(
        Workflow.capability_id.in_([c.id for c in capabilities])
    ).all() if capabilities else []
    for wf in workflows:
        all_tasks.extend(session.query(Task).filter(Task.workflow_id == wf.id).all())

    blocked_tasks = [t for t in all_tasks if t.status == "blocked"]
    completed_tasks = [t for t in all_tasks if t.status == "completed"]
    failed_tasks = [t for t in all_tasks if t.status == "failed"]
    in_progress_tasks = [t for t in all_tasks if t.status == "in_progress"]

    pending_decisions = get_pending_decisions(session, organization.id)
    unresolved_escalations = get_unresolved_escalations(session, organization.id)

    total_terminal = len(completed_tasks) + len(failed_tasks)
    success_rate = (len(completed_tasks) / total_terminal) if total_terminal > 0 else None

    return {
        "organization_id": organization.id,
        "organization_name": organization.name,
        "active_objectives": [c.name for c in active_capabilities],
        "active_agents": len(agents),
        "agent_titles": [a.title for a in agents],
        "current_tasks_in_progress": len(in_progress_tasks),
        "blocked_tasks": len(blocked_tasks),
        "completed_tasks": len(completed_tasks),
        "failed_tasks": len(failed_tasks),
        "pending_decisions": len(pending_decisions),
        "unresolved_escalations": len(unresolved_escalations),
        "resource_usage": {"total_tasks_created": len(all_tasks)},
        "organizational_health": {
            "task_success_rate": success_rate,
            "status": (
                "healthy" if (success_rate is None or success_rate >= 0.7)
                else "degraded" if success_rate >= 0.4
                else "at_risk"
            ),
        },
    }
