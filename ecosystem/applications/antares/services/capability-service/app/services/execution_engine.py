"""
Organizational Execution Engine — Part-3.

This turns the static foundation (Part-2) into something that actually
DOES work: task state transitions, dependency-aware execution, retries,
failure handling, escalation, and a full Capability -> Task -> Execution
-> Outcome pipeline.

Design choice: task "work" is represented by an executor function the
caller supplies (see execute_task's `executor` param). This keeps the
engine itself agnostic to WHAT the work is — a human, a script, or (from
Part-4 onward) an AI agent can all plug into the same execution pipeline.
The engine's job is orchestration, retries, and governance-relevant state
tracking, not doing the work itself.
"""
from datetime import datetime, timezone

from app.models import Task, Workflow, LifecycleState
from app.models.memory import Outcome
from app.models.workflow import Escalation
from app.services.event_service import emit_event
from app.models.audit import AuditLog


class TaskExecutionError(Exception):
    """Raised internally when a task fails; carries the failure reason."""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _get_organization_id_for_task(session, task: Task) -> str:
    """Tasks don't store org_id directly; resolve it via workflow -> capability -> organization."""
    workflow = session.get(Workflow, task.workflow_id)
    capability = workflow.capability_id  # capability id
    from app.models.capability import OrganizationalCapability
    cap = session.get(OrganizationalCapability, capability)
    return cap.organization_id


def resolve_execution_order(session, workflow_id: str) -> list[Task]:
    """
    Returns tasks in dependency order (tasks with no dependency first).
    Simple topological pass — sufficient for the linear/small-DAG workflows
    this platform deals with; not built for arbitrarily complex graphs.
    """
    tasks = session.query(Task).filter(Task.workflow_id == workflow_id).all()
    by_id = {t.id: t for t in tasks}
    ordered = []
    visited = set()

    def visit(t):
        if t.id in visited:
            return
        if t.depends_on_task_id and t.depends_on_task_id in by_id:
            visit(by_id[t.depends_on_task_id])
        visited.add(t.id)
        ordered.append(t)

    for t in tasks:
        visit(t)
    return ordered


def start_task(session, task: Task) -> Task:
    org_id = _get_organization_id_for_task(session, task)
    task.status = "in_progress"
    task.lifecycle_state = LifecycleState.ACTIVE
    session.add(task)
    emit_event(session, org_id, "task_started", "Task", task.id, f"Task '{task.title}' started")
    session.add(AuditLog(entity_type="Task", entity_id=task.id, action="status_changed",
                          detail="pending -> in_progress"))
    session.commit()
    return task


def complete_task(session, task: Task, result: str) -> Task:
    org_id = _get_organization_id_for_task(session, task)
    task.status = "completed"
    task.lifecycle_state = LifecycleState.COMPLETED
    task.result = result
    session.add(task)

    outcome = Outcome(task_id=task.id, success=True, summary=result,
                       lifecycle_state=LifecycleState.COMPLETED)
    session.add(outcome)
    session.flush()

    emit_event(session, org_id, "task_completed", "Task", task.id, result)
    session.add(AuditLog(entity_type="Task", entity_id=task.id, action="status_changed",
                          detail="in_progress -> completed"))
    session.commit()
    return task


def escalate_task(session, task: Task, reason: str, escalated_to_id: str = None) -> Escalation:
    org_id = _get_organization_id_for_task(session, task)
    task.status = "escalated"
    task.lifecycle_state = LifecycleState.PAUSED
    session.add(task)

    escalation = Escalation(task_id=task.id, reason=reason, escalated_to_id=escalated_to_id,
                             resolved=False, lifecycle_state=LifecycleState.ACTIVE)
    session.add(escalation)
    session.flush()

    emit_event(session, org_id, "escalation_triggered", "Task", task.id, reason)
    session.add(AuditLog(entity_type="Task", entity_id=task.id, action="escalated", detail=reason))
    session.commit()
    return escalation


