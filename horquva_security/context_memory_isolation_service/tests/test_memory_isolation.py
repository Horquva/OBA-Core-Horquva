from fastapi.testclient import TestClient
from horquva_security_py.context_memory_isolation_service.main import app

client = TestClient(app)


def test_write_then_read_by_owner_succeeds():
    client.post("/memory/write", json={
        "tenant_id": "t1", "session_id": "s1", "owner_agent_id": "agent-1",
        "key": "k", "value": {"data": 1},
    })
    resp = client.post("/memory/read", json={
        "tenant_id": "t1", "session_id": "s1", "requesting_agent_id": "agent-1", "key": "k",
    })
    body = resp.json()
    assert body["allowed"] is True
    assert body["value"] == {"data": 1}


def test_cross_agent_read_denied():
    client.post("/memory/write", json={
        "tenant_id": "t1", "session_id": "s1", "owner_agent_id": "agent-owner",
        "key": "secret", "value": {"data": "private"},
    })
    resp = client.post("/memory/read", json={
        "tenant_id": "t1", "session_id": "s1", "requesting_agent_id": "agent-other", "key": "secret",
    })
    assert resp.json()["allowed"] is False
    assert resp.json()["value"] is None


def test_cross_tenant_read_denied_even_for_same_agent_and_key():
    client.post("/memory/write", json={
        "tenant_id": "tenant-a", "session_id": "s1", "owner_agent_id": "agent-1",
        "key": "k", "value": {"data": "a-only"},
    })
    resp = client.post("/memory/read", json={
        "tenant_id": "tenant-b", "session_id": "s1", "requesting_agent_id": "agent-1", "key": "k",
    })
    assert resp.json()["allowed"] is False


def test_cross_session_read_denied_even_for_same_tenant_and_agent():
    client.post("/memory/write", json={
        "tenant_id": "t2", "session_id": "session-x", "owner_agent_id": "agent-1",
        "key": "k", "value": {"data": "x-only"},
    })
    resp = client.post("/memory/read", json={
        "tenant_id": "t2", "session_id": "session-y", "requesting_agent_id": "agent-1", "key": "k",
    })
    assert resp.json()["allowed"] is False


def test_delete_by_non_owner_denied_and_data_survives():
    client.post("/memory/write", json={
        "tenant_id": "t3", "session_id": "s1", "owner_agent_id": "agent-owner",
        "key": "k", "value": {"data": 1},
    })
    resp = client.post("/memory/delete", json={
        "tenant_id": "t3", "session_id": "s1", "requesting_agent_id": "agent-attacker", "key": "k",
    })
    assert resp.json()["allowed"] is False
    still_there = client.post("/memory/read", json={
        "tenant_id": "t3", "session_id": "s1", "requesting_agent_id": "agent-owner", "key": "k",
    })
    assert still_there.json()["allowed"] is True


def test_ttl_expiry_denies_read():
    client.post("/memory/write", json={
        "tenant_id": "t4", "session_id": "s1", "owner_agent_id": "agent-1",
        "key": "k", "value": {"data": 1}, "ttl_seconds": -1,
    })
    resp = client.post("/memory/read", json={
        "tenant_id": "t4", "session_id": "s1", "requesting_agent_id": "agent-1", "key": "k",
    })
    assert resp.json()["allowed"] is False
    assert "expired" in resp.json()["reason"]
