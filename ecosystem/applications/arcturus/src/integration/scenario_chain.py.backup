"""
Arcturus Day 5 — Scenario Engineering Chain Step
=====================================================
Platform Owner: Maryam Yaqoob (Scenario Engineering Platform)

Day 5 E2E chain position (§ Phase E of Week 3 Master Execution Guide):
  Ontology -> Enterprise -> Workforce -> Workflows -> Scenarios
  -> Synthetic Data -> Runtime -> Validation

This module exposes the Scenario Engineering Platform's step of the
Day 5 end-to-end vertical slice, using shared contracts as the
communication layer (in-process, no HTTP), consistent with
integration/e2e_chain.py and integration/validation_chain.py.

run_scenario_chain(payload, constraints, expectations)
    Compiles the three canonical scenario contracts (ScenarioDSLPayload,
    ScenarioConstraintContract, ScenarioExpectationContract) through the
    real ScenarioEngine/ScenarioAdapter pipeline built and tested across
    Days 1-4, and returns the outbound payload(s) for the downstream
    platforms that consume this step:
      - Muhammad Maaz Khan (Simulation Runtime)  -> "runtime_dispatch"
      - Amina Khan (Validation & Evaluation)      -> "validation_handoff"
        (only present when `expectations` is supplied)

Architectural law: this module imports ONLY from this platform's own
contracts and this platform's own src/ (scenario_engine.py,
scenario_adapters.py), plus the shared contracts. It must never import
another platform's src/ internals directly (§2.1).
"""

from __future__ import annotations

import logging
from typing import Any

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_adapters import (
    ScenarioAdapter,
)

logger = logging.getLogger(__name__)

PLATFORM_SOURCE = "scenario_engineering"


def run_scenario_chain(
    payload: ScenarioDSLPayload,
    constraints: ScenarioConstraintContract | None = None,
    expectations: ScenarioExpectationContract | None = None,
) -> dict[str, Any]:
    """
    Execute this platform's step in the Day 5 chain.

    Compiles `payload` (plus the optional `constraints` and
    `expectations` contracts) via ScenarioAdapter -> ScenarioEngine,
    reusing the exact compilation and validation logic built and tested
    across Days 1-4, with no duplicated logic.

    Returns a plain, serializable dict:
      {
          "scenario_id": str,
          "fingerprint": str,
          "runtime_dispatch": dict,       # for Runtime (always present)
          "validation_handoff": dict,     # for Validation (only if
                                           # `expectations` was supplied)
      }

    Raises ArcturusValidationError (propagated from ScenarioEngine) on
    any structural defect in the supplied contracts.
    """
    logger.info(
        "-> [Scenario] starting for run_id=%s, scenario_id=%s",
        payload.context.run_id,
        payload.scenario_id,
    )

    adapter = ScenarioAdapter()
    compiled = adapter.compile(payload, constraints, expectations)

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
