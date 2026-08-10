import pytest

from security_quality_platform.database import Base, SessionLocal, engine
from security_quality_platform.domain.enums import (
    AssessmentStatus,
    CertificationStatus,
    ExceptionStatus,
    FindingStatus,
    TrustStatus,
)
from security_quality_platform.domain.models import (
    Assessment,
    AuditRecord,
    Certification,
    ExceptionRecord,
    Finding,
    TrustState,
)
from security_quality_platform.services.lifecycle import (
    change_assessment_status,
)
from security_quality_platform.services.state_machine import (
    InvalidTransition,
    transition_assessment,
    transition_certification,
    transition_exception,
    transition_finding,
    transition_trust,
)


def test_valid_assessment_transition():
    result = transition_assessment(
        AssessmentStatus.REQUESTED,
        AssessmentStatus.TRIAGED,
    )

    assert result.previous_state == "REQUESTED"
    assert result.new_state == "TRIAGED"


def test_invalid_assessment_transition_fails_closed():
    with pytest.raises(InvalidTransition):
        transition_assessment(
            AssessmentStatus.REQUESTED,
            AssessmentStatus.CERTIFICATION,
        )


def test_invalid_finding_transition_fails_closed():
    with pytest.raises(InvalidTransition):
        transition_finding(
            FindingStatus.OPEN,
            FindingStatus.CLOSED,
        )


def test_invalid_trust_transition_fails_closed():
    with pytest.raises(InvalidTransition):
        transition_trust(
            TrustStatus.TRUSTED,
            TrustStatus.REVOKED,
        )


def test_invalid_certification_transition_fails_closed():
    with pytest.raises(InvalidTransition):
        transition_certification(
            CertificationStatus.ELIGIBLE,
            CertificationStatus.APPROVED,
        )


def test_invalid_exception_transition_fails_closed():
    with pytest.raises(InvalidTransition):
        transition_exception(
            ExceptionStatus.REQUESTED,
            ExceptionStatus.ACTIVE,
        )


def test_assessment_transition_creates_audit_record():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        assessment = Assessment(
            target_platform="Sentinel",
            target_capability="DevSecOps",
            environment="test",
            scope="Verify pipeline security",
            risk_tier="TIER_1",
            verification_depth="DEEP",
            responsible_owner="devsecops-owner",
            verification_authority="security-quality",
            acceptance_criteria="Required security checks pass",
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        change_assessment_status(
            db,
            assessment,
            AssessmentStatus.TRIAGED,
            actor="security-quality-verifier",
        )

        assert assessment.status == "TRIAGED"
        assert assessment.version == 2

        record = (
            db.query(AuditRecord)
            .filter(AuditRecord.resource_id == assessment.id)
            .order_by(AuditRecord.created_at.desc())
            .first()
        )

        assert record is not None
        assert record.previous_state == "REQUESTED"
        assert record.new_state == "TRIAGED"
        assert record.actor == "security-quality-verifier"

    finally:
        db.close()
