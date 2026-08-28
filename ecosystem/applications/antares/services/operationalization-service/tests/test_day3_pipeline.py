"""
Automated Test Suite for Day 3 Live Knowledge Operationalization Pipeline
"""

import os
from fastapi.testclient import TestClient

# Clean up previous db
if os.path.exists("./antres_live_pipeline.db"):
    os.remove("./antres_live_pipeline.db")

from day3_live_pipeline import app

client = TestClient(app)

def test_live_pipeline_workflow():
    # 1. Test Valid Ingestion & Pipeline Execution
    payload = {
        "id": "ko-live-999",
        "title":   "  automated compliance validation engine  ",
        "description": "  This is a validated enterprise compliance system for cross-border financial transactions.  ",
        "category": "Capability",
        "source": {
            "source_team": "Enterprise Validation (Ammara)",
            "author_id": "ammara.lead",
            "source_reference_id": "EV-REF-4421",
            "original_discovery_id": "DISC-RAW-7732"
        },
        "validation": {
            "validated_by": "Kanwal (Trust & Governance)",
            "validation_status": "APPROVED",
            "confidence_score": 0.96,
            "constitutional_check_passed": True
        },
        "tags": ["Compliance", "Fintech", "COMPLIANCE", "Security"],
        "related_capabilities": ["cap-fin-09", "cap-gov-02"],
        "related_technologies": ["tech-fastapi", "tech-python"]
    }

    response = client.post("/api/v3/pipeline/ingest", json=payload)
    print("Pipeline Execution Status:", response.status_code)
    print("Pipeline Execution Response:", response.json())
    
    assert response.status_code == 201
    data = response.json()
    
    # Verify Normalization
    assert data["operational_object"]["title"] == "Automated Compliance Validation Engine"
    assert data["operational_object"]["normalized_tags"] == ["compliance", "fintech", "security"]
    
    # Verify Traceability / Provenance
    provenance = data["provenance_trace"]
    assert provenance["operational_knowledge_id"] == "ko-live-999"
    assert provenance["provenance_chain"]["step_5_original_discovery_id"] == "DISC-RAW-7732"
    assert provenance["provenance_chain"]["step_3_validation_record"]["validated_by"] == "Kanwal (Trust & Governance)"

    # 2. Test Provenance Trace Endpoint
    trace_response = client.get("/api/v3/pipeline/trace/ko-live-999")
    print("Trace Endpoint Status:", trace_response.status_code)
    print("Trace Endpoint JSON:", trace_response.json())
    assert trace_response.status_code == 200
    assert trace_response.json()["provenance_chain"]["step_5_original_discovery_id"] == "DISC-RAW-7732"

    # 3. Test Schema Validation Error (Invalid Category)
    invalid_payload = payload.copy()
    invalid_payload["id"] = "ko-live-888"
    invalid_payload["category"] = "InvalidCategory"
    
    val_error_response = client.post("/api/v3/pipeline/ingest", json=invalid_payload)
    print("Validation Error Status:", val_error_response.status_code)
    assert val_error_response.status_code == 422

    print("\nAll Day 3 Live Pipeline & Traceability tests passed successfully!")

if __name__ == "__main__":
    test_live_pipeline_workflow()
