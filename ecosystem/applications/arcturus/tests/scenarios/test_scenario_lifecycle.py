"""
Unit tests for src/control_plane/scenarios/scenario_lifecycle.py

Written directly against the real source (paste confirmed, no guessing).
Key confirmed behavior:

  - ScenarioLifecycleManager() takes no args; per-instance in-memory state.
  - start(scenario_id) -> DEFINED
      Raises ArcturusValidationError if scenario_id already has a
      lifecycle in progress (no restart without a fresh manager instance).
  - current_state(scenario_id) -> ScenarioLifecycleState
      Raises ArcturusValidationError if start() was never called.
  - transition(scenario_id, to_state) -> ScenarioLifecycleState
      Raises ArcturusValidationError if:
        (a) scenario_id was never started (via current_state()),
        (b) current state is already terminal (COMPLETED/FAILED/TERMINATED)
            — blocks ANY further transition, even to another terminal,
        (c) to_state is not in the allowed set for the current state.
      Allowed transitions (per module's own FLAGGED ASSUMPTION comment —
      conservative, forward-only, confirm against Maaz's Runtime later):
        DEFINED   -> VALIDATED | FAILED | TERMINATED
        VALIDATED -> READY     | FAILED | TERMINATED
        READY     -> ACTIVATED | FAILED | TERMINATED
        ACTIVATED -> ACTIVE    | FAILED | TERMINATED
        ACTIVE    -> COMPLETED | FAILED | TERMINATED
      No skipping states on the happy path (e.g. DEFINED -> READY is
      NOT allowed), and no self-transitions.

      IMPORTANT (bug found + fixed in this file, not in the source):
      COMPLETED is reachable ONLY from ACTIVE — unlike FAILED/TERMINATED,
      which are reachable from every non-terminal state. Any test that
      wants to land on COMPLETED specifically must first walk the full
      forward chain to ACTIVE. See _reach_terminal() below.
  - history(scenario_id) -> list[tuple[ScenarioLifecycleState, datetime]]
      Raises ArcturusValidationError if never started. Returns a COPY
      (mutating the returned list must not affect internal state).
  - is_terminal(scenario_id) -> bool
      Delegates to current_state(), so also raises if never started.

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/scenarios/test_scenario_lifecycle.py -v
"""

import pytest

from src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleManager,
    ScenarioLifecycleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)

S = ScenarioLifecycleState  # short alias for readability

SCN_A = "SCN-HR-001"
SCN_B = "SCN-OP-002"

TERMINAL_STATES = (S.COMPLETED, S.FAILED, S.TERMINATED)
NON_TERMINAL_STATES = (S.DEFINED, S.VALIDATED, S.READY, S.ACTIVATED, S.ACTIVE)


@pytest.fixture
def manager():
    """Fresh, empty lifecycle manager for each test."""
    return ScenarioLifecycleManager()


def _advance_to(manager: ScenarioLifecycleManager, scenario_id: str, target: S) -> None:
    """
    Drive scenario_id from DEFINED up to (and including) `target` along
    the happy path. Assumes start() has already been called.
    Only walks the forward chain — does not go to FAILED/TERMINATED.
    """
    chain = [S.VALIDATED, S.READY, S.ACTIVATED, S.ACTIVE, S.COMPLETED]
    for state in chain:
        manager.transition(scenario_id, state)
        if state == target:
            return


def _reach_terminal(manager: ScenarioLifecycleManager, scenario_id: str, terminal: S) -> None:
    """
    Land scenario_id on `terminal` correctly, regardless of which terminal
    state it is. FAILED/TERMINATED are reachable directly from DEFINED
    (or any non-terminal state); COMPLETED is reachable ONLY from ACTIVE,
    so we must walk the full forward chain first in that case.

    Assumes start() has already been called and scenario_id is currently
    in DEFINED.
    """
    if terminal == S.COMPLETED:
        _advance_to(manager, scenario_id, S.ACTIVE)
    manager.transition(scenario_id, terminal)


# ---------------------------------------------------------------------------
# start()
# ---------------------------------------------------------------------------

