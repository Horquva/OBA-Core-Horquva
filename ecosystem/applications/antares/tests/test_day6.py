"""
test_day6.py

Tests for the v1 Future Organization Modeling Engine (Part-5).

Same setup pattern as the earlier day tests: TestClient as a context
manager for dimension seeding, check_duplicates=false + unique tags so
Day 2's duplicate detection doesn't interfere.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TESTING", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _create_analyzed_signal(client, description: str):
    unique_tag = uuid.uuid4().hex[:8]
    signal = client.post(
        "/signals?check_duplicates=false",
        json={
            "title": f"Signal {unique_tag}",
            "description": description,
            "source": "test-suite",
        },
    ).json()
    client.post(f"/signals/{signal['id']}/analyze")
    return signal["id"]


def _build_pattern_from_two_signals(client, description: str) -> str:
    """Creates 2 similarly-worded signals, analyzes and pattern-detects
    them, and returns the resulting pattern_id."""
    _create_analyzed_signal(client, description)
    _create_analyzed_signal(client, description)
    patterns = client.post("/patterns/detect").json()
    assert len(patterns) >= 1
    return patterns[0]["id"]


# ---------- Building a model ----------

def test_build_model_from_single_pattern(client):
    pattern_id = _build_pattern_from_two_signals(
        client,
        "Company removed a layer of middle management and gave teams "
        "direct decision-making authority over hiring.",
    )

    response = client.post("/models/build", json={"pattern_ids": [pattern_id]})
    assert response.status_code == 200

    model = response.json()
    assert model["confidence"] == "hypothesized"
    assert "workforce" in model["structure_notes"] or "decision_making" in model["structure_notes"]


def test_build_model_with_custom_name(client):
    pattern_id = _build_pattern_from_two_signals(
        client,
        "New governance policy changed how the board approves budget decisions.",
    )

    response = client.post(
        "/models/build",
        json={"pattern_ids": [pattern_id], "name": "AI-Native Adaptive Enterprise"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "AI-Native Adaptive Enterprise"


def test_build_model_combines_multiple_patterns(client):
    pattern_id_1 = _build_pattern_from_two_signals(
        client,
        "Executive team adopted an autonomous decision approval workflow.",
    )
    pattern_id_2 = _build_pattern_from_two_signals(
        client,
        "New governance policy changed how the board approves budget decisions.",
    )

    response = client.post(
        "/models/build", json={"pattern_ids": [pattern_id_1, pattern_id_2]}
    )
    assert response.status_code == 200
    model = response.json()

    # combining two different patterns should mention more than one
    # dimension in the structure notes
    assert "2 pattern(s)" in model["structure_notes"]


def test_build_model_skips_invalid_pattern_ids_but_still_builds(client):
    pattern_id = _build_pattern_from_two_signals(
        client,
        "Teams began using shared documentation to preserve institutional knowledge.",
    )

    response = client.post(
        "/models/build",
        json={"pattern_ids": [pattern_id, "does-not-exist"]},
    )
    assert response.status_code == 200  # still builds from the valid one


def test_build_model_all_invalid_pattern_ids_returns_404(client):
    response = client.post(
        "/models/build", json={"pattern_ids": ["fake-1", "fake-2"]}
    )
    assert response.status_code == 404


# ---------- Reading models back / queryable intelligence ----------

def test_read_model_by_id(client):
    pattern_id = _build_pattern_from_two_signals(
        client, "Autonomous operations reduced manual approval steps across teams."
    )
    model = client.post("/models/build", json={"pattern_ids": [pattern_id]}).json()

    response = client.get(f"/models/{model['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == model["id"]


def test_read_missing_model_returns_404(client):
    response = client.get("/models/does-not-exist")
    assert response.status_code == 404


def test_model_support_returns_contributing_patterns(client):
    pattern_id = _build_pattern_from_two_signals(
        client, "Cross-team collaboration tools changed how decisions get communicated."
    )
    model = client.post("/models/build", json={"pattern_ids": [pattern_id]}).json()

    response = client.get(f"/models/{model['id']}/support")
    assert response.status_code == 200

    support = response.json()
    assert len(support) == 1
    assert support[0]["source_type"] == "pattern"
    assert support[0]["source_id"] == pattern_id
    assert support[0]["relationship_type"] == "informs"


def test_model_support_missing_model_returns_404(client):
    response = client.get("/models/does-not-exist/support")
    assert response.status_code == 404
