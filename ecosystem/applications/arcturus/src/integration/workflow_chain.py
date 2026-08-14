from __future__ import annotations

from typing import Any

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
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_service import (
    WorkflowService,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_adapters import (
    adapt_agent_assignment_ref,
    adapt_enterprise_context,
    resolve_activity_assignments,
)

PLATFORM_SOURCE = "workflow"


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

class WorkflowChainResult:
    """
    Bundled output of a single Day 5 workflow-chain run.

    - workflow: the compiled WorkflowDefinitionContract
    - execution_trace: diagnostic dict from WorkflowService.build_execution_trace
    - sla_result: dict from WorkflowService.evaluate_sla (compliant / breaches / elapsed_seconds)
    - evidence: WorkflowExecutionEvidence, the outbound payload consumed by
      Amina's validation_chain and ultimately by governance_evidence.py
    """

    def __init__(
        self,
        workflow: WorkflowDefinitionContract,
        execution_trace: dict[str, Any],
        sla_result: dict[str, Any],
        evidence: WorkflowExecutionEvidence,
    ) -> None:
        self.workflow = workflow
        self.execution_trace = execution_trace
        self.sla_result = sla_result
        self.evidence = evidence


# ---------------------------------------------------------------------------
# Day 5 chain entry point
# ---------------------------------------------------------------------------

def run_workflow_chain(
    context: SimulationContext,
    workflow_id: str,
    workflow_name: str,
    activities: list[ActivityStateContract],
    enterprise_instance: Any,
    agent_assignment: Any,
    activity_id_by_role_id: dict[int, str],
    sla_seconds: dict[str, float] | None = None,
    policy: PolicyGovernanceContract | None = None,
    evidence_id: str = "EVID-001",
    description: str = "",
    created_by: str = "javeria.rafhan",
) -> WorkflowChainResult:
    """
    Day 5 integration chain wrapper for the Workflow platform.

    Wires together, in order:
      1. Ajwa's EnterpriseInstancePayload   -> organizational_context_ref
         (via adapt_enterprise_context)
      2. Syeda's AgentAssignmentPayload     -> agent_assignment_ref
         (via adapt_agent_assignment_ref, verified against the same
         enterprise instance resolved in step 1)
      3. Per-activity agent binding         -> resolve_activity_assignments
      4. Compilation                        -> WorkflowService.compile_workflow
      5. SLA evaluation                     -> WorkflowService.evaluate_sla
      6. Governance policy enforcement      -> WorkflowService.enforce_policy
         (optional; raises ArcturusValidationError on a blocking breach)
      7. Execution trace                    -> WorkflowService.build_execution_trace
      8. Evidence bundle                    -> WorkflowExecutionEvidence
         (outbound payload for Amina's validation_chain)

    This wrapper only imports the Workflow platform's own outbound
    contracts, service, and adapters -- it does not import Ajwa's or
    Syeda's internal platform code -- so it can be safely called by the
    Day 5 E2E orchestrator without introducing circular coupling between
    platforms.

    Raises:
        ArcturusValidationError: if enterprise context adaptation, agent
        assignment adaptation, activity resolution, workflow compilation,
        or policy enforcement fails at any step.
    """

    service = WorkflowService(context=context)

    # 1. Adapt enterprise context (Ajwa -> Workflow)
    organizational_context_ref = adapt_enterprise_context(enterprise_instance)

    # 2. Adapt agent assignment (Syeda -> Workflow), verified against the
    #    same enterprise instance the workflow is binding to
    agent_assignment_ref = adapt_agent_assignment_ref(
        agent_assignment,
        expected_enterprise_instance_id=organizational_context_ref,
    )

    # 3. Resolve per-activity agent bindings
    resolved_activities = resolve_activity_assignments(
        activities=activities,
        agent_assignment=agent_assignment,
        activity_id_by_role_id=activity_id_by_role_id,
    )

    # 4. Compile the workflow (wraps pydantic ValidationError as
    #    ArcturusValidationError at the service boundary)
    workflow = service.compile_workflow(
        workflow_id=workflow_id,
        name=workflow_name,
        activities=resolved_activities,
        organizational_context_ref=organizational_context_ref,
        agent_assignment_ref=agent_assignment_ref,
        description=description,
        created_by=created_by,
    )

    # 5. Evaluate SLA compliance
    sla_result = service.evaluate_sla(workflow, sla_seconds=sla_seconds)

    # 6. Enforce governance policy, if supplied. Raises on a blocking breach.
    if policy is not None:
        service.enforce_policy(policy, sla_result)

    # 7. Build execution trace (diagnostic output for the E2E runner / logs)
    execution_trace = service.build_execution_trace(workflow)

    # 8. Build the outbound evidence bundle for Amina's validation platform
    completed = sum(
        1 for a in workflow.activities if a.status == ActivityStatus.COMPLETED
    )
    failed = sum(
        1 for a in workflow.activities if a.status == ActivityStatus.FAILED
    )
    escalated = sum(
        1 for a in workflow.activities if a.status == ActivityStatus.ESCALATED
    )

    evidence = WorkflowExecutionEvidence(
        context=context,
        evidence_id=evidence_id,
        workflow_id=workflow.workflow_id,
        total_activities=len(workflow.activities),
        completed_activities=completed,
        failed_activities=failed,
        escalated_activities=escalated,
        sla_compliant=sla_result["compliant"],
    )

    return WorkflowChainResult(
        workflow=workflow,
        execution_trace=execution_trace,
        sla_result=sla_result,
        evidence=evidence,
    )
