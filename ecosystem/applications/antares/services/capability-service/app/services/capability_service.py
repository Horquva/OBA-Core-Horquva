from app.models import OrganizationalCapability, Responsibility, LifecycleState
from app.models.audit import AuditLog


def assign_capability(session, organization_id: str, name: str, description: str = None,
                       provenance: str = "manual_seed") -> OrganizationalCapability:
    """
    Creates a capability for an organization.

    provenance should eventually be set to something traceable back to the
    Future Organizational Model that produced it (Muzammel/Syed Hadeed's
    input) once that pipeline exists. "manual_seed" is used for Day 2
    prototyping only.
    """
    cap = OrganizationalCapability(
        name=name, description=description, organization_id=organization_id,
        provenance=provenance, lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(cap)
    session.flush()
    session.add(AuditLog(entity_type="OrganizationalCapability", entity_id=cap.id,
                          action="created", detail=f"Capability '{name}' assigned"))
    session.commit()
    return cap


def define_responsibility(session, capability_id: str, responsibility_type: str,
                           human_role_id: str = None, agent_role_id: str = None) -> Responsibility:
    resp = Responsibility(
        capability_id=capability_id,
        responsibility_type=responsibility_type,
        human_role_id=human_role_id,
        agent_role_id=agent_role_id,
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(resp)
    session.flush()
    session.add(AuditLog(entity_type="Responsibility", entity_id=resp.id, action="created",
                          detail=f"Responsibility ({responsibility_type}) defined for capability {capability_id}"))
    session.commit()
    return resp
