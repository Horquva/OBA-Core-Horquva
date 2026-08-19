"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 3 Deliverables: Live Knowledge Operationalization Engine
Core Pipeline Stages:
1. Ingestion
2. Schema Validation (Pydantic Strict Validation)
3. Normalization (Data cleaning & standardization)
4. Metadata Extraction (Auto-tagging & computation)
5. Relationship Resolution (Linking to capabilities, tech, governance)
6. Provenance & Traceability (Operational Knowledge -> Capability Ref -> Validation Record -> Source Evidence -> Original Discovery)
7. Persistence & Indexing (SQLAlchemy DB)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ==========================================
# 1. PERSISTENCE LAYER & PROVENANCE RECORDS
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./antres_live_pipeline.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class OperationalKnowledgeModel(Base):
    __tablename__ = "operational_knowledge_objects"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    
    # Provenance Chain (Traceability to Source & Original Discovery)
    source_team = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    original_discovery_id = Column(String, nullable=False, index=True)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation & Governance Record
    validated_by = Column(String, nullable=False)
    validation_status = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    constitutional_check_passed = Column(Boolean, default=True)
    
    # Extracted Metadata & Relationships (Knowledge Graph Ready)
    normalized_tags = Column(JSON, default=list)
    related_capabilities = Column(JSON, default=list)
    related_technologies = Column(JSON, default=list)
    extraction_metadata = Column(JSON, default=dict)
    
    # Lifecycle & Versioning State
    lifecycle_state = Column(String, default="OPERATIONALIZED")
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    def to_provenance_trace(self):
        """Ensures complete traceability: Operational Knowledge -> Capability Ref -> Validation Record -> Source Evidence -> Original Discovery"""
        return {
            "operational_knowledge_id": self.id,
            "lifecycle_state": self.lifecycle_state,
            "provenance_chain": {
                "step_1_operational_object": self.id,
                "step_2_capability_references": self.related_capabilities,
                "step_3_validation_record": {
                    "validated_by": self.validated_by,
                    "status": self.validation_status,
                    "confidence": self.confidence_score,
                    "constitutional_check": self.constitutional_check_passed
                },
                "step_4_source_evidence": {
                    "source_team": self.source_team,
                    "author_id": self.author_id,
                    "source_reference_id": self.source_reference_id
                },
                "step_5_original_discovery_id": self.original_discovery_id
            },
            "ingested_at": self.ingested_at.isoformat()
        }

Base.metadata.create_all(bind=engine)


# ==========================================
# 2. SCHEMA VALIDATION (Pydantic Contracts)
# ==========================================
class IncomingSourceData(BaseModel):
    source_team: str = Field(..., description="Validating Antres team")
    author_id: str = Field(..., description="Author ID")
    source_reference_id: str = Field(..., description="Source reference ID")
    original_discovery_id: str = Field(..., description="Unique ID of the original raw discovery")

class IncomingValidationData(BaseModel):
    validated_by: str = Field(..., description="Governance or validation officer")
    validation_status: str = Field(..., description="APPROVED, CONDITIONAL")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = True

class RawKnowledgeInput(BaseModel):
    id: str = Field(..., description="Target Knowledge Object ID")
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(..., description="Capability, Technology, Governance, etc.")
    source: IncomingSourceData
    validation: IncomingValidationData
    tags: List[str] = Field(default=[], description="Raw tags from discovery")
    related_capabilities: List[str] = Field(default=[])
    related_technologies: List[str] = Field(default=[])

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = ["Capability", "Technology", "Governance", "Organizational Future"]
        if v not in allowed:
            raise ValueError(f"Invalid category '{v}'. Must be one of {allowed}")
        return v


# ==========================================
# 3. PIPELINE SERVICE (Normalization, Metadata & Resolution)
# ==========================================
class LiveKnowledgePipeline:
    @staticmethod
    def process_and_persist(db: Session, raw: RawKnowledgeInput) -> OperationalKnowledgeModel:
        # Check for duplicate / existing ID
        existing = db.query(OperationalKnowledgeModel).filter(OperationalKnowledgeModel.id == raw.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Knowledge Object ID '{raw.id}' already exists in operational store."
            )

        # Stage 3: Normalization (Clean titles, lowercase tags, normalize categories)
        normalized_title = raw.title.strip().title()
        normalized_description = raw.description.strip()
        normalized_tags = sorted(list(set([t.lower().strip() for t in raw.tags])))

        # Stage 4: Metadata Extraction & Auto-Tagging
        word_count = len(normalized_description.split())
        extraction_metadata = {
            "word_count": word_count,
            "auto_classified_tier": "Enterprise" if raw.validation.confidence_score > 0.9 else "Standard",
            "processed_pipeline_version": "3.0.0"
        }

        # Stage 5: Relationship Resolution (Ensuring valid links)
        resolved_capabilities = [c.strip() for c in raw.related_capabilities if c.strip()]
        resolved_technologies = [t.strip() for t in raw.related_technologies if t.strip()]

        # Stage 6 & 7: Persistence & Indexing (No orphan objects - Full Provenance)
        db_obj = OperationalKnowledgeModel(
            id=raw.id,
            title=normalized_title,
            description=normalized_description,
            category=raw.category,
            source_team=raw.source.source_team,
            author_id=raw.source.author_id,
            source_reference_id=raw.source.source_reference_id,
            original_discovery_id=raw.source.original_discovery_id,
            ingested_at=datetime.now(timezone.utc),
            validated_by=raw.validation.validated_by,
            validation_status=raw.validation.validation_status,
            confidence_score=raw.validation.confidence_score,
            constitutional_check_passed=raw.validation.constitutional_check_passed,
            normalized_tags=normalized_tags,
            related_capabilities=resolved_capabilities,
            related_technologies=resolved_technologies,
            extraction_metadata=extraction_metadata,
            lifecycle_state="OPERATIONALIZED",
            version=1,
            is_active=True
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# ==========================================
# 4. FASTAPI LIVE PIPELINE ENDPOINTS
# ==========================================
app = FastAPI(
    title="Antres Live Knowledge Operationalization Pipeline",
    description="Day 3 Engine: Ingestion ➔ Validation ➔ Normalization ➔ Metadata ➔ Relationship Resolution ➔ Traceable Persistence",
    version="3.0.0"
)

@app.post("/api/v3/pipeline/ingest", status_code=status.HTTP_201_CREATED)
def run_live_pipeline(payload: RawKnowledgeInput):
    db = SessionLocal()
    try:
        operational_obj = LiveKnowledgePipeline.process_and_persist(db, payload)
        return {
            "message": "Live Knowledge Operationalization Pipeline executed successfully.",
            "operational_object": {
                "id": operational_obj.id,
                "title": operational_obj.title,
                "category": operational_obj.category,
                "normalized_tags": operational_obj.normalized_tags,
                "extraction_metadata": operational_obj.extraction_metadata,
                "lifecycle_state": operational_obj.lifecycle_state
            },
            "provenance_trace": operational_obj.to_provenance_trace()
        }
    finally:
        db.close()

@app.get("/api/v3/pipeline/trace/{knowledge_id}")
def get_provenance_trace(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(OperationalKnowledgeModel).filter(OperationalKnowledgeModel.id == knowledge_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Operational Knowledge Object not found")
        return obj.to_provenance_trace()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
