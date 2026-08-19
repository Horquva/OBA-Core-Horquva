from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, EntityMixin


class Workflow(Base, EntityMixin):
    """A sequence of tasks executing a capability."""
    __tablename__ = "workflows"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    capability_id: Mapped[str] = mapped_column(ForeignKey("capabilities.id"), nullable=False)


class Task(Base, EntityMixin):
    """A single unit of work within a workflow."""
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), nullable=False)

    assignee_id: Mapped[str] = mapped_column(String(100), nullable=True)
    assignee_type: Mapped[str] = mapped_column(String(20), nullable=True)  # "human" | "agent"

    status: Mapped[str] = mapped_column(String(30), default="pending")
    # "pending" | "in_progress" | "completed" | "failed" | "blocked" | "escalated"

    depends_on_task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    result: Mapped[str] = mapped_column(Text, nullable=True)

    retry_count: Mapped[int] = mapped_column(default=0)
    max_retries: Mapped[int] = mapped_column(default=2)
    last_failure_reason: Mapped[str] = mapped_column(Text, nullable=True)


class Delegation(Base, EntityMixin):
    """Records a task being delegated from one actor to another."""
    __tablename__ = "delegations"

    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False)
    from_actor_id: Mapped[str] = mapped_column(String(100), nullable=True)
    to_actor_id: Mapped[str] = mapped_column(String(100), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=True)


class Escalation(Base, EntityMixin):
    """Records a task or decision being escalated (e.g. to a human)."""
    __tablename__ = "escalations"

    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    decision_id: Mapped[str] = mapped_column(ForeignKey("decisions.id"), nullable=True)
    escalated_to_id: Mapped[str] = mapped_column(String(100), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(default=False)
