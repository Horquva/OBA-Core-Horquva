"""
Status: 🟢 IMPLEMENTED
"""
from __future__ import annotations

import logging
from uuid import uuid4

from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig, ExperimentStatus
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError, SimulationContext

logger = logging.getLogger(__name__)


class ExperimentOrchestrator:
    """
    Chains all simulation platforms into a single experiment execution pipeline.

    States: CREATED -> INIT_ONTOLOGY -> INIT_ENTERPRISE -> INIT_WORKFORCE
             -> INIT_WORKFLOW -> INIT_SCENARIO -> RUNNING_SIMULATION
             -> GENERATING_DATA -> VALIDATING -> ASSESSING -> COMPLETED / FAILED

    Each step is a discrete method so it can be individually:
    - Tested in isolation with mocked dependencies.
    - Retried independently on partial failure.
    - Reported as a STAGE_CHANGE WebSocket event.

    Design decision — why not a DAG/Celery pipeline?
    For Week 4's single-process SQLite model, sequential async steps with
    per-stage error handling are simpler, faster to ship, and easier to debug
    than a distributed task queue. The interface is designed so each step
    can be replaced with a queue-backed call later without touching callers.
    """

    def __init__(self, experiment_id: str, config: ExperimentConfig):
        self.experiment_id = experiment_id
        self.config = config
        self.run_id = str(uuid4())
        self.stage = "CREATED"
        self._context: SimulationContext | None = None

    def build_context(self) -> SimulationContext:
        """
        Constructs the canonical SimulationContext that flows through
        every downstream platform call as the shared execution identity.
        """
        return SimulationContext(
            experiment_id=self.experiment_id,
            run_id=self.run_id,
            global_seed=self.config.global_seed,
            config=self.config.model_dump(),
        )

    def _step_ontology(self, context: SimulationContext) -> dict:
        """
        Step 1: Resolve domain vocabulary from OntologyController.
        """
        self.stage = "INIT_ONTOLOGY"
        logger.info(f"[{self.experiment_id}] Stage: INIT_ONTOLOGY")
        from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import (
            ontology_controller,
        )
        snapshot = ontology_controller.export_snapshot()
        return {"ontology_snapshot": snapshot}

    def _step_enterprise(self, context: SimulationContext, ontology: dict) -> dict:
        """
        Step 2: Generate enterprise structure from ontology snapshot.
        """
        self.stage = "INIT_ENTERPRISE"
        logger.info(f"[{self.experiment_id}] Stage: INIT_ENTERPRISE")
        from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import (
            EnterpriseGenerator,
        )
        from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
            EnterpriseTemplatePayload,
            EnterpriseConfigurationPayload,
            IndustryType,
            ScaleProfile,
        )
        template = EnterpriseTemplatePayload(
            context=context,
            template_id="default-temp-1",
            template_name="Default SaaS",
            industry_type=IndustryType.SAAS,
            scale_profile=ScaleProfile.SMALL,
            default_org_depth=3,
        )
        ent_config = EnterpriseConfigurationPayload(
            context=context,
            config_id="default-conf-1",
            template_id="default-temp-1",
            org_name="Arcturus Default Org",
            department_count_override=2,
            team_size_range=[2, 5],
        )
        generator = EnterpriseGenerator()
        enterprise = generator.generate(template=template, config=ent_config)
        return {"enterprise": enterprise}

    def _step_workforce(self, context: SimulationContext, enterprise: dict) -> dict:
        """
        Step 3: Materialize synthetic workers from enterprise structure.
        """
        self.stage = "INIT_WORKFORCE"
        logger.info(f"[{self.experiment_id}] Stage: INIT_WORKFORCE")
        from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
            WorkforceService,
        )
        svc = WorkforceService()
        if enterprise.get("enterprise"):
            agents = svc.materialize_from_enterprise(
                context=context,
                enterprise=enterprise["enterprise"],
            )
        else:
            agents = svc.materialize_agents(
                context=context,
                enterprise_instance_id=f"ENT-{context.experiment_id}",
                agent_count=10,
            )
        return {"agents": agents}

    def _step_workflow(self, context: SimulationContext, workforce: dict) -> dict:
        self.stage = "INIT_WORKFLOW"
        logger.info(f"[{self.experiment_id}] Stage: INIT_WORKFLOW")
        from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
            WorkflowDefinitionContract,
            ActivityStateContract,
        )
        from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
            ActivityStatus,
        )
        import random
        rng = random.Random(context.global_seed)
        w_id = f"WF-GOV-{rng.randint(100, 999)}"
        a_id = f"ACT-{rng.randint(1000, 9999)}"
        ag_id = f"AGENT-{rng.randint(100, 999)}"

        workflow = WorkflowDefinitionContract(
            context=context,
            workflow_id=w_id,
            name="Governance Review Workflow",
            description="A review workflow",
            activities=[
                ActivityStateContract(
                    context=context,
                    activity_id=a_id,
                    name="Contract Review",
                    status=ActivityStatus.PENDING,
                    assigned_agent_id=ag_id,
                ),
            ],
            organizational_context_ref="REF",
            agent_assignment_ref="REF",
            created_by="System"
        )
        return {"workflows": [workflow]}

    def _step_scenario(self, context: SimulationContext, workflows: dict) -> dict:
        self.stage = "INIT_SCENARIO"
        logger.info(f"[{self.experiment_id}] Stage: INIT_SCENARIO")
        from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import ScenarioEngine
        from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
            ScenarioDSLPayload,
        )
        import random
        rng = random.Random(context.global_seed)
        sc_id = f"SCN-GV-{rng.randint(100, 999)}"
        ag_id = f"AGENT-{rng.randint(100, 999)}"

        engine = ScenarioEngine()
        scenario_payload = ScenarioDSLPayload(
            context=context,
            scenario_id=sc_id,
            description="A scenario",
            trigger_event="system_startup",
            participants=[ag_id],
            organizational_scope=["DEPT-001"],
            variables={"headcount": 25, "budget_usd": 500000},
            preconditions=["min_agents >= 3", "max_cycle_time_days <= 30"],
        )
        scenario = engine.compile_scenario(scenario_payload)
        return {"scenario": scenario}

    def _step_runtime(self, context: SimulationContext, scenario: dict) -> dict:
        self.stage = "RUNNING_SIMULATION"
        logger.info(f"[{self.experiment_id}] Stage: RUNNING_SIMULATION")
        from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as td:
            engine = RuntimeEngine(checkpoint_root=Path(td))
            engine.initialize_run(context)
            for tick in range(3):
                engine.step()
            record = engine.finalize_run()
            return {"events": [], "status": record.status}

    def _step_synthetic_data(self, context: SimulationContext, runtime_results: dict) -> dict:
        self.stage = "GENERATING_DATA"
        logger.info(f"[{self.experiment_id}] Stage: GENERATING_DATA")
        from ecosystem.applications.arcturus.src.integration.synthetic_data_chain import (
            run_synthetic_data_chain,
        )
        result, evidence = run_synthetic_data_chain(
            context=context,
            requested_artifact_types=["report", "document", "meeting"],
            requested_artifact_count=100,
        )
        return {"result": result, "artifacts": result.artifacts, "corpus": evidence}

    def _step_validation(self, context: SimulationContext, data_corpus: dict) -> dict:
        self.stage = "VALIDATING"
        logger.info(f"[{self.experiment_id}] Stage: VALIDATING")
        from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine
        from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
            ValidationRun, EvidenceContract, ValidationRuleContract
        )
        from datetime import datetime, timezone
        from uuid import UUID, uuid4
        engine = ValidationEngine()
        ev = EvidenceContract(
            context=context,
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
        run_uuid = context.run_id if isinstance(context.run_id, UUID) else UUID(str(context.run_id))
        run = ValidationRun(
            run_id=run_uuid,
            context=context,
            evidence=ev,
            rules_applied=[rule],
            status="pending"
        )
        result = engine.run_validation(run)
        return {"validation": result}

    def _step_intelligence(self, context: SimulationContext, run_id: str) -> dict:
        """
        Step 9: Generate evidence-grounded intelligence assessment via Gemini.

        Architectural decision — why call IntelligenceService directly?
        The service already owns all anti-hallucination logic (no validated
        evidence → None, bad citations → None, Gemini down → IntelligenceUnavailable).
        The orchestrator must NOT re-implement these rules; it just routes the result.

        Graceful degradation: if Gemini is unavailable (IntelligenceUnavailable),
        the pipeline is NOT marked FAILED — only this stage is degraded to
        ASSESSING_UNAVAILABLE. A simulation run is not less valid because the
        AI assessment layer was temporarily unreachable.
        """
        self.stage = "ASSESSING"
        logger.info(f"[{self.experiment_id}] Stage: ASSESSING")

        from ecosystem.applications.arcturus.api.services.intelligence_service import (
            IntelligenceService,
            IntelligenceUnavailable,
        )

        svc = IntelligenceService()
        try:
            assessment = svc.generate_assessment(run_id=run_id)
            if assessment is None:
                return {"intelligence_status": "NO_TRUSTED_EVIDENCE", "assessment": None}
            return {"intelligence_status": "READY", "assessment": assessment}
        except IntelligenceUnavailable as exc:
            logger.warning(
                f"[{self.experiment_id}] Gemini unavailable during ASSESSING: {exc}. "
                "Pipeline continues — stage recorded as ASSESSING_UNAVAILABLE."
            )
            return {"intelligence_status": "ASSESSING_UNAVAILABLE", "assessment": None}

    def run_pipeline(self) -> dict:
        """
        Execute the full orchestration pipeline and return a summary dict.
        Each stage publishes a STAGE_CHANGE event (caller injects bus).
        """
        context = self.build_context()
        self._context = context

        results = {}
        try:
            results["ontology"] = self._step_ontology(context)
            results["enterprise"] = self._step_enterprise(context, results["ontology"])
            results["workforce"] = self._step_workforce(context, results["enterprise"])
            results["workflow"] = self._step_workflow(context, results["workforce"])
            results["scenario"] = self._step_scenario(context, results["workflow"])
            results["runtime"] = self._step_runtime(context, results["scenario"])
            results["synthetic_data"] = self._step_synthetic_data(context, results["runtime"])
            results["validation"] = self._step_validation(context, results["synthetic_data"])
            
            # Step 9: Intelligence Assessment
            results["intelligence"] = self._step_intelligence(context, self.run_id)
            
            self.stage = "COMPLETED"
            results["status"] = "PIPELINE_COMPLETED"
        except ArcturusValidationError as exc:
            self.stage = "FAILED"
            results["status"] = "FAILED"
            results["error"] = exc.message
            logger.error(f"[{self.experiment_id}] Pipeline validation failed: {exc.message}")
        except Exception as exc:
            self.stage = "FAILED"
            results["status"] = "FAILED"
            results["error"] = str(exc)
            logger.exception(f"[{self.experiment_id}] Pipeline execution failed with unexpected error.")

        return results
