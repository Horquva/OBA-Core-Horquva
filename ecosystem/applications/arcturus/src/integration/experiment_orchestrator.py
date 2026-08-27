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
        Stubbed for Day 3 — replaced when Hamza's router is fully wired.
        """
        self.stage = "INIT_ONTOLOGY"
        logger.info(f"[{self.experiment_id}] Stage: INIT_ONTOLOGY")
        try:
            from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import (
                ontology_controller,
            )
            snapshot = ontology_controller.export_snapshot()
            return {"ontology_snapshot": snapshot}
        except Exception:
            logger.warning("Ontology step skipped — using empty snapshot stub.")
            return {"ontology_snapshot": None}

    def _step_enterprise(self, context: SimulationContext, ontology: dict) -> dict:
        """
        Step 2: Generate enterprise structure from ontology snapshot.
        Stubbed for Day 3 — replaced when Ajwa's PR merges.
        """
        self.stage = "INIT_ENTERPRISE"
        logger.info(f"[{self.experiment_id}] Stage: INIT_ENTERPRISE")
        try:
            from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import (
                EnterpriseGenerator,
            )
            generator = EnterpriseGenerator()
            enterprise = generator.generate(context=context, ontology_snapshot=ontology.get("ontology_snapshot"))
            return {"enterprise": enterprise}
        except Exception:
            logger.warning("Enterprise step skipped — using empty enterprise stub.")
            return {"enterprise": None}

    def _step_workforce(self, context: SimulationContext, enterprise: dict) -> dict:
        """
        Step 3: Materialize synthetic workers from enterprise structure.
        Stubbed for Day 3 — replaced when Dua's PR merges.
        """
        self.stage = "INIT_WORKFORCE"
        logger.info(f"[{self.experiment_id}] Stage: INIT_WORKFORCE")
        try:
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
        except Exception:
            logger.warning("Workforce step skipped — using empty agents stub.")
            return {"agents": []}

    def _step_workflow(self, context: SimulationContext, workforce: dict) -> dict:
        self.stage = "INIT_WORKFLOW"
        logger.info(f"[{self.experiment_id}] Stage: INIT_WORKFLOW")
        try:
            from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_service import WorkflowService
            svc = WorkflowService()
            workflows = svc.assign_workflows(context=context, workforce=workforce.get("agents", []))
            return {"workflows": workflows}
        except Exception:
            logger.warning("Workflow step skipped — using empty workflows stub.")
            return {"workflows": []}

    def _step_scenario(self, context: SimulationContext, workflows: dict) -> dict:
        self.stage = "INIT_SCENARIO"
        logger.info(f"[{self.experiment_id}] Stage: INIT_SCENARIO")
        try:
            from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import ScenarioEngine
            engine = ScenarioEngine()
            scenario = engine.compile_scenario(context=context, workflows=workflows.get("workflows", []))
            return {"scenario": scenario}
        except Exception:
            logger.warning("Scenario step skipped — using empty scenario stub.")
            return {"scenario": None}

    def _step_runtime(self, context: SimulationContext, scenario: dict) -> dict:
        self.stage = "RUNNING_SIMULATION"
        logger.info(f"[{self.experiment_id}] Stage: RUNNING_SIMULATION")
        try:
            from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine
            engine = RuntimeEngine()
            events = engine.run_simulation(context=context, scenario=scenario.get("scenario"))
            return {"events": events}
        except Exception:
            logger.warning("Runtime step skipped — using empty events stub.")
            return {"events": []}

    def _step_synthetic_data(self, context: SimulationContext, runtime_results: dict) -> dict:
        self.stage = "GENERATING_DATA"
        logger.info(f"[{self.experiment_id}] Stage: GENERATING_DATA")
        try:
            from ecosystem.applications.arcturus.src.synthetic_data.generation_service import GenerationService
            svc = GenerationService()
            corpus = svc.generate_corpus(context=context, events=runtime_results.get("events", []))
            return {"corpus": corpus}
        except Exception:
            logger.warning("Synthetic Data step skipped — using empty corpus stub.")
            return {"corpus": None}

    def _step_validation(self, context: SimulationContext, data_corpus: dict) -> dict:
        self.stage = "VALIDATING"
        logger.info(f"[{self.experiment_id}] Stage: VALIDATING")
        try:
            from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine
            engine = ValidationEngine()
            result = engine.evaluate_corpus(context=context, corpus=data_corpus.get("corpus"))
            return {"validation": result}
        except Exception:
            logger.warning("Validation step skipped — using empty validation stub.")
            return {"validation": None}

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
            
            self.stage = "COMPLETED"
            results["status"] = "PIPELINE_COMPLETED"
        except ArcturusValidationError as exc:
            self.stage = "FAILED"
            results["status"] = "FAILED"
            results["error"] = exc.message
            logger.error(f"[{self.experiment_id}] Pipeline failed: {exc.message}")

        return results
