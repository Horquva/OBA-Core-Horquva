from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, EntityMixin


class Policy(Base, EntityMixin):
    """
    A governance rule that constrains organizational actions.

    Policies are authored by Kanwal's Trust & Governance platform. This
    model is intentionally generic (a rule name + machine-checkable
    condition text) so it can hold real governance rules once that
    integration exists (Part-6), without needing schema changes.

    requires_approval / applies_to_capability_id give the enforcement
    engine (governance_service.py) enough structure to actually gate
    execution, without hardcoding domain-specific rule logic here — real
    rule evaluation logic belongs to Kanwal's platform; this is the
    structural hook it plugs into.
    """
    __tablename__ = "policies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    rule: Mapped[str] = mapped_column(Text, nullable=False)  # condition, plain text/JSON for now
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)

    requires_approval: Mapped[bool] = mapped_column(default=False)
    # If set, this policy only applies to one capability. If null, it applies org-wide.
    applies_to_capability_id: Mapped[str] = mapped_column(ForeignKey("capabilities.id"), nullable=True)


class Decision(Base, EntityMixin):
    """An organizational decision, with context, evidence, and outcome."""
    __tablename__ = "decisions"

    context: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=True)
    responsible_actor_id: Mapped[str] = mapped_column(String(100), nullable=True)
    responsible_actor_type: Mapped[str] = mapped_column(String(20), nullable=True)  # "human" | "agent"
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id"), nullable=True)
    approval_required: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(String(30), default="proposed")
    # "proposed" | "approved" | "rejected" | "escalated"
    outcome_summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Links this decision back to the task it's gating, so an approval can
    # resume execution of the exact task that was paused waiting for it.
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    approver_id: Mapped[str] = mapped_column(String(100), nullable=True)
