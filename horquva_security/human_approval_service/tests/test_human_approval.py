from fastapi.testclient import TestClient
from horquva_security_py.human_approval_service.main import app

client = TestClient(app)


def test_create_and_approve_by_different_actor():
    created = client.post("/approvals", json={
        "agent_id": "agent-1", "action": {"type": "fund_transfer"}, "risk": "high",
    })
    approval_id = created.json()["approval_id"]
    decided = client.post(f"/approvals/{approval_id}/decide", json={
        "decided_by": "human-reviewer-1", "approve": True, "reason": "looks fine",
    })
    assert decided.json()["state"] == "approved"


def test_self_approval_rejected():
    created = client.post("/approvals", json={
        "agent_id": "agent-2", "action": {"type": "delete"}, "risk": "critical",
    })
    approval_id = created.json()["approval_id"]
    resp = client.post(f"/approvals/{approval_id}/decide", json={
        "decided_by": "agent-2", "approve": True, "reason": "I approve myself",
    })
    assert resp.status_code == 403


def test_double_decision_rejected():
    created = client.post("/approvals", json={
        "agent_id": "agent-3", "action": {"type": "delete"}, "risk": "high",
    })
    approval_id = created.json()["approval_id"]
    client.post(f"/approvals/{approval_id}/decide", json={"decided_by": "reviewer", "approve": False, "reason": "no"})
    second = client.post(f"/approvals/{approval_id}/decide", json={"decided_by": "reviewer", "approve": True, "reason": "changed mind"})
    assert second.status_code == 409


def test_unknown_approval_404():
    assert client.get("/approvals/does-not-exist").status_code == 404
