from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, EntityMixin


class HumanRole(Base, EntityMixin):
    """A role held by a human within an organization unit."""
    __tablename__ = "human_roles"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    person_name: Mapped[str] = mapped_column(String(200), nullable=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("organization_units.id"), nullable=False)


class AgentRole(Base, EntityMixin):
    """
    A role held by an AI agent within an organization unit.

    Note: this table defines the ROLE and its permitted capabilities/
    constraints. The actual AI/ML reasoning behind the agent is Hasnain's
    responsibility (Part-4/5 runtime) — this model only defines the
    organizational boundary the agent must operate within.
    """
    __tablename__ = "agent_roles"

    title: Mapped[str] = mapped_column(String(200), nullable=False)   # e.g. "ResearchAgent"
    unit_id: Mapped[str] = mapped_column(ForeignKey("organization_units.id"), nullable=False)

    # Explicit capabilities — agents must not have unlimited access (Part-4 rule).
    # Real grants now live in AgentCapabilityGrant (below); this field is kept
    # only as a human-readable summary, not used for authorization checks.
    allowed_capability_ids: Mapped[str] = mapped_column(Text, nullable=True)
    constraints: Mapped[str] = mapped_column(Text, nullable=True)            # free-text/JSON constraints
    goals: Mapped[str] = mapped_column(Text, nullable=True)


class AgentCapabilityGrant(Base, EntityMixin):
    """
    An explicit grant of one capability to one agent role.

    This is the real Agent Capability Registry (Part-4): agents must have
    EXPLICIT capabilities rather than unlimited access. Any capability not
    granted here is off-limits to that agent role, full stop — this is
    what the execution engine checks before letting an agent touch a task.
    """
    __tablename__ = "agent_capability_grants"

    agent_role_id: Mapped[str] = mapped_column(ForeignKey("agent_roles.id"), nullable=False)
    capability_id: Mapped[str] = mapped_column(ForeignKey("capabilities.id"), nullable=False)
    granted_by: Mapped[str] = mapped_column(String(100), nullable=True)  # who authorized this grant
