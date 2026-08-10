from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


def test_audit_endpoint_returns_records():
    assessment_response = client.post(
        "/api/v1/assessments",
        json={
            "requester": "mustafa",
            "requester_role": "security-quality",
            "target_platform": "Sentinel",
            "target_capability": "Audit Verification",
            "environment": "test",
            "scope": "Verify audit record generation",
            "risk_tier": "TIER_2",
            "verification_depth": "STANDARD",
            "responsible_owner": "security-quality",
            "verification_authority": "security-quality",
            "acceptance_criteria": "Audit event must exist",
        },
    )

    assert assessment_response.status_code == 201

    response = client.get("/api/v1/audit")

    assert response.status_code == 200

    records = response.json()

    assert isinstance(records, list)
    assert len(records) > 0

    assert any(
        record["action"] == "ASSESSMENT_CREATED"
        for record in records
    )
