from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseConfigurationPayload,
    EnterpriseInstancePayload,
    EnterpriseTemplatePayload,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.src.integration.enterprise_chain import (
    EnterpriseChain,
)


router = APIRouter(
    prefix="/api/v1/enterprise",
    tags=["enterprise"],
)


@router.post(
    "/generate",
    response_model=EnterpriseInstancePayload,
)
def generate_enterprise(
    template: EnterpriseTemplatePayload,
    config: EnterpriseConfigurationPayload,
) -> EnterpriseInstancePayload:
    """
    Generate a synthetic enterprise from a template and configuration.
    """

    try:
        return EnterpriseChain().execute(
            template=template,
            config=config,
        )

    except ArcturusValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.message,
        ) from exc