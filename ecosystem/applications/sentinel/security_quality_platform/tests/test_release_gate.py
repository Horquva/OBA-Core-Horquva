from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


ASSESSMENT_PAYLOAD = {
    "requester": "mustafa",
    "requester_role": "security-quality",
    "target_platform": "Sentinel",
    "target_capability": "Application Security",
    "environment": "test",
    "scope": "Verify release readiness",
    "risk_tier": "TIER_1",
    "verification_depth": "DEEP",
    "responsible_owner": "appsec-owner",
    "verification_authority": "security-quality",
    "acceptance_criteria": "All release gates must pass",
}


def create_assessment():
    response = client.post(
        "/api/v1/assessments",
        json=ASSESSMENT_PAYLOAD,
    )

    assert response.status_code == 201
    return response.json()["id"]


def test_release_blocked_when_evidence_missing():
    assessment_id = create_assessment()

    response = client.get(
        f"/api/v1/assessments/{assessment_id}/release-decision"
    )

    assert response.status_code == 200
    assert response.json()["release"] == "BLOCKED"
    assert "evidence" in response.json()["reason"].lower()
    
    
def test_release_blocked_when_trust_is_revoked():
    assessment_id = create_assessment()

    trust_response = client.post(
        "/api/v1/trust",
        json={
            "subject_type": "assessment",
            "subject_id": assessment_id,
            "reason": "Initial verification",
        },
    )

    assert trust_response.status_code == 201

    trust_id = trust_response.json()["id"]

    # Follow the governed trust lifecycle instead of jumping
    # directly from the initial state to REVOKED.
    for target_status in [
        "AT_RISK",
        "DEGRADED",
        "REVOKED",
    ]:
        response = client.post(
            f"/api/v1/trust/{trust_id}/transition",
            json={
                "target_status": target_status,
                "actor": "security-quality-verifier",
                "reason": "Verification confidence degraded",
            },
        )

        assert response.status_code == 200

    release_response = client.get(
        f"/api/v1/assessments/{assessment_id}/release-decision"
    )

    assert release_response.status_code == 200
    assert release_response.json()["release"] == "BLOCKED"
    
    
    
def test_release_blocked_by_critical_unresolved_finding():
    assessment_id = create_assessment()

    finding_response = client.post(
        f"/api/v1/assessments/{assessment_id}/findings",
        json={
            "title": "Critical authentication bypass",
            "description": "Controlled test detected a critical bypass",
            "severity": "CRITICAL",
            "owner": "appsec-owner",
        },
    )

    assert finding_response.status_code == 201

    release_response = client.get(
        f"/api/v1/assessments/{assessment_id}/release-decision"
    )

    assert release_response.status_code == 200
    assert release_response.json()["release"] == "BLOCKED"
    assert "critical" in release_response.json()["reason"].lower()
    
    
    

