from __future__ import annotations

from datetime import datetime, timezone
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
    validate_activity_transition,
)


@pytest.fixture
def ctx() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-FAILURE-TEST", global_seed=99)


@pytest.fixture
def service(ctx) -> WorkflowService:
    return WorkflowService(context=ctx)


class _DummyEnterpriseInstance:
    def __init__(self, instance_id="ENT-INST-001", is_structurally_valid=True, validation_errors=None):
        self.instance_id = instance_id
        self.is_structurally_valid = is_structurally_valid
        self.validation_errors = validation_errors or []


class _DummyAgentAssignment:
    def __init__(self, assignment_id="AGT-ASSIGN-001", enterprise_instance_id="ENT-INST-001", assignments=None):
        self.assignment_id = assignment_id
        self.enterprise_instance_id = enterprise_instance_id
        self.assignments = assignments or []


class _DummyAssignmentEntry:
    def __init__(self, agent_id, role_id):
        self.agent_id = agent_id
        self.role_id = role_id


# ---------------------------------------------------------------------------
# 1. Circular Task Dependencies (Cycle Failure Modes)
# ---------------------------------------------------------------------------

def test_failure_mode_3_node_circular_dependency(service, ctx):
    """Failure mode: Cycle A -> B -> C -> A must be rejected by DAG validator."""
    act_a = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Task A", dependencies=["ACT-0003"])
    act_b = ActivityStateContract(context=ctx, activity_id="ACT-0002", name="Task B", dependencies=["ACT-0001"])
    act_c = ActivityStateContract(context=ctx, activity_id="ACT-0003", name="Task C", dependencies=["ACT-0002"])

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="3-Node Cycle",
        activities=[act_a, act_b, act_c],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "circular dependency detected" in exc.value.message
    assert exc.value.platform_source == "workflow"


def test_failure_mode_2_node_circular_dependency(service, ctx):
    """Failure mode: Immediate loop A <-> B must be detected and rejected."""
    act_a = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Task A", dependencies=["ACT-0002"])
    act_b = ActivityStateContract(context=ctx, activity_id="ACT-0002", name="Task B", dependencies=["ACT-0001"])

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="2-Node Cycle",
        activities=[act_a, act_b],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "circular dependency detected" in exc.value.message


def test_failure_mode_self_dependency(service, ctx):
    """Failure mode: Task depending on itself must be rejected."""
    act_a = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Self Task", dependencies=["ACT-0001"])

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Self Dep",
        activities=[act_a],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "self-dependency" in exc.value.message


def test_failure_mode_missing_dependency_reference(service, ctx):
    """Failure mode: Dependency pointing to a non-existent activity must raise error."""
    act_a = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Task A", dependencies=["ACT-8888"])

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Missing Target",
        activities=[act_a],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "references non-existent dependency" in exc.value.message


# ---------------------------------------------------------------------------
# 2. Blocked Activity Execution & Dependency Guards
# ---------------------------------------------------------------------------

def test_failure_mode_advancing_blocked_activity_rejected(service, ctx):
    """Failure mode: Child task cannot transition to IN_PROGRESS while parent is still PENDING."""
    act_parent = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Parent", status=ActivityStatus.PENDING)
    act_child = ActivityStateContract(
        context=ctx, activity_id="ACT-0002", name="Child", status=ActivityStatus.PENDING, dependencies=["ACT-0001"]
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Blocked Advance",
        activities=[act_parent, act_child],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.advance_activity(workflow, "ACT-0002", ActivityStatus.IN_PROGRESS)
    assert "dependency 'ACT-0001' status is 'pending'" in exc.value.message


def test_failure_mode_advancing_nonexistent_activity_rejected(service, ctx):
    """Failure mode: Attempting to advance an activity ID not in workflow raises error."""
    act_a = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Task A", status=ActivityStatus.PENDING)

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Invalid ID Advance",
        activities=[act_a],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.advance_activity(workflow, "ACT-9999", ActivityStatus.IN_PROGRESS)
    assert "activity 'ACT-9999' not found" in exc.value.message


# ---------------------------------------------------------------------------
# 3. Invalid Activity State Machine Transitions
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "current_status,target_status",
    [
        (ActivityStatus.PENDING, ActivityStatus.COMPLETED),      # Cannot skip IN_PROGRESS
        (ActivityStatus.COMPLETED, ActivityStatus.IN_PROGRESS),  # Terminal state immutable
        (ActivityStatus.COMPLETED, ActivityStatus.PENDING),      # Terminal state immutable
        (ActivityStatus.FAILED, ActivityStatus.IN_PROGRESS),     # Terminal state immutable
        (ActivityStatus.CANCELLED, ActivityStatus.IN_PROGRESS),  # Terminal state immutable
    ],
)
def test_failure_mode_invalid_state_transitions(current_status, target_status):
    """Failure mode: Invalid activity state jumps are rejected by state machine guards."""
    with pytest.raises(ArcturusValidationError) as exc:
        validate_activity_transition(current_status, target_status)
    assert "invalid activity state transition" in exc.value.message


