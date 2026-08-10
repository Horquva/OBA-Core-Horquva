from __future__ import annotations

from dataclasses import dataclass
from typing import TypeVar

from security_quality_platform.domain.enums import (
    AssessmentStatus,
    CertificationStatus,
    ExceptionStatus,
    FindingStatus,
    TrustStatus,
)

State = TypeVar("State")


class InvalidTransition(ValueError):
    """Raised when a governed lifecycle transition is not permitted."""


@dataclass(frozen=True)
class TransitionResult:
    previous_state: str
    new_state: str


ASSESSMENT_TRANSITIONS = {
    AssessmentStatus.REQUESTED: {AssessmentStatus.TRIAGED},
    AssessmentStatus.TRIAGED: {AssessmentStatus.PLANNED},
    AssessmentStatus.PLANNED: {AssessmentStatus.IN_TESTING},
    AssessmentStatus.IN_TESTING: {AssessmentStatus.FINDINGS_REVIEW},
    AssessmentStatus.FINDINGS_REVIEW: {
        AssessmentStatus.REMEDIATION_RETEST,
        AssessmentStatus.COMPLIANCE_REVIEW,
    },
    AssessmentStatus.REMEDIATION_RETEST: {
        AssessmentStatus.FINDINGS_REVIEW,
        AssessmentStatus.COMPLIANCE_REVIEW,
    },
    AssessmentStatus.COMPLIANCE_REVIEW: {
        AssessmentStatus.CERTIFICATION,
    },
    AssessmentStatus.CERTIFICATION: set(),
}


FINDING_TRANSITIONS = {
    FindingStatus.OPEN: {FindingStatus.TRIAGED},
    FindingStatus.TRIAGED: {FindingStatus.ASSIGNED},
    FindingStatus.ASSIGNED: {FindingStatus.REMEDIATION},
    FindingStatus.REMEDIATION: {FindingStatus.RETEST},
    FindingStatus.RETEST: {
        FindingStatus.VERIFIED,
        FindingStatus.REMEDIATION,
    },
    FindingStatus.VERIFIED: {FindingStatus.CLOSED},
    FindingStatus.CLOSED: set(),
}


TRUST_TRANSITIONS = {
    TrustStatus.TRUSTED: {TrustStatus.AT_RISK},
    TrustStatus.AT_RISK: {
        TrustStatus.TRUSTED,
        TrustStatus.DEGRADED,
    },
    TrustStatus.DEGRADED: {
        TrustStatus.AT_RISK,
        TrustStatus.REVOKED,
    },
    TrustStatus.REVOKED: set(),
}


CERTIFICATION_TRANSITIONS = {
    CertificationStatus.ELIGIBLE: {
        CertificationStatus.UNDER_REVIEW,
    },
    CertificationStatus.UNDER_REVIEW: {
        CertificationStatus.APPROVED,
        CertificationStatus.CONDITIONAL,
        CertificationStatus.REJECTED,
    },
    CertificationStatus.APPROVED: {
        CertificationStatus.EXPIRED,
    },
    CertificationStatus.CONDITIONAL: {
        CertificationStatus.EXPIRED,
    },
    CertificationStatus.REJECTED: set(),
    CertificationStatus.EXPIRED: set(),
}


EXCEPTION_TRANSITIONS = {
    ExceptionStatus.REQUESTED: {ExceptionStatus.REVIEW},
    ExceptionStatus.REVIEW: {
        ExceptionStatus.APPROVED,
        ExceptionStatus.REVOKED,
    },
    ExceptionStatus.APPROVED: {ExceptionStatus.ACTIVE},
    ExceptionStatus.ACTIVE: {
        ExceptionStatus.EXPIRING,
        ExceptionStatus.REVOKED,
    },
    ExceptionStatus.EXPIRING: {
        ExceptionStatus.EXPIRED,
        ExceptionStatus.REVOKED,
    },
    ExceptionStatus.EXPIRED: set(),
    ExceptionStatus.REVOKED: set(),
}


def _transition(
    current: State,
    target: State,
    allowed_transitions: dict,
) -> TransitionResult:
    allowed = allowed_transitions.get(current, set())

    if target not in allowed:
        raise InvalidTransition(
            f"Invalid transition: {current.value} -> {target.value}"
        )

    return TransitionResult(
        previous_state=current.value,
        new_state=target.value,
    )


def transition_assessment(
    current: AssessmentStatus,
    target: AssessmentStatus,
) -> TransitionResult:
    return _transition(current, target, ASSESSMENT_TRANSITIONS)


def transition_finding(
    current: FindingStatus,
    target: FindingStatus,
) -> TransitionResult:
    return _transition(current, target, FINDING_TRANSITIONS)


def transition_trust(
    current: TrustStatus,
    target: TrustStatus,
) -> TransitionResult:
    return _transition(current, target, TRUST_TRANSITIONS)


def transition_certification(
    current: CertificationStatus,
    target: CertificationStatus,
) -> TransitionResult:
    return _transition(current, target, CERTIFICATION_TRANSITIONS)


def transition_exception(
    current: ExceptionStatus,
    target: ExceptionStatus,
) -> TransitionResult:
    return _transition(current, target, EXCEPTION_TRANSITIONS)
