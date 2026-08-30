"""
Scenario Engineering Platform — Day 6 Failure Engineering
Owner: Maryam Yaqoob

Tracker item (Week 4 Day 6, docs/week4/implementation_plan.md §"Maryam
(Scenario)"):
    Unresolvable preconditions -> scenario marked `INVALID`
    Test: tests/scenario_engineering/test_scenario_failures.py

ASSUMPTION FLAGGED: the tracker's expected outcome ("marked INVALID")
does not match the real ScenarioLifecycleState enum in
scenario_lifecycle.py, which only defines:
    DEFINED, VALIDATED, READY, ACTIVATED, ACTIVE,
    COMPLETED, FAILED, TERMINATED
There is no INVALID state. Adding one this late (Day 6, with Day 7's
Golden Acceptance Run next) would touch a shared enum that Hashim's
experiment_orchestrator.py and Maaz's Runtime both key off of --
too risky to introduce unreviewed, this close to the milestone.

Decision made here instead: reuse the existing FAILED terminal state,
which the lifecycle module's own docstring already documents as
"reachable from any non-terminal state, since real systems fail at any
stage." This is a zero-risk, zero-new-surface-area choice. If the team
wants a dedicated INVALID state later, that is a lifecycle-model change
that should go through Hashim for cross-platform sign-off first.

Second decision (interpreting "unresolvable"): scenario_engine.py's
evaluate_preconditions() only checks STRUCTURAL well-formedness (non-
empty, no duplicates) -- already covered by
tests/scenarios/test_scenario_failure_engineering.py::TestFailedPrecondition.
"Unresolvable" is treated here as the semantically distinct case: a
precondition that references a participant which does not exist in the
real, resolved enterprise instance -- i.e. exactly what
scenario_context_resolver.resolve_scenario_context(strict=True) already
guards, per Part 2. That function is the real "unresolvable" check;
this file verifies it produces traceable evidence and, when the
scenario is already lifecycle-tracked, a clean FAILED transition
(never a silent pass, never a partial/corrupted state).

Third item on the original tracker line ("AI-generated scenario failing
validation") is intentionally NOT covered here: per this platform's own
docs/week4/Maryam_Yaqoob.md Part 5C, AI-assisted scenario generation is
not implemented anywhere in src/, contracts/, or api/ for this platform,
so it is correctly classified as "Architecture/Future" and out of scope
for Day 6 -- flagged to Hashim separately rather than building an
unnecessary AI subsystem to satisfy the line item.

Uses the SCN-UR-1xx scenario_id range, unique across the whole suite
(process-wide singletons in scenario_chain.py are shared across test
files that import it -- this file does not import that module, so no
collision risk regardless, but the range is reserved for consistency).

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/scenario_engineering/test_scenario_failures.py -v
"""

from __future__ import annotations

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    DepartmentState,
    DivisionState,
    OrganizationState,
    RoleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_context_resolver import (
    resolve_scenario_context,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleManager,
    ScenarioLifecycleState,
)


# ---------------------------------------------------------------------------
# Fixtures / builders (local to this file, per project convention)
# ---------------------------------------------------------------------------

def _context(experiment_id: str = "EXP-UNR-001", seed: int = 11) -> SimulationContext:
    return SimulationContext(experiment_id=experiment_id, global_seed=seed)


def _payload(
    scenario_id: str,
    participants: list[str],
    organizational_scope: list[str] | None = None,
) -> ScenarioDSLPayload:
    return ScenarioDSLPayload(
        context=_context(),
        scenario_id=scenario_id,
        description="Unresolvable precondition failure-engineering test",
        trigger_event="reorg_announced",
        participants=participants,
        organizational_scope=(
            organizational_scope if organizational_scope is not None else ["HR"]
        ),
        preconditions=["assigned_participant_must_exist"],
        variables={},
    )


