from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
    PolicyGovernanceContract,
    WorkflowDefinitionContract,
    WorkflowExecutionEvidence,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
    PolicyEnforcementLevel,
    PolicyViolationAction,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_service import (
    WorkflowService,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_adapters import (
    adapt_agent_assignment_ref,
    adapt_enterprise_context,
    resolve_activity_assignments,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def ctx() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-WF-TEST", global_seed=7)


@pytest.fixture
def valid_activity(ctx) -> ActivityStateContract:
    return ActivityStateContract(
        context=ctx,
        activity_id="ACT-0001",
        name="Draft quarterly report",
        status=ActivityStatus.PENDING,
    )


@pytest.fixture
def service(ctx) -> WorkflowService:
    return WorkflowService(context=ctx)


class _FakeEnterpriseInstance:
    def __init__(self, instance_id="ENT-INST-001", is_structurally_valid=True, validation_errors=None):
        self.instance_id = instance_id
        self.is_structurally_valid = is_structurally_valid
        self.validation_errors = validation_errors or []


class _FakeAgentAssignment:
    def __init__(self, assignment_id="AGT-ASSIGN-001", enterprise_instance_id="ENT-INST-001", assignments=None):
        self.assignment_id = assignment_id
        self.enterprise_instance_id = enterprise_instance_id
        self.assignments = assignments or []


class _FakeAssignmentEntry:
    def __init__(self, agent_id, role_id):
        self.agent_id = agent_id
        self.role_id = role_id


# ---------------------------------------------------------------------------
# 1. ActivityStateContract — schema & business-rule violations
# ---------------------------------------------------------------------------

def test_activity_valid_pending_needs_no_timestamps(ctx):
    activity = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Draft report", status=ActivityStatus.PENDING
    )
    assert activity.started_at is None


def test_activity_invalid_id_pattern_raises_schema_violation(ctx):
    with pytest.raises(ValidationError):
        ActivityStateContract(context=ctx, activity_id="not-a-valid-id", name="X", status=ActivityStatus.PENDING)


def test_activity_missing_name_raises_schema_violation(ctx):
    with pytest.raises(ValidationError):
        ActivityStateContract(context=ctx, activity_id="ACT-0001", name="", status=ActivityStatus.PENDING)


def test_activity_completed_without_started_at_raises(ctx):
    """Business-rule violation: terminal status requires started_at."""
    with pytest.raises(ValidationError):
        ActivityStateContract(
            context=ctx, activity_id="ACT-0001", name="X", status=ActivityStatus.COMPLETED
        )


def test_activity_completed_at_before_started_at_raises(ctx):
    with pytest.raises(ValidationError):
        ActivityStateContract(
            context=ctx,
            activity_id="ACT-0001",
            name="X",
            status=ActivityStatus.COMPLETED,
            started_at=datetime(2026, 8, 13, 10, 0, 0),
            completed_at=datetime(2026, 8, 13, 9, 0, 0),  # before started_at
        )


def test_activity_failed_without_started_at_raises(ctx):
    """FAILED is also a terminal status per TERMINAL_ACTIVITY_STATUSES."""
    with pytest.raises(ValidationError):
        ActivityStateContract(context=ctx, activity_id="ACT-0001", name="X", status=ActivityStatus.FAILED)


def test_activity_escalated_does_not_require_started_at(ctx):
    """ESCALATED is intentionally NOT in TERMINAL_ACTIVITY_STATUSES."""
    activity = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="X", status=ActivityStatus.ESCALATED
    )
    assert activity.started_at is None


# ---------------------------------------------------------------------------
# 2. WorkflowDefinitionContract — missing fields, duplicate activity_id
# ---------------------------------------------------------------------------

def test_workflow_valid_definition(ctx, valid_activity):
    workflow = WorkflowDefinitionContract(
        context=ctx,
        workflow_id="WF-BHV-001",
        name="Quarterly Reporting Workflow",
        activities=[valid_activity],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )
    assert workflow.created_by == "javeria.rafhan"


def test_workflow_empty_activities_raises(ctx):
    with pytest.raises(ValidationError):
        WorkflowDefinitionContract(
            context=ctx,
            workflow_id="WF-BHV-001",
            name="Empty Workflow",
            activities=[],
            organizational_context_ref="ENT-INST-001",
            agent_assignment_ref="AGT-ASSIGN-001",
        )


