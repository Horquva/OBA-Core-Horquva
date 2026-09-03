from fastapi.testclient import TestClient
from horquva_security_py.agent_authorization_service.main import app

client = TestClient(app)


def test_no_role_no_grant_denied():
    resp = client.post("/authz/check", json={"agent_id": "new-agent", "resource": "data", "scope": "read"})
    assert resp.json()["allowed"] is False


def test_role_permission_allows():
    client.post("/authz/roles/grant", json={"agent_id": "reader-1", "role": "reader"})
    resp = client.post("/authz/check", json={"agent_id": "reader-1", "resource": "data", "scope": "read"})
    assert resp.json()["allowed"] is True


def test_sensitive_resource_requires_explicit_grant_even_with_admin_role():
    client.post("/authz/roles/grant", json={"agent_id": "admin-1", "role": "admin"})
    resp = client.post("/authz/check", json={"agent_id": "admin-1", "resource": "data:export", "scope": "run"})
    assert resp.json()["allowed"] is False  # role alone isn't enough for sensitive resource

    client.post("/authz/permissions/grant", json={"agent_id": "admin-1", "resource": "data:export", "scope": "run"})
    resp2 = client.post("/authz/check", json={"agent_id": "admin-1", "resource": "data:export", "scope": "run"})
    assert resp2.json()["allowed"] is True


def test_temporary_grant_expires():
    client.post("/authz/permissions/grant", json={
        "agent_id": "temp-1", "resource": "tool:x", "scope": "execute",
        "temporary": True, "ttl_seconds": -1,  # already expired
    })
    resp = client.post("/authz/check", json={"agent_id": "temp-1", "resource": "tool:x", "scope": "execute"})
    assert resp.json()["allowed"] is False


def test_force_deny_attribute_vetoes_otherwise_allowed_request():
    client.post("/authz/roles/grant", json={"agent_id": "vetoed-1", "role": "reader"})
    resp = client.post("/authz/check", json={
        "agent_id": "vetoed-1", "resource": "data", "scope": "read",
        "attributes": {"force_deny": True},
    })
    assert resp.json()["allowed"] is False


def test_unknown_role_grant_rejected():
    resp = client.post("/authz/roles/grant", json={"agent_id": "x", "role": "not-a-role"})
    assert resp.status_code == 400
