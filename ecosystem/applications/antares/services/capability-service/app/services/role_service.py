from app.models import HumanRole, AgentRole, AgentCapabilityGrant, LifecycleState
from app.models.audit import AuditLog


def define_human_role(session, unit_id: str, title: str, person_name: str = None) -> HumanRole:
    role = HumanRole(
        title=title, unit_id=unit_id, person_name=person_name,
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(role)
    session.flush()
    session.add(AuditLog(entity_type="HumanRole", entity_id=role.id, action="created",
                          detail=f"Human role '{title}' defined"))
    session.commit()
    return role


def define_agent_role(session, unit_id: str, title: str,
                       constraints: str = "", goals: str = "") -> AgentRole:
    """
    Defines an AI agent role. No capabilities are granted here — capabilities
    must be explicitly granted afterward via grant_capability_to_agent(),
    since agents must never have unlimited access (Part-4 rule).
    """
    role = AgentRole(
        title=title, unit_id=unit_id,
        constraints=constraints, goals=goals,
        allowed_capability_ids="",  # informational only; see AgentCapabilityGrant
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(role)
    session.flush()
    session.add(AuditLog(entity_type="AgentRole", entity_id=role.id, action="created",
                          detail=f"Agent role '{title}' defined with zero default capabilities"))
    session.commit()
    return role


def grant_capability_to_agent(session, agent_role_id: str, capability_id: str,
                               granted_by: str = None) -> AgentCapabilityGrant:
    """Explicitly grants one capability to one agent role. This is the ONLY
    way an agent gains permission to execute a capability's tasks."""
    grant = AgentCapabilityGrant(
        agent_role_id=agent_role_id, capability_id=capability_id, granted_by=granted_by,
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(grant)
    session.flush()
    session.add(AuditLog(entity_type="AgentCapabilityGrant", entity_id=grant.id, action="granted",
                          actor_id=granted_by, actor_type="human",
                          detail=f"Capability {capability_id} granted to agent role {agent_role_id}"))
    session.commit()
    return grant


def agent_has_capability(session, agent_role_id: str, capability_id: str) -> bool:
    grant = session.query(AgentCapabilityGrant).filter(
        AgentCapabilityGrant.agent_role_id == agent_role_id,
        AgentCapabilityGrant.capability_id == capability_id,
        AgentCapabilityGrant.lifecycle_state == LifecycleState.ACTIVE,
    ).first()
    return grant is not None