def test_workflow_missing_organizational_context_ref_raises(ctx, valid_activity):
    with pytest.raises(ValidationError):
        WorkflowDefinitionContract(
            context=ctx,
            workflow_id="WF-BHV-001",
            name="X",
            activities=[valid_activity],
            agent_assignment_ref="AGT-ASSIGN-001",
        )


def test_workflow_duplicate_activity_ids_raises(ctx):
    a1 = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="A", status=ActivityStatus.PENDING)
    a2 = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="B", status=ActivityStatus.PENDING)
    with pytest.raises(ValidationError):
        WorkflowDefinitionContract(
            context=ctx,
            workflow_id="WF-BHV-001",
            name="Duplicate IDs",
            activities=[a1, a2],
            organizational_context_ref="ENT-INST-001",
            agent_assignment_ref="AGT-ASSIGN-001",
        )


def test_workflow_invalid_workflow_id_pattern_raises(ctx, valid_activity):
    with pytest.raises(ValidationError):
        WorkflowDefinitionContract(
            context=ctx,
            workflow_id="not-valid",
            name="X",
            activities=[valid_activity],
            organizational_context_ref="ENT-INST-001",
            agent_assignment_ref="AGT-ASSIGN-001",
        )


# ---------------------------------------------------------------------------
# 3. PolicyGovernanceContract — invalid enforcement/violation combination
# ---------------------------------------------------------------------------

def test_policy_valid_blocking_with_halt(ctx):
    policy = PolicyGovernanceContract(
        context=ctx,
        policy_id="POL-BHV-001",
        applies_to_workflow_id="WF-BHV-001",
        enforcement_level=PolicyEnforcementLevel.BLOCKING,
        rule_description="Every activity must have an assigned agent.",
        violation_action=PolicyViolationAction.HALT_WORKFLOW,
    )
    assert policy.enforcement_level == PolicyEnforcementLevel.BLOCKING


def test_policy_blocking_with_log_only_raises(ctx):
    """A BLOCKING policy that only logs (doesn't halt) is an invalid transition."""
    with pytest.raises(ValidationError):
        PolicyGovernanceContract(
            context=ctx,
            policy_id="POL-BHV-001",
            applies_to_workflow_id="WF-BHV-001",
            enforcement_level=PolicyEnforcementLevel.BLOCKING,
            rule_description="X",
            violation_action=PolicyViolationAction.LOG_ONLY,
        )


def test_policy_invalid_policy_id_pattern_raises(ctx):
    with pytest.raises(ValidationError):
        PolicyGovernanceContract(
            context=ctx,
            policy_id="bad-id",
            applies_to_workflow_id="WF-BHV-001",
            enforcement_level=PolicyEnforcementLevel.ADVISORY,
            rule_description="X",
        )


# ---------------------------------------------------------------------------
# 4. WorkflowExecutionEvidence — count consistency
# ---------------------------------------------------------------------------

def test_evidence_valid_counts(ctx):
    evidence = WorkflowExecutionEvidence(
        context=ctx,
        evidence_id="EVID-001",
        workflow_id="WF-BHV-001",
        total_activities=3,
        completed_activities=2,
        failed_activities=1,
        escalated_activities=0,
        sla_compliant=True,
    )
    assert evidence.total_activities == 3


def test_evidence_counts_exceeding_total_raises(ctx):
    with pytest.raises(ValidationError):
        WorkflowExecutionEvidence(
            context=ctx,
            evidence_id="EVID-001",
            workflow_id="WF-BHV-001",
            total_activities=2,
            completed_activities=2,
            failed_activities=1,  # 2 + 1 > 2
            sla_compliant=True,
        )


# ---------------------------------------------------------------------------
# 5. WorkflowService — typed-error wrapping, SLA evaluation
# ---------------------------------------------------------------------------

def test_compile_workflow_wraps_validation_error_as_arcturus_error(service):
    """Service boundary must never leak raw pydantic ValidationError."""
    with pytest.raises(ArcturusValidationError):
        service.compile_workflow(
            workflow_id="WF-BHV-001",
            name="X",
            activities=[],  # violates must_have_at_least_one_activity
            organizational_context_ref="ENT-INST-001",
            agent_assignment_ref="AGT-ASSIGN-001",
        )


