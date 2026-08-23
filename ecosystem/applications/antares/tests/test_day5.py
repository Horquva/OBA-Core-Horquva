"""
test_day5.py

Tests for the v1 Pattern Detection Engine (Part-4).

Same pattern as test_day2.py / test_day4.py: TestClient used as a
context manager so FastAPI's startup event (dimension seeding) fires,
and every test signal uses check_duplicates=false + a unique tag so
Day 2's duplicate detection doesn't interfere with unrelated tests.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TESTING", "1")

from app.main import app  # noqa: E402
from app.pattern_engine import group_signals_by_dimensions  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _create_analyzed_signal(client, description: str):
    """
    Creates a signal with the given description and immediately runs
    Day 4's impact engine on it, so it has real dimension matches to
    group by. Returns the signal_id.
    """
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


# ---------- Pure grouping logic (no DB needed) ----------

def test_group_signals_requires_min_group_size():
    signal_dimension_map = {
        "s1": frozenset({"workforce", "decision_making"}),
        "s2": frozenset({"trust"}),  # only 1 signal has this set
    }
    groups = group_signals_by_dimensions(signal_dimension_map, min_group_size=2)
    assert groups == []  # neither group reaches size 2


def test_group_signals_groups_matching_dimension_sets():
    signal_dimension_map = {
        "s1": frozenset({"workforce", "decision_making"}),
        "s2": frozenset({"workforce", "decision_making"}),
        "s3": frozenset({"trust"}),
    }
    groups = group_signals_by_dimensions(signal_dimension_map, min_group_size=2)
    assert len(groups) == 1
    dims, signal_ids = groups[0]
    assert dims == frozenset({"workforce", "decision_making"})
    assert set(signal_ids) == {"s1", "s2"}


def test_group_signals_ignores_empty_dimension_sets():
    signal_dimension_map = {
        "s1": frozenset(),  # unanalyzed / no matches
        "s2": frozenset(),
    }
    groups = group_signals_by_dimensions(signal_dimension_map, min_group_size=2)
    assert groups == []


# ---------- Full endpoint flow (DB + API) ----------

def test_detect_patterns_creates_pattern_from_similar_signals(client):
    # Two signals worded so Day 4's keyword engine matches the same
    # dimensions (workforce + decision_making) for both.
    text = (
        "Company removed a layer of middle management and gave teams "
        "direct decision-making authority over hiring."
    )
    _create_analyzed_signal(client, text)
    _create_analyzed_signal(client, text)

    response = client.post("/patterns/detect")
    assert response.status_code == 200

    patterns = response.json()
    assert len(patterns) >= 1
    assert any("workforce" in p["name"] or "decision_making" in p["name"] for p in patterns)
    for p in patterns:
        assert p["confidence"] == "hypothesized"
        assert p["status"] == "created"


def test_detect_patterns_is_idempotent_on_names(client):
    text = "New governance policy changed how the board approves budget decisions."
    _create_analyzed_signal(client, text)
    _create_analyzed_signal(client, text)

    first_run = client.post("/patterns/detect").json()
    second_run = client.post("/patterns/detect").json()

    # re-running detection with no new signals should return the SAME
    # pattern(s), not create duplicates with the same name
    first_names = {p["name"] for p in first_run}
    second_names = {p["name"] for p in second_run}
    assert first_names == second_names

    all_patterns = client.get("/patterns").json()
    matching = [p for p in all_patterns if p["name"] in first_names]
    # exactly one row per unique pattern name, not two
    assert len(matching) == len(first_names)


def test_detect_patterns_links_signals_via_relationships(client):
    text = "Executive team adopted an autonomous decision approval workflow."
    signal_id_1 = _create_analyzed_signal(client, text)
    signal_id_2 = _create_analyzed_signal(client, text)

    client.post("/patterns/detect")

    rels_1 = client.get(f"/relationships?source_id={signal_id_1}").json()
    rels_2 = client.get(f"/relationships?source_id={signal_id_2}").json()

    assert any(r["target_type"] == "pattern" and r["relationship_type"] == "supports" for r in rels_1)
    assert any(r["target_type"] == "pattern" and r["relationship_type"] == "supports" for r in rels_2)


def test_detect_patterns_ignores_lone_signals(client):
    # Only one signal with this exact wording -> no pattern should form
    unique_tag = uuid.uuid4().hex[:8]
    text = f"A completely unique operational change happened, tag {unique_tag}."
    _create_analyzed_signal(client, text)

    before = {p["id"] for p in client.get("/patterns").json()}
    client.post("/patterns/detect")
    after = {p["id"] for p in client.get("/patterns").json()}

    assert before == after  # no new pattern created for a lone signal