def _enterprise(instance_id: str = "ENT-UNR-001") -> EnterpriseInstancePayload:
    """A real, resolvable enterprise instance with exactly one role: 'HR Lead'."""
    return EnterpriseInstancePayload(
        context=_context(),
        instance_id=instance_id,
        config_id="CFG-UNR-001",
        organization=OrganizationState(org_id=1, org_name="Horquva", leader="CEO"),
        divisions=[DivisionState(div_id=10, div_name="People Operations", org_id=1)],
        departments=[
            DepartmentState(dept_id=100, div_id=10, dept_name="HR", readiness_score=1.0)
        ],
        teams=[],
        roles=[RoleState(role_id=1000, role_title="HR Lead", access_level=2.0)],
        is_structurally_valid=True,
        validation_errors=[],
    )


# ---------------------------------------------------------------------------
# Unresolvable precondition (participant does not exist in real enterprise)
# ---------------------------------------------------------------------------

class TestUnresolvablePrecondition:

    def test_nonexistent_participant_rejected_with_traceable_evidence(self):
        """
        A precondition implicitly depends on its participants existing in
        the real org. A participant string with no matching role_title in
        the enterprise instance is unresolvable -- resolve_scenario_context
        (strict=True) must reject it, and the error must name both the
        scenario_id and the exact unresolved label (traceability, not just
        a generic failure).
        """
        payload = _payload("SCN-UR-101", participants=["Nonexistent Role"])
        enterprise = _enterprise()

        with pytest.raises(ArcturusValidationError) as exc_info:
            resolve_scenario_context(payload, enterprise, strict=True)

        message = str(exc_info.value)
        assert "SCN-UR-101" in message
        assert "Nonexistent Role" in message

    def test_valid_participant_resolves_cleanly(self):
        """Control case: a real role_title must NOT be rejected."""
        payload = _payload("SCN-UR-102", participants=["HR Lead"])
        enterprise = _enterprise()

        resolution = resolve_scenario_context(payload, enterprise, strict=True)

        assert resolution.all_resolved
        assert resolution.unresolved == []

    def test_already_tracked_scenario_transitions_to_failed_not_silently_stuck(self):
        """
        If a scenario_id was already registered in the lifecycle manager
        (e.g. compiled and started before context resolution ran), an
        unresolvable precondition must land it in FAILED -- not leave it
        silently sitting at DEFINED (which would look indistinguishable
        from "not yet processed") and not raise from transition() itself.

        This is the concrete stand-in for the tracker's "marked INVALID":
        FAILED is the real terminal state available for this today (see
        module docstring for why a new INVALID state was not added).
        """
        manager = ScenarioLifecycleManager()
        manager.start("SCN-UR-103")

        payload = _payload("SCN-UR-103", participants=["Nonexistent Role"])
        enterprise = _enterprise()

        with pytest.raises(ArcturusValidationError):
            resolve_scenario_context(payload, enterprise, strict=True)

        # Caller (e.g. the compile/dispatch path) is responsible for
        # catching the rejection above and marking the lifecycle FAILED.
        # Verify that path is clean and traceable, not that resolution
        # does it implicitly (resolve_scenario_context has no lifecycle
        # awareness by design -- no cross-platform coupling, per §2.1).
        manager.transition("SCN-UR-103", ScenarioLifecycleState.FAILED)

        assert manager.current_state("SCN-UR-103") == ScenarioLifecycleState.FAILED
        assert manager.is_terminal("SCN-UR-103")

    def test_multiple_unresolvable_participants_all_named_in_error(self):
        """Traceability must scale: every unresolved label should be
        identifiable, not just the first one found."""
        payload = _payload(
            "SCN-UR-104",
            participants=["Ghost Role", "Another Ghost Role"],
        )
        enterprise = _enterprise()

        with pytest.raises(ArcturusValidationError) as exc_info:
            resolve_scenario_context(payload, enterprise, strict=True)

        message = str(exc_info.value)
        assert "Ghost Role" in message
        assert "Another Ghost Role" in message


__all__: list[str] = []
