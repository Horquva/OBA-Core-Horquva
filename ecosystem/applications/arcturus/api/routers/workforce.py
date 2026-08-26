from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentProfileContract,
)
from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_adapters import (
    WorkforceAdapter,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)


router = APIRouter(
    prefix="/api/v1/workforce",
    tags=["workforce"],
)


@router.post(
    "/materialize",
    response_model=list[AgentProfileContract],
)
def materialize_workforce(
    enterprise: EnterpriseInstancePayload,
) -> list[AgentProfileContract]:
    """
    Materialize synthetic workforce agents from a validated
    EnterpriseInstancePayload.
    """

    try:
        adapter = WorkforceAdapter()

        return adapter.materialize_from_enterprise(
            context=enterprise.context,
            enterprise=enterprise,
        )

    except ArcturusValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.message,
        ) from exc