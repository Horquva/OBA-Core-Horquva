from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    IndustryType,
    ScaleProfile,
)


class EnterpriseTemplateSchema(BaseModel):
    """
    Control-layer schema for defining a reusable enterprise template.
    """

    template_id: str = Field(
        ...,
        description="Unique identifier for the enterprise template",
    )

    template_name: str = Field(
        ...,
        description="Human-readable name of the enterprise template",
    )

    industry_type: IndustryType = Field(
        ...,
        description="Industry category of the enterprise",
    )

    scale_profile: ScaleProfile = Field(
        ...,
        description="Scale profile of the enterprise",
    )

    default_business_units: list[str] = Field(
        default_factory=list,
        description="Default business units used when generating the enterprise",
    )

    default_org_depth: int = Field(
        ...,
        description="Expected organization hierarchy depth",
    )


class EnterpriseConfigurationSchema(BaseModel):
    """
    Control-layer schema for configuring a specific enterprise
    generation request from an existing template.
    """

    config_id: str = Field(
        ...,
        description="Unique identifier for the enterprise configuration",
    )

    template_id: str = Field(
        ...,
        description="Identifier of the enterprise template being instantiated",
    )

    org_name: str = Field(
        ...,
        description="Name of the enterprise to generate",
    )

    department_count_override: int | None = Field(
        default=None,
        description="Optional override for the number of departments",
    )

    team_size_range: list[int] | None = Field(
        default=None,
        description="Optional minimum and maximum team size",
    )

    custom_business_units: list[str] | None = Field(
        default=None,
        description="Optional custom business units",
    )