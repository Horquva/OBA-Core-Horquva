from fastapi.testclient import TestClient

from security_quality_platform.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_lists_core_modules():
    response = client.get("/api/v1/readiness")

    assert response.status_code == 200

    body = response.json()

    assert body["ready"] is True
    assert "assessment" in body["modules"]
    assert "evidence" in body["modules"]
    assert "certification" in body["modules"]
