"""
Automated Test Suite for Day 6 OBA-Ready Knowledge Backend
"""

import os
from fastapi.testclient import TestClient

# Clean up previous db
if os.path.exists("./antres_oba_backend.db"):
    os.remove("./antres_oba_backend.db")

from day6_oba_backend import app

client = TestClient(app)

def test_oba_backend_workflow():
    payload_v1 = {
        "id": "ko-oba-001",
        "title": "Autonomous Institutional Clearing Protocol",
        "description": "Enterprise-grade financial clearing capability model for future OBA execution.",
        "category": "Capability",
        "provenance": {
            "source_platform": "Capability Validation",
            "author_id": "zara.lead",
            "source_reference_id": "CV-REF-1102"
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.99,
            "constitutional_check_passed": True
        },
        "capabilities": ["cap-fin-clearing-01"],
        "technologies": ["tech-fastapi", "tech-kafka"],
        "dependencies": ["dep-clearing-house"],
        "version": 1,
        "audit_trail_notes": "Initial deployment for OBA consumption."
    }

    # 1. Test Unvalidated Ingestion Safeguard (Should fail with 400)
    bad_payload = payload_v1.copy()
    bad_payload["validation"] = {
        "validated_by": "Unverified",
        "validation_status": "PENDING",
        "confidence_score": 0.50,
        "constitutional_check_passed": False
    }
    bad_resp = client.post("/api/v6/oba/knowledge", json=bad_payload)
    print("Unvalidated Safeguard Status:", bad_resp.status_code)
    assert bad_resp.status_code == 400

    # 2. Test Valid Initial Ingestion (v1)
    resp_v1 = client.post("/api/v6/oba/knowledge", json=payload_v1)
    print("Valid v1 Ingestion Status:", resp_v1.status_code)
    assert resp_v1.status_code == 201
    data_v1 = resp_v1.json()
    assert data_v1["machine_consumable_output"]["lifecycle_and_versioning"]["version"] == 1
    assert data_v1["machine_consumable_output"]["lifecycle_and_versioning"]["lifecycle_state"] == "ACTIVE_USABLE"

    # 3. Test Version Conflict Safeguard (Trying to overwrite with same version 1 -> should fail with 409)
    conflict_resp = client.post("/api/v6/oba/knowledge", json=payload_v1)
    print("Version Conflict Status:", conflict_resp.status_code)
    assert conflict_resp.status_code == 409

    # 4. Test Valid Version Upgrade (v2 Revision)
    payload_v2 = payload_v1.copy()
    payload_v2["version"] = 2
    payload_v2["previous_version_id"] = "ko-oba-001"
    payload_v2["description"] = "Updated enterprise-grade financial clearing capability model with enhanced OBA triggers."
    payload_v2["audit_trail_notes"] = "Upgraded to v2 with enhanced telemetry."

    resp_v2 = client.post("/api/v6/oba/knowledge", json=payload_v2)
    print("Valid v2 Upgrade Status:", resp_v2.status_code)
    assert resp_v2.status_code == 201
    data_v2 = resp_v2.json()
    assert data_v2["machine_consumable_output"]["lifecycle_and_versioning"]["version"] == 2
    assert data_v2["machine_consumable_output"]["lifecycle_and_versioning"]["previous_version_id"] == "ko-oba-001"

    # 5. Test Machine Consumption Retrieval API
    get_resp = client.get("/api/v6/oba/knowledge/ko-oba-001")
    print("Machine Consumption Retrieval Status:", get_resp.status_code)
    print("Machine Consumption Data:", get_resp.json())
    assert get_resp.status_code == 200
    assert get_resp.json()["lifecycle_and_versioning"]["version"] == 2

    print("\nAll Day 6 OBA Backend & Integrity Safeguards tests passed successfully!")

if __name__ == "__main__":
    test_oba_backend_workflow()
