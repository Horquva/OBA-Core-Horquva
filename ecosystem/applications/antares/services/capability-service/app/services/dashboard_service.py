"""
Command Interface Dashboard — Part-8.

Builds the data context for, and renders, the final minimal organizational
command interface required by the roadmap: Organization, Agents,
Execution, Intelligence, and Governance — nothing else. This module only
READS state (via query_service and direct queries); it never mutates
anything, matching the same read-only discipline as the Part-6 query
interface it's built on top of.
"""
from datetime import datetime, timezone

from app.models import AgentRole, Task
from app.models.governance import Decision, Policy
from app.models.workflow import Escalation
from app.models.memory import OrganizationalMemory
from app.models.audit import AuditLog
from app.services import query_service
from app.services.execution_engine import _get_organization_id_for_task


def build_dashboard_context(session, organization) -> dict:
    state = query_service.get_organization_state(session, organization)

    # --- Agents panel ---
    from app.models.organization import OrganizationUnit
    units = session.query(OrganizationUnit).filter(
        OrganizationUnit.organization_id == organization.id).all()
    unit_ids = [u.id for u in units]
    agents = session.query(AgentRole).filter(AgentRole.unit_id.in_(unit_ids)).all() if unit_ids else []
    agent_rows = [query_service.get_agent_status(session, a) for a in agents]

    # --- Execution panel ---
    all_tasks = []
    from app.models.capability import OrganizationalCapability
    from app.models.workflow import Workflow
    capabilities = session.query(OrganizationalCapability).filter(
        OrganizationalCapability.organization_id == organization.id).all()
    workflows = session.query(Workflow).filter(
        Workflow.capability_id.in_([c.id for c in capabilities])).all() if capabilities else []
    for wf in workflows:
        all_tasks.extend(session.query(Task).filter(Task.workflow_id == wf.id).all())
    task_rows = [{
        "title": t.title, "status": t.status,
        "assignee": t.assignee_id[:8] + "..." if t.assignee_id else "unassigned",
        "assignee_type": t.assignee_type or "-",
        "retries": f"{t.retry_count}/{t.max_retries}",
    } for t in all_tasks]

    # --- Intelligence panel ---
    memories = session.query(OrganizationalMemory).filter(
        OrganizationalMemory.organization_id == organization.id).all()
    lessons = [m.lesson for m in memories]

    all_decisions = []
    for t in all_tasks:
        all_decisions.extend(session.query(Decision).filter(Decision.task_id == t.id).all())
    decision_rows = [{
        "context": d.context[:80] + ("..." if len(d.context) > 80 else ""),
        "status": d.status, "approver": d.approver_id or "-",
    } for d in all_decisions]

    # --- Governance panel ---
    pending_decisions = query_service.get_pending_decisions(session, organization.id)
    escalations = query_service.get_unresolved_escalations(session, organization.id)
    policies = session.query(Policy).filter(Policy.organization_id == organization.id).all()
    policy_rows = [{"name": p.name, "requires_approval": p.requires_approval} for p in policies]

    # --- Signature element: recent audit ledger (last 12 entries) ---
    recent_audit = session.query(AuditLog).order_by(AuditLog.occurred_at.desc()).limit(12).all()
    audit_rows = [{
        "time": a.occurred_at.strftime("%H:%M:%S"),
        "entity": a.entity_type, "action": a.action,
    } for a in reversed(recent_audit)]

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "org_name": organization.name,
        "org_mission": organization.mission or "—",
        "state": state,
        "agents": agent_rows,
        "tasks": task_rows,
        "lessons": lessons,
        "decisions": decision_rows,
        "pending_decisions": pending_decisions,
        "escalations": escalations,
        "policies": policy_rows,
        "audit_ledger": audit_rows,
    }
