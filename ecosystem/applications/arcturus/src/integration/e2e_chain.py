"""
Arcturus Day 5 — End-to-End Vertical Slice Orchestrator
=========================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)

Day 5 E2E chain (§ Phase E of Week 3 Master Execution Guide):
  Ontology → Enterprise → Workforce → Workflows → Scenarios
  → Synthetic Data → Runtime → Validation

This module executes the full 8-platform vertical slice in-process
using shared contracts as the communication layer. Each platform step
is wrapped in a try/except so the chain captures per-step status even
if individual platforms fail.

Integration orchestrators are exempt from §2.1 import boundaries
(see import_boundary_checker._resolve_own_prefixes).
"""
from __future__ import annotations

import logging
import random
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Per-step executor helpers
# ---------------------------------------------------------------------------

def _step_ontology(ctx: SimulationContext) -> dict[str, Any]:
    """Step 1 — Bootstrap the ontology snapshot."""
    from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_runtime import (
        OntologyRuntime,
    )
    from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
        OntologySnapshotContract,
        DepartmentState,
        CapabilityState,
        OrganizationState,
    )

    runtime = OntologyRuntime()
    rng = random.Random(ctx.global_seed)

    org = OrganizationState(
        org_id=1,
        org_name="Arcturus Enterprise Systems",
        leader="CEO",
    )
    dept = DepartmentState(
        dept_id=1,
        div_id=1,
        dept_name="Engineering",
        readiness_score=1.0,
    )
    snapshot = OntologySnapshotContract(
        context=ctx,
        snapshot_version="1.0",
        organizations=[org],
        departments=[dept],
    )
    return {
        "snapshot_version": snapshot.snapshot_version,
        "org_name": org.org_name,
        "department_count": len(snapshot.departments),
    }


def _step_enterprise(ctx: SimulationContext, ontology_result: dict) -> dict[str, Any]:
    """Step 2 — Generate synthetic enterprise instance."""
    from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import (
        EnterpriseGenerator,
    )
    from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
        OntologySnapshotContract,
        DepartmentState,
        OrganizationState,
    )

    org = OrganizationState(
        org_id=1,
        org_name=ontology_result.get("org_name", "Arcturus Enterprise Systems"),
        leader="CEO",
    )
    dept = DepartmentState(
        dept_id=1,
        div_id=1,
        dept_name="Engineering",
        readiness_score=1.0,
    )
    snapshot = OntologySnapshotContract(
        context=ctx,
        snapshot_version="1.0",
        organizations=[org],
        departments=[dept],
    )

    gen = EnterpriseGenerator()
    from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
        EnterpriseTemplatePayload,
        EnterpriseConfigurationPayload,
    )
    template = EnterpriseTemplatePayload(
        context=ctx,
        template_id="TPL-001",
        template_name="Tech Corp",
        industry_type="enterprise_saas",
        scale_profile="medium",
        default_business_units=[],
        default_org_depth=3,
        governance_complexity="matrix"
    )
    config = EnterpriseConfigurationPayload(
        context=ctx,
        config_id="CFG-001",
        template_id="TPL-001",
        org_name="Arcturus Enterprise Systems",
        department_count_override=1,
        team_size_range=(5, 10),
        custom_business_units=[]
    )
    instance = gen.generate(template, config)
    return {
        "org_name": instance.organization.org_name if instance.organization else "N/A",
        "is_valid": instance.is_structurally_valid,
        "department_count": len(instance.departments),
    }


def _step_workforce(ctx: SimulationContext) -> dict[str, Any]:
    """Step 3 — Materialize synthetic agents via workforce service."""
    from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
        WorkforceService,
    )
    from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
        WorkforceRoleContract,
    )
    from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
        RoleState,
    )

    svc = WorkforceService()
    roles = [
        WorkforceRoleContract(
            role=RoleState(
                role_id=i,
                role_title=name,
                access_level=1.0,
            )
        )
        for i, name in enumerate(
            ["Engineer", "Analyst", "Manager", "Coordinator", "Specialist"], start=1
        )
    ]
    agents = svc.materialize_agents(
        context=ctx,
        enterprise_instance_id="ENT-001",
        agent_count=5
    )
    roster = svc.build_roster(
        context=ctx,
        enterprise_instance_id="ENT-001",
        agents=agents,
        roles=roles,
    )
    return {
        "agent_count": len(roster.agents),
        "enterprise_instance_id": roster.enterprise_instance_id,
    }


def _step_workflows(ctx: SimulationContext) -> dict[str, Any]:
    """Step 4 — Compile governance workflow definition."""
    from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
        WorkflowDefinitionContract,
        ActivityStateContract,
        PolicyGovernanceContract,
    )
    from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
        ActivityStatus,
        PolicyEnforcementLevel,
        PolicyViolationAction,
    )

    workflow = WorkflowDefinitionContract(
        context=ctx,
        workflow_id="WF-GOV-001",
        name="Governance Review Workflow",
        description="A review workflow",
        activities=[
            ActivityStateContract(
                context=ctx,
                activity_id="ACT-0001",
                name="Contract Review",
                status=ActivityStatus.PENDING,
                assigned_agent_id="AGENT-001",
            ),
        ],
        organizational_context_ref="REF",
        agent_assignment_ref="REF",
        created_by="System"
    )
    # The actual code might use workflow somehow, we just want to prove it compiles
    return {
        "workflow_id": workflow.workflow_id,
        "activity_count": len(workflow.activities),
    }


