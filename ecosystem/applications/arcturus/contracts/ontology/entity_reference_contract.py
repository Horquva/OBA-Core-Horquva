from pydantic import BaseModel, Field
from typing import List, Optional
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext, 
    ContractEnvelope
)

class EntityReference(BaseModel):
    """
    Represents a single verified entity within the organizational domain.
    """
    entity_type: str = Field(
        ..., 
        description="The constitutional type of the entity (e.g., 'Department', 'Role', 'Capability')"
    )
    entity_id: int = Field(
        ..., 
        description="The unique integer identifier of the resolved entity"
    )
    is_resolved: bool = Field(
        default=True, 
        description="Boolean flag indicating if the entity was successfully located in the active ontology"
    )
    resolution_notes: Optional[str] = Field(
        None, 
        description="Optional context, such as 'Entity state is degraded' or resolution warnings"
    )

class EntityReferenceContract(ContractEnvelope):
    """
    Validates the existence and state of organizational entities targeted by a scenario.
    Wrapped in the shared ContractEnvelope per architectural directives.
    """
    scenario_target_id: str = Field(
        ..., 
        description="The identifier of the scenario requesting entity validation"
    )
    resolved_entities: List[EntityReference] = Field(
        default_factory=list,
        description="The list of entities structurally verified to exist within the ontology"
    )