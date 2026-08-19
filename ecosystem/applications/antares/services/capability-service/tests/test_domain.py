"""Domain Tests — Part-7. Every core entity: create, persist, relate."""
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_human_role, define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability, define_responsibility
from app.services.workflow_service import create_workflow, create_task
from app.services.decision_service import record_decision, record_outcome


def test_organization_and_unit_creation(session):
    org = create_organization(session, name="Test Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Test Unit")
    assert org.id is not None
    assert unit.organization_id == org.id
    assert org.lifecycle_state.value == "active"


def test_human_and_agent_roles(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    human = define_human_role(session, unit_id=unit.id, title="Lead", person_name="Alice")
    agent = define_agent_role(session, unit_id=unit.id, title="ResearchAgent")
    assert human.person_name == "Alice"
    assert agent.title == "ResearchAgent"
    # Agents must start with zero granted capabilities (Part-4 rule).
    assert agent.allowed_capability_ids == ""


def test_capability_and_responsibility(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    human = define_human_role(session, unit_id=unit.id, title="Lead")
    cap = assign_capability(session, organization_id=org.id, name="Do the thing")
    resp = define_responsibility(session, capability_id=cap.id, responsibility_type="sole",
                                  human_role_id=human.id)
    assert resp.capability_id == cap.id
    assert resp.human_role_id == human.id


def test_workflow_and_task_relationship(session):
    org = create_organization(session, name="Org")
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="Workflow")
    task = create_task(session, workflow_id=wf.id, title="Task 1")
    assert task.workflow_id == wf.id
    assert task.status == "pending"
    assert task.retry_count == 0
    assert task.max_retries == 2  # default


def test_decision_and_outcome(session):
    decision = record_decision(session, context="Should we do X?", approval_required=True)
    outcome = record_outcome(session, success=True, summary="Done.", decision_id=decision.id)
    assert decision.status == "proposed"
    assert outcome.decision_id == decision.id
    assert outcome.success is True


def test_agent_capability_grant_is_explicit(session):
    """An agent with NO grant must show zero grants — never implicit access."""
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="Agent")
    cap = assign_capability(session, organization_id=org.id, name="Cap")

    from app.services.role_service import agent_has_capability
    assert agent_has_capability(session, agent.id, cap.id) is False

    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap.id)
    assert agent_has_capability(session, agent.id, cap.id) is True


def test_audit_log_created_for_every_entity(session):
    from app.models.audit import AuditLog
    org = create_organization(session, name="Org")
    logs = session.query(AuditLog).filter(AuditLog.entity_id == org.id).all()
    assert len(logs) >= 1
    assert logs[0].action == "created"
