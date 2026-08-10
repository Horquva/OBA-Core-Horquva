from datetime import datetime, timedelta, timezone

from security_quality_platform.database import SessionLocal
from security_quality_platform.domain.models import TrustState
from security_quality_platform.services.expiry import enforce_expirations


def test_expired_trust_reverification_moves_trust_to_at_risk():
    db = SessionLocal()

    try:
        trust = TrustState(
            subject_type="assessment",
            subject_id="test-assessment",
            status="TRUSTED",
            reason="Initial trust",
            reverify_by=datetime.now(timezone.utc) - timedelta(minutes=5),
        )

        db.add(trust)
        db.commit()
        db.refresh(trust)

        result = enforce_expirations(db)

        db.refresh(trust)

        assert trust.status == "AT_RISK"
        assert result["degraded_trust"] >= 1

    finally:
        db.close()
