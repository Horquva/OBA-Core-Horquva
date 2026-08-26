from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
    PolicyGovernanceContract,
    WorkflowDefinitionContract,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_service import (
    WorkflowService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/workflows",
    tags=["Behavior & Workflow Platform"],
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class CompileWorkflowRequest(BaseModel):
    experiment_id: str = Field(..., description="Unique experiment identifier")
    global_seed: int = Field(default=42, description="Simulation seed")
    workflow_id: str = Field(..., description="Workflow ID (e.g. WF-BHV-001)")
    name: str = Field(..., min_length=1, description="Display name for the workflow")
    description: str = Field(default="", description="Optional workflow description")
    activities: List[ActivityStateContract] = Field(
        ...,
        min_length=1,
        description="List of activity contracts in the workflow",
    )
    organizational_context_ref: str = Field(
        ...,
        description="Enterprise instance ID from Ajwa",
    )
    agent_assignment_ref: str = Field(
        ...,
        description="Agent assignment ID from Syeda",
    )
    created_by: str = Field(
        default="javeria.rafhan",
        description="Author / platform owner",
    )


class AdvanceActivityRequest(BaseModel):
    workflow: WorkflowDefinitionContract = Field(..., description="Current workflow definition")
    activity_id: str = Field(..., description="ID of the activity to advance")
    target_status: ActivityStatus = Field(..., description="Target status to advance to")
    tick: int = Field(default=0, description="Current simulation tick")


class EvaluateSLARequest(BaseModel):
    workflow: WorkflowDefinitionContract = Field(..., description="Workflow to evaluate")
    sla_seconds: Optional[Dict[str, float]] = Field(
        default=None,
        description="Mapping of activity_id -> max allowed duration in seconds",
    )


class EnforcePolicyRequest(BaseModel):
    policy: PolicyGovernanceContract = Field(..., description="Governance policy to enforce")
    sla_result: Dict[str, Any] = Field(..., description="SLA evaluation result")


# ---------------------------------------------------------------------------
# Router Endpoints
# ---------------------------------------------------------------------------

@router.post("/compile", response_model=WorkflowDefinitionContract)
async def compile_workflow_endpoint(request: CompileWorkflowRequest):
    """
    Compiles a workflow from activities, context references, and verifies
    DAG dependency constraints (cycle detection).
    """
    try:
        ctx = SimulationContext(
            experiment_id=request.experiment_id,
            global_seed=request.global_seed,
        )
        service = WorkflowService(context=ctx)

        workflow = service.compile_workflow(
            workflow_id=request.workflow_id,
            name=request.name,
            description=request.description,
            activities=request.activities,
            organizational_context_ref=request.organizational_context_ref,
            agent_assignment_ref=request.agent_assignment_ref,
            created_by=request.created_by,
        )

        # Validate DAG dependencies and ensure no circular cycles
        service.validate_dependency_graph(workflow)

        return workflow
    except ArcturusValidationError as e:
        logger.error(f"Workflow compilation failed: {e.message}")
        raise HTTPException(
            status_code=422,
            detail={"error": e.message, "source": e.platform_source},
        )
    except Exception as e:
        logger.error(f"Unexpected error during workflow compilation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "source": "workflow"},
        )


@router.post("/advance")
async def advance_activity_endpoint(request: AdvanceActivityRequest):
    """
    Advances the status of an activity within a workflow, strictly validating
    state machine guards and upstream DAG dependency completion.
    """
    try:
        service = WorkflowService(context=request.workflow.context)

        # Look up old status before advancing
        old_activity = next(
            (a for a in request.workflow.activities if a.activity_id == request.activity_id),
            None,
        )
        old_status = old_activity.status if old_activity else ActivityStatus.PENDING

        updated_activity = service.advance_activity(
            workflow=request.workflow,
            activity_id=request.activity_id,
            target_status=request.target_status,
        )

        # Generate simulation event for Runtime and Synthetic Data streaming
        event = service.create_workflow_event(
            workflow_id=request.workflow.workflow_id,
            activity_id=request.activity_id,
            old_status=old_status,
            new_status=request.target_status,
            tick=request.tick,
        )

        return {
            "status": "success",
            "updated_activity": updated_activity.model_dump(mode="json"),
            "workflow": request.workflow.model_dump(mode="json"),
            "event": event,
        }
    except ArcturusValidationError as e:
        logger.warning(f"Advance activity validation rejected: {e.message}")
        raise HTTPException(
            status_code=422,
            detail={"error": e.message, "source": e.platform_source},
        )
    except Exception as e:
        logger.error(f"Advance activity failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "source": "workflow"},
        )


@router.post("/unblocked", response_model=List[ActivityStateContract])
async def get_unblocked_activities_endpoint(workflow: WorkflowDefinitionContract):
    """
    Returns all PENDING activities whose DAG dependencies have all reached
    COMPLETED status, signaling to the Runtime engine that they are ready to assign/execute.
    """
    try:
        service = WorkflowService(context=workflow.context)
        unblocked = service.get_unblocked_activities(workflow)
        return unblocked
    except Exception as e:
        logger.error(f"Failed to get unblocked activities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "source": "workflow"},
        )


@router.post("/evaluate-sla")
async def evaluate_sla_endpoint(request: EvaluateSLARequest):
    """
    Evaluates execution timestamps against SLA duration thresholds.
    """
    try:
        service = WorkflowService(context=request.workflow.context)
        sla_result = service.evaluate_sla(
            workflow=request.workflow,
            sla_seconds=request.sla_seconds,
        )
        return sla_result
    except Exception as e:
        logger.error(f"SLA evaluation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "source": "workflow"},
        )


@router.post("/enforce-policy")
async def enforce_policy_endpoint(request: EnforcePolicyRequest):
    """
    Enforces governance policies against SLA evaluation outcomes.
    Raises structured validation error if a blocking policy halts the workflow.
    """
    try:
        service = WorkflowService(context=request.policy.context)
        service.enforce_policy(
            policy=request.policy,
            sla_result=request.sla_result,
        )
        return {
            "status": "success",
            "message": "Policy evaluated successfully without halting workflow.",
        }
    except ArcturusValidationError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": e.message, "source": e.platform_source},
        )


@router.post("/trace")
async def build_execution_trace_endpoint(workflow: WorkflowDefinitionContract):
    """
    Builds a normalized execution trace dictionary for Synthetic Data capture.
    """
    try:
        service = WorkflowService(context=workflow.context)
        trace = service.build_execution_trace(workflow)
        return trace
    except Exception as e:
        logger.error(f"Trace generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "source": "workflow"},
        )
