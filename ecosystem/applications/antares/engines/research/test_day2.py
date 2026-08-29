"""
test_day2.py

Basic functional tests for Day 2. Not trying to cover every edge case
yet (that's more of a Part-7 job) - this is just enough to prove the
core flow works: create a signal -> attach evidence -> store analysis
-> link a relationship -> read everything back.

Run with:
    pytest test_day2.py -v
"""

import os
import pytest
from fastapi.testclient import TestClient

# use a separate throwaway db for tests so I don't pollute the real one
os.environ.setdefault("TESTING", "1")

from .main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_dimensions_are_seeded(client):
    r = client.get("/dimensions")
    assert r.status_code == 200
    names = [d["name"] for d in r.json()]
    assert "governance" in names
    assert "workforce" in names
    assert len(names) == 10


def test_signal_lifecycle(client):
    # create
    r = client.post("/signals", json={
        "title": "Test signal",
        "description": "A test organizational signal for Day 2 checks.",
        "evidence_state": "observed",
    })
    assert r.status_code == 200
    signal = r.json()
    assert signal["version"] == 1

    # read back
    r = client.get(f"/signals/{signal['id']}")
    assert r.status_code == 200
    assert r.json()["title"] == "Test signal"

    # missing signal returns 404, not a silent empty result
    r = client.get("/signals/does-not-exist")
    assert r.status_code == 404


def test_evidence_requires_existing_signal(client):
    r = client.post("/evidence", json={
        "signal_id": "does-not-exist",
        "description": "orphan evidence",
    })
    assert r.status_code == 404


def test_analysis_links_signal_and_dimension(client):
    signal = client.post("/signals", json={
        "title": "Signal for analysis test",
        "description": "desc",
    }).json()

    dims = client.get("/dimensions").json()
    dim_id = [d for d in dims if d["name"] == "trust"][0]["id"]

    r = client.post("/analysis", json={
        "signal_id": signal["id"],
        "dimension_id": dim_id,
        "description": "Trust dynamics shifted after the change.",
        "confidence": "inferred",
    })
    assert r.status_code == 200

    r = client.get(f"/signals/{signal['id']}/analysis")
    assert len(r.json()) == 1


def test_signal_update_creates_history_and_bumps_version(client):
    signal = client.post("/signals", json={
        "title": "Original title",
        "description": "Original description",
    }).json()
    assert signal["version"] == 1

    r = client.patch(f"/signals/{signal['id']}", json={
        "description": "Updated description after review",
        "changed_by": "muhammad",
        "change_reason": "clarified after re-reading the source memo",
    })
    assert r.status_code == 200
    updated = r.json()
    assert updated["version"] == 2
    assert updated["description"] == "Updated description after review"
    # title untouched since it wasn't part of the update payload
    assert updated["title"] == "Original title"

    r = client.get(f"/signals/{signal['id']}/history")
    assert r.status_code == 200
    history = r.json()
    assert len(history) == 1
    assert history[0]["version"] == 1
    assert history[0]["description"] == "Original description"
    assert history[0]["change_reason"] == "clarified after re-reading the source memo"


def test_no_op_update_does_not_bump_version(client):
    signal = client.post("/signals", json={
        "title": "Stable signal",
        "description": "Nothing about this should change",
    }).json()

    r = client.patch(f"/signals/{signal['id']}", json={
        "title": "Stable signal",  # identical value
    })
    assert r.status_code == 200
    assert r.json()["version"] == 1  # unchanged, no history row should exist

    history = client.get(f"/signals/{signal['id']}/history").json()
    assert history == []


def test_update_missing_signal_returns_404(client):
    r = client.patch("/signals/does-not-exist", json={"title": "x"})
    assert r.status_code == 404


def test_duplicate_signal_detection(client):
    original = {
        "title": "Flattened management layers at a mid-size tech firm",
        "description": "Company removed a layer of middle management and gave "
        "squads direct budget authority over their own spend.",
    }
    r = client.post("/signals", json=original)
    assert r.status_code == 200

    # near-identical wording should be flagged, not silently duplicated
    r = client.post("/signals", json={
        "title": "Flattened management layers at a mid sized tech firm",
        "description": "Company removed a layer of middle management and gave "
        "squads direct budget authority over their own spend.",
    })
    assert r.status_code == 409
    assert "possible_duplicates" in r.json()["detail"]

    # the same payload should still go through if the caller overrides the check
    r = client.post(
        "/signals?check_duplicates=false",
        json={
            "title": "Flattened management layers at a mid sized tech firm",
            "description": "Company removed a layer of middle management and gave "
            "squads direct budget authority over their own spend.",
        },
    )
    assert r.status_code == 200


def test_relationship_round_trip(client):
    signal = client.post("/signals", json={
        "title": "Relationship test signal",
        "description": "desc",
    }).json()

    r = client.post("/relationships", json={
        "source_type": "signal",
        "source_id": signal["id"],
        "target_type": "pattern",
        "target_id": "placeholder-pattern-id",
        "relationship_type": "supports",
    })
    assert r.status_code == 200

    r = client.get(f"/relationships?source_id={signal['id']}")
    assert len(r.json()) == 1
    assert r.json()[0]["relationship_type"] == "supports"
