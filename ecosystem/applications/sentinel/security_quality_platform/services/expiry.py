from datetime import datetime, timezone

from sqlalchemy.orm import Session

from security_quality_platform.domain.models import (
    Certification,
    ExceptionRecord,
    TrustState,
)
from security_quality_platform.domain.enums import (
    CertificationStatus,
    ExceptionStatus,
    TrustStatus,
)

def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)

def enforce_expirations(db: Session) -> dict:
    now = datetime.now(timezone.utc)

    expired_certifications = 0
    expired_exceptions = 0
    degraded_trust = 0

    certifications = db.query(Certification).all()

    for certification in certifications:
        if (
            certification.expires_at
            and as_utc(certification.expires_at) <= now
            and certification.status != CertificationStatus.EXPIRED
        ):
            certification.status = CertificationStatus.EXPIRED
            expired_certifications += 1

    exceptions = db.query(ExceptionRecord).all()

    for exception in exceptions:
        if (
            exception.expires_at
            and as_utc(exception.expires_at) <= now
            and exception.status
            not in {
                ExceptionStatus.EXPIRED,
                ExceptionStatus.REVOKED,
            }
        ):
            exception.status = ExceptionStatus.EXPIRED
            expired_exceptions += 1

    trust_states = db.query(TrustState).all()

    for trust in trust_states:
        if (
            trust.reverify_by
            and as_utc(trust.reverify_by) <= now
            and trust.status == TrustStatus.TRUSTED
        ):
            trust.status = TrustStatus.AT_RISK
            degraded_trust += 1

    db.commit()

    return {
        "expired_certifications": expired_certifications,
        "expired_exceptions": expired_exceptions,
        "degraded_trust": degraded_trust,
    }
