"""
Scenario Engineering Platform — API Router
Owner: Maryam Yaqoob

Day 4: FastAPI router exposing ScenarioController over HTTP, mounted at
prefix "/api/v1/scenarios". Mirrors the shared router convention used by
api/routers/ontology.py and api/routers/workflows.py.

ASSUMPTIONS / DECISIONS FLAGGED:

1. ERROR HANDLING -- this router does NOT catch ArcturusValidationError
   locally; every endpoint lets it propagate to api/main.py's global
   @app.exception_handler(ArcturusValidationError), which always returns
   a flat 422. This follows Hashim's literal Day 4 chat guidance ("handled
   globally... you don't need manual try/except boilerplate in your
   endpoints"). NOTE: this diverges from what api/routers/ontology.py
   ACTUALLY does in its merged code -- ontology.py catches
   ArcturusValidationError locally in every endpoint and maps it to
   endpoint-specific status codes (422 for its bootstrap endpoint, 404 for
   its resolve endpoint), which also matches the original task spec's
   wording ("caught locally in each endpoint AND handled globally").
   Practical effect of following the chat guidance instead: this router
   has NO 404s -- a lookup against an unregistered scenario_id (e.g.
   GET /{scenario_id}) returns 422, not 404. If REST-style 404 semantics
   for "not found" are wanted here, that requires re-introducing local
   try/except blocks per endpoint (as ontology.py does) -- flag with
   Hashim if this divergence from the reference implementation's actual
   behavior is not what was intended.

2. /compile REQUEST BODY -- payload / constraints / expectations are
   wrapped in a single ScenarioCompileRequest model (one JSON object),
   rather than three separate FastAPI body parameters or a raw
   Dict[str, Any] (as api/routers/ontology.py's bootstrap endpoint does).
   Not dictated by any existing convention seen so far -- a design choice
   for a single typed request body.

3. GET /{scenario_id}/lifecycle RESPONSE SHAPE -- combines current state
   and full history into one payload in a single round trip. No existing
   convention dictated this shape.

4. Context-resolution endpoints (resolve_scenario_context() /
   verify_workflow_compatibility() from scenario_context_resolver.py) are
   DEFERRED from this router, consistent with scenario_controller.py's
   own module docstring ASSUMPTION 4 -- they depend on Ajwa's
   EnterpriseInstancePayload and Javeria's WorkflowDefinitionContract,
   neither independently verified on this branch as of this file being
   written.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_controller import (
    scenario_controller,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleState,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scenarios", tags=["Scenario Engineering"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class ScenarioCompileRequest(BaseModel):
    """Single-body wrapper for compile_and_register(). See module docstring
    ASSUMPTION 2."""

    payload: ScenarioDSLPayload
    constraints: ScenarioConstraintContract | None = None
    expectations: ScenarioExpectationContract | None = None


class LifecycleAdvanceRequest(BaseModel):
    """Body for POST /{scenario_id}/lifecycle/advance."""

    to_state: ScenarioLifecycleState


class VariantCreateRequest(BaseModel):
    """Body for POST /{scenario_id}/variants."""

    variant_label: str = Field(..., min_length=1)
    parameter_overrides: dict[str, object] = Field(default_factory=dict)


class CustomScenarioCreateRequest(BaseModel):
    id: str = ""
    name: str
    domain: str = "Financial Services"
    seed: int = 42
    duration: int = 50
    shock_type: str = "NONE"
    shock_tick: int = 10
    description: str = ""


_custom_scenarios: list[dict] = [
    {"id": "SCN-RT-992", "name": "High Market Volatility Stress Test", "domain": "Financial Services", "seed": 42, "duration": 100, "shock_type": "DEMAND_SPIKE", "shock_tick": 20},
    {"id": "SCN-RT-401", "name": "Global Freight Port Congestion", "domain": "Supply Chain", "seed": 101, "duration": 250, "shock_type": "SUPPLIER_FAILURE", "shock_tick": 30},
    {"id": "SCN-RT-884", "name": "Cyber Incident Infrastructure Failover", "domain": "IT Operations", "seed": 777, "duration": 50, "shock_type": "SYSTEM_OUTAGE", "shock_tick": 10},
]


# ---------------------------------------------------------------------------
# Compile
# ---------------------------------------------------------------------------


@router.post("/compile")
async def compile_scenario(request: ScenarioCompileRequest):
    """
    Compile and register a scenario. First-time compile of a given
    scenario_id also bootstraps its lifecycle (DEFINED -> VALIDATED) --
    see ScenarioController.compile_and_register() for details/assumptions.
    """
    compiled = scenario_controller.compile_and_register(
        request.payload, request.constraints, request.expectations
    )
    return scenario_controller.adapter.serialize(compiled)


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------


@router.get("/")
async def list_scenarios():
    """List all registered scenario_ids."""
    return scenario_controller.list_scenario_ids()


@router.get("/list/detailed")
async def list_detailed_scenarios():
    """Returns rich scenario definitions with parameters and domain tags."""
    return _custom_scenarios


@router.post("/custom")
async def create_custom_scenario(req: CustomScenarioCreateRequest):
    """Create and register a custom digital twin scenario."""
    import random
    scn_id = req.id if (req.id and req.id.startswith("SCN-")) else f"SCN-CS-{random.randint(100, 999)}"
    entry = {
        "id": scn_id,
        "name": req.name,
        "domain": req.domain,
        "seed": req.seed,
        "duration": req.duration,
        "shock_type": req.shock_type,
        "shock_tick": req.shock_tick,
        "description": req.description,
    }
    _custom_scenarios.insert(0, entry)
    return entry


@router.get("/{scenario_id}")

async def get_scenario(scenario_id: str):
    """Return the latest registered (compiled + serialized) version of a scenario."""
    return scenario_controller.get_serialized(scenario_id)


@router.get("/{scenario_id}/versions")
async def get_scenario_versions(scenario_id: str):
    """List all known fingerprints (versions) for a scenario_id, oldest first."""
    return scenario_controller.list_versions(scenario_id)


@router.get("/{scenario_id}/preconditions")
async def get_scenario_preconditions(scenario_id: str):
    """Return the normalized preconditions for the latest registered version."""
    return scenario_controller.get_preconditions(scenario_id)


# ---------------------------------------------------------------------------
# Outbound payloads (Runtime / Validation handoffs)
# ---------------------------------------------------------------------------


@router.get("/{scenario_id}/runtime-dispatch")
async def get_runtime_dispatch(scenario_id: str):
    """Outbound dispatch payload consumed by Maaz's Simulation Runtime."""
    return scenario_controller.get_runtime_dispatch(scenario_id)


