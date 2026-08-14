import logging
from typing import Dict, Any

from ecosystem.applications.arcturus.src.ontology.ontology_controller import ontology_service
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError

logger = logging.getLogger(__name__)

class OntologyIntegrationChain:
    """
    Day 5 Wrapper: Executes the Ontology node in the unified synchronous pipeline.
    """
    @staticmethod
    def execute_phase(baseline_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests the initial ontology state and verifies constraints.
        Returns the context required by the next node (Enterprise).
        """
        logger.info("⚙️ [Phase 1: Ontology] Starting platform integration chain...")
        
        try:
            ontology_service.load_snapshot(baseline_payload)
            run_id = str(ontology_service.current_state.context.run_id)
            
            logger.info(f"✅ [Phase 1: Ontology] Success. Run ID established: {run_id}")
            
            return {
                "status": "success",
                "run_id": run_id,
                "message": "Ontology constraints verified. Ready for Enterprise Template Generation."
            }
            
        except ArcturusValidationError as e:
            logger.error(f"❌ [Phase 1: Ontology] Integration halted: {e.message}")
            return {
                "status": "failed",
                "error": e.message,
                "source": e.platform_source
            }