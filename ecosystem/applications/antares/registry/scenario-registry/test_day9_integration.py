"""
Automated Test Suite for Day 9 Cross-Team Integration Layer.
Covers: invalid requests, duplicate submissions, version conflicts,
and end-to-end ingestion from every upstream Antares platform.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "day8"))

# DIN7 FIX: removed this file's own os.remove("./antres_production_knowledge.db")
# at module (collection) time — see the matching note in test_part8_production.py
# for why a raw delete here raced with test_part8_production.py /
# test_day10_final_demo.py sharing the same engine.
#
# A plain replacement reset at module level isn't enough either: pytest collects
# every test file before it executes any of them, and test_day10_final_demo.py
# (which ingests these same sample IDs and correctly resets before running) is
# collected AND executed before this module's tests run. A collection-time reset
# here would happen before day10 even runs, so day10's leftover data would still
# be sitting in the table by the time this module's tests actually execute.
# The autouse fixture below resets at the right point instead — right before
# this module's own tests run, whatever ran before it.

import pytest
from fastapi.testclient import TestClient
from day9_cross_team_integration import app, CROSS_TEAM_SAMPLE_PAYLOADS

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _clean_slate_for_day9_suite():
    from part8_production_antres_platform import engine, Base, PROD_DB_URL
    engine.dispose()
    db_path = PROD_DB_URL.replace("sqlite:///./", "")
    if os.path.exists(db_path):
        os.remove(db_path)
    Base.metadata.create_all(bind=engine)


def test_cross_team_check_integrates_all_upstream_platforms():
    response = client.post("/api/v9/integration/run-cross-team-check")
    assert response.status_code == 200
    body = response.json()
    assert body["total_platforms_tested"] == len(CROSS_TEAM_SAMPLE_PAYLOADS)
    assert body["failed"] == 0
    assert body["integrated"] == len(CROSS_TEAM_SAMPLE_PAYLOADS)


def test_status_report_groups_by_source_platform():
    response = client.get("/api/v9/integration/status-report")
    assert response.status_code == 200
    body = response.json()
    assert body["total_active_knowledge_objects"] >= len(CROSS_TEAM_SAMPLE_PAYLOADS)
    # every platform from the sample catalog should appear in the grouping
    for payload in CROSS_TEAM_SAMPLE_PAYLOADS:
        assert payload["provenance"]["source_platform"] in body["objects_by_source_platform"]


def test_duplicate_submission_from_same_platform_is_version_conflict():
    duplicate_payload = dict(CROSS_TEAM_SAMPLE_PAYLOADS[0])
    duplicate_payload["version"] = 1  # same id, same version as already-ingested object
    response = client.post("/api/v8/production/ingest", json=duplicate_payload)
    assert response.status_code == 409


def test_new_version_of_existing_object_is_accepted():
    updated_payload = dict(CROSS_TEAM_SAMPLE_PAYLOADS[0])
    updated_payload["version"] = 2
    updated_payload["description"] = "Updated: expanded fraud detection capability with real-time scoring v2."
    response = client.post("/api/v8/production/ingest", json=updated_payload)
    assert response.status_code == 201
    assert response.json()["data"]["object_identity"]["version"] == 2


def test_invalid_category_from_upstream_platform_rejected_with_422():
    bad_payload = dict(CROSS_TEAM_SAMPLE_PAYLOADS[3])
    bad_payload["id"] = "ko-invalid-category-999"
    bad_payload["category"] = "NotARealCategory"
    response = client.post("/api/v8/production/ingest", json=bad_payload)
    assert response.status_code == 422


def test_unapproved_validation_status_rejected():
    bad_payload = dict(CROSS_TEAM_SAMPLE_PAYLOADS[4])
    bad_payload["id"] = "ko-unapproved-888"
    bad_payload["validation"] = dict(bad_payload["validation"])
    bad_payload["validation"]["validation_status"] = "PENDING_REVIEW"
    response = client.post("/api/v8/production/ingest", json=bad_payload)
    assert response.status_code == 400


def test_missing_provenance_rejected():
    bad_payload = dict(CROSS_TEAM_SAMPLE_PAYLOADS[2])
    bad_payload["id"] = "ko-missing-provenance-777"
    bad_payload["provenance"] = dict(bad_payload["provenance"])
    bad_payload["provenance"]["author_id"] = ""
    response = client.post("/api/v8/production/ingest", json=bad_payload)
    assert response.status_code == 400
