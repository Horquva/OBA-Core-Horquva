"""
AI Agent Organization Engine — Part-4, extended in Part-6 with governance.

Implements the full chain required by the roadmap:
  Task Received -> Context Loaded -> Plan Generated -> Authority Check
  -> Policy Check -> Approval Requirement (if needed) -> Action Authorized
  -> Tool Execution -> Result Evaluated -> Outcome Recorded

And enforces Agent Boundaries — an agent must never:
  - bypass constitutional rules
  - invent authority
  - exceed its assigned (granted) capabilities
  - execute restricted actions without authorization
  - modify governance without approval

Design choice: the actual AI reasoning (how a plan gets generated, how a
tool call gets made) is intentionally NOT implemented here — that is
Hasnain's AI/ML engineering responsibility. This engine implements the
ORGANIZATIONAL machinery an agent operates inside: permission checks,
governance gates, lifecycle stages, events, and audit. `planner` and
`tool_executor` are pluggable callables so real AI logic can be dropped
in later without changing this engine.
"""
from app.models import Task, Workflow, AgentRole, LifecycleState
from app.services.role_service import agent_has_capability
from app.services.event_service import emit_event
from app.services.execution_engine import (
    start_task, complete_task, fail_task, escalate_task,
    _get_organization_id_for_task, TaskExecutionError,
)
from app.services.memory_service import get_relevant_memory
from app.services.governance_service import policy_check as evaluate_governance_policies
from app.services.decision_service import record_decision
from app.models.audit import AuditLog


class AgentBoundaryViolation(Exception):
    """Raised when an agent attempts something outside its granted authority."""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _get_capability_id_for_task(session, task: Task) -> str:
    workflow = session.get(Workflow, task.workflow_id)
    return workflow.capability_id


def authority_check(session, agent_role: AgentRole, task: Task) -> None:
    """
    Capability/authority boundary enforcement (Part-4). Raises
    AgentBoundaryViolation if the agent is not explicitly granted the
    capability this task belongs to. No exceptions, no implicit trust.
    """
    capability_id = _get_capability_id_for_task(session, task)
    if not agent_has_capability(session, agent_role.id, capability_id):
        raise AgentBoundaryViolation(
            f"Agent role '{agent_role.title}' has no grant for capability {capability_id}; "
            f"task '{task.title}' rejected."
        )


def _planner_accepts_memory(planner) -> bool:
    """Checks if a planner function accepts (task, relevant_lessons) vs just (task)."""
    import inspect
    try:
        sig = inspect.signature(planner)
        return len(sig.parameters) >= 2
    except (TypeError, ValueError):
        return False


def run_agent_task(session, agent_role: AgentRole, task: Task,
                    planner=None, tool_executor=None) -> Task:
    """
    Runs a task through Task Received -> Context Loaded -> Plan Generated
    -> Authority Check -> Policy Check -> (Approval Requirement, if any
    applicable policy requires it) -> execution.

    If authority check fails: task is rejected and escalated, never executed.
    If a policy requires approval: task is set to 'blocked' and a Decision
    is created; the caller must approve it via decision_service.approve_decision()
    and then call resume_agent_task() to actually run the work. This
    function does NOT execute anything while awaiting approval — that is
    the entire point of an approval gate.
    If no policy requires approval: execution proceeds immediately (same
    behavior as before Part-6, so Day 5/6 demos with no policies configured
    are unaffected).
    """
    org_id = _get_organization_id_for_task(session, task)
    capability_id = _get_capability_id_for_task(session, task)

    # Stage 1: Task Received
    emit_event(session, org_id, "agent_task_received", "Task", task.id,
               f"Agent '{agent_role.title}' received task '{task.title}'")

    # Stage 2: Context Loaded
    relevant_lessons = get_relevant_memory(session, org_id, keyword=task.title)
    context = {"task": task.title, "agent": agent_role.title,
               "relevant_lessons": [m.lesson for m in relevant_lessons]}
    emit_event(session, org_id, "agent_context_loaded", "Task", task.id, str(context))

    # Stage 3: Plan Generated
    if planner:
        plan = planner(task, relevant_lessons) if _planner_accepts_memory(planner) else planner(task)
    else:
        plan = f"Direct execution of '{task.title}'"
    if relevant_lessons:
        plan += f" [informed by {len(relevant_lessons)} past lesson(s)]"
    emit_event(session, org_id, "agent_plan_generated", "Task", task.id, plan)

    # Stage 4: Authority Check (Part-4 capability boundary)
    try:
        authority_check(session, agent_role, task)
    except AgentBoundaryViolation as e:
        emit_event(session, org_id, "agent_authority_check_failed", "Task", task.id, e.reason)
        session.add(AuditLog(entity_type="Task", entity_id=task.id, action="agent_boundary_violation",
                              actor_id=agent_role.id, actor_type="agent", detail=e.reason))
        session.commit()
        escalate_task(session, task, reason=f"Agent boundary violation: {e.reason}")
        return task

    emit_event(session, org_id, "agent_authority_check_passed", "Task", task.id,
               f"Agent '{agent_role.title}' authorized for this capability")

    # Record the assignee now that authority is confirmed — was previously
    # only set by coordination_service delegation, leaving directly-run
    # agent tasks with no assignee on record (a real data gap, not cosmetic:
    # the query/dashboard interfaces depend on this field being accurate).
    task.assignee_id = agent_role.id
    task.assignee_type = "agent"
    session.add(task)
    session.commit()

    # Stage 5: Policy Check (Part-6 governance layer)
    requires_approval, applicable_policies = evaluate_governance_policies(session, org_id, capability_id)
    policy_names = [p.name for p in applicable_policies]
    emit_event(session, org_id, "agent_policy_check_completed", "Task", task.id,
               f"{len(applicable_policies)} applicable polic{'y' if len(applicable_policies)==1 else 'ies'} "
               f"({', '.join(policy_names) if policy_names else 'none'}); "
               f"requires_approval={requires_approval}")

    if requires_approval:
        # Stage 5b: Approval Requirement — pause here. Task becomes 'blocked'
        # and a Decision is created. Execution does NOT proceed until a
        # human calls decision_service.approve_decision() + resume_agent_task().
        task.status = "blocked"
        session.add(task)
        session.commit()

        decision = record_decision(
            session,
            context=f"Approval required to execute '{task.title}' via agent '{agent_role.title}' "
                     f"(policies: {', '.join(policy_names)}). Plan: {plan}",
            responsible_actor_id=agent_role.id, responsible_actor_type="agent",
            approval_required=True, task_id=task.id,
            policy_id=applicable_policies[0].id if applicable_policies else None,
        )
        emit_event(session, org_id, "approval_required", "Task", task.id,
                   f"Task blocked pending approval of decision {decision.id}")
        return task

    # No approval needed — proceed straight to execution.
    return execute_agent_action(session, agent_role, task, plan, tool_executor)


