"""
Day 2 demo — proves the foundation actually works.

This does NOT implement real execution logic yet (that's Part-3, Days 3-4).
It only proves that: entities can be created, saved to a real database,
linked to each other via relationships, and that every action is audited.

Run: python main.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_human_role, define_agent_role
from app.services.capability_service import assign_capability, define_responsibility
from app.services.workflow_service import create_workflow, create_task
from app.services.decision_service import record_decision, record_outcome
from app.models.audit import AuditLog


def run_demo():
    init_db()
    session = get_session()

    print("=== Future Organization Engineering Platform — Day 2 Foundation Demo ===\n")

    # 1. Create an organization (provenance = manual for this demo; would
    #    normally trace back to a Future Organizational Model input).
    org = create_organization(
        session, name="Antares Demo Org",
        mission="Prototype organization proving the Day 2 foundation works.",
        owner_id="zeeshan.farooq", provenance="manual_seed",
    )
    print(f"Created Organization: {org.name} (id={org.id[:8]}..., state={org.lifecycle_state.value})")

    # 2. Create a unit inside it
    unit = create_organizational_unit(session, organization_id=org.id, name="Research Unit")
    print(f"Created Unit: {unit.name} (id={unit.id[:8]}...)")

    # 3. Define a human role and an agent role inside that unit
    human = define_human_role(session, unit_id=unit.id, title="Research Lead", person_name="Zeeshan Farooq")
    agent = define_agent_role(
        session, unit_id=unit.id, title="ResearchAgent",
        constraints="read_only; no_external_publish",
    )
    print(f"Defined HumanRole: {human.title} ({human.person_name})")
    print(f"Defined AgentRole: {agent.title} (constraints: {agent.constraints})")

    # 4. Assign a capability to the org, and define who's responsible for it
    capability = assign_capability(
        session, organization_id=org.id, name="Summarize weekly research findings",
        description="Produce a structured summary of the week's research output.",
    )
    responsibility = define_responsibility(
        session, capability_id=capability.id, responsibility_type="shared",
        human_role_id=human.id, agent_role_id=agent.id,
    )
    print(f"Assigned Capability: {capability.name}")
    print(f"Defined Responsibility: type={responsibility.responsibility_type} "
          f"(human={human.title}, agent={agent.title})")

    # 5. Create a workflow + a task under that capability
    workflow = create_workflow(session, capability_id=capability.id, name="Weekly Summary Workflow")
    task = create_task(
        session, workflow_id=workflow.id, title="Draft weekly summary",
        assignee_id=agent.id, assignee_type="agent",
    )
    print(f"Created Workflow: {workflow.name}")
    print(f"Created Task: {task.title} (status={task.status}, assignee_type={task.assignee_type})")

    # 6. Record a decision and an outcome (proves the decision/outcome chain works)
    decision = record_decision(
        session, context="Approve agent-drafted summary for release",
        responsible_actor_id=human.id, responsible_actor_type="human",
        evidence="Draft reviewed, matches source data.", approval_required=True,
    )
    outcome = record_outcome(
        session, success=True, summary="Summary approved and recorded.",
        task_id=task.id, decision_id=decision.id,
    )
    print(f"Recorded Decision: status={decision.status}")
    print(f"Recorded Outcome: success={outcome.success}, summary='{outcome.summary}'")

    # 7. Show the audit trail this demo generated
    print("\n--- Audit Trail (proves every action is tracked) ---")
    logs = session.query(AuditLog).order_by(AuditLog.occurred_at).all()
    for log in logs:
        print(f"[{log.occurred_at.strftime('%H:%M:%S')}] {log.entity_type:<25} {log.action:<12} {log.detail}")

    session.close()
    print(f"\nTotal audit log entries: {len(logs)}")
    print("\n=== Day 2 foundation confirmed working: entities create, persist, relate, and audit correctly. ===")


if __name__ == "__main__":
    run_demo()
