from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, EntityMixin


class Event(Base, EntityMixin):
    """A discrete organizational event (task created, decision approved, etc.)."""
    __tablename__ = "events"

    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    related_entity_type: Mapped[str] = mapped_column(String(50), nullable=True)
    related_entity_id: Mapped[str] = mapped_column(String(36), nullable=True)
    detail: Mapped[str] = mapped_column(Text, nullable=True)


class Outcome(Base, EntityMixin):
    """The recorded result of an executed task or decision."""
    __tablename__ = "outcomes"

    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    decision_id: Mapped[str] = mapped_column(ForeignKey("decisions.id"), nullable=True)
    success: Mapped[bool] = mapped_column(nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)


class PerformanceSignal(Base, EntityMixin):
    """A measurable signal about organizational performance, used for learning."""
    __tablename__ = "performance_signals"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    signal_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "task_success_rate"
    signal_value: Mapped[str] = mapped_column(String(100), nullable=False)  # stored as text for flexibility


class OrganizationalMemory(Base, EntityMixin):
    """
    A retrievable 'lesson' the organization has learned, linking back to the
    outcome/event that produced it. This is the entry point for Part-5's
    Organizational Learning loop (Execution -> Outcome -> Evaluation -> Lesson).
    """
    __tablename__ = "organizational_memory"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    lesson: Mapped[str] = mapped_column(Text, nullable=False)
    source_outcome_id: Mapped[str] = mapped_column(ForeignKey("outcomes.id"), nullable=True)
