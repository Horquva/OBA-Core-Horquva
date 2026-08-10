from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


ASSESSMENT_PAYLOAD = {
    "requester": "mustafa",
    "requester_role": "security-quality",
    "target_platform": "Sentinel",
    "target_capability": "DevSecOps",
    "environment": "test",
    "scope": "Verify CI/CD ingestion",
    "risk_tier": "TIER_2",
    "verification_depth": "STANDARD",
    "responsible_owner": "devsecops-owner",
    "verification_authority": "security-quality",
    "acceptance_criteria": "Pipeline results must be ingested",
}


def test_ci_verification_result_can_be_ingested():
    assessment_response = client.post(
        "/api/v1/assessments",
        json=ASSESSMENT_PAYLOAD,
    )

    assert assessment_response.status_code == 201

    assessment_id = assessment_response.json()["id"]

    response = client.post(
        "/api/v1/verification/ingest",
        json={
            "assessment_id": assessment_id,
            "source": "github-actions",
            "check_type": "sast",
            "result": "PASS",
            "evidence_sha256": "a" * 64,
            "artifact_reference": "artifacts/semgrep.json",
            "actor": "ci-pipeline",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["assessment_id"] == assessment_id
    assert body["result"] == "PASS"
    assert body["status"] == "INGESTED"
    assert body["evidence_id"] is not None