class TestStart:

    def test_start_returns_defined(self, manager):
        assert manager.start(SCN_A) == S.DEFINED

    def test_start_sets_current_state_to_defined(self, manager):
        manager.start(SCN_A)
        assert manager.current_state(SCN_A) == S.DEFINED

    def test_start_seeds_history_with_one_entry(self, manager):
        manager.start(SCN_A)
        history = manager.history(SCN_A)
        assert len(history) == 1
        assert history[0][0] == S.DEFINED

    def test_start_twice_raises(self, manager):
        manager.start(SCN_A)
        with pytest.raises(ArcturusValidationError):
            manager.start(SCN_A)

    def test_start_different_scenario_ids_are_independent(self, manager):
        manager.start(SCN_A)
        manager.start(SCN_B)
        assert manager.current_state(SCN_A) == S.DEFINED
        assert manager.current_state(SCN_B) == S.DEFINED


# ---------------------------------------------------------------------------
# current_state()
# ---------------------------------------------------------------------------

class TestCurrentState:

    def test_current_state_raises_if_never_started(self, manager):
        with pytest.raises(ArcturusValidationError):
            manager.current_state(SCN_A)

    def test_current_state_reflects_latest_transition(self, manager):
        manager.start(SCN_A)
        manager.transition(SCN_A, S.VALIDATED)
        assert manager.current_state(SCN_A) == S.VALIDATED
        manager.transition(SCN_A, S.READY)
        assert manager.current_state(SCN_A) == S.READY


# ---------------------------------------------------------------------------
# transition() — happy path
# ---------------------------------------------------------------------------

class TestTransitionHappyPath:

    def test_full_forward_chain_to_completed(self, manager):
        manager.start(SCN_A)
        assert manager.transition(SCN_A, S.VALIDATED) == S.VALIDATED
        assert manager.transition(SCN_A, S.READY) == S.READY
        assert manager.transition(SCN_A, S.ACTIVATED) == S.ACTIVATED
        assert manager.transition(SCN_A, S.ACTIVE) == S.ACTIVE
        assert manager.transition(SCN_A, S.COMPLETED) == S.COMPLETED
        assert manager.current_state(SCN_A) == S.COMPLETED

    def test_history_records_every_step_in_order(self, manager):
        manager.start(SCN_A)
        manager.transition(SCN_A, S.VALIDATED)
        manager.transition(SCN_A, S.READY)

        states_in_order = [entry[0] for entry in manager.history(SCN_A)]
        assert states_in_order == [S.DEFINED, S.VALIDATED, S.READY]


# ---------------------------------------------------------------------------
# transition() — invalid / skipped transitions
# ---------------------------------------------------------------------------

class TestTransitionInvalid:

    def test_transition_on_unstarted_scenario_raises(self, manager):
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.VALIDATED)

    def test_cannot_skip_states_defined_to_ready(self, manager):
        manager.start(SCN_A)
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.READY)  # must go through VALIDATED first

    def test_cannot_skip_states_defined_to_active(self, manager):
        manager.start(SCN_A)
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.ACTIVE)

    def test_cannot_self_transition(self, manager):
        manager.start(SCN_A)
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.DEFINED)

    def test_cannot_go_backward(self, manager):
        manager.start(SCN_A)
        manager.transition(SCN_A, S.VALIDATED)
        manager.transition(SCN_A, S.READY)
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.VALIDATED)  # no backward edge defined

    def test_failed_transition_error_message_lists_allowed_states(self, manager):
        manager.start(SCN_A)
        with pytest.raises(ArcturusValidationError) as exc_info:
            manager.transition(SCN_A, S.READY)
        # Sanity check the error is informative, not just that it fires.
        assert "DEFINED" in str(exc_info.value) or "READY" in str(exc_info.value)


# ---------------------------------------------------------------------------
# transition() — FAILED / TERMINATED reachable from every non-terminal state
# ---------------------------------------------------------------------------

