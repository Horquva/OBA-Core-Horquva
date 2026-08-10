from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


VALID_PAYLOAD = {
    "requester": "mustafa",
    "requester_role": "security-quality",
    "target_platform": "Sentinel",
    "target_capability": "Application Security",
    "environment": "test",
    "scope": "Verify application security controls",
    "risk_tier": "TIER_1",
    "verification_depth": "DEEP",
    "responsible_owner": "appsec-owner",
    "verification_authority": "security-quality",
    "acceptance_criteria": "All mandatory controls and evidence must pass",
}


def test_create_assessment():
    response = client.post(
        "/api/v1/assessments",
        json=VALID_PAYLOAD,
    )

    assert response.status_code == 201

    body = response.json()

    assert body["status"] == "REQUESTED"
    assert body["target_platform"] == "Sentinel"
    assert body["risk_tier"] == "TIER_1"
    assert body["correlation_id"]


def test_unauthorized_requester_is_rejected():
    payload = {
        **VALID_PAYLOAD,
        "requester_role": "viewer",
    }

    response = client.post(
        "/api/v1/assessments",
        json=payload,
    )

    assert response.status_code == 403


def test_missing_scope_is_rejected():
    payload = {
        **VALID_PAYLOAD,
        "scope": "",
    }

    response = client.post(
        "/api/v1/assessments",
        json=payload,
    )

    assert response.status_code == 422


def test_invalid_risk_tier_is_rejected():
    payload = {
        **VALID_PAYLOAD,
        "risk_tier": "TIER_9",
    }

    response = client.post(
        "/api/v1/assessments",
        json=payload,
    )

    assert response.status_code == 422


def test_valid_assessment_transition():
    create_response = client.post(
        "/api/v1/assessments",
        json=VALID_PAYLOAD,
    )

    assert create_response.status_code == 201

    assessment_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/assessments/{assessment_id}/transition",
        params={
            "target_status": "TRIAGED",
            "actor": "security-quality-verifier",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "TRIAGED"
    assert response.json()["version"] == 2


def test_invalid_assessment_transition_returns_409():
    create_response = client.post(
        "/api/v1/assessments",
        json=VALID_PAYLOAD,
    )

    assert create_response.status_code == 201

    assessment_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/assessments/{assessment_id}/transition",
        params={
            "target_status": "CERTIFICATION",
            "actor": "security-quality-verifier",
        },
    )

    assert response.status_code == 409
    assert "Invalid transition" in response.json()["detail"]
