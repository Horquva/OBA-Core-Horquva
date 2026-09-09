from fastapi.testclient import TestClient
from horquva_security_py.risk_assessment_service.main import app

client = TestClient(app)


def test_low_risk_baseline():
    resp = client.post("/risk/assess", json={
        "agent_id": "a1", "action_type": "read", "signals": {"agent_trust_level": "elevated"},
    })
    assert resp.json()["risk"] == "low"


def test_untrusted_agent_raises_risk():
    resp = client.post("/risk/assess", json={
        "agent_id": "a1", "action_type": "read", "signals": {"agent_trust_level": "untrusted"},
    })
    assert resp.json()["risk"] in ("medium", "high", "critical")


def test_sensitive_action_plus_high_guardrail_risk_is_critical_or_high():
    resp = client.post("/risk/assess", json={
        "agent_id": "a1", "action_type": "delete",
        "signals": {"agent_trust_level": "standard", "guardrail_risk": "high", "is_sensitive_action": True},
    })
    assert resp.json()["risk"] in ("high", "critical")


def test_cross_tenant_action_is_critical():
    resp = client.post("/risk/assess", json={
        "agent_id": "a1", "action_type": "read",
        "signals": {"agent_trust_level": "full", "is_cross_tenant": True},
    })
    assert resp.json()["risk"] == "high"


def test_rationale_always_present():
    resp = client.post("/risk/assess", json={
        "agent_id": "a1", "action_type": "read", "signals": {},
    })
    assert len(resp.json()["rationale"]) >= 1
