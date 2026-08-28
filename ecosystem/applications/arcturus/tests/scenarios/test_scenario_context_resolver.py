"""
Unit tests for src/control_plane/scenarios/scenario_context_resolver.py

Written directly against the real scenario_context_resolver.py source
(confirmed by file inspection). Confirmed real behavior:

  - resolve_organizational_scope(payload, enterprise) -> list[ResolvedEntity]
      Matches each organizational_scope string against Division.div_name
      first, then Department.dept_name (department dict built only from
      departments with a non-None dept_name). Case-sensitive exact match.
      Team-level and Organization-level scope strings are NOT matched at
      all (documented gap, not silently accepted) â€” they always come back
      "Unknown"/unresolved.
  - resolve_participants(payload, enterprise) -> list[ResolvedEntity]
      Matches each participant string against RoleState.role_title only.
      Case-sensitive exact match.
  - resolve_scenario_context(payload, enterprise, *, strict=True)
      strict=True (default): raises ArcturusValidationError if anything is
      unresolved. strict=False: returns the ScenarioContextResolution
      regardless, for diagnostic use.
      Resolution is performed even when enterprise.is_structurally_valid
      is False (documented assumption: names still exist pre-validation).
  - verify_workflow_compatibility(payload, workflow, enterprise)
      Raises ArcturusValidationError iff
      workflow.organizational_context_ref != enterprise.instance_id.
      Returns None (no exception) otherwise.

Contract shapes confirmed from:
  - contracts/enterprise/base_models.py (EnterpriseInstancePayload)
  - contracts/ontology/ontology_snapshot_contract.py (OrganizationState,
    DivisionState, DepartmentState, RoleState â€” all IDs are int)
  - contracts/execution/workflows/base_models.py +
    schemas/execution/workflows/base_schemas.py (WorkflowDefinitionContract,
    ActivityStateContract, WORKFLOW_ID_PATTERN=^WF-[A-Z]{3}-\\d{3}$,
    ACTIVITY_ID_PATTERN=^ACT-\\d{4}$, ActivityStatus.PENDING does not
    require started_at since PENDING is not in TERMINAL_ACTIVITY_STATUSES)
  - contracts/shared/base_models.py (SimulationContext, ArcturusValidationError)

Run with:
  python -m pytest ecosystem/applications/arcturus/tests/scenarios/test_scenario_context_resolver.py -v
"""

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
    WorkflowDefinitionContract,
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
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_context_resolver import (
    ScenarioContextResolution,
    resolve_organizational_scope,
    resolve_participants,
    resolve_scenario_context,
    verify_workflow_compatibility,
)


# ---------------------------------------------------------------------------
# Fixtures / builders
# ---------------------------------------------------------------------------

def _context(experiment_id: str = "EXP-CTX-001", seed: int = 11) -> SimulationContext:
    return SimulationContext(experiment_id=experiment_id, global_seed=seed)


def _payload(
    participants: list[str] | None = None,
    organizational_scope: list[str] | None = None,
    scenario_id: str = "SCN-HR-001",
) -> ScenarioDSLPayload:
    return ScenarioDSLPayload(
        context=_context(),
        scenario_id=scenario_id,
        description="Context resolution test scenario",
        trigger_event="reorg_announced",
        participants=participants if participants is not None else ["HR Lead"],
        organizational_scope=(
            organizational_scope if organizational_scope is not None else ["HR"]
        ),
        preconditions=["baseline_precondition"],
        variables={},
    )


def _enterprise(
    instance_id: str = "ENT-001",
    config_id: str = "CFG-001",
    divisions: list[DivisionState] | None = None,
    departments: list[DepartmentState] | None = None,
    roles: list[RoleState] | None = None,
    is_structurally_valid: bool = False,
) -> EnterpriseInstancePayload:
    return EnterpriseInstancePayload(
        context=_context(),
        instance_id=instance_id,
        config_id=config_id,
        organization=OrganizationState(org_id=1, org_name="Horquva", leader="CEO"),
        divisions=(
            divisions
            if divisions is not None
            else [DivisionState(div_id=10, div_name="People Operations", org_id=1)]
        ),
        departments=(
            departments
            if departments is not None
            else [
                DepartmentState(
                    dept_id=100, div_id=10, dept_name="HR", readiness_score=1.0
                )
            ]
        ),
        teams=[],
        roles=(
            roles
            if roles is not None
            else [RoleState(role_id=1000, role_title="HR Lead", access_level=2.0)]
        ),
        is_structurally_valid=is_structurally_valid,
        validation_errors=[],
    )


