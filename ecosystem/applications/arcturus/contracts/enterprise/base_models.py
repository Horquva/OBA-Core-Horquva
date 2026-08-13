from enum import Enum
from typing import List, Optional, Literal

from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
    ContractEnvelope,
)

# Canonical ontology primitives — owned by Muhammad Hamza's platform.
# Imported, never redefined, per locked non-overlap boundary.
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OrganizationState,
    DivisionState,
    DepartmentState,
    TeamState,
    RoleState,
)


# ---------------------------------------------------------------------------
# 1. ENTERPRISE TEMPLATE LAYER
#    Machine-readable configuration, per Part-2 §2: "Enterprise Templates as
#    machine-readable configurations (not Markdown)"
# ---------------------------------------------------------------------------

class IndustryType(str, Enum):
    STARTUP = "startup"
    SAAS = "enterprise_saas"
    MANUFACTURING = "manufacturing"
    HOSPITAL = "hospital"
    UNIVERSITY = "university"
    GOVERNMENT = "government_agency"
    FINANCIAL = "financial_institution"
    RETAIL = "retail_enterprise"


class ScaleProfile(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    ENTERPRISE = "enterprise_scale"


class EnterpriseTemplatePayload(ContractEnvelope):
    """
    A reusable, machine-readable enterprise archetype.
    Directive: must inherit from ContractEnvelope. ✅
    """
    template_id: str = Field(..., description="Unique identifier for this template")
    template_name: str = Field(..., description="e.g. 'SaaS Startup - Series A'")
    industry_type: IndustryType
    scale_profile: ScaleProfile

    default_business_units: List[str] = Field(
        default_factory=list,
        description="e.g. ['Finance', 'HR', 'Engineering', 'Sales', 'Product']",
    )
    default_org_depth: int = Field(
        ..., description="Hierarchy levels: Org -> BU -> Division -> Dept -> Team"
    )
    governance_complexity: Literal["flat", "matrix", "hierarchical"] = "hierarchical"


# ---------------------------------------------------------------------------
# 2. ENTERPRISE CONFIGURATION LAYER
#    Part-2 §3: "Template -> Configuration -> Enterprise Instance"
# ---------------------------------------------------------------------------

class EnterpriseConfigurationPayload(ContractEnvelope):
    """
    A specific, parameterized instantiation request derived from a template.
    This is the object Runtime (Maaz) triggers generation with.
    """
    config_id: str
    template_id: str = Field(
        ..., description="References EnterpriseTemplatePayload.template_id"
    )
    # NOTE: deterministic seed lives on context.global_seed (SimulationContext) —
    # do not duplicate it here. Access it as: config_payload.context.global_seed
    org_name: str

    department_count_override: Optional[int] = None
    team_size_range: Optional[List[int]] = Field(
        None, description="[min, max] employees per team"
    )
    custom_business_units: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# 3. GENERATED ENTERPRISE INSTANCE
#    Outbound payload consumed by Workforce, Behavior/Workflow, Scenario, Runtime.
#    Reuses Hamza's ontology entities directly — zero duplicate structural models.
# ---------------------------------------------------------------------------

class EnterpriseInstancePayload(ContractEnvelope):
    """
    A fully generated, structurally-checked synthetic enterprise.
    is_structurally_valid must only be set True after the constraint engine
    (built in Days 3-5) passes it — never set true at generation time.
    """
    instance_id: str
    config_id: str = Field(..., description="References EnterpriseConfigurationPayload.config_id")

    organization: OrganizationState
    divisions: List[DivisionState] = Field(default_factory=list)
    departments: List[DepartmentState] = Field(default_factory=list)
    teams: List[TeamState] = Field(default_factory=list)
    roles: List[RoleState] = Field(default_factory=list)

    is_structurally_valid: bool = Field(
        default=False,
        description="True only after the Day 3-5 constraint engine passes this instance",
    )
    validation_errors: List[str] = Field(default_factory=list)
