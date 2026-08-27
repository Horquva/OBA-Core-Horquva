"""
Arcturus Day 5 - Scenario Engineering Chain Step
=====================================================
Platform Owner: Maryam Yaqoob (Scenario Engineering Platform)

Day 5 E2E chain position ( Phase E of Week 3 Master Execution Guide):
  Ontology -> Enterprise -> Workforce -> Workflows -> Scenarios
  -> Synthetic Data -> Runtime -> Validation

This module exposes the Scenario Engineering Platform's step of the
Day 5 end-to-end vertical slice, using shared contracts as the
communication layer (in-process, no HTTP), consistent with
integration/e2e_chain.py and integration/validation_chain.py.

run_scenario_chain(payload, constraints, expectations, enterprise, workflow)
    Compiles the three canonical scenario contracts (ScenarioDSLPayload,
    ScenarioConstraintContract, ScenarioExpectationContract) through the
    real ScenarioEngine/ScenarioAdapter pipeline built and tested across
    Days 1-4, registers the result in ScenarioRegistry, starts/advances
    its ScenarioLifecycleManager state, and returns the outbound
    payload(s) for the downstream platforms that consume this step:
      - Muhammad Maaz Khan (Simulation Runtime)  -> "runtime_dispatch"
      - Amina Khan (Validation & Evaluation)      -> "validation_handoff"
        (only present when `expectations` is supplied)

    NEW (Week 4, Part 1/2/3 gap closure): `enterprise` and `workflow`
    are OPTIONAL keyword-only arguments. This preserves the exact
    original behavior/signature for all Days 1-4 callers and the 55
    existing tests (which never pass them). When `enterprise` IS
    supplied, this function additionally runs real context resolution
    (scenario_context_resolver.resolve_scenario_context) and, if
    `workflow` is also supplied, workflow compatibility verification
    (verify_workflow_compatibility) - closing the Part 2 gap. When
    `enterprise` is None (the old calling convention), no resolution is
    attempted and behavior is identical to before this change.

Architectural law: this module imports ONLY from this platform's own
contracts and this platform's own src/ (scenario_engine.py,
scenario_adapters.py, scenario_registry.py, scenario_lifecycle.py,
scenario_context_resolver.py), plus the shared contracts, plus (only
for the new optional path) Ajwa's and Javeria's *contracts* -
never their src/ ( 2.1).
"""

from __future__ import annotations

import logging
from typing import Any

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    WorkflowDefinitionContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_adapters import (
    ScenarioAdapter,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_context_resolver import (
    resolve_scenario_context,
    verify_workflow_compatibility,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleManager,
    ScenarioLifecycleState,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_registry import (
    ScenarioRegistry,
)

logger = logging.getLogger(__name__)

PLATFORM_SOURCE = "scenario_engineering"

# Module-level singletons: persist scenario registration/lifecycle state
# across calls within one process, consistent with how a single API
# server run would use them (see scenario_registry.py / scenario_lifecycle.py
# docstrings - not a database, in-process working set only).
_REGISTRY = ScenarioRegistry()
_LIFECYCLE = ScenarioLifecycleManager()


def run_scenario_chain(
    payload: ScenarioDSLPayload,
    constraints: ScenarioConstraintContract | None = None,
    expectations: ScenarioExpectationContract | None = None,
    *,
    enterprise: EnterpriseInstancePayload | None = None,
    workflow: WorkflowDefinitionContract | None = None,
) -> dict[str, Any]:
    """
    Execute this platform's step in the Day 5 chain.

    Compiles `payload` (plus the optional `constraints` and
    `expectations` contracts) via ScenarioAdapter -> ScenarioEngine,
    reusing the exact compilation and validation logic built and tested
    across Days 1-4, with no duplicated logic. Registers the compiled
    result and advances its lifecycle to VALIDATED.

    If `enterprise` is supplied (new, optional), also resolves
    participants/organizational_scope against real data (raises on any
    unresolved entity - see scenario_context_resolver.py) and advances
    lifecycle to READY. If `workflow` is also supplied, verifies
    scenario/workflow enterprise-instance compatibility.

    Returns a plain, serializable dict:
      {
          "scenario_id": str,
          "fingerprint": str,
          "runtime_dispatch": dict,       # for Runtime (always present)
          "validation_handoff": dict,     # for Validation (only if
                                           # `expectations` was supplied)
      }

    Raises ArcturusValidationError (propagated from ScenarioEngine,
    scenario_context_resolver, or verify_workflow_compatibility) on any
    structural defect or unresolved entity reference.
    """
    logger.info(
        "-> [Scenario] starting for run_id=%s, scenario_id=%s",
        payload.context.run_id,
        payload.scenario_id,
    )

    adapter = ScenarioAdapter()
    compiled = adapter.compile(payload, constraints, expectations)

    # Registry: idempotent registration of this compiled version.
    _REGISTRY.register(compiled)

    # Lifecycle: start (or reuse) DEFINED, then advance to VALIDATED -
    # structural compilation above is what "VALIDATED" represents here.
    # ASSUMPTION FLAGGED: catching a bare Exception from current_state()
    # to detect "not started yet" relies on ArcturusValidationError being
    # the only failure mode there; this is true today (see
    # scenario_lifecycle.py) but would need revisiting if that changes.
    try:
        _LIFECYCLE.current_state(payload.scenario_id)
    except ArcturusValidationError:
        _LIFECYCLE.start(payload.scenario_id)
    if _LIFECYCLE.current_state(payload.scenario_id) == ScenarioLifecycleState.DEFINED:
        _LIFECYCLE.transition(payload.scenario_id, ScenarioLifecycleState.VALIDATED)

    # Optional (new): real context resolution, only if enterprise supplied.
    if enterprise is not None:
        resolve_scenario_context(payload, enterprise, strict=True)
        if _LIFECYCLE.current_state(payload.scenario_id) == ScenarioLifecycleState.VALIDATED:
            _LIFECYCLE.transition(payload.scenario_id, ScenarioLifecycleState.READY)
        if workflow is not None:
            verify_workflow_compatibility(payload, workflow, enterprise)

    result: dict[str, Any] = {
        "scenario_id": compiled.scenario_id,
        "fingerprint": compiled.fingerprint,
        "runtime_dispatch": adapter.to_runtime_dispatch(compiled),
    }

    if expectations is not None:
        result["validation_handoff"] = adapter.to_validation_handoff(compiled)

    logger.info(
        "<- [Scenario] finished, scenario_id=%s, fingerprint=%s",
        compiled.scenario_id,
        compiled.fingerprint[:12],
    )

    return result


__all__ = ["run_scenario_chain"]
