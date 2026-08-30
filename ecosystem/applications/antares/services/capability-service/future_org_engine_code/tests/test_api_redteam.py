"""
Red-Team API Tests — Din 6 / Part 6.

Uses FastAPI's TestClient (in-process, synchronous — avoids the
background-process persistence issues seen when testing via live curl
across separate terminal sessions). Every test here deliberately attempts
to break the running API, per the assignment's explicit requirement:
"agent random cheezein na kare" (agents/callers must not be able to do
arbitrary things) and "jhooti success kabhi nahi" (never fake success —
if something is broken, the test must show it broken).

Run: pytest tests/test_api_redteam.py -v
"""
import pytest
from fastapi.testclient import TestClient

from app.api import app
from app.database import init_db, engine
from app.models import Base


@pytest.fixture(autouse=True)
def fresh_db():
    """Each test gets a clean schema — drop and recreate before every test
    so red-team attempts in one test can't contaminate another."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture()
def client():
    return TestClient(app)


def _setup_org_agent_capability(client, grant=True, policy=False):
    """Helper: creates org/unit/capability/workflow/agent, optionally
    grants the capability and/or attaches an approval-required policy."""
    org = client.post("/organizations", json={"name": "RT Org"}).json()
    unit = client.post("/units", json={"organization_id": org["organization_id"], "name": "Unit"}).json()
    cap = client.post("/capabilities", json={"organization_id": org["organization_id"], "name": "Cap"}).json()
    wf = client.post("/workflows", json={"capability_id": cap["capability_id"], "name": "WF"}).json()
    agent = client.post("/agent-roles", json={"unit_id": unit["unit_id"], "title": "RTAgent"}).json()
    if grant:
        client.post("/agent-roles/grant-capability",
                     json={"agent_role_id": agent["agent_role_id"], "capability_id": cap["capability_id"]})
    if policy:
        client.post("/governance/receive-rules", json={
            "organization_id": org["organization_id"],
            "rules": [{"name": "Gate", "rule": "needs approval", "requires_approval": True,
                       "applies_to_capability_id": cap["capability_id"]}],
        })
    return org, unit, cap, wf, agent


# ---------- 1. Unauthorized action attempt ----------

def test_unauthorized_agent_action_rejected_via_api(client):
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=False)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Unauthorized attempt"}).json()

    r = client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "escalated"
    assert body["result"] is None, "Unauthorized agent must NEVER execute, even over HTTP"


# ---------- 2. Privilege escalation: resume without approval ----------

def test_resume_without_approval_rejected(client):
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=True, policy=True)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Gated"}).json()
    client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})

    pending = client.get(f"/organizations/{org['organization_id']}/decisions/pending").json()
    decision_id = pending[0]["decision_id"]

    r = client.post(f"/decisions/{decision_id}/resume", params={"agent_role_id": agent["agent_role_id"]})
    assert r.status_code == 409, "Resuming an unapproved decision must be rejected, not silently allowed"


# ---------- 3. Policy bypass attempt (authorized agent, gated capability) ----------

def test_policy_bypass_blocks_even_authorized_agent(client):
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=True, policy=True)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Gated"}).json()

    r = client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})
    body = r.json()
    assert body["status"] == "blocked", "An authorized agent must still be blocked by policy"
    assert body["result"] is None


# ---------- 4. Malformed input handling ----------

def test_malformed_input_does_not_crash_server(client):
    r = client.post("/organizations", json={})  # missing required 'name' field
    assert r.status_code == 422, "Missing required field should be a clean validation error, not a 500 crash"

    r = client.post("/tasks", json={"workflow_id": "not-a-real-id", "title": "x"})
    # Should not 500 — either succeeds with orphaned FK (SQLite doesn't enforce by default) or errors cleanly
    assert r.status_code != 500, "Invalid foreign key reference must not crash the server with an unhandled exception"


# ---------- 5. Nonexistent resource handling ----------

def test_nonexistent_organization_returns_404_not_crash(client):
    r = client.get("/organizations/00000000-0000-0000-0000-000000000000/state")
    assert r.status_code == 404
    assert r.status_code != 500


def test_nonexistent_task_run_returns_404_not_crash(client):
    r = client.post("/agent-tasks/run", json={
        "agent_role_id": "00000000-0000-0000-0000-000000000000",
        "task_id": "00000000-0000-0000-0000-000000000000",
    })
    assert r.status_code == 404
    assert r.status_code != 500


# ---------- 6. Known gap: no authentication (documents the real finding) ----------

def test_KNOWN_GAP_no_authentication_enforced(client):
    """
    This test documents a REAL, CONFIRMED gap rather than hiding it.
    It intentionally asserts the current (undesirable) behavior: any
    caller can approve any decision as any claimed approver_id, with no
    verification. This test should be treated as a FAILING requirement,
    not a passing security guarantee — it exists so the gap is tracked
    and re-run after real authentication is added.
    """
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=True, policy=True)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Gated"}).json()
    client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})
    pending = client.get(f"/organizations/{org['organization_id']}/decisions/pending").json()
    decision_id = pending[0]["decision_id"]

    # Nothing verifies this claimed identity belongs to a real, authorized approver.
    r = client.post(f"/decisions/{decision_id}/approve", json={"approver_id": "literally_anyone_i_typed"})
    assert r.status_code == 200
    assert r.json()["approver_id"] == "literally_anyone_i_typed", (
        "CONFIRMED GAP: the API accepts an unverified approver identity with no authentication check. "
        "This must be fixed before any real deployment."
    )


# ---------- 7. Re-approval of a rejected decision (found during this session) ----------

def test_FIXED_rejected_decision_cannot_be_reapproved(client):
    """
    Originally found as a bug during this Din 6 session: approve_decision()
    had no guard against overwriting an already-REJECTED decision. Fixed
    in decision_service.py (see git history / commit message for this
    change). This test now proves the fix holds, rather than documenting
    the bug as accepted behavior.
    """
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=True, policy=True)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Gated"}).json()
    client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})
    pending = client.get(f"/organizations/{org['organization_id']}/decisions/pending").json()
    decision_id = pending[0]["decision_id"]

    from app.database import get_session
    from app.services.decision_service import reject_decision
    from app.models.governance import Decision
    session = get_session()
    decision = session.get(Decision, decision_id)
    reject_decision(session, decision, approver_id="kamil.ejaz", reason="Not appropriate")
    session.close()

    # Attempt to approve the SAME already-rejected decision — must now be blocked.
    r = client.post(f"/decisions/{decision_id}/approve", json={"approver_id": "someone.else"})
    assert r.status_code == 409, "A rejected decision must not be re-approvable — this is now correctly blocked"


# ---------- 8. Cross-organization data isolation (data-model level, despite no HTTP auth) ----------

def test_capability_grant_does_not_leak_across_organizations(client):
    org_a = client.post("/organizations", json={"name": "Org A"}).json()
    org_b = client.post("/organizations", json={"name": "Org B"}).json()
    unit_a = client.post("/units", json={"organization_id": org_a["organization_id"], "name": "Unit A"}).json()
    cap_a = client.post("/capabilities", json={"organization_id": org_a["organization_id"], "name": "Cap A"}).json()
    wf_a = client.post("/workflows", json={"capability_id": cap_a["capability_id"], "name": "WF A"}).json()
    agent_a = client.post("/agent-roles", json={"unit_id": unit_a["unit_id"], "title": "AgentA"}).json()
    client.post("/agent-roles/grant-capability",
                json={"agent_role_id": agent_a["agent_role_id"], "capability_id": cap_a["capability_id"]})

    cap_b = client.post("/capabilities", json={"organization_id": org_b["organization_id"], "name": "Cap B"}).json()
    wf_b = client.post("/workflows", json={"capability_id": cap_b["capability_id"], "name": "WF B"}).json()
    task_b = client.post("/tasks", json={"workflow_id": wf_b["workflow_id"], "title": "Org B task"}).json()

    # Agent A (granted only in Org A) attempts a task under Org B's capability.
    r = client.post("/agent-tasks/run", json={"agent_role_id": agent_a["agent_role_id"], "task_id": task_b["task_id"]})
    body = r.json()
    assert body["status"] == "escalated", "A capability grant in one organization must not authorize action in another"
    assert body["result"] is None


# ---------- 9. Retry/failure behavior still holds via the API surface ----------

def test_task_status_reflects_real_state_not_default(client):
    org, unit, cap, wf, agent = _setup_org_agent_capability(client, grant=True)
    task = client.post("/tasks", json={"workflow_id": wf["workflow_id"], "title": "Check status"}).json()
    client.post("/agent-tasks/run", json={"agent_role_id": agent["agent_role_id"], "task_id": task["task_id"]})

    status = client.get(f"/tasks/{task['task_id']}").json()
    assert status["status"] == "completed"
    assert status["result"] is not None


# ---------- 10. Governance rules endpoint rejects malformed rule input ----------

def test_governance_rules_endpoint_validates_input(client):
    org = client.post("/organizations", json={"name": "Org"}).json()
    r = client.post("/governance/receive-rules", json={
        "organization_id": org["organization_id"],
        "rules": [{"name": "Missing rule field"}],  # 'rule' is required
    })
    assert r.status_code == 422, "Malformed governance rule input should be a clean validation error, not a crash"