def execute_agent_action(session, agent_role: AgentRole, task: Task, plan: str,
                          tool_executor=None) -> Task:
    """
    Stages 6-8: Action Authorized -> Tool Execution -> Result Evaluated ->
    Outcome Recorded. Split out from run_agent_task so an approved (and
    previously blocked) task can resume execution here without re-running
    the earlier planning/authority/policy stages.
    """
    org_id = _get_organization_id_for_task(session, task)

    # Stage 6: Action Authorized
    session.add(AuditLog(entity_type="Task", entity_id=task.id, action="agent_action_authorized",
                          actor_id=agent_role.id, actor_type="agent", detail=plan))
    session.commit()

    start_task(session, task)

    def default_tool(task, plan):
        return f"Executed plan: {plan}"

    executor_fn = tool_executor or default_tool

    # Retry loop: fail_task() resets status to 'pending' when retries
    # remain, so we must keep attempting until the task reaches a
    # terminal state (completed / failed+escalated).
    while True:
        try:
            result = executor_fn(task, plan)
        except TaskExecutionError as e:
            emit_event(session, org_id, "agent_tool_execution_failed", "Task", task.id, e.reason)
            task = fail_task(session, task, e.reason)
            if task.status == "pending":
                start_task(session, task)
                continue
            _learn_from_task_outcome(session, task)
            return task

        # Stage 7: Result Evaluated
        emit_event(session, org_id, "agent_result_evaluated", "Task", task.id, result)

        # Stage 8: Outcome Recorded
        final_task = complete_task(session, task, result)
        _learn_from_task_outcome(session, final_task)
        return final_task


def resume_agent_task(session, decision, agent_role: AgentRole, tool_executor=None) -> Task:
    """
    Resumes a task that was blocked awaiting approval. Only proceeds if
    the linked decision was actually approved — never executes on a
    rejected or still-pending decision. This is the other half of the
    Approval Requirement gate: approval alone doesn't run anything, this
    function is the explicit resume step.
    """
    if decision.status != "approved":
        raise ValueError(f"Cannot resume task: decision {decision.id} status is "
                          f"'{decision.status}', not 'approved'.")

    task = session.get(Task, decision.task_id)
    org_id = _get_organization_id_for_task(session, task)
    emit_event(session, org_id, "task_resumed_after_approval", "Task", task.id,
               f"Decision {decision.id} approved by {decision.approver_id}; resuming execution")

    # Extract the plan text back out of the decision context (it was
    # embedded there when the approval gate was created).
    plan = decision.context.split("Plan: ", 1)[-1] if "Plan: " in decision.context else decision.context
    return execute_agent_action(session, agent_role, task, plan, tool_executor)


def _learn_from_task_outcome(session, task: Task) -> None:
    """After a task reaches a terminal state, evaluate its outcome and
    record a lesson if one is warranted (Part-5 learning loop)."""
    from app.models.memory import Outcome
    from app.services.learning_service import evaluate_outcome
    outcome = session.query(Outcome).filter(Outcome.task_id == task.id).order_by(
        Outcome.created_at.desc()).first()
    if outcome:
        evaluate_outcome(session, outcome)
