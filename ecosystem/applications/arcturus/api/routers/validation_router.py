from fastapi import APIRouter

router = APIRouter(
    prefix="/api/v1/validation",
    tags=["validation"]
)

@router.post("/evaluate")
async def evaluate_corpus():
    """
    Evaluate the generated synthetic data corpus.
    Triggered by OCOS or Orchestrator.
    """
    return {"status": "success", "message": "Corpus evaluation triggered"}
