from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


ASSESSMENT_PAYLOAD = {
    "requester": "mustafa",
    "requester_role": "security-quality",
    "target_platform": "Sentinel",
    "target_capability": "Application Security",
    "environment": "test",
    "scope": "Verify certification readiness",
    "risk_tier": "TIER_1",
    "verification_depth": "DEEP",
    "responsible_owner": "appsec-owner",
    "verification_authority": "security-quality",
    "acceptance_criteria": "All certification gates must pass",
}


def test_certification_approval_blocked_without_evidence():
    assessment_response = client.post(
        "/api/v1/assessments",
        json=ASSESSMENT_PAYLOAD,
    )

    assert assessment_response.status_code == 201

    assessment_id = assessment_response.json()["id"]

    certification_response = client.post(
        "/api/v1/certifications",
        json={
            "assessment_id": assessment_id,
            "requested_by": "security-quality",
        },
    )

    assert certification_response.status_code == 201

    certification = certification_response.json()

    assert certification["status"] == "UNDER_REVIEW"

    decision_response = client.post(
        f"/api/v1/certifications/{certification['id']}/decision",
        json={
            "decision": "APPROVED",
            "decided_by": "security-quality-authority",
            "reason": "Attempted certification approval",
        },
    )

    assert decision_response.status_code == 409
    assert "evidence" in decision_response.json()["detail"].lower()
