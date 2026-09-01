from fastapi.testclient import TestClient
from horquva_security_py.kill_switch_controller.main import app

client = TestClient(app)


def test_trip_and_status():
    client.post("/kill-switch/trip", json={"scope": "agent-1", "tripped_by": "human-1", "reason": "misbehaving"})
    resp = client.get("/kill-switch/agent-1/status")
    assert resp.json()["state"] == "tripped"


def test_is_blocked_true_after_trip():
    client.post("/kill-switch/trip", json={"scope": "agent-2", "tripped_by": "human-1", "reason": "test"})
    resp = client.get("/kill-switch/agent-2/is-blocked")
    assert resp.json()["blocked"] is True


def test_global_trip_blocks_every_scope():
    client.post("/kill-switch/trip", json={"scope": "global", "tripped_by": "human-1", "reason": "incident"})
    resp = client.get("/kill-switch/some-random-agent/is-blocked")
    assert resp.json()["blocked"] is True
    # cleanup for other tests
    client.post("/kill-switch/global/reset", json={"reset_by": "human-2"})


def test_self_reset_by_tripper_denied():
    client.post("/kill-switch/trip", json={"scope": "agent-3", "tripped_by": "agent-3", "reason": "self-tripped"})
    resp = client.post("/kill-switch/agent-3/reset", json={"reset_by": "agent-3"})
    assert resp.status_code == 403


def test_reset_by_different_actor_succeeds():
    client.post("/kill-switch/trip", json={"scope": "agent-4", "tripped_by": "human-1", "reason": "test"})
    resp = client.post("/kill-switch/agent-4/reset", json={"reset_by": "human-2"})
    assert resp.json()["state"] == "armed"