def _step_scenarios(ctx: SimulationContext) -> dict[str, Any]:
    """Step 5 — Compile canonical scenario."""
    from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
        ScenarioEngine,
    )
    from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
        ScenarioDSLPayload,
    )

    engine = ScenarioEngine()
    scenario = ScenarioDSLPayload(
        context=ctx,
        scenario_id="SCN-GV-101",
        description="A scenario",
        trigger_event="system_startup",
        participants=["AGENT-001"],
        organizational_scope=["DEPT-001"],
        variables={"headcount": 25, "budget_usd": 500000},
        preconditions=["min_agents >= 3", "max_cycle_time_days <= 30"],
    )
    compiled = engine.compile_scenario(scenario)
    return {
        "scenario_id": compiled.scenario_id,
        "is_compiled": True,
    }


def _step_synthetic_data(ctx: SimulationContext) -> dict[str, Any]:
    """Step 6 — Generate synthetic data artifacts."""
    from ecosystem.applications.arcturus.src.integration.synthetic_data_chain import (
        run_synthetic_data_chain,
    )

    result, evidence = run_synthetic_data_chain(
        context=ctx,
        requested_artifact_types=["report", "document", "meeting"],
        requested_artifact_count=100,
    )
    return {
        "artifact_count": evidence["artifact_count"],
        "provenance_hash": evidence["deterministic_fingerprint"],
    }


def _step_runtime(ctx: SimulationContext) -> dict[str, Any]:
    """Step 7 — Execute simulation runtime."""
    from ecosystem.applications.arcturus.src.simulation.runtime_engine import (
        RuntimeEngine,
    )

    with tempfile.TemporaryDirectory() as td:
        engine = RuntimeEngine(checkpoint_root=Path(td))
        engine.initialize_run(ctx)
        for tick in range(3):
            engine.step()
        record = engine.finalize_run()
        return {
            "status": record.status,
            "ended_at": record.ended_at,
        }


def _step_validation(ctx: SimulationContext, runtime_result: dict) -> dict[str, Any]:
    """Step 8 — Validate execution evidence."""
    from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import (
        ValidationEngine,
    )
    from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
        ValidationRun,
        EvidenceContract,
        ValidationRuleContract,
    )

    engine = ValidationEngine()
    
    ev = EvidenceContract(
        context=ctx,
        source_execution_id="EXEC-001",
        observed_value=26.3,
        expected_value=25.0,
        collected_at=datetime.now(timezone.utc).timestamp()
    )
    
    rule = ValidationRuleContract(
        rule_id="RULE-001",
        category="governance",
        description="Verify compliance",
        hard_fail=True
    )
    
    run = ValidationRun(
        run_id=uuid4(),
        context=ctx,
        evidence=ev,
        rules_applied=[rule],
        status="pending"
    )
    
    result = engine.run_validation(run)
    return {
        "validation_status": result.final_status,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_CHAIN_STEPS = [
    ("Ontology (Hamza)",       _step_ontology),
    ("Enterprise (Ajwa)",      _step_enterprise),
    ("Workforce (Syeda)",      _step_workforce),
    ("Workflows (Javeria)",    _step_workflows),
    ("Scenarios (Maryam)",     _step_scenarios),
    ("Synthetic Data (Ahmed)", _step_synthetic_data),
    ("Runtime (Maaz)",         _step_runtime),
    ("Validation (Amina)",     _step_validation),
]


def execute_day5_e2e_chain(
    *,
    experiment_id: str = "EXP-DAY5-E2E",
    global_seed: int = 42,
) -> dict[str, Any]:
    """
    Execute the Day 5 end-to-end vertical slice chain.

    Returns
    -------
    dict
        A structured result with per-step outcomes and an overall success flag.
    """
    ctx = SimulationContext(
        run_id=uuid4(),
        experiment_id=experiment_id,
        global_seed=global_seed,
    )

    results: dict[str, Any] = {}
    steps_executed: list[str] = []
    all_ok = True

    for step_name, step_fn in _CHAIN_STEPS:
        logger.info("▶ %s — starting", step_name)
        try:
            if step_fn is _step_enterprise:
                step_result = step_fn(ctx, results.get("ontology", {}))
            elif step_fn is _step_validation:
                step_result = step_fn(ctx, results.get("runtime", {}))
            else:
                step_result = step_fn(ctx)

            # Store under a short key
            short_key = step_name.split("(")[0].strip().lower().replace(" ", "_")
            results[short_key] = step_result
            steps_executed.append(step_name)
            logger.info("✅ %s — done", step_name)
        except Exception as exc:
            logger.error("❌ %s — failed: %s", step_name, exc)
            short_key = step_name.split("(")[0].strip().lower().replace(" ", "_")
            results[short_key] = {"error": str(exc)}
            steps_executed.append(f"{step_name} [FAILED]")
            all_ok = False

    return {
        "context": {
            "run_id": str(ctx.run_id),
            "experiment_id": ctx.experiment_id,
            "global_seed": ctx.global_seed,
        },
        "success": all_ok,
        "steps_executed": steps_executed,
        "results": results,
    }
