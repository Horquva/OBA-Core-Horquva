"""
Automated Test Suite for Day 5 Knowledge Services & Reliability Engineering
"""

import os
from fastapi.testclient import TestClient

# Clean up previous db
if os.path.exists("./antres_knowledge_services.db"):
    os.remove("./antres_knowledge_services.db")

from day5_knowledge_services import app

client = TestClient(app)

def test_knowledge_services_workflow():
    payload = {
        "id": "ko-svc-001",
        "title": "Autonomous Financial Settlement Engine",
        "description": "Cross-platform technology capability model for automated institutional clearing.",
        "category": "Capability",
        "provenance": {
            "source_platform": "Capability Validation",
            "author_id": "zara.val.lead",
            "source_reference_id": "CV-REF-9921"
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.99,
            "constitutional_check_passed": True
        },
        "capabilities": ["cap-fin-settle-01"],
        "technologies": ["tech-fastapi", "tech-postgres"],
        "dependencies": ["dep-auth-gateway"],
        "version": 1,
        "permissions_tier": "ENTERPRISE_INTERNAL"
    }

    # 1. Test Ingestion without Idempotency Key (Should fail with 400)
    bad_resp = client.post("/api/v5/services/ingest", json=payload)
    print("Missing Idempotency Key Status:", bad_resp.status_code)
    assert bad_resp.status_code == 400

    # 2. Test Valid Idempotent Ingestion
    headers = {"X-Idempotency-Key": "idemp-key-abc-123"}
    resp = client.post("/api/v5/services/ingest", json=payload, headers=headers)
    print("Valid Ingestion Status:", resp.status_code)
    print("Valid Ingestion Response:", resp.json())
    assert resp.status_code == 201
    data = resp.json()
    assert data["service_metadata"]["object_id"] == "ko-svc-001"
    assert data["provenance_and_ownership"]["source_platform"] == "Capability Validation"

    # 3. Test Idempotency Retry (Same Key should return existing record successfully)
    retry_resp = client.post("/api/v5/services/ingest", json=payload, headers=headers)
    print("Idempotent Retry Status:", retry_resp.status_code)
    assert retry_resp.status_code == 201
    assert retry_resp.json()["service_metadata"]["object_id"] == "ko-svc-001"

    # 4. Test Operationalization Status Endpoint
    status_resp = client.get("/api/v5/services/status/ko-svc-001")
    print("Status Endpoint Response:", status_resp.json())
    assert status_resp.status_code == 200
    assert status_resp.json()["operationalization_status"] == "ACTIVE_OPERATIONALIZED"

    # 5. Test Relationship Traversal Endpoint
    trav_resp = client.get("/api/v5/services/traverse/ko-svc-001")
    print("Traversal Endpoint Response:", trav_resp.json())
    assert trav_resp.status_code == 200
    assert "cap-fin-settle-01" in trav_resp.json()["traversed_edges"]["capabilities"]

    print("\nAll Day 5 Knowledge Services & Reliability tests passed successfully!")

if __name__ == "__main__":
    test_knowledge_services_workflow()
