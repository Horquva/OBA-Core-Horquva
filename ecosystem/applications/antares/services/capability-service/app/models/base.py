"""
Base entity mixin.

Per Part-2 of the Future Organization Engineering roadmap, every domain
entity must have: unique identity, lifecycle state, ownership, provenance,
timestamps, relationships, and audit history.

This mixin provides the first six. Audit history is provided separately by
the AuditLog model (see app/models/audit.py) + the audit_log() helper below,
since audit trails are cross-entity and shouldn't be duplicated in every table.
"""
import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase


class Base(DeclarativeBase):
    pass


class LifecycleState(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


def new_id() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class EntityMixin:
    """Common columns shared by every organizational entity."""

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)

    # Lifecycle state — required for every entity per the roadmap.
    lifecycle_state: Mapped[LifecycleState] = mapped_column(
        Enum(LifecycleState), default=LifecycleState.DRAFT, nullable=False
    )

    # Ownership — who (human user id, agent id, or system) owns this entity.
    owner_id: Mapped[str] = mapped_column(String(100), nullable=True)
    owner_type: Mapped[str] = mapped_column(String(20), nullable=True)  # "human" | "agent" | "system"

    # Provenance — where this entity came from (e.g. "muzammel_org_futures",
    # "kanwal_governance", "manual", "seed_demo"). Required so downstream
    # platforms (capability validation, OBA) can trace origin.
    provenance: Mapped[str] = mapped_column(String(200), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )
