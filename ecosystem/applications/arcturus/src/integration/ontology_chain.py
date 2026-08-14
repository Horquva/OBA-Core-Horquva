import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

class OntologyIntegrationChain:
    """
    Day 5 Wrapper: Executes the Ontology node in the unified synchronous pipeline via HTTP.
    Strictly adheres to Import Boundary Check (§2.1) by avoiding direct module imports.
    """
    @staticmethod
    def execute_phase(baseline_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends the baseline payload to the running Ontology API to initialize the state.
        Returns the context required by the next node (Enterprise).
        """
        logger.info("⚙️ [Phase 1: Ontology] Starting platform integration chain...")
        
        try:
            # Communicate over HTTP to respect boundaries, rather than direct Python imports
            response = requests.post(
                "http://localhost:8000/api/v1/ontology/bootstrap",
                json=baseline_payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Phase 1: Ontology] Success. Run ID established: {data.get('run_id')}")
                return data
            else:
                logger.error(f"❌ [Phase 1: Ontology] Integration halted with status {response.status_code}: {response.text}")
                return {
                    "status": "failed",
                    "error": response.text,
                    "source": "Enterprise Ontology API"
                }
                
        except Exception as e:
            logger.error(f"❌ [Phase 1: Ontology] Connection error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "source": "Integration Runner"
            }