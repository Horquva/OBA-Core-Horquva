"""
Governance Runtime — Part-6.

Implements the required chain:
  Agent Intent -> Capability Check -> Authority Check -> Policy Check
  -> Approval Requirement -> Execution

Capability/Authority Check already exists in agent_engine.py (Part-4's
boundary enforcement). This module adds the POLICY layer on top of it —
organization-wide or capability-specific rules that can force a human
approval gate before execution, even for an agent that IS authorized.

Design boundary: this module enforces policies, it does not author them.
Real governance rules come from Kanwal's Trust & Governance platform via
create_policy() (or, once integrated, a direct feed from her platform).
Nothing here invents governance logic — it only evaluates what's stored.
"""
from app.models.governance import Policy
from app.models.base import LifecycleState
from app.services.event_service import emit_event
from app.models.audit import AuditLog


def create_policy(session, organization_id: str, name: str, rule: str,
                   requires_approval: bool = False,
                   applies_to_capability_id: str = None,
                   created_by: str = None) -> Policy:
    """
    Registers a governance policy. In production this would be called by
    the integration receiving Kanwal's governance rules feed, not authored
    ad-hoc by this platform — see receive_governance_rules() below for
    that integration point.
    """
    policy = Policy(
        organization_id=organization_id, name=name, rule=rule,
        requires_approval=requires_approval,
        applies_to_capability_id=applies_to_capability_id,
        provenance="kanwal_governance" if created_by == "kanwal" else "manual_seed",
        lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(policy)
    session.flush()
    session.add(AuditLog(entity_type="Policy", entity_id=policy.id, action="created",
                          actor_id=created_by, detail=f"Policy '{name}': {rule}"))
    session.commit()
    return policy


def get_applicable_policies(session, organization_id: str, capability_id: str) -> list[Policy]:
    """Returns active policies that apply to this capability — either
    capability-specific policies, or org-wide policies (applies_to_capability_id is null)."""
    all_policies = session.query(Policy).filter(
        Policy.organization_id == organization_id,
        Policy.lifecycle_state == LifecycleState.ACTIVE,
    ).all()
    return [p for p in all_policies
            if p.applies_to_capability_id is None or p.applies_to_capability_id == capability_id]


def policy_check(session, organization_id: str, capability_id: str) -> tuple[bool, list[Policy]]:
    """
    Returns (requires_approval, applicable_policies). This is the actual
    "Policy Check" stage in the Agent Intent -> ... -> Execution chain.
    """
    policies = get_applicable_policies(session, organization_id, capability_id)
    requires_approval = any(p.requires_approval for p in policies)
    return requires_approval, policies


def receive_governance_rules(session, organization_id: str, rules: list[dict], source: str = "kanwal") -> list[Policy]:
    """
    Integration point for Kanwal's Trust & Governance platform. Each rule
    dict should have: name, rule, requires_approval, applies_to_capability_id
    (optional). This function does NOT decide what the rules should say —
    it only registers whatever Kanwal's platform sends. Currently unused
    in demos since that integration doesn't exist yet; kept here so the
    connection point is explicit rather than something to figure out later.
    """
    created = []
    for r in rules:
        policy = create_policy(
            session, organization_id=organization_id, name=r["name"], rule=r["rule"],
            requires_approval=r.get("requires_approval", False),
            applies_to_capability_id=r.get("applies_to_capability_id"),
            created_by=source,
        )
        created.append(policy)
    return created
