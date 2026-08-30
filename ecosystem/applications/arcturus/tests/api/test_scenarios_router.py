"""
Router-level tests for api/routers/scenarios.py (Scenario Engineering Platform).
Owner: Maryam Yaqoob

DESIGN DECISIONS FLAGGED:

1. STYLE: follows the flat function + `client` fixture convention from
   test_workflows_router.py (api/ router tests), not the class-based
   style used in tests/scenarios/test_scenario_lifecycle.py (plain unit
   tests against ScenarioLifecycleManager directly). Router tests hit
   the real FastAPI app end-to-end, so they mirror the existing router
   test convention rather than the unit-test one.

2. STATE ISOLATION: `scenario_controller` (imported and used inside
   api/routers/scenarios.py) is a MODULE-LEVEL SINGLETON -- one instance
   for the life of the test process, not reset between tests or test
   files. Unlike test_scenario_lifecycle.py's `manager` fixture (a fresh
   ScenarioLifecycleManager() per test), there is no fixture here that
   resets scenario_controller's registry/lifecycle state. To avoid
   cross-test collisions (a second compile of the same scenario_id skips
   lifecycle bootstrap -- see ScenarioController.compile_and_register()
   ASSUMPTION 2), every test in this file uses its own unique
   scenario_id constant. Do not reuse a scenario_id across tests in this
   file (or in any other file that also exercises this router against
   the same running app) without accounting for that shared state.

3. ERROR SEMANTICS: per Hashim's confirmed repo-wide convention,
   ArcturusValidationError is handled ONLY by the global exception
   handler in api/main.py -- every error case below asserts 422, never
   404, including "scenario_id not found" (e.g. GET /{scenario_id} on an
   unregistered id). This is confirmed intended behavior, not a bug.

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/api/test_scenarios_router.py -v
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ecosystem.applications.arcturus.api.main import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


# ---------------------------------------------------------------------------
# Payload builders (JSON dicts for the wire, not pydantic objects --
# mirrors the plain-dict style used in test_workflows_router.py)
# ---------------------------------------------------------------------------

def _context(experiment_id: str = "EXP-API-SCN", global_seed: int = 42) -> dict:
    return {"experiment_id": experiment_id, "global_seed": global_seed}


def _dsl_payload(scenario_id: str, **overrides: object) -> dict:
    defaults: dict[str, object] = dict(
        context=_context(),
        scenario_id=scenario_id,
        description="Executive departure triggers succession review",
        trigger_event="Executive resignation announced",
        participants=["Executive", "HR Lead"],
        organizational_scope=["Leadership", "Governance"],
        preconditions=["Succession plan exists", "HR notified within 24h"],
        variables={"severity": "high", "duration_days": 14},
    )
    defaults.update(overrides)
    return defaults


def _constraints(scenario_id: str, **overrides: object) -> dict:
    defaults: dict[str, object] = dict(
        context=_context(),
        scenario_id=scenario_id,
        constraints=["Notice period fixed at 30 days"],
        hard_limits={"budget_cap": 120000, "max_duration_days": 30},
    )
    defaults.update(overrides)
    return defaults


def _expectations(scenario_id: str, **overrides: object) -> dict:
    defaults: dict[str, object] = dict(
        context=_context(),
        scenario_id=scenario_id,
        success_criteria=["Successor named within 14 days"],
        failure_conditions=["No successor named within 30 days"],
        expected_outcomes=["Smooth leadership transition"],
        metrics=["recovery time", "morale score"],
        termination_conditions=["Successor confirmed", "Role backfilled externally"],
    )
    defaults.update(overrides)
    return defaults


def _compile_body(
    scenario_id: str,
    include_constraints: bool = False,
    include_expectations: bool = False,
    payload_overrides: dict | None = None,
) -> dict:
    body: dict[str, object] = {
        "payload": _dsl_payload(scenario_id, **(payload_overrides or {}))
    }
    if include_constraints:
        body["constraints"] = _constraints(scenario_id)
    if include_expectations:
        body["expectations"] = _expectations(scenario_id)
    return body


# ---------------------------------------------------------------------------
# POST /compile
# ---------------------------------------------------------------------------

def test_compile_scenario_endpoint_success(client):
    scenario_id = "SCN-AP-001"
    response = client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_id"] == scenario_id
    assert data["payload"]["scenario_id"] == scenario_id
    assert data["constraints"] is None
    assert data["expectations"] is None


def test_compile_scenario_endpoint_with_constraints_and_expectations(client):
    scenario_id = "SCN-AP-002"
    body = _compile_body(scenario_id, include_constraints=True, include_expectations=True)
    response = client.post("/api/v1/scenarios/compile", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["constraints"]["hard_limits"]["budget_cap"] == 120000
    assert data["expectations"]["success_criteria"] == ["Successor named within 14 days"]


def test_compile_scenario_endpoint_rejects_empty_participants(client):
    scenario_id = "SCN-AP-003"
    body = _compile_body(scenario_id, payload_overrides={"participants": []})
    response = client.post("/api/v1/scenarios/compile", json=body)
    assert response.status_code == 422
    assert response.json()["error_code"] == "ARCTURUS_VALIDATION_ERROR"


def test_compile_scenario_endpoint_rejects_malformed_scenario_id(client):
    body = _compile_body("NOT-A-VALID-ID")
    response = client.post("/api/v1/scenarios/compile", json=body)
    # Pydantic field validation (pattern mismatch) fails before the router
    # body even reaches scenario_controller -- FastAPI's own request
    # validation 422, not the ArcturusValidationError global handler, so
    # the response shape here is FastAPI's default {"detail": [...]}.
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET / (list) and GET /{scenario_id}
# ---------------------------------------------------------------------------

def test_list_scenarios_includes_compiled_scenario(client):
    scenario_id = "SCN-AP-004"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get("/api/v1/scenarios/")
    assert response.status_code == 200
    assert scenario_id in response.json()


def test_get_scenario_endpoint_returns_latest_version(client):
    scenario_id = "SCN-AP-005"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get(f"/api/v1/scenarios/{scenario_id}")
    assert response.status_code == 200
    assert response.json()["scenario_id"] == scenario_id


def test_get_scenario_endpoint_unregistered_id_returns_422_not_404(client):
    """See module docstring point 3 -- confirmed intended, not a bug."""
    response = client.get("/api/v1/scenarios/SCN-XX-999")
    assert response.status_code == 422
    assert response.json()["error_code"] == "ARCTURUS_VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# GET /{scenario_id}/versions and /preconditions
# ---------------------------------------------------------------------------

def test_get_scenario_versions_endpoint(client):
    scenario_id = "SCN-AP-006"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get(f"/api/v1/scenarios/{scenario_id}/versions")
    assert response.status_code == 200
    versions = response.json()
    assert len(versions) == 1


def test_get_scenario_preconditions_endpoint(client):
    scenario_id = "SCN-AP-007"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get(f"/api/v1/scenarios/{scenario_id}/preconditions")
    assert response.status_code == 200
    assert "Succession plan exists" in response.json()


# ---------------------------------------------------------------------------
# GET /{scenario_id}/runtime-dispatch and /validation-handoff
# ---------------------------------------------------------------------------

def test_get_runtime_dispatch_endpoint(client):
    scenario_id = "SCN-AP-008"
    client.post(
        "/api/v1/scenarios/compile",
        json=_compile_body(scenario_id, include_constraints=True),
    )
    response = client.get(f"/api/v1/scenarios/{scenario_id}/runtime-dispatch")
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_id"] == scenario_id
    assert data["hard_limits"]["budget_cap"] == 120000


def test_get_validation_handoff_endpoint(client):
    scenario_id = "SCN-AP-009"
    client.post(
        "/api/v1/scenarios/compile",
        json=_compile_body(scenario_id, include_expectations=True),
    )
    response = client.get(f"/api/v1/scenarios/{scenario_id}/validation-handoff")
    assert response.status_code == 200
    assert response.json()["success_criteria"] == ["Successor named within 14 days"]


def test_get_validation_handoff_without_expectations_returns_422(client):
    scenario_id = "SCN-AP-010"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get(f"/api/v1/scenarios/{scenario_id}/validation-handoff")
    assert response.status_code == 422
    assert response.json()["error_code"] == "ARCTURUS_VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Lifecycle: GET /{scenario_id}/lifecycle, POST /{scenario_id}/lifecycle/advance
# ---------------------------------------------------------------------------

def test_lifecycle_endpoint_reflects_bootstrap_after_first_compile(client):
    """First compile bootstraps DEFINED -> VALIDATED (see
    ScenarioController.compile_and_register())."""
    scenario_id = "SCN-AP-011"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.get(f"/api/v1/scenarios/{scenario_id}/lifecycle")
    assert response.status_code == 200
    data = response.json()
    assert data["current_state"] == "VALIDATED"
    states_in_history = [entry["state"] for entry in data["history"]]
    assert states_in_history == ["DEFINED", "VALIDATED"]


def test_lifecycle_advance_endpoint_success(client):
    scenario_id = "SCN-AP-012"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.post(
        f"/api/v1/scenarios/{scenario_id}/lifecycle/advance",
        json={"to_state": "READY"},
    )
    assert response.status_code == 200
    assert response.json()["current_state"] == "READY"


def test_lifecycle_advance_endpoint_rejects_invalid_transition(client):
    """VALIDATED -> ACTIVATED skips READY; must be rejected (422)."""
    scenario_id = "SCN-AP-013"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.post(
        f"/api/v1/scenarios/{scenario_id}/lifecycle/advance",
        json={"to_state": "ACTIVATED"},
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "ARCTURUS_VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# POST /{scenario_id}/variants
# ---------------------------------------------------------------------------

def test_create_scenario_variant_endpoint(client):
    scenario_id = "SCN-AP-014"
    client.post("/api/v1/scenarios/compile", json=_compile_body(scenario_id))
    response = client.post(
        f"/api/v1/scenarios/{scenario_id}/variants",
        json={
            "variant_label": "high-severity",
            "parameter_overrides": {"severity": "critical"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["lineage"]["base_scenario_id"] == scenario_id
    assert data["lineage"]["variant_label"] == "high-severity"
    assert data["lineage"]["parameter_overrides"] == {"severity": "critical"}
    # Variant keeps the same scenario_id as its base -- see
    # scenario_variants.py / ScenarioController.create_variant().
    assert data["scenario"]["scenario_id"] == scenario_id


def test_create_scenario_variant_endpoint_unregistered_base_returns_422(client):
    response = client.post(
        "/api/v1/scenarios/SCN-XX-998/variants",
        json={"variant_label": "test-variant", "parameter_overrides": {}},
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "ARCTURUS_VALIDATION_ERROR"
