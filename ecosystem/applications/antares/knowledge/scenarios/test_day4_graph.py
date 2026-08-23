"""
Automated Test Suite for Day 4 Knowledge Graph & Retrieval Intelligence
"""

import os
from fastapi.testclient import TestClient

# Clean up previous db
if os.path.exists("./antres_knowledge_graph.db"):
    os.remove("./antres_knowledge_graph.db")

from day4_knowledge_graph import app

client = TestClient(app)

def test_knowledge_graph_workflow():
    # 1. Create Knowledge Graph Nodes with Machine-Readable Relationships
    node1 = {
        "id": "ko-graph-01",
        "title": "Automated Fraud Detection Framework",
        "description": "Real-time AI capability model for detecting fraudulent transactions across Antres banking channels.",
        "category": "Capability",
        "source_team": "Enterprise Validation (Ammara)",
        "author_id": "ammara.lead",
        "validation_status": "APPROVED",
        "confidence_score": 0.98,
        "capabilities": ["cap-fin-fraud-01", "cap-core-security"],
        "technologies": ["tech-fastapi", "tech-pytorch"],
        "governance_patterns": ["gov-sec-tier1"],
        "organizational_problems": ["prob-high-chargebacks"],
        "evidence_links": ["ev-fin-log-88"],
        "dependencies": ["dep-db-cluster"],
        "related_knowledge": ["ko-graph-02"],
        "version": 1,
        "metadata_tags": {"domain": "Fintech", "priority": "High"}
    }

    resp1 = client.post("/api/v4/graph/nodes", json=node1)
    print("Node 1 Creation Status:", resp1.status_code)
    assert resp1.status_code == 201

    node2 = {
        "id": "ko-graph-02",
        "title": "Customer Identity Verification Protocol",
        "description": "Biometric and document verification workflow for onboarding new enterprise users.",
        "category": "Capability",
        "source_team": "Capability Validation (Zara)",
        "author_id": "zara.val",
        "validation_status": "APPROVED",
        "confidence_score": 0.92,
        "capabilities": ["cap-fin-fraud-01", "cap-user-auth"],
        "technologies": ["tech-fastapi", "tech-redis"],
        "governance_patterns": ["gov-privacy-gdpr"],
        "organizational_problems": ["prob-slow-onboarding"],
        "evidence_links": ["ev-user-survey-12"],
        "dependencies": ["dep-auth-service"],
        "related_knowledge": ["ko-graph-01"],
        "version": 1,
        "metadata_tags": {"domain": "Identity", "priority": "Medium"}
    }

    resp2 = client.post("/api/v4/graph/nodes", json=node2)
    print("Node 2 Creation Status:", resp2.status_code)
    assert resp2.status_code == 201

    # 2. Test Intelligent Search & Traversal (Linked Capability Filter)
    search_resp = client.get("/api/v4/graph/search?linked_capability=cap-fin-fraud-01")
    print("Search by Linked Capability Status:", search_resp.status_code)
    data = search_resp.json()
    print("Total Matches:", data["total_matches"])
    assert search_resp.status_code == 200
    assert data["total_matches"] == 2  # Both nodes link to cap-fin-fraud-01

    # Verify Context-Rich Retrieval (Checking that output contains graph edges & provenance)
    first_result = data["results"][0]
    assert "knowledge_graph_edges" in first_result
    assert "provenance_and_validation" in first_result
    assert first_result["provenance_and_validation"]["confidence_score"] >= 0.92  # Sorted by confidence ranking

    # 3. Test Keyword Search & Confidence Filtering
    keyword_resp = client.get("/api/v4/graph/search?q=fraud&min_confidence=0.95")
    print("Keyword Search Status:", keyword_resp.status_code)
    kw_data = keyword_resp.json()
    print("Keyword Matches:", kw_data["total_matches"])
    assert keyword_resp.status_code == 200
    assert kw_data["total_matches"] == 1
    assert kw_data["results"][0]["node_id"] == "ko-graph-01"

    print("\nAll Day 4 Knowledge Graph & Retrieval Intelligence tests passed successfully!")

if __name__ == "__main__":
    test_knowledge_graph_workflow()
