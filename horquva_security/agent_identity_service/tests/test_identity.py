from fastapi.testclient import TestClient
from horquva_security_py.agent_identity_service.main import app

client = TestClient(app)


def test_register_and_verify():
    reg = client.post("/agents/register", json={
        "agent_id": "agent-x", "display_name": "Agent X", "owner": "team-a",
    })
    assert reg.status_code == 201
    credential = reg.json()["credential"]

    verify_ok = client.post("/agents/verify", json={"agent_id": "agent-x", "credential": credential})
    assert verify_ok.json()["verified"] is True

    verify_bad = client.post("/agents/verify", json={"agent_id": "agent-x", "credential": "wrong"})
    assert verify_bad.json()["verified"] is False


def test_duplicate_registration_rejected():
    client.post("/agents/register", json={"agent_id": "dup-1", "display_name": "D", "owner": "t"})
    resp = client.post("/agents/register", json={"agent_id": "dup-1", "display_name": "D", "owner": "t"})
    assert resp.status_code == 409


def test_unknown_agent_status_404():
    assert client.get("/agents/does-not-exist").status_code == 404


def test_deactivate_agent():
    client.post("/agents/register", json={"agent_id": "deact-1", "display_name": "D", "owner": "t"})
    resp = client.post("/agents/deact-1/deactivate")
    assert resp.status_code == 200
    assert resp.json()["active"] is False


def test_credential_rotation_invalidates_old_one():
    reg = client.post("/agents/register", json={"agent_id": "rot-1", "display_name": "D", "owner": "t"})
    old_credential = reg.json()["credential"]
    rotate = client.post("/agents/rotate-credential/rot-1")
    new_credential = rotate.json()["credential"]
    assert old_credential != new_credential
    assert client.post("/agents/verify", json={"agent_id": "rot-1", "credential": old_credential}).json()["verified"] is False
    assert client.post("/agents/verify", json={"agent_id": "rot-1", "credential": new_credential}).json()["verified"] is True
