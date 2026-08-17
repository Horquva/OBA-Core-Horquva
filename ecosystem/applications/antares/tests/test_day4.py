"""
test_day4.py

Tests for the v1 Impact Analysis Engine (Part-3).

Follows the same pattern as test_day2.py: fresh in-memory-style SQLite
DB per test run via FastAPI's TestClient, so tests don't depend on
whatever's sitting in the local dev database.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

# use a separate throwaway db for tests, same as test_day2.py
os.environ.setdefault("TESTING", "1")

from app.main import app  # noqa: E402
from app.impact_engine import classify_dimensions  # noqa: E402
from app.models import DimensionName  # noqa: E402


@pytest.fixture
def client():
    """
    Using TestClient as a context manager (not just TestClient(app)) is
    what actually triggers FastAPI's startup event - that's what seeds
    the 10 organizational dimensions. Missing this the first time round
    caused every dimension lookup in the engine to come back empty.
    """
    with TestClient(app) as c:
        yield c


# ---------- Pure classification logic (no DB needed) ----------

def test_classify_dimensions_matches_leadership_and_decision_making():
    text = "The company removed a layer of leadership and gave teams direct decision authority."
    matched = classify_dimensions(text)
    assert DimensionName.LEADERSHIP in matched
    assert DimensionName.DECISION_MAKING in matched


def test_classify_dimensions_no_match_returns_empty_list():
    text = "The weather was unusually warm this week."
    matched = classify_dimensions(text)
    assert matched == []


# ---------- Full endpoint flow (DB + API) ----------

def _create_test_signal(client):
    """
    Each call generates a slightly unique title so Day 2's duplicate
    detection (see test_duplicate_signal_detection in test_day2.py)
    doesn't flag back-to-back test signals as near-duplicates of each
    other and return a 409 instead of a fresh signal.
    """
    unique_tag = uuid.uuid4().hex[:8]
    response = client.post(
        # check_duplicates=false here on purpose - these tests are
        # about the impact engine, not Day 2's duplicate detection
        # (that's already covered by test_day2.py), and every test
        # signal is intentionally similar in wording so it reliably
        # matches the same keywords.
        "/signals?check_duplicates=false",
        json={
            "title": f"Flattened management structure {unique_tag}",
            "description": (
                "Company X removed a layer of middle management and gave "
                "teams direct decision-making authority over their own workflow."
            ),
            "source": "test-suite",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_analyze_signal_creates_impacts(client):
    signal_id = _create_test_signal(client)

    response = client.post(f"/signals/{signal_id}/analyze")
    assert response.status_code == 200

    impacts = response.json()
    assert len(impacts) > 0

    # every impact should be marked "inferred" - this is a keyword
    # match, not an observed fact, and the API must be honest about that
    for impact in impacts:
        assert impact["confidence"] == "inferred"
        assert impact["signal_id"] == signal_id


def test_analyze_signal_is_idempotent_by_default(client):
    signal_id = _create_test_signal(client)

    first_run = client.post(f"/signals/{signal_id}/analyze").json()
    second_run = client.post(f"/signals/{signal_id}/analyze").json()

    # second call without force=true should return the SAME impacts,
    # not create duplicates
    assert len(first_run) == len(second_run)
    assert {i["id"] for i in first_run} == {i["id"] for i in second_run}


def test_analyze_signal_force_creates_additional_impacts(client):
    signal_id = _create_test_signal(client)

    first_run = client.post(f"/signals/{signal_id}/analyze").json()
    forced_run = client.post(f"/signals/{signal_id}/analyze?force=true").json()

    # forced_run only returns the newly-created batch (same count as
    # first_run's batch), but it should be a genuinely NEW set of rows,
    # not the same ones being handed back again.
    assert len(forced_run) == len(first_run)
    assert {i["id"] for i in forced_run}.isdisjoint({i["id"] for i in first_run})

    # and the total impacts stored for this signal should now be double,
    # since force=true adds on top instead of replacing
    all_impacts = client.get(f"/signals/{signal_id}/analysis").json()
    assert len(all_impacts) == len(first_run) + len(forced_run)


def test_analyze_signal_missing_signal_returns_404(client):
    response = client.post("/signals/does-not-exist/analyze")
    assert response.status_code == 404


def test_analyze_signal_creates_relationships(client):
    signal_id = _create_test_signal(client)
    client.post(f"/signals/{signal_id}/analyze")

    rel_response = client.get(f"/relationships?source_id={signal_id}")
    assert rel_response.status_code == 200
    relationships = rel_response.json()

    assert len(relationships) > 0
    for rel in relationships:
        assert rel["source_type"] == "signal"
        assert rel["target_type"] == "impact"
        assert rel["relationship_type"] == "produced"
