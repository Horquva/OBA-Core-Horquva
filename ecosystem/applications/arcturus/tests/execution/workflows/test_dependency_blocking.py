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
    WorkflowDefinitionContract,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_service import (
    WorkflowService,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_adapters import (
    validate_activity_transition,
)


@pytest.fixture
def ctx() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-DAG-TEST", global_seed=42)


@pytest.fixture
def service(ctx) -> WorkflowService:
    return WorkflowService(context=ctx)


# ---------------------------------------------------------------------------
# 1. DAG Graph Validation & Cycle Detection
# ---------------------------------------------------------------------------

def test_dag_cycle_detection_raises_validation_error(service, ctx):
    """Circular dependency A -> B -> C -> A must be rejected."""
    act_a = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Task A", dependencies=["ACT-0003"]
    )
    act_b = ActivityStateContract(
        context=ctx, activity_id="ACT-0002", name="Task B", dependencies=["ACT-0001"]
    )
    act_c = ActivityStateContract(
        context=ctx, activity_id="ACT-0003", name="Task C", dependencies=["ACT-0002"]
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Cycle Test",
        activities=[act_a, act_b, act_c],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "circular dependency detected" in exc.value.message


def test_dag_self_dependency_raises_validation_error(service, ctx):
    """Activity depending on itself must be rejected."""
    act_a = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Self dependent", dependencies=["ACT-0001"]
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Self Dep Test",
        activities=[act_a],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "self-dependency" in exc.value.message


def test_dag_missing_dependency_reference_raises_validation_error(service, ctx):
    """Referencing a non-existent activity ID in dependencies must raise error."""
    act_a = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Task A", dependencies=["ACT-9999"]
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Missing Dep Test",
        activities=[act_a],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    with pytest.raises(ArcturusValidationError) as exc:
        service.validate_dependency_graph(workflow)
    assert "non-existent dependency" in exc.value.message


# ---------------------------------------------------------------------------
# 2. Activity Advancement & Blocking Behavior
# ---------------------------------------------------------------------------

def test_advance_activity_blocked_until_dependency_completes(service, ctx):
    """Task B cannot transition to IN_PROGRESS while Task A is PENDING."""
    act_a = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Design", status=ActivityStatus.PENDING
    )
    act_b = ActivityStateContract(
        context=ctx,
        activity_id="ACT-0002",
        name="Develop",
        status=ActivityStatus.PENDING,
        dependencies=["ACT-0001"],
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Pipeline",
        activities=[act_a, act_b],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    # Attempt to advance Task B directly -> should fail because Task A is not completed
    with pytest.raises(ArcturusValidationError) as exc:
        service.advance_activity(workflow, "ACT-0002", ActivityStatus.IN_PROGRESS)
    assert "dependency 'ACT-0001' status is 'pending'" in exc.value.message


def test_advance_activity_unblocks_and_transitions_successfully(service, ctx):
    """When Task A completes, Task B can transition and tracks timestamps."""
    act_a = ActivityStateContract(
        context=ctx, activity_id="ACT-0001", name="Design", status=ActivityStatus.PENDING
    )
    act_b = ActivityStateContract(
        context=ctx,
        activity_id="ACT-0002",
        name="Develop",
        status=ActivityStatus.PENDING,
        dependencies=["ACT-0001"],
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Pipeline",
        activities=[act_a, act_b],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    # 1. Advance Task A to IN_PROGRESS then COMPLETED
    t0 = datetime(2026, 8, 24, 10, 0, 0, tzinfo=timezone.utc)
    t1 = datetime(2026, 8, 24, 11, 0, 0, tzinfo=timezone.utc)
    updated_a1 = service.advance_activity(workflow, "ACT-0001", ActivityStatus.IN_PROGRESS, timestamp=t0)
    assert updated_a1.status == ActivityStatus.IN_PROGRESS
    assert updated_a1.started_at == t0

    updated_a2 = service.advance_activity(workflow, "ACT-0001", ActivityStatus.COMPLETED, timestamp=t1)
    assert updated_a2.status == ActivityStatus.COMPLETED
    assert updated_a2.completed_at == t1

    # 2. Now Task B should unblock and advance successfully
    t2 = datetime(2026, 8, 24, 11, 30, 0, tzinfo=timezone.utc)
    updated_b = service.advance_activity(workflow, "ACT-0002", ActivityStatus.IN_PROGRESS, timestamp=t2)
    assert updated_b.status == ActivityStatus.IN_PROGRESS
    assert updated_b.started_at == t2


# ---------------------------------------------------------------------------
# 3. Multi-tier DAG Unblocked Activities Query
# ---------------------------------------------------------------------------

def test_get_unblocked_activities_multi_tier(service, ctx):
    """Verifies that unblocked query accurately identifies ready tasks across tiers."""
    # Tier 0: Root (ACT-0001)
    act_1 = ActivityStateContract(context=ctx, activity_id="ACT-0001", name="Root")
    # Tier 1: Two parallel branches (ACT-0002, ACT-0003) depending on Root
    act_2 = ActivityStateContract(context=ctx, activity_id="ACT-0002", name="Branch 1", dependencies=["ACT-0001"])
    act_3 = ActivityStateContract(context=ctx, activity_id="ACT-0003", name="Branch 2", dependencies=["ACT-0001"])
    # Tier 2: Final (ACT-0004) depending on both Branch 1 and Branch 2
    act_4 = ActivityStateContract(
        context=ctx, activity_id="ACT-0004", name="Join", dependencies=["ACT-0002", "ACT-0003"]
    )

    workflow = service.compile_workflow(
        workflow_id="WF-BHV-001",
        name="Multi Tier",
        activities=[act_1, act_2, act_3, act_4],
        organizational_context_ref="ENT-INST-001",
        agent_assignment_ref="AGT-ASSIGN-001",
    )

    # Initial state: only Root is unblocked
    unblocked = service.get_unblocked_activities(workflow)
    assert [a.activity_id for a in unblocked] == ["ACT-0001"]

    # Complete Root
    service.advance_activity(workflow, "ACT-0001", ActivityStatus.IN_PROGRESS)
    service.advance_activity(workflow, "ACT-0001", ActivityStatus.COMPLETED)

    # Now both Branch 1 and Branch 2 are unblocked, but not Join
    unblocked = service.get_unblocked_activities(workflow)
    assert set(a.activity_id for a in unblocked) == {"ACT-0002", "ACT-0003"}

    # Complete Branch 1 only
    service.advance_activity(workflow, "ACT-0002", ActivityStatus.IN_PROGRESS)
    service.advance_activity(workflow, "ACT-0002", ActivityStatus.COMPLETED)

    # Only Branch 2 is still unblocked (Join is still waiting for Branch 2)
    unblocked = service.get_unblocked_activities(workflow)
    assert [a.activity_id for a in unblocked] == ["ACT-0003"]

    # Complete Branch 2
    service.advance_activity(workflow, "ACT-0003", ActivityStatus.IN_PROGRESS)
    service.advance_activity(workflow, "ACT-0003", ActivityStatus.COMPLETED)

    # Now Join is finally unblocked!
    unblocked = service.get_unblocked_activities(workflow)
    assert [a.activity_id for a in unblocked] == ["ACT-0004"]


# ---------------------------------------------------------------------------
# 4. State Machine Guards & Simulation Events
# ---------------------------------------------------------------------------

def test_invalid_activity_transition_rejected():
    """Direct jump from PENDING to COMPLETED is rejected."""
    with pytest.raises(ArcturusValidationError):
        validate_activity_transition(ActivityStatus.PENDING, ActivityStatus.COMPLETED)


def test_create_workflow_event_payload(service):
    """Event generation produces structured schema with tick and ISO timestamp."""
    event = service.create_workflow_event(
        workflow_id="WF-BHV-001",
        activity_id="ACT-0001",
        old_status=ActivityStatus.PENDING,
        new_status=ActivityStatus.IN_PROGRESS,
        tick=5,
        details={"executor": "agent-001"},
    )
    assert event["event_type"] == "WORKFLOW_ACTIVITY_STATUS_CHANGED"
    assert event["workflow_id"] == "WF-BHV-001"
    assert event["activity_id"] == "ACT-0001"
    assert event["old_status"] == "pending"
    assert event["new_status"] == "in_progress"
    assert event["tick"] == 5
    assert "timestamp" in event
    assert event["details"]["executor"] == "agent-001"
