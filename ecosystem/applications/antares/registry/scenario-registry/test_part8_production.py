"""
Comprehensive Acceptance Test Suite for Part 8: Final Working Antres Knowledge Layer
"""

import os
from fastapi.testclient import TestClient

if os.path.exists("./antres_production_knowledge.db"):
    os.remove("./antres_production_knowledge.db")

from part8_production_antres_platform import app

client = TestClient(app)

def test_production_acceptance_workflow():
    print("\n--- Running Part 8 Production Acceptance Verification ---")

    # Payload simulating Technology Intelligence platform output
    tech_payload = {
        "id": "ko-prod-tech-01",
        "title": "  Distributed Kafka Event Bus Architecture  ",
        "description": "Enterprise-grade real-time streaming backbone for Antres operational services.",
        "category": "Technology",
        "provenance": {
            "source_platform": "Technology Intelligence",
            "author_id": "tech.architect.01",
            "source_reference_id": "TI-REF-8812"
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.99,
            "constitutional_check_passed": True
        },
        "capabilities": ["cap-event-streaming-01"],
        "technologies": ["tech-kafka", "tech-python", "tech-zookeeper"],
        "dependencies": ["dep-core-network"],
        "version": 1,
        "audit_notes": "Operationalized into production from Technology Intelligence discovery."
    }

    # 1. Test Ingestion with Idempotency Key
    resp = client.post("/api/v8/production/ingest", json=tech_payload, headers={"X-Idempotency-Key": "prod-idemp-01"})
    print(f"Production Ingestion Status (Expected 201): {resp.status_code}")
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["object_identity"]["id"] == "ko-prod-tech-01"
    assert data["content"]["title"] == "Distributed Kafka Event Bus Architecture" # Normalized

    # 2. Test Retrieval API
    get_resp = client.get("/api/v8/production/knowledge/ko-prod-tech-01")
    print(f"Production Retrieval Status (Expected 200): {get_resp.status_code}")
    assert get_resp.status_code == 200
    assert get_resp.json()["cross_team_provenance"]["source_platform"] == "Technology Intelligence"

    # 3. Test Graph Traversal API
    trav_resp = client.get("/api/v8/production/traverse/ko-prod-tech-01")
    print(f"Production Traversal Response: {trav_resp.json()}")
    assert trav_resp.status_code == 200
    assert "tech-kafka" in trav_resp.json()["relationship_graph"]["technologies"]

    # 4. Test Version Upgrade (v2)
    v2_payload = tech_payload.copy()
    v2_payload["version"] = 2
    v2_payload["previous_version_id"] = "ko-prod-tech-01"
    v2_payload["description"] = "Enhanced distributed Kafka event bus architecture with zero-trust encryption."
    v2_payload["audit_notes"] = "Upgraded to v2 in production."

    v2_resp = client.post("/api/v8/production/ingest", json=v2_payload)
    print(f"Production v2 Upgrade Status (Expected 201): {v2_resp.status_code}")
    assert v2_resp.status_code == 201
    assert v2_resp.json()["data"]["object_identity"]["version"] == 2

    print("\nAll Part 8 Production Acceptance Tests Passed Successfully!")

if __name__ == "__main__":
    test_production_acceptance_workflow()