def test_evaluate_sla_detects_breach(service, ctx):
    activity = ActivityStateContract(
        context=ctx,
        activity_id="ACT-0001",
        name="Slow task",
        status=ActivityStatus.COMPLETED,
        started_at=datetime(2026, 8, 13, 9, 0, 0),
        completed_at=datetime(2026, 8, 13, 9, 0, 0) + timedelta(seconds=5000),
    )
    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="X",
        activities=[activity],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )
    result = service.evaluate_sla(workflow, sla_seconds={"ACT-0001": 3000})
    assert result["compliant"] is False
    assert "ACT-0001" in result["breaches"]


def test_evaluate_sla_skips_unfinished_activities(service, ctx):
    activity = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Not started", status=ActivityStatus.PENDING
    )
    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="X",
        activities=[activity],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )
    result = service.evaluate_sla(workflow)
    assert result["compliant"] is True
    assert result["breaches"] == []


def test_enforce_policy_halts_on_breach(service):
    policy = PolicyGovernanceContract(
        context=service.context,
        policy_id="POL-BHV-001",
        applies_to_workflow_id="WF-BHV-001",
        enforcement_level=PolicyEnforcementLevel.BLOCKING,
        rule_description="Must meet SLA",
        violation_action=PolicyViolationAction.HALT_WORKFLOW,
    )
    breached_result = {"compliant": False, "breaches": ["ACT-0001"], "elapsed_seconds": {}}
    with pytest.raises(ArcturusValidationError):
        service.enforce_policy(policy, breached_result)


def test_enforce_policy_passes_when_compliant(service):
    policy = PolicyGovernanceContract(
        context=service.context,
        policy_id="POL-BHV-001",
        applies_to_workflow_id="WF-BHV-001",
        enforcement_level=PolicyEnforcementLevel.BLOCKING,
        rule_description="Must meet SLA",
        violation_action=PolicyViolationAction.HALT_WORKFLOW,
    )
    compliant_result = {"compliant": True, "breaches": [], "elapsed_seconds": {}}
    service.enforce_policy(policy, compliant_result)  # should not raise


# ---------------------------------------------------------------------------
# 6. workflow_adapters — cross-platform translation failures
# ---------------------------------------------------------------------------

def test_adapt_enterprise_context_valid_instance():
    instance = _FakeEnterpriseInstance(instance_id="ENT-INST-001", is_structurally_valid=True)
    assert adapt_enterprise_context(instance) == "ENT-INST-001"


def test_adapt_enterprise_context_rejects_structurally_invalid_instance():
    instance = _FakeEnterpriseInstance(
        instance_id="ENT-INST-001", is_structurally_valid=False, validation_errors=["bad hierarchy"]
    )
    with pytest.raises(ArcturusValidationError):
        adapt_enterprise_context(instance)


def test_adapt_agent_assignment_ref_valid():
    assignment = _FakeAgentAssignment(assignment_id="AGT-ASSIGN-001", enterprise_instance_id="ENT-INST-001")
    ref = adapt_agent_assignment_ref(assignment, expected_enterprise_instance_id="ENT-INST-001")
    assert ref == "AGT-ASSIGN-001"


def test_adapt_agent_assignment_ref_rejects_mismatched_enterprise_instance():
    assignment = _FakeAgentAssignment(assignment_id="AGT-ASSIGN-001", enterprise_instance_id="ENT-INST-999")
    with pytest.raises(ArcturusValidationError):
        adapt_agent_assignment_ref(assignment, expected_enterprise_instance_id="ENT-INST-001")


def test_resolve_activity_assignments_maps_agent_to_activity(ctx):
    activity = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="X", status=ActivityStatus.PENDING)
    assignment = _FakeAgentAssignment(
        assignments=[_FakeAssignmentEntry(agent_id=501, role_id=101)]
    )
    result = resolve_activity_assignments(
        activities=[activity],
        agent_assignment=assignment,
        activity_id_by_role_id={101: "ACT-0001"},
    )
    assert result[0].assigned_agent_id == "501"


def test_resolve_activity_assignments_raises_on_unmapped_role(ctx):
    activity = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="X", status=ActivityStatus.PENDING)
    assignment = _FakeAgentAssignment(
        assignments=[_FakeAssignmentEntry(agent_id=501, role_id=999)]  # no mapping for 999
    )
    with pytest.raises(ArcturusValidationError):
        resolve_activity_assignments(
            activities=[activity],
            agent_assignment=assignment,
            activity_id_by_role_id={101: "ACT-0001"},
        )