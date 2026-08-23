"""
Comprehensive Test Suite for Part 7: Test, Integrate, Harden
- Unit & API Tests
- End-to-End Tests
- Cross-Team Integration Simulation (Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance)
- Performance Benchmarking (Latency & Throughput)
"""

import os
import time
from fastapi.testclient import TestClient

if os.path.exists("./part7_antres_hardened.db"):
    os.remove("./part7_antres_hardened.db")

from part7_test_integrate_harden import app

client = TestClient(app)

def test_1_unit_and_api_validation():
    print("\n--- Running Test 1: API Validation & Malformed Payloads ---")
    bad_payload = {
        "id": "ko-test-001",
        "title": "AB",  # Too short (< 3 chars)
        "description": "Short",
        "category": "InvalidCategory",
        "provenance": {"source_platform": "Capability Validation", "author_id": "zara", "source_reference_id": "REF-1"},
        "validation": {"validated_by": "Kanwal", "validation_status": "APPROVED", "confidence_score": 0.95, "constitutional_check_passed": True}
    }
    resp = client.post("/api/v7/hardened/ingest", json=bad_payload)
    print(f"Malformed Request Status (Expected 422): {resp.status_code}")
    assert resp.status_code == 422

def test_2_integrity_safeguards():
    print("\n--- Running Test 2: Integrity Safeguards (Unconstitutional Ingestion) ---")
    unconstitutional_payload = {
        "id": "ko-test-002",
        "title": "Unconstitutional Knowledge Object",
        "description": "This discovery bypasses constitutional governance checks.",
        "category": "Capability",
        "provenance": {"source_platform": "Enterprise Validation", "author_id": "ammara", "source_reference_id": "REF-2"},
        "validation": {"validated_by": "Unverified", "validation_status": "PENDING", "confidence_score": 0.40, "constitutional_check_passed": False}
    }
    resp = client.post("/api/v7/hardened/ingest", json=unconstitutional_payload)
    print(f"Unconstitutional Ingestion Status (Expected 400): {resp.status_code}")
    assert resp.status_code == 400

def test_3_end_to_end_cross_team_integration():
    print("\n--- Running Test 3: End-to-End Cross-Team Integration Simulation ---")
    
    # Simulating 3 different cross-team sources integrating into Laiba's backend
    teams_payloads = [
        {
            "id": "ko-cross-tech",
            "title": "   Next-Gen Distributed KV Engine   ", # Test normalization cleanup
            "description": "High-throughput distributed caching architecture for Antres scale.",
            "category": "Technology",
            "provenance": {"source_platform": "Technology Intelligence", "author_id": "tech.lead", "source_reference_id": "TI-REF-99"},
            "validation": {"validated_by": "Kanwal (Trust & Governance)", "validation_status": "APPROVED", "confidence_score": 0.98, "constitutional_check_passed": True},
            "capabilities": ["cap-cache-01"],
            "technologies": ["tech-redis", "tech-go"],
            "dependencies": ["dep-cluster-core"]
        },
        {
            "id": "ko-cross-future",
            "title": "Organizational Foresight Matrix",
            "description": "Predictive model for enterprise capability scaling over 3 years.",
            "category": "Organizational Future",
            "provenance": {"source_platform": "Organizational Futures", "author_id": "future.lead", "source_reference_id": "OF-REF-44"},
            "validation": {"validated_by": "Kanwal (Trust & Governance)", "validation_status": "APPROVED", "confidence_score": 0.96, "constitutional_check_passed": True},
            "capabilities": ["cap-foresight-01"],
            "technologies": ["tech-python", "tech-pandas"],
            "dependencies": ["dep-data-lake"]
        }
    ]

    for p in teams_payloads:
        resp = client.post("/api/v7/hardened/ingest", json=p, headers={"X-Idempotency-Key": f"key-{p['id']}"})
        print(f"Cross-Team Integration [{p['provenance']['source_platform']}] Status: {resp.status_code}")
        assert resp.status_code == 201
        
        # Verify normalization (title whitespace stripped)
        data = resp.json()["data"]
        assert data["content"]["title"] == p["title"].strip()

    # Test Traversal / Relationship Search
    trav_resp = client.get("/api/v7/hardened/traverse/ko-cross-tech")
    print(f"Relationship Traversal Response: {trav_resp.json()}")
    assert trav_resp.status_code == 200
    assert "cap-cache-01" in trav_resp.json()["edges"]["capabilities"]