@router.get("/{scenario_id}/validation-handoff")
async def get_validation_handoff(scenario_id: str):
    """Outbound baseline-expectation payload consumed by Amina's Validation
    & Evaluation Platform. Raises ArcturusValidationError (-> 422 via the
    global handler) if the scenario was compiled without expectations."""
    return scenario_controller.get_validation_handoff(scenario_id)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


@router.get("/{scenario_id}/lifecycle")
async def get_scenario_lifecycle(scenario_id: str):
    """Current lifecycle state plus full transition history. See module
    docstring ASSUMPTION 3 for response shape."""
    state = scenario_controller.get_lifecycle_state(scenario_id)
    history = scenario_controller.get_lifecycle_history(scenario_id)
    return {
        "scenario_id": scenario_id,
        "current_state": state.value,
        "history": [
            {"state": s.value, "timestamp": ts.isoformat()} for s, ts in history
        ],
    }


@router.post("/{scenario_id}/lifecycle/advance")
async def advance_scenario_lifecycle(scenario_id: str, request: LifecycleAdvanceRequest):
    """Explicit, externally-driven lifecycle transition (e.g. READY,
    ACTIVATED, ACTIVE, COMPLETED, FAILED, TERMINATED)."""
    new_state = scenario_controller.advance_lifecycle(scenario_id, request.to_state)
    return {"scenario_id": scenario_id, "current_state": new_state.value}


# ---------------------------------------------------------------------------
# Variants
# ---------------------------------------------------------------------------


@router.post("/{scenario_id}/variants")
async def create_scenario_variant(scenario_id: str, request: VariantCreateRequest):
    """Generate and register a variant of the latest registered version of
    scenario_id. The variant keeps the SAME scenario_id as its base -- see
    scenario_variants.py and ScenarioController.create_variant()."""
    compiled, lineage = scenario_controller.create_variant(
        scenario_id, request.variant_label, request.parameter_overrides
    )
    return {
        "scenario": scenario_controller.adapter.serialize(compiled),
        "lineage": {
            "base_scenario_id": lineage.base_scenario_id,
            "base_fingerprint": lineage.base_fingerprint,
            "variant_scenario_id": lineage.variant_scenario_id,
            "variant_label": lineage.variant_label,
            "parameter_overrides": lineage.parameter_overrides,
        },
    }
