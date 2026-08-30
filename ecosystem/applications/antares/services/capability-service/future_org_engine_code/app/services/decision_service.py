from app.models import Decision, LifecycleState
from app.models.memory import Outcome
from app.models.audit import AuditLog
from app.services.event_service import emit_event


def record_decision(session, context: str, responsible_actor_id: str = None,
                     responsible_actor_type: str = None, evidence: str = None,
                     policy_id: str = None, approval_required: bool = False,
                     task_id: str = None) -> Decision:
    decision = Decision(
        context=context, evidence=evidence,
        responsible_actor_id=responsible_actor_id,
        responsible_actor_type=responsible_actor_type,
        policy_id=policy_id, approval_required=approval_required,
        task_id=task_id,
        status="proposed", lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(decision)
    session.flush()
    session.add(AuditLog(entity_type="Decision", entity_id=decision.id, action="proposed",
                          actor_id=responsible_actor_id, actor_type=responsible_actor_type,
                          detail=context))
    session.commit()
    return decision


def approve_decision(session, decision: Decision, approver_id: str) -> Decision:
    """
    Guards against overwriting a decision that's already reached a
    terminal state. A rejected decision must not be silently flippable
    to approved by a later call — that would let a human's explicit
    rejection be bypassed. (Bug found and fixed during Din 6 red-team
    testing: this guard did not exist before.)
    """
    if decision.status == "rejected":
        raise ValueError(
            f"Cannot approve decision {decision.id}: it was already rejected. "
            f"A rejected decision cannot be silently overwritten to approved."
        )
    if decision.status == "approved":
        raise ValueError(f"Decision {decision.id} is already approved (by {decision.approver_id}).")

    decision.status = "approved"
    decision.approver_id = approver_id
    session.add(decision)
    session.add(AuditLog(entity_type="Decision", entity_id=decision.id, action="approved",
                          actor_id=approver_id, actor_type="human",
                          detail=f"Approved by {approver_id}"))
    session.commit()
    return decision


def reject_decision(session, decision: Decision, approver_id: str, reason: str = None) -> Decision:
    decision.status = "rejected"
    decision.approver_id = approver_id
    decision.outcome_summary = reason
    session.add(decision)
    session.add(AuditLog(entity_type="Decision", entity_id=decision.id, action="rejected",
                          actor_id=approver_id, actor_type="human", detail=reason))
    session.commit()
    return decision


def record_outcome(session, success: bool, summary: str = None,
                    task_id: str = None, decision_id: str = None) -> Outcome:
    outcome = Outcome(
        success=success, summary=summary, task_id=task_id, decision_id=decision_id,
        lifecycle_state=LifecycleState.COMPLETED,
    )
    session.add(outcome)
    session.flush()
    session.add(AuditLog(entity_type="Outcome", entity_id=outcome.id, action="recorded",
                          detail=f"success={success}: {summary}"))
    session.commit()
    return outcome
