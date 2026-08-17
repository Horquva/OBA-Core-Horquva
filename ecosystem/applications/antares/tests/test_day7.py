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
        json={"title": f"Signal {unique_tag}", "description": description, "source": "test-suite"},
    ).json()
    client.post(f"/signals/{signal['id']}/analyze")
    return signal["id"]


def _full_chain(client, description: str):
    """Builds signal(s) -> pattern -> model -> returns (signal_id, model_id).

    Looks up which pattern THIS test's signal actually got linked to via
    the relationship graph, instead of assuming patterns[0] from
    /patterns/detect - other tests in this file create their own
    patterns too, so blindly taking the first result in the list can
    grab an unrelated pattern once more than one exists in the database.
    """
    signal_id_1 = _create_analyzed_signal(client, description)
    _create_analyzed_signal(client, description)
    client.post("/patterns/detect")

    rels = client.get(f"/relationships?source_id={signal_id_1}").json()
    pattern_id = next(r["target_id"] for r in rels if r["target_type"] == "pattern")

    model = client.post("/models/build", json={"pattern_ids": [pattern_id]}).json()
    return signal_id_1, model["id"]


def test_build_capability_from_model(client):
    _, model_id = _full_chain(
        client,
        "Company removed a layer of middle management and gave teams direct decision-making authority.",
    )
    response = client.post("/capabilities/build", json={"model_id": model_id})
    assert response.status_code == 200
    capability = response.json()
    assert capability["status"] == "candidate"
    assert capability["supporting_pattern_id"] is not None


def test_build_capability_missing_model_returns_404(client):
    response = client.post("/capabilities/build", json={"model_id": "fake-id"})
    assert response.status_code == 404


def test_read_capability_by_id(client):
    _, model_id = _full_chain(
        client, "New governance policy changed how the board approves budget decisions."
    )
    capability = client.post("/capabilities/build", json={"model_id": model_id}).json()
    response = client.get(f"/candidate-capabilities/{capability['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == capability["id"]


def test_read_missing_capability_returns_404(client):
    response = client.get("/candidate-capabilities/does-not-exist")
    assert response.status_code == 404


def test_intelligence_trace_returns_full_chain(client):
    signal_id, model_id = _full_chain(
        client, "Autonomous operations reduced manual approval steps across teams."
    )
    client.post("/capabilities/build", json={"model_id": model_id})

    response = client.get(f"/intelligence/trace/{signal_id}")
    assert response.status_code == 200
    trace = response.json()

    assert trace["signal"]["id"] == signal_id
    assert len(trace["impacts"]) > 0
    assert len(trace["patterns"]) > 0
    assert len(trace["models"]) > 0
    assert len(trace["candidate_capabilities"]) > 0
    # A shared pattern (same dimension combo) could theoretically have
    # more than one model built from it across different test runs -
    # models aren't deduplicated the way patterns are (see DAY7_NOTES).
    # So check membership, not exact ordering/uniqueness.
    assert model_id in [m["id"] for m in trace["models"]]


def test_intelligence_trace_missing_signal_returns_404(client):
    response = client.get("/intelligence/trace/does-not-exist")
    assert response.status_code == 404


def test_intelligence_trace_partial_chain_returns_empty_lists(client):
    # a signal that was created but never analyzed/patterned/modeled
    signal_id = _create_analyzed_signal(client, "A completely unremarkable event occurred.")
    response = client.get(f"/intelligence/trace/{signal_id}")
    assert response.status_code == 200
    trace = response.json()
    assert trace["patterns"] == []
    assert trace["models"] == []
    assert trace["candidate_capabilities"] == []