# ---------------------------------------------------------------------------
# 4. Agent Assignment & Enterprise Context Boundary Failures
# ---------------------------------------------------------------------------

def test_failure_mode_unmapped_role_assignment_rejected(ctx):
    """Failure mode: Agent assigned to a role that has no activity mapping raises ArcturusValidationError."""
    activity = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Task 1", status=ActivityStatus.PENDING)
    assignment = _DummyAgentAssignment(
        assignments=[_DummyAssignmentEntry(agent_id=101, role_id=999)]
    )

    with pytest.raises(ArcturusValidationError) as exc:
        resolve_activity_assignments(
            activities=[activity],
            agent_assignment=assignment,
            activity_id_by_role_id={200: "ACT-0001"},  # 999 is unmapped
        )
    assert "no activity mapped for role_id=999" in exc.value.message


def test_failure_mode_mismatched_enterprise_instance_binding_rejected():
    """Failure mode: Agent assignment targeting Enterprise A cannot bind to Enterprise B."""
    assignment = _DummyAgentAssignment(
        assignment_id="AGT-001", enterprise_instance_id="ENT-INST-AAA"
    )

    with pytest.raises(ArcturusValidationError) as exc:
        adapt_agent_assignment_ref(assignment, expected_enterprise_instance_id="ENT-INST-BBB")
    assert "mismatched instance" in exc.value.message


def test_failure_mode_structurally_invalid_enterprise_rejected():
    """Failure mode: Unvalidated enterprise instances are rejected at workflow boundary."""
    invalid_instance = _DummyEnterpriseInstance(
        instance_id="ENT-INST-001",
        is_structurally_valid=False,
        validation_errors=["Circular team reporting"],
    )

    with pytest.raises(ArcturusValidationError) as exc:
        adapt_enterprise_context(invalid_instance)
    assert "is not structurally valid" in exc.value.message


# ---------------------------------------------------------------------------
# 5. Governance Policy & Evidence Boundary Failures
# ---------------------------------------------------------------------------

def test_failure_mode_blocking_policy_halts_execution(service):
    """Failure mode: SLA breach under a BLOCKING policy with HALT_WORKFLOW must raise validation error."""
    policy = PolicyGovernanceContract(
        context=service.context,
        policy_id="POL-BHV-001",
        applies_to_workflow_id="WF-BHV-001",
        enforcement_level=PolicyEnforcementLevel.BLOCKING,
        rule_description="Strict SLA Enforcement",
        violation_action=PolicyViolationAction.HALT_WORKFLOW,
    )
    sla_result = {"compliant": False, "breaches": ["ACT-0001"], "elapsed_seconds": {"ACT-0001": 500.0}}

    with pytest.raises(ArcturusValidationError) as exc:
        service.enforce_policy(policy, sla_result)
    assert "halted by blocking policy" in exc.value.message


def test_failure_mode_evidence_activity_count_overflow(ctx):
    """Failure mode: Completed + Failed + Escalated cannot exceed total activities."""
    with pytest.raises(ValidationError):
        WorkflowExecutionEvidence(
            context=ctx,
            evidence_id="EVID-001",
            workflow_id="WF-BHV-001",
            total_activities=2,
            completed_activities=2,
            failed_activities=1,  # 2 + 1 = 3 > 2
            sla_compliant=True,
        )
