from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from security_quality_platform.database import Base
from security_quality_platform.domain.enums import (
    AssessmentStatus,
    CertificationStatus,
    ControlStatus,
    ExceptionStatus,
    FindingStatus,
    RiskTier,
    Severity,
    TestResult,
    TrustStatus,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    correlation_id: Mapped[str] = mapped_column(
        String, nullable=False, index=True, default=new_id
    )
    target_platform: Mapped[str] = mapped_column(String, nullable=False)
    target_capability: Mapped[str] = mapped_column(String, nullable=False)
    environment: Mapped[str] = mapped_column(String, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    risk_tier: Mapped[str] = mapped_column(
        String, nullable=False, default=RiskTier.TIER_2.value
    )
    verification_depth: Mapped[str] = mapped_column(
        String, nullable=False, default="STANDARD"
    )
    responsible_owner: Mapped[str] = mapped_column(String, nullable=False)
    verification_authority: Mapped[str] = mapped_column(String, nullable=False)
    acceptance_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=AssessmentStatus.REQUESTED.value
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    test_plans: Mapped[list["TestPlan"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    findings: Mapped[list["Finding"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    certifications: Mapped[list["Certification"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    scorecards: Mapped[list["Scorecard"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class TestPlan(Base):
    __tablename__ = "test_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    assessment: Mapped["Assessment"] = relationship(back_populates="test_plans")
    test_cases: Mapped[list["TestCase"]] = relationship(
        back_populates="test_plan",
        cascade="all, delete-orphan",
    )


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    test_plan_id: Mapped[str] = mapped_column(
        ForeignKey("test_plans.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    result: Mapped[str] = mapped_column(
        String, nullable=False, default=TestResult.NOT_RUN.value
    )
    failure_classification: Mapped[str | None] = mapped_column(String)
    evidence_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    retest_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    test_plan: Mapped["TestPlan"] = relationship(back_populates="test_cases")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String, nullable=False, default=Severity.MEDIUM.value
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=FindingStatus.OPEN.value
    )
    owner: Mapped[str] = mapped_column(String, nullable=False)
    remediation: Mapped[str | None] = mapped_column(Text)
    verified_by: Mapped[str | None] = mapped_column(String)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    assessment: Mapped["Assessment"] = relationship(back_populates="findings")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    evidence_type: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    storage_reference: Mapped[str] = mapped_column(String, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    provenance: Mapped[str] = mapped_column(Text, nullable=False)
    collected_by: Mapped[str] = mapped_column(String, nullable=False)
    integrity_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    assessment: Mapped["Assessment"] = relationship(back_populates="evidence")


class Control(Base):
    __tablename__ = "controls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    control_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    framework: Mapped[str] = mapped_column(String, nullable=False)
    framework_reference: Mapped[str | None] = mapped_column(String)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=ControlStatus.NOT_TESTED.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class ExceptionRecord(Base):
    __tablename__ = "exceptions"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=new_id,
    )

    control_id: Mapped[str] = mapped_column(
        ForeignKey("controls.id"),
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    risk: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    scope: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    compensating_control: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    risk_owner: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    approver: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=ExceptionStatus.REQUESTED.value,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )


class Certification(Base):
    __tablename__ = "certifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=CertificationStatus.ELIGIBLE.value
    )
    decision_reason: Mapped[str | None] = mapped_column(Text)
    approved_by: Mapped[str | None] = mapped_column(String)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    assessment: Mapped["Assessment"] = relationship(
        back_populates="certifications"
    )


class TrustState(Base):
    __tablename__ = "trust_states"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String, nullable=False, default=TrustStatus.TRUSTED.value
    )
    reason: Mapped[str | None] = mapped_column(Text)
    last_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    reverify_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )


class RegressionCase(Base):
    __tablename__ = "regression_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    source_finding_id: Mapped[str | None] = mapped_column(
        ForeignKey("findings.id"), index=True
    )
    test_reference: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_result: Mapped[str] = mapped_column(
        String, nullable=False, default=TestResult.NOT_RUN.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Scorecard(Base):
    __tablename__ = "scorecards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )
    quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    compliance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    trust_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    evidence_health_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    assessment: Mapped["Assessment"] = relationship(back_populates="scorecards")


class AuditRecord(Base):
    __tablename__ = "audit_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    correlation_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    actor: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    resource_type: Mapped[str] = mapped_column(String, nullable=False)
    resource_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    previous_state: Mapped[str | None] = mapped_column(String)
    new_state: Mapped[str | None] = mapped_column(String)
    details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
