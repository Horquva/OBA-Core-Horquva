from fastapi.testclient import TestClient
from horquva_security_py.tool_permission_service.main import app

client = TestClient(app)


def _register_and_bind():
    client.post("/tools/register", json={"tool_id": "search", "name": "Search", "allowed_capabilities": ["read", "write"]})
    client.post("/tools/bind", json={"agent_id": "agent-1", "tool_id": "search", "capabilities": ["read"]})


def test_unregistered_tool_denied():
    resp = client.post("/tools/authorize-call", json={"agent_id": "a", "tool_id": "nope", "capability": "read"})
    assert resp.json()["allowed"] is False


def test_bound_capability_allowed():
    _register_and_bind()
    resp = client.post("/tools/authorize-call", json={"agent_id": "agent-1", "tool_id": "search", "capability": "read"})
    assert resp.json()["allowed"] is True


def test_unbound_capability_denied():
    _register_and_bind()
    resp = client.post("/tools/authorize-call", json={"agent_id": "agent-1", "tool_id": "search", "capability": "write"})
    assert resp.json()["allowed"] is False


def test_bind_rejects_capability_outside_tool_allowed_set():
    client.post("/tools/register", json={"tool_id": "narrow", "name": "Narrow", "allowed_capabilities": ["read"]})
    resp = client.post("/tools/bind", json={"agent_id": "agent-2", "tool_id": "narrow", "capabilities": ["delete"]})
    assert resp.status_code == 400


def test_bind_unregistered_tool_404():
    resp = client.post("/tools/bind", json={"agent_id": "agent-2", "tool_id": "ghost", "capabilities": ["read"]})
    assert resp.status_code == 404
