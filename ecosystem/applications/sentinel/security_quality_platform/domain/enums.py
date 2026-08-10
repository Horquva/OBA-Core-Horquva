from enum import Enum


class AssessmentStatus(str, Enum):
    REQUESTED = "REQUESTED"
    TRIAGED = "TRIAGED"
    PLANNED = "PLANNED"
    IN_TESTING = "IN_TESTING"
    FINDINGS_REVIEW = "FINDINGS_REVIEW"
    REMEDIATION_RETEST = "REMEDIATION_RETEST"
    COMPLIANCE_REVIEW = "COMPLIANCE_REVIEW"
    CERTIFICATION = "CERTIFICATION"


class FindingStatus(str, Enum):
    OPEN = "OPEN"
    TRIAGED = "TRIAGED"
    ASSIGNED = "ASSIGNED"
    REMEDIATION = "REMEDIATION"
    RETEST = "RETEST"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"


class TrustStatus(str, Enum):
    TRUSTED = "TRUSTED"
    AT_RISK = "AT_RISK"
    DEGRADED = "DEGRADED"
    REVOKED = "REVOKED"


class CertificationStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    CONDITIONAL = "CONDITIONAL"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ExceptionStatus(str, Enum):
    REQUESTED = "REQUESTED"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    EXPIRING = "EXPIRING"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class Severity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TestResult(str, Enum):
    NOT_RUN = "NOT_RUN"
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"


class ControlStatus(str, Enum):
    NOT_TESTED = "NOT_TESTED"
    PASS = "PASS"
    FAIL = "FAIL"
    EXCEPTION = "EXCEPTION"


class RiskTier(str, Enum):
    TIER_1 = "TIER_1"
    TIER_2 = "TIER_2"
    TIER_3 = "TIER_3"