class TestFailedAndTerminatedReachability:

    @pytest.mark.parametrize("target_state", NON_TERMINAL_STATES)
    def test_failed_reachable_from_every_non_terminal_state(self, manager, target_state):
        manager.start(SCN_A)
        if target_state != S.DEFINED:
            _advance_to(manager, SCN_A, target_state)
        assert manager.transition(SCN_A, S.FAILED) == S.FAILED
        assert manager.current_state(SCN_A) == S.FAILED

    @pytest.mark.parametrize("target_state", NON_TERMINAL_STATES)
    def test_terminated_reachable_from_every_non_terminal_state(self, manager, target_state):
        manager.start(SCN_A)
        if target_state != S.DEFINED:
            _advance_to(manager, SCN_A, target_state)
        assert manager.transition(SCN_A, S.TERMINATED) == S.TERMINATED
        assert manager.current_state(SCN_A) == S.TERMINATED


# ---------------------------------------------------------------------------
# transition() — terminal states block ALL further transitions
# ---------------------------------------------------------------------------

class TestTerminalStatesBlockTransitions:

    @pytest.mark.parametrize("terminal_state", TERMINAL_STATES)
    def test_no_transition_allowed_once_terminal(self, manager, terminal_state):
        manager.start(SCN_A)
        _reach_terminal(manager, SCN_A, terminal_state)
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.FAILED)  # even to another terminal state
        with pytest.raises(ArcturusValidationError):
            manager.transition(SCN_A, S.TERMINATED)


# ---------------------------------------------------------------------------
# history()
# ---------------------------------------------------------------------------

class TestHistory:

    def test_history_raises_if_never_started(self, manager):
        with pytest.raises(ArcturusValidationError):
            manager.history(SCN_A)

    def test_history_returns_a_copy_not_a_live_reference(self, manager):
        manager.start(SCN_A)
        history = manager.history(SCN_A)
        history.append((S.TERMINATED, None))  # mutate the returned list

        fresh_history = manager.history(SCN_A)
        assert len(fresh_history) == 1  # internal state untouched
        assert fresh_history[0][0] == S.DEFINED

    def test_history_does_not_leak_across_scenario_ids(self, manager):
        manager.start(SCN_A)
        manager.start(SCN_B)
        manager.transition(SCN_A, S.VALIDATED)

        assert len(manager.history(SCN_A)) == 2
        assert len(manager.history(SCN_B)) == 1


# ---------------------------------------------------------------------------
# is_terminal()
# ---------------------------------------------------------------------------

class TestIsTerminal:

    def test_is_terminal_raises_if_never_started(self, manager):
        with pytest.raises(ArcturusValidationError):
            manager.is_terminal(SCN_A)

    def test_is_terminal_false_through_forward_chain(self, manager):
        manager.start(SCN_A)
        assert manager.is_terminal(SCN_A) is False
        manager.transition(SCN_A, S.VALIDATED)
        assert manager.is_terminal(SCN_A) is False
        manager.transition(SCN_A, S.READY)
        assert manager.is_terminal(SCN_A) is False
        manager.transition(SCN_A, S.ACTIVATED)
        assert manager.is_terminal(SCN_A) is False
        manager.transition(SCN_A, S.ACTIVE)
        assert manager.is_terminal(SCN_A) is False

    @pytest.mark.parametrize("terminal_state", TERMINAL_STATES)
    def test_is_terminal_true_for_each_terminal_state(self, manager, terminal_state):
        manager.start(SCN_A)
        _reach_terminal(manager, SCN_A, terminal_state)
        assert manager.is_terminal(SCN_A) is True


# ---------------------------------------------------------------------------
# Isolation between ScenarioLifecycleManager instances
# ---------------------------------------------------------------------------

class TestInstanceIsolation:

    def test_two_manager_instances_do_not_share_state(self):
        mgr1 = ScenarioLifecycleManager()
        mgr2 = ScenarioLifecycleManager()
        mgr1.start(SCN_A)
        assert mgr1.current_state(SCN_A) == S.DEFINED
        with pytest.raises(ArcturusValidationError):
            mgr2.current_state(SCN_A)
