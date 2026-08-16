import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)


def run_runtime_chain(baseline_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Day 5 Wrapper: Executes the Simulation Runtime node in the unified
    synchronous pipeline via HTTP.
    Strictly adheres to Import Boundary Check (§2.1) by avoiding direct
    module imports of src/simulation/*.
    """
    logger.info("⚙️ [Phase 6: Runtime] Starting platform integration chain...")

    try:
        response = requests.post(
            "http://localhost:8000/api/v1/runtime/execute",
            json=baseline_payload,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ [Phase 6: Runtime] Success. Run ID: {data.get('run_id')}")
            return data
        else:
            logger.error(f"❌ [Phase 6: Runtime] Integration halted with status {response.status_code}: {response.text}")
            return {
                "status": "failed",
                "error": response.text,
                "source": "Simulation Runtime API",
            }

    except Exception as e:
        logger.error(f"❌ [Phase 6: Runtime] Connection error: {str(e)}")
        return {
            "status": "failed",
            "error": str(e),
            "source": "Integration Runner",
        }