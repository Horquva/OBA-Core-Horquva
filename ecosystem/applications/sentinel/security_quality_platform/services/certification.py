from sqlalchemy.orm import Session

from security_quality_platform.domain.models import (
    Assessment,
    Control,
    Evidence,
    Finding,
    TrustState,
)


class CertificationBlocked(ValueError):
    pass


def validate_certification_readiness(
    db: Session,
    assessment: Assessment,
) -> None:
    blocking_findings = (
        db.query(Finding)
        .filter(
            Finding.assessment_id == assessment.id,
            Finding.severity == "CRITICAL",
            Finding.status != "CLOSED",
        )
        .count()
    )

    if blocking_findings:
        raise CertificationBlocked(
            "Critical unresolved findings block certification"
        )

    mandatory_control_failures = (
        db.query(Control)
        .filter(
            Control.mandatory.is_(True),
            Control.status != "PASS",
        )
        .count()
    )

    if mandatory_control_failures:
        raise CertificationBlocked(
            "Failed mandatory controls block certification"
        )

    evidence = (
        db.query(Evidence)
        .filter(Evidence.assessment_id == assessment.id)
        .all()
    )

    if not evidence:
        raise CertificationBlocked(
            "Missing required evidence blocks certification"
        )

    if any(not item.integrity_verified for item in evidence):
        raise CertificationBlocked(
            "Unverified evidence blocks certification"
        )

    trust = (
        db.query(TrustState)
        .filter(
            TrustState.subject_type == "assessment",
            TrustState.subject_id == assessment.id,
        )
        .first()
    )

    if trust is None:
        raise CertificationBlocked(
            "Missing trust state blocks certification"
        )

    if trust.status == "REVOKED":
        raise CertificationBlocked(
            "Revoked trust blocks certification"
        )
