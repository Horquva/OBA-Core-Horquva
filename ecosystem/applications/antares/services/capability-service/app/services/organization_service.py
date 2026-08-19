from app.models import Organization, OrganizationUnit, LifecycleState
from app.models.audit import AuditLog


def create_organization(session, name: str, mission: str = None, owner_id: str = None,
                         provenance: str = "manual") -> Organization:
    org = Organization(
        name=name,
        mission=mission,
        owner_id=owner_id,
        owner_type="human",
        provenance=provenance,
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(org)
    session.flush()  # get org.id without full commit

    session.add(AuditLog(
        entity_type="Organization", entity_id=org.id, action="created",
        actor_id=owner_id, actor_type="human", detail=f"Organization '{name}' created",
    ))
    session.commit()
    return org


def create_organizational_unit(session, organization_id: str, name: str,
                                provenance: str = "manual") -> OrganizationUnit:
    unit = OrganizationUnit(
        name=name,
        organization_id=organization_id,
        provenance=provenance,
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(unit)
    session.flush()

    session.add(AuditLog(
        entity_type="OrganizationUnit", entity_id=unit.id, action="created",
        detail=f"Unit '{name}' created under organization {organization_id}",
    ))
    session.commit()
    return unit
