from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class BootstrapResponse(BaseModel):
    """Standardized response for a successful state ingestion."""
    status: str = Field(..., description="Execution status (e.g., 'success')")
    message: str = Field(..., description="Result details regarding DAG and constraint validation")
    run_id: UUID = Field(..., description="The shared simulation run_id tied to this state")

class GraphTraversalResponse(BaseModel):
    """Standardized response for Maaz's RuntimeEngine when querying relationships."""
    parent_id: int = Field(..., description="The requested parent entity ID")
    relationship_type: Optional[str] = Field(None, description="The optional filter applied")
    children_ids: List[int] = Field(default_factory=list, description="Resolved downstream entity IDs")