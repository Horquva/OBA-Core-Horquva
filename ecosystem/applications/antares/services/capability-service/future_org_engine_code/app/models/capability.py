from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, EntityMixin


class OrganizationalCapability(Base, EntityMixin):
    """
    A specific, executable capability an organization can perform.

    Provenance matters a lot here: capabilities should trace back to a
    Future Organizational Model (Muzammel/Syed Hadeed's input) once that
    pipeline is connected. Until then, provenance="manual_seed" is used
    for demo/testing purposes.
    """
    __tablename__ = "capabilities"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)


class Responsibility(Base, EntityMixin):
    """Links a capability to whoever is responsible for executing it."""
    __tablename__ = "responsibilities"

    capability_id: Mapped[str] = mapped_column(ForeignKey("capabilities.id"), nullable=False)

    # Exactly one of these should be set (human or agent role responsible).
    human_role_id: Mapped[str] = mapped_column(ForeignKey("human_roles.id"), nullable=True)
    agent_role_id: Mapped[str] = mapped_column(ForeignKey("agent_roles.id"), nullable=True)

    responsibility_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # "sole" | "shared" | "approval" | "escalation" — per Part-3 Responsibility Engine
