"""
Automated Test Suite for Day 2 Backend Foundation
(Replaces the original submission, which was a saved JSON response
mistakenly saved with a .py extension and was not an executable test.)
"""
import os

if os.path.exists("./antres_knowledge.db"):
    os.remove("./antres_knowledge.db")

from fastapi.testclient import TestClient
from day2_backend_foundation import app

client = TestClient(app)

SAMPLE_PAYLOAD = {
    "id": "ko-fin-001",
    "title": "Automated Risk Scoring Protocol",
    "description": "Validated risk assessment model for real-time fintech lending validation.",
    "category": "Capability",
    "source": {
        "source_team": "Enterprise Validation (Ammara)",
        "author_id": "ammara.lead",
        "source_reference_id": "REF-VAL-882"
    },
    "validation": {
        "validated_by": "Kanwal (Trust & Governance)",
        "validation_status": "APPROVED",
        "confidence_score": 0.98,
        "constitutional_check_passed": True
    },
    "related_capabilities": ["cap-lend-01"],
    "related_technologies": ["tech-fastapi", "tech-sqlite"],
    "metadata_tags": {"tier": "Enterprise", "security": "Strict"},
    "version": 1,
    "previous_version_id": None,
}


def test_ingest_knowledge_returns_201():
    response = client.post("/api/v1/knowledge", json=SAMPLE_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "ko-fin-001"
    assert body["is_active"] is True


def test_duplicate_ingestion_is_rejected():
    # First ingestion already happened in the previous test (shared TestClient/db).
    response = client.post("/api/v1/knowledge", json=SAMPLE_PAYLOAD)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_get_knowledge_by_id():
    response = client.get("/api/v1/knowledge/ko-fin-001")
    assert response.status_code == 200
    assert response.json()["title"] == "Automated Risk Scoring Protocol"


def test_get_missing_knowledge_returns_404():
    response = client.get("/api/v1/knowledge/does-not-exist")
    assert response.status_code == 404


def test_list_knowledge_returns_active_objects():
    response = client.get("/api/v1/knowledge")
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert "ko-fin-001" in ids


def test_invalid_payload_missing_required_field_returns_422():
    bad_payload = dict(SAMPLE_PAYLOAD)
    bad_payload["id"] = "ko-fin-002"
    del bad_payload["source"]  # required field
    response = client.post("/api/v1/knowledge", json=bad_payload)
    assert response.status_code == 422


def test_invalid_confidence_score_out_of_range_returns_422():
    bad_payload = dict(SAMPLE_PAYLOAD)
    bad_payload["id"] = "ko-fin-003"
    bad_payload["validation"] = dict(SAMPLE_PAYLOAD["validation"])
    bad_payload["validation"]["confidence_score"] = 1.5  # out of 0-1 range
    response = client.post("/api/v1/knowledge", json=bad_payload)
    assert response.status_code == 422