def fail_task(session, task: Task, reason: str) -> Task:
    """
    Handles a task failure with retry logic:
    - If retries remain (retry_count < max_retries): increment retry_count,
      reset to 'pending' so it can be attempted again.
    - If retries are exhausted: mark 'failed' and automatically escalate,
      per the roadmap's adaptive-execution requirement ("adapt when a task
      fails").
    """
    org_id = _get_organization_id_for_task(session, task)
    task.last_failure_reason = reason

    if task.retry_count < task.max_retries:
        task.retry_count += 1
        task.status = "pending"
        task.lifecycle_state = LifecycleState.DRAFT
        session.add(task)
        emit_event(session, org_id, "task_retry_scheduled", "Task", task.id,
                   f"Attempt {task.retry_count}/{task.max_retries} after failure: {reason}")
        session.add(AuditLog(entity_type="Task", entity_id=task.id, action="retry_scheduled",
                              detail=f"retry {task.retry_count}/{task.max_retries}: {reason}"))
        session.commit()
        return task
    else:
        task.status = "failed"
        task.lifecycle_state = LifecycleState.FAILED
        session.add(task)

        outcome = Outcome(task_id=task.id, success=False, summary=reason,
                           lifecycle_state=LifecycleState.FAILED)
        session.add(outcome)
        session.flush()

        emit_event(session, org_id, "task_failed", "Task", task.id,
                   f"Failed after {task.max_retries} retries: {reason}")
        session.add(AuditLog(entity_type="Task", entity_id=task.id, action="status_changed",
                              detail=f"-> failed (retries exhausted): {reason}"))
        session.commit()

        # Adaptive execution: exhausted retries auto-escalate to a human.
        escalate_task(session, task, reason=f"Auto-escalated: task failed after max retries ({reason})")
        return task


def execute_task(session, task: Task, executor) -> Task:
    """
    Runs a single task through the full lifecycle using the supplied
    executor callable. `executor` takes a Task and returns a result string
    on success, or raises TaskExecutionError(reason) on failure.
    """
    start_task(session, task)
    try:
        result = executor(task)
        return complete_task(session, task, result)
    except TaskExecutionError as e:
        return fail_task(session, task, e.reason)


def execute_workflow(session, workflow_id: str, executor) -> dict:
    """
    Executes every task in a workflow in dependency order. Stops advancing
    past a task that ends up blocked/escalated/failed (its dependents won't
    run), but does not raise — returns a summary so the caller (and any
    governance layer above it) can decide what to do next.
    """
    tasks = resolve_execution_order(session, workflow_id)
    results = {"completed": [], "failed": [], "escalated": [], "skipped": []}
    blocked_ids = set()

    for task in tasks:
        if task.depends_on_task_id in blocked_ids:
            task.status = "blocked"
            session.add(task)
            session.commit()
            results["skipped"].append(task.id)
            blocked_ids.add(task.id)
            continue

        # Refresh in case it was already handled (e.g. retried)
        session.refresh(task)

        # Keep attempting this task until it reaches a terminal state
        # (completed / failed / escalated) — fail_task() resets status to
        # 'pending' when retries remain, so we must loop here rather than
        # attempt once and move on, otherwise retries never actually run.
        while task.status in ("pending",):
            execute_task(session, task, executor)
            session.refresh(task)

        if task.status == "completed":
            results["completed"].append(task.id)
        elif task.status == "failed":
            results["failed"].append(task.id)
            blocked_ids.add(task.id)
        elif task.status == "escalated":
            results["escalated"].append(task.id)
            blocked_ids.add(task.id)

    return results


def execute_capability(session, capability_id: str, executor) -> dict:
    """
    Full Part-3 pipeline: Capability -> Responsibility -> Role -> Task ->
    Execution -> Outcome. Executes every workflow under a capability and
    returns an aggregate summary.
    """
    workflows = session.query(Workflow).filter(Workflow.capability_id == capability_id).all()
    summary = {"workflows_run": 0, "completed": [], "failed": [], "escalated": [], "skipped": []}

    for wf in workflows:
        result = execute_workflow(session, wf.id, executor)
        summary["workflows_run"] += 1
        for key in ("completed", "failed", "escalated", "skipped"):
            summary[key].extend(result[key])

    return summary
