"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 1 Deliverables: 
1. Knowledge Lifecycle Flow Definition
2. Knowledge Object Schema Definition (Python Pydantic Model)
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class KnowledgeSource(BaseModel):
    source_team: str = Field(..., description="e.g., Capability Validation (Zara), Enterprise Validation (Ammara)")
    author_id: str = Field(..., description="ID or name of the validator/discoverer")
    source_reference_id: str = Field(..., description="External reference ID from source system")
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ValidationReference(BaseModel):
    is_validated: bool = True
    validated_by: str = Field(..., description="Governance or validation team member")
    validation_status: str = Field(..., description="APPROVED, CONDITIONAL, PENDING_REVIEW")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence rating between 0 and 1")
    constitutional_check_passed: bool = True


class KnowledgeObject(BaseModel):
    # 1. Identity
    id: str = Field(..., description="Unique UUID for this Knowledge Object")
    title: str = Field(..., description="Clear title of the knowledge item")
    description: str = Field(..., description="Detailed description/content of the knowledge")
    category: str = Field(..., description="e.g., Capability, Technology, Governance, Organizational Future")

    # 2. Source & Provenance (Crucial for traceability - No orphan objects)
    source: KnowledgeSource
    
    # 3. Validation Reference
    validation: ValidationReference

    # 4. Relationships (Links to Capabilities, Tech, Governance)
    related_capabilities: List[str] = Field(default=[], description="List of related capability IDs")
    related_technologies: List[str] = Field(default=[], description="List of related technology IDs")
    metadata_tags: Dict[str, Any] = Field(default={}, description="Flexible metadata and tags")

    # 5. Versioning
    version: int = Field(default=1, description="Version number of this knowledge object")
    previous_version_id: Optional[str] = Field(default=None, description="ID of previous version if updated")
    is_active: bool = Field(default=True, description="Active status for retrieval")


# Example usage / test object to verify schema
if __name__ == "__main__":
    sample_knowledge = KnowledgeObject(
        id="ko-2026-0808-001",
        title="Automated Compliance Verification Pipeline",
        description="Validated capability model for automated compliance checking in Antres financial modules.",
        category="Capability",
        source=KnowledgeSource(
            source_team="Enterprise Validation (Ammara)",
            author_id="ammara.val@antres.internal",
            source_reference_id="EV-REF-9982"
        ),
        validation=ValidationReference(
            validated_by="Kanwal (Trust & Governance)",
            validation_status="APPROVED",
            confidence_score=0.95,
            constitutional_check_passed=True
        ),
        related_capabilities=["cap-fin-01", "cap-gov-04"],
        related_technologies=["tech-python-fastapi", "tech-docker"],
        metadata_tags={"domain": "Fintech", "security_level": "High"},
        version=1
    )
    
    print("Day 1 Knowledge Object Schema compiled successfully!")
    print(sample_knowledge.model_dump_json(indent=2))
