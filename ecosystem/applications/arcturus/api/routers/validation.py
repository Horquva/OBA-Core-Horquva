from fastapi import APIRouter, HTTPException
import logging

from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import SyntheticDataCorpus
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import run_corpus_validation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/validation", tags=["Validation & Evaluation"])


@router.post("/corpus")
async def validate_corpus(payload: SyntheticDataCorpus):
    """
    Evaluates a SyntheticDataCorpus (Ahmed's corpus) and produces a
    tri-state ValidationResult (VALIDATED / REJECTED / INCONCLUSIVE).
    Unblocks Ahmed's Intelligence platform, which consumes this result.
    """
    try:
        result = run_corpus_validation(payload)
        return result.model_dump()
    except Exception as e:
        logger.error(f"Corpus validation failed unexpectedly: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal validation error", "source": "Validation & Evaluation Platform"}
        )