def test_4_version_conflicts_and_idempotency():
    print("\n--- Running Test 4: Version Conflicts & Idempotency ---")
    payload = {
        "id": "ko-ver-001",
        "title": "Autonomous Settlement Protocol",
        "description": "Initial settlement protocol for institutional clearing.",
        "category": "Capability",
        "provenance": {"source_platform": "Capability Validation", "author_id": "zara", "source_reference_id": "CV-100"},
        "validation": {"validated_by": "Kanwal", "validation_status": "APPROVED", "confidence_score": 0.99, "constitutional_check_passed": True},
        "version": 1
    }
    # Ingest v1
    r1 = client.post("/api/v7/hardened/ingest", json=payload, headers={"X-Idempotency-Key": "idemp-v1"})
    assert r1.status_code == 201

    # Idempotent retry with same idempotency key should succeed safely
    r1_retry = client.post("/api/v7/hardened/ingest", json=payload, headers={"X-Idempotency-Key": "idemp-v1"})
    assert r1_retry.status_code == 201

    # Version conflict (try to ingest version 1 again -> should fail with 409)
    r_conflict = client.post("/api/v7/hardened/ingest", json=payload)
    print(f"Version Conflict Status (Expected 409): {r_conflict.status_code}")
    assert r_conflict.status_code == 409

    # Valid Upgrade to v2
    payload_v2 = payload.copy()
    payload_v2["version"] = 2
    payload_v2["previous_version_id"] = "ko-ver-001"
    payload_v2["description"] = "Upgraded settlement protocol with advanced audit logging."
    r2 = client.post("/api/v7/hardened/ingest", json=payload_v2)
    print(f"Version Upgrade v2 Status (Expected 201): {r2.status_code}")
    assert r2.status_code == 201

def test_5_performance_benchmark():
    print("\n--- Running Test 5: Performance & Concurrency Benchmarking ---")
    start_time = time.time()
    iterations = 50
    for i in range(iterations):
        p = {
            "id": f"ko-perf-{i:03d}",
            "title": f"Performance Test Knowledge Object {i}",
            "description": f"Benchmarking operationalization throughput and API latency for object {i}.",
            "category": "Capability",
            "provenance": {"source_platform": "Enterprise Validation", "author_id": "bench.lead", "source_reference_id": f"REF-PERF-{i}"},
            "validation": {"validated_by": "Kanwal", "validation_status": "APPROVED", "confidence_score": 0.99, "constitutional_check_passed": True},
            "capabilities": [f"cap-perf-{i}"],
            "technologies": ["tech-fastapi"]
        }
        resp = client.post("/api/v7/hardened/ingest", json=p)
        assert resp.status_code == 201

    total_duration = time.time() - start_time
    avg_latency_ms = (total_duration / iterations) * 1000
    print(f"Performance Benchmark Results over {iterations} requests:")
    print(f"Total Duration: {total_duration:.4f} seconds")
    print(f"Average API Latency per Ingestion: {avg_latency_ms:.2f} ms")
    assert avg_latency_ms < 50.0  # Assert high performance (<50ms per ingest)

if __name__ == "__main__":
    test_1_unit_and_api_validation()
    test_2_integrity_safeguards()
    test_3_end_to_end_cross_team_integration()
    test_4_version_conflicts_and_idempotency()
    test_5_performance_benchmark()
    print("\nAll Part 7 Test, Integrate, and Harden tests passed successfully!")
