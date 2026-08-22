"""
api.py — HTTP wrapper around the Future Organization Engineering Platform.

Seeds the same real demo organization from main.py (real entities, real
audit trail, real SQLite persistence) once at startup, then exposes it
as JSON via FastAPI so other services can consume it live.

Run: uvicorn api:app --port 4004
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_human_role, define_agent_role
from app.services.capability_service import assign_capability, define_responsibility
from app.services.workflow_service import create_workflow, create_task
from app.services.decision_service import record_decision, record_outcome
from app.models.audit import AuditLog

app = FastAPI(title="Antares Future Organization Engineering API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_state = {}


def seed_once():
    init_db()
    session = get_session()

    org = create_organization(
        session, name="Antares Demo Org",
        mission="Prototype organization proving the Day 2 foundation works.",
        owner_id="zeeshan.farooq", provenance="manual_seed",
    )
    unit = create_organizational_unit(session, organization_id=org.id, name="Research Unit")
    human = define_human_role(session, unit_id=unit.id, title="Research Lead", person_name="Zeeshan Farooq")
    agent = define_agent_role(session, unit_id=unit.id, title="ResearchAgent", constraints="read_only; no_external_publish")
    capability = assign_capability(
        session, organization_id=org.id, name="Summarize weekly research findings",
        description="Produce a structured summary of the week's research output.",
    )
    responsibility = define_responsibility(
        session, capability_id=capability.id, responsibility_type="shared",
        human_role_id=human.id, agent_role_id=agent.id,
    )
    workflow = create_workflow(session, capability_id=capability.id, name="Weekly Summary Workflow")
    task = create_task(session, workflow_id=workflow.id, title="Draft weekly summary", assignee_id=agent.id, assignee_type="agent")
    decision = record_decision(
        session, context="Approve agent-drafted summary for release",
        responsible_actor_id=human.id, responsible_actor_type="human",
        evidence="Draft reviewed, matches source data.", approval_required=True,
    )
    outcome = record_outcome(session, success=True, summary="Summary approved and recorded.", task_id=task.id, decision_id=decision.id)

    logs = session.query(AuditLog).order_by(AuditLog.occurred_at).all()

    _state["summary"] = {
        "service": "capability-service",
        "owner": "Zeeshan Farooq / Muhammad Hasnain Ajmal",
        "organization": {"id": org.id, "name": org.name, "mission": org.mission},
        "unit": unit.name,
        "roles": {"human": human.title, "agent": agent.title},
        "capability": {"id": capability.id, "name": capability.name},
        "workflow": workflow.name,
        "task": {"title": task.title, "status": task.status, "assignee_type": task.assignee_type},
        "decision": {"status": decision.status, "context": decision.context},
        "outcome": {"success": outcome.success, "summary": outcome.summary},
        "auditLogCount": len(logs),
        "auditTrail": [
            {"at": log.occurred_at.isoformat(), "entityType": log.entity_type, "action": log.action, "detail": log.detail}
            for log in logs
        ],
    }
    session.close()


@app.on_event("startup")
def on_startup():
    seed_once()


@app.get("/api/summary")
def summary():
    return _state.get("summary", {})


@app.get("/health")
def health():
    return {"status": "ok", "service": "capability-service"}