def _activity(activity_id: str = "ACT-0001") -> ActivityStateContract:
    return ActivityStateContract(
        context=_context(),
        activity_id=activity_id,
        name="Notify stakeholders",
        status=ActivityStatus.PENDING,
    )


def _workflow(
    workflow_id: str = "WF-HRX-001",
    organizational_context_ref: str = "ENT-001",
) -> WorkflowDefinitionContract:
    return WorkflowDefinitionContract(
        context=_context(),
        workflow_id=workflow_id,
        name="HR Reorg Workflow",
        description="",
        activities=[_activity()],
        organizational_context_ref=organizational_context_ref,
        agent_assignment_ref="AGT-001",
    )


# ---------------------------------------------------------------------------
# resolve_organizational_scope()
# ---------------------------------------------------------------------------

class TestResolveOrganizationalScope:

    def test_resolves_department_name_exact_match(self):
        payload = _payload(organizational_scope=["HR"])
        enterprise = _enterprise()
        resolved = resolve_organizational_scope(payload, enterprise)

        assert len(resolved) == 1
        assert resolved[0].entity_type == "Department"
        assert resolved[0].label == "HR"
        assert resolved[0].entity_id == 100
        assert resolved[0].is_resolved is True

    def test_resolves_division_name_exact_match(self):
        payload = _payload(organizational_scope=["People Operations"])
        enterprise = _enterprise()
        resolved = resolve_organizational_scope(payload, enterprise)

        assert resolved[0].entity_type == "Division"
        assert resolved[0].entity_id == 10
        assert resolved[0].is_resolved is True

    def test_unresolved_scope_returns_unknown_with_notes(self):
        payload = _payload(organizational_scope=["Nonexistent Division"])
        enterprise = _enterprise()
        resolved = resolve_organizational_scope(payload, enterprise)

        assert resolved[0].entity_type == "Unknown"
        assert resolved[0].entity_id == -1
        assert resolved[0].is_resolved is False
        assert resolved[0].resolution_notes is not None
        assert "Nonexistent Division" in resolved[0].resolution_notes

    def test_department_with_none_dept_name_does_not_crash_and_stays_unresolved(self):
        payload = _payload(organizational_scope=["Unnamed"])
        enterprise = _enterprise(
            departments=[
                DepartmentState(dept_id=101, div_id=10, dept_name=None, readiness_score=1.0)
            ]
        )
        resolved = resolve_organizational_scope(payload, enterprise)
        assert resolved[0].is_resolved is False

    def test_team_and_organization_level_scope_are_not_supported(self):
        """Documented gap: only Division and Department are matched.
        A team name or the org name itself must NOT resolve."""
        payload = _payload(organizational_scope=["Horquva"])  # org_name, not div/dept
        enterprise = _enterprise()
        resolved = resolve_organizational_scope(payload, enterprise)
        assert resolved[0].is_resolved is False


# ---------------------------------------------------------------------------
# resolve_participants()
# ---------------------------------------------------------------------------

class TestResolveParticipants:

    def test_resolves_role_title_exact_match(self):
        payload = _payload(participants=["HR Lead"])
        enterprise = _enterprise()
        resolved = resolve_participants(payload, enterprise)

        assert resolved[0].entity_type == "Role"
        assert resolved[0].label == "HR Lead"
        assert resolved[0].entity_id == 1000
        assert resolved[0].is_resolved is True

    def test_unresolved_participant_returns_unknown(self):
        payload = _payload(participants=["Nonexistent Role"])
        enterprise = _enterprise()
        resolved = resolve_participants(payload, enterprise)

        assert resolved[0].entity_type == "Unknown"
        assert resolved[0].is_resolved is False
        assert "Nonexistent Role" in resolved[0].resolution_notes

    def test_case_sensitive_match_required(self):
        """Documented assumption: resolution is CASE-SENSITIVE exact match."""
        payload = _payload(participants=["hr lead"])  # lowercase, real is "HR Lead"
        enterprise = _enterprise()
        resolved = resolve_participants(payload, enterprise)
        assert resolved[0].is_resolved is False


