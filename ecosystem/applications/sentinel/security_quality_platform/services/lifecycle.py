from sqlalchemy.orm import Session

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
from security_quality_platform.services.state_machine import (
    transition_assessment,
    transition_certification,
    transition_exception,
    transition_finding,
    transition_trust,
)


def _audit_transition(
    db: Session,
    *,
    correlation_id: str,
    actor: str,
    resource_type: str,
    resource_id: str,
    previous_state: str,
    new_state: str,
):
    record = AuditRecord(
        correlation_id=correlation_id,
        actor=actor,
        action="STATE_TRANSITION",
        resource_type=resource_type,
        resource_id=resource_id,
        previous_state=previous_state,
        new_state=new_state,
        details=f"{previous_state} -> {new_state}",
    )

    db.add(record)
    return record


def change_assessment_status(
    db: Session,
    assessment: Assessment,
    target: AssessmentStatus,
    *,
    actor: str,
):
    result = transition_assessment(
        AssessmentStatus(assessment.status),
        target,
    )

    assessment.status = result.new_state
    assessment.version += 1

    _audit_transition(
        db,
        correlation_id=assessment.correlation_id,
        actor=actor,
        resource_type="Assessment",
        resource_id=assessment.id,
        previous_state=result.previous_state,
        new_state=result.new_state,
    )

    db.commit()
    db.refresh(assessment)
    return assessment


def change_finding_status(
    db: Session,
    finding: Finding,
    target: FindingStatus,
    *,
    actor: str,
    correlation_id: str,
):
    result = transition_finding(
        FindingStatus(finding.status),
        target,
    )

    finding.status = result.new_state
    finding.version += 1

    _audit_transition(
        db,
        correlation_id=correlation_id,
        actor=actor,
        resource_type="Finding",
        resource_id=finding.id,
        previous_state=result.previous_state,
        new_state=result.new_state,
    )

    db.commit()
    db.refresh(finding)
    return finding


def change_trust_status(
    db: Session,
    trust: TrustState,
    target: TrustStatus,
    *,
    actor: str,
    correlation_id: str,
):
    result = transition_trust(
        TrustStatus(trust.status),
        target,
    )

    trust.status = result.new_state

    _audit_transition(
        db,
        correlation_id=correlation_id,
        actor=actor,
        resource_type="TrustState",
        resource_id=trust.id,
        previous_state=result.previous_state,
        new_state=result.new_state,
    )

    db.commit()
    db.refresh(trust)
    return trust


def change_certification_status(
    db: Session,
    certification: Certification,
    target: CertificationStatus,
    *,
    actor: str,
    correlation_id: str,
):
    result = transition_certification(
        CertificationStatus(certification.status),
        target,
    )

    certification.status = result.new_state

    _audit_transition(
        db,
        correlation_id=correlation_id,
        actor=actor,
        resource_type="Certification",
        resource_id=certification.id,
        previous_state=result.previous_state,
        new_state=result.new_state,
    )

    db.commit()
    db.refresh(certification)
    return certification


def change_exception_status(
    db: Session,
    exception: ExceptionRecord,
    target: ExceptionStatus,
    *,
    actor: str,
    correlation_id: str,
):
    result = transition_exception(
        ExceptionStatus(exception.status),
        target,
    )

    exception.status = result.new_state

    _audit_transition(
        db,
        correlation_id=correlation_id,
        actor=actor,
        resource_type="Exception",
        resource_id=exception.id,
        previous_state=result.previous_state,
        new_state=result.new_state,
    )

    db.commit()
    db.refresh(exception)
    return exception
