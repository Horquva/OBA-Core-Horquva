"""
AuditLog — cross-entity audit history.

Rather than embedding an audit trail inside every table, we record every
significant action against any entity as a row here. This keeps audit
history queryable, traceable, and consistent across all entity types,
which matters later for governance (Part-6) and testing (Part-7).
"""
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, EntityMixin, now


class AuditLog(Base, EntityMixin):
    __tablename__ = "audit_logs"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. "Task"
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)     # id of the affected entity
    action: Mapped[str] = mapped_column(String(50), nullable=False)        # e.g. "created", "status_changed"
    actor_id: Mapped[str] = mapped_column(String(100), nullable=True)      # who did it
    actor_type: Mapped[str] = mapped_column(String(20), nullable=True)     # "human" | "agent" | "system"
    detail: Mapped[str] = mapped_column(Text, nullable=True)               # free-text/JSON description
    occurred_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