# ---------------------------------------------------------------------------
# resolve_scenario_context()
# ---------------------------------------------------------------------------

class TestResolveScenarioContext:

    def test_all_resolved_true_when_everything_matches(self):
        payload = _payload(participants=["HR Lead"], organizational_scope=["HR"])
        enterprise = _enterprise()
        resolution = resolve_scenario_context(payload, enterprise, strict=False)

        assert isinstance(resolution, ScenarioContextResolution)
        assert resolution.scenario_id == payload.scenario_id
        assert resolution.enterprise_instance_id == enterprise.instance_id
        assert resolution.all_resolved is True
        assert resolution.unresolved == []

    def test_strict_true_raises_on_unresolved_entity(self):
        payload = _payload(participants=["Ghost Role"], organizational_scope=["HR"])
        enterprise = _enterprise()
        with pytest.raises(ArcturusValidationError):
            resolve_scenario_context(payload, enterprise)  # strict=True is default

    def test_strict_false_returns_resolution_without_raising(self):
        payload = _payload(participants=["Ghost Role"], organizational_scope=["HR"])
        enterprise = _enterprise()
        resolution = resolve_scenario_context(payload, enterprise, strict=False)

        assert resolution.all_resolved is False
        assert len(resolution.unresolved) == 1
        assert resolution.unresolved[0].label == "Ghost Role"

    def test_unresolved_property_only_lists_failed_entities(self):
        payload = _payload(
            participants=["HR Lead", "Ghost Role"],
            organizational_scope=["HR"],
        )
        enterprise = _enterprise()
        resolution = resolve_scenario_context(payload, enterprise, strict=False)

        unresolved_labels = [e.label for e in resolution.unresolved]
        assert unresolved_labels == ["Ghost Role"]

    def test_resolution_succeeds_even_when_enterprise_not_structurally_valid(self):
        """Documented assumption (c): is_structurally_valid=False does not
        block name resolution."""
        payload = _payload(participants=["HR Lead"], organizational_scope=["HR"])
        enterprise = _enterprise(is_structurally_valid=False)
        resolution = resolve_scenario_context(payload, enterprise)
        assert resolution.all_resolved is True

    def test_error_message_lists_unresolved_labels_and_instance_id(self):
        payload = _payload(
            scenario_id="SCN-HR-002",
            participants=["Ghost Role"],
            organizational_scope=["HR"],
        )
        enterprise = _enterprise(instance_id="ENT-999")
        with pytest.raises(ArcturusValidationError) as exc_info:
            resolve_scenario_context(payload, enterprise)

        message = str(exc_info.value)
        assert "SCN-HR-002" in message
        assert "ENT-999" in message
        assert "Ghost Role" in message


# ---------------------------------------------------------------------------
# verify_workflow_compatibility()
# ---------------------------------------------------------------------------

class TestVerifyWorkflowCompatibility:

    def test_matching_context_ref_does_not_raise(self):
        payload = _payload()
        enterprise = _enterprise(instance_id="ENT-001")
        workflow = _workflow(organizational_context_ref="ENT-001")

        # Should not raise
        assert verify_workflow_compatibility(payload, workflow, enterprise) is None

    def test_mismatched_context_ref_raises(self):
        payload = _payload()
        enterprise = _enterprise(instance_id="ENT-001")
        workflow = _workflow(organizational_context_ref="ENT-002")

        with pytest.raises(ArcturusValidationError):
            verify_workflow_compatibility(payload, workflow, enterprise)

    def test_mismatch_error_message_includes_both_instance_ids_and_workflow_id(self):
        payload = _payload(scenario_id="SCN-HR-003")
        enterprise = _enterprise(instance_id="ENT-001")
        workflow = _workflow(
            workflow_id="WF-HRX-002", organizational_context_ref="ENT-999"
        )

        with pytest.raises(ArcturusValidationError) as exc_info:
            verify_workflow_compatibility(payload, workflow, enterprise)

        message = str(exc_info.value)
        assert "SCN-HR-003" in message
        assert "ENT-001" in message
        assert "ENT-999" in message
        assert "WF-HRX-002" in message
