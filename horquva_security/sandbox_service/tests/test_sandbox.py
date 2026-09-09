from fastapi.testclient import TestClient
from horquva_security_py.sandbox_service.main import app

client = TestClient(app)


def test_allowed_capability_call_recorded():
    created = client.post("/sandbox/sessions", json={"agent_id": "a1", "allowed_capabilities": ["read"], "max_calls": 5})
    sid = created.json()["session_id"]
    resp = client.post(f"/sandbox/sessions/{sid}/call", json={"capability": "read"})
    assert resp.json()["allowed"] is True
    assert resp.json()["session"]["calls_made"] == 1


def test_disallowed_capability_denied():
    created = client.post("/sandbox/sessions", json={"agent_id": "a1", "allowed_capabilities": ["read"], "max_calls": 5})
    sid = created.json()["session_id"]
    resp = client.post(f"/sandbox/sessions/{sid}/call", json={"capability": "write"})
    assert resp.json()["allowed"] is False


def test_call_budget_enforced():
    created = client.post("/sandbox/sessions", json={"agent_id": "a1", "allowed_capabilities": ["read"], "max_calls": 1})
    sid = created.json()["session_id"]
    client.post(f"/sandbox/sessions/{sid}/call", json={"capability": "read"})
    resp = client.post(f"/sandbox/sessions/{sid}/call", json={"capability": "read"})
    assert resp.json()["allowed"] is False
    assert "budget" in resp.json()["reason"]


def test_destroyed_session_rejects_further_calls():
    created = client.post("/sandbox/sessions", json={"agent_id": "a1", "allowed_capabilities": ["read"], "max_calls": 5})
    sid = created.json()["session_id"]
    client.post(f"/sandbox/sessions/{sid}/destroy")
    resp = client.post(f"/sandbox/sessions/{sid}/call", json={"capability": "read"})
    assert resp.json()["allowed"] is False
    assert "destroyed" in resp.json()["reason"]


def test_unknown_session_404():
    assert client.get("/sandbox/sessions/nope").status_code == 404
