r"""
Scenario Engineering Platform — Lifecycle State Machine
Owner: Maryam Yaqoob

Part-3 gap closure: scenario_engine.py's own module docstring stated
"Deferred to later parts: scenario lifecycle state machine... Part-2/4".
This module implements that deferred piece.

States (per docs/week4/Maryam_Yaqoob.md Part 3 §4):
    DEFINED -> VALIDATED -> READY -> ACTIVATED -> ACTIVE
        -> COMPLETED / FAILED / TERMINATED

ASSUMPTION FLAGGED: the exact allowed-transition graph below is my own
interpretation of the linear diagram in the spec. The spec shows a
straight line with three possible terminal states branching off ACTIVE.
It does not explicitly say whether e.g. READY can transition directly
back to VALIDATED (for re-validation) or whether FAILED can occur before
ACTIVE (e.g. failing during ACTIVATED). I have made the transition table
below deliberately conservative (only forward progression, plus FAILED
reachable from any non-terminal state, since real systems fail at any
stage). This should be confirmed against how Maaz's Runtime actually
reports failures before being treated as final.

No cross-platform imports: only this platform's own contracts.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)

PLATFORM_SOURCE = "scenario_engineering"


class ScenarioLifecycleState(str, Enum):
    DEFINED = "DEFINED"
    VALIDATED = "VALIDATED"
    READY = "READY"
    ACTIVATED = "ACTIVATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TERMINATED = "TERMINATED"


_TERMINAL_STATES = frozenset(
    {
        ScenarioLifecycleState.COMPLETED,
        ScenarioLifecycleState.FAILED,
        ScenarioLifecycleState.TERMINATED,
    }
)

# Forward-progression edges (spec's happy path).
_FORWARD_TRANSITIONS: dict[ScenarioLifecycleState, set[ScenarioLifecycleState]] = {
    ScenarioLifecycleState.DEFINED: {ScenarioLifecycleState.VALIDATED},
    ScenarioLifecycleState.VALIDATED: {ScenarioLifecycleState.READY},
    ScenarioLifecycleState.READY: {ScenarioLifecycleState.ACTIVATED},
    ScenarioLifecycleState.ACTIVATED: {ScenarioLifecycleState.ACTIVE},
    ScenarioLifecycleState.ACTIVE: {ScenarioLifecycleState.COMPLETED},
}

# Every non-terminal state may also transition to FAILED or TERMINATED
# (assumption flagged in module docstring above).
for _state in list(_FORWARD_TRANSITIONS.keys()) + [ScenarioLifecycleState.ACTIVE]:
    _FORWARD_TRANSITIONS.setdefault(_state, set())
    _FORWARD_TRANSITIONS[_state].add(ScenarioLifecycleState.FAILED)
    _FORWARD_TRANSITIONS[_state].add(ScenarioLifecycleState.TERMINATED)


class ScenarioLifecycleManager:
    """
    Tracks the current lifecycle state of each scenario_id and enforces
    only valid transitions. Does not itself decide *when* a transition
    should happen (e.g. it does not call Maaz's Runtime) — it is the
    guard that other code (scenario_chain.py, or a future API router)
    must call through.
    """

    def __init__(self) -> None:
        self._current: dict[str, ScenarioLifecycleState] = {}
        self._history: dict[str, list[tuple[ScenarioLifecycleState, datetime]]] = {}

    def start(self, scenario_id: str) -> ScenarioLifecycleState:
        """Register a scenario_id at its initial DEFINED state."""
        if scenario_id in self._current:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' already has a lifecycle in progress "
                f"(current state: {self._current[scenario_id].value})",
                PLATFORM_SOURCE,
            )
        self._current[scenario_id] = ScenarioLifecycleState.DEFINED
        self._history[scenario_id] = [
            (ScenarioLifecycleState.DEFINED, datetime.now(timezone.utc))
        ]
        return ScenarioLifecycleState.DEFINED

    def current_state(self, scenario_id: str) -> ScenarioLifecycleState:
        if scenario_id not in self._current:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' has no lifecycle in progress — call start() first",
                PLATFORM_SOURCE,
            )
        return self._current[scenario_id]

    def transition(
        self, scenario_id: str, to_state: ScenarioLifecycleState
    ) -> ScenarioLifecycleState:
        """
        Attempt to move scenario_id to to_state. Raises
        ArcturusValidationError if the transition is not allowed from the
        current state, or if the scenario is already in a terminal state.
        """
        current = self.current_state(scenario_id)

        if current in _TERMINAL_STATES:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' is already in terminal state "
                f"{current.value}; cannot transition to {to_state.value}",
                PLATFORM_SOURCE,
            )

        allowed = _FORWARD_TRANSITIONS.get(current, set())
        if to_state not in allowed:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' cannot transition from "
                f"{current.value} to {to_state.value} (allowed: "
                f"{sorted(s.value for s in allowed)})",
                PLATFORM_SOURCE,
            )

        self._current[scenario_id] = to_state
        self._history[scenario_id].append((to_state, datetime.now(timezone.utc)))
        return to_state

    def history(
        self, scenario_id: str
    ) -> list[tuple[ScenarioLifecycleState, datetime]]:
        if scenario_id not in self._history:
            raise ArcturusValidationError(
                f"scenario '{scenario_id}' has no lifecycle in progress — call start() first",
                PLATFORM_SOURCE,
            )
        return list(self._history[scenario_id])

    def is_terminal(self, scenario_id: str) -> bool:
        return self.current_state(scenario_id) in _TERMINAL_STATES


__all__ = ["ScenarioLifecycleState", "ScenarioLifecycleManager"]