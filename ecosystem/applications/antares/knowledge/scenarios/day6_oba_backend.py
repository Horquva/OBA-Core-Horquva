"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 6 Deliverables: Build the OBA-Ready Knowledge Backend
- OBA Compatibility (Preserving provenance, confidence, validation state, constitutional status, relationships, dependencies, source references, timestamps, versions, lifecycle state)
- Knowledge Integrity Safeguards (Preventing duplicate knowledge, conflicting versions without audit trails, orphaned references, invalid relationships, missing provenance, unvalidated ingestion, schema drift, accidental overwrites)
- Versioning Engine (Knowledge v1 -> Revision -> Knowledge v2 -> Validation/Traceability -> Current usable representation with historical auditable states)
- Machine Consumption APIs (Structured machine-readable outputs for Antres services, intelligence engines, capability engines, and future OBA interfaces)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON, PrimaryKeyConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("OBAReadyBackend")

# ==========================================
# 1. PERSISTENCE LAYER & AUDITABLE HISTORY
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./antres_oba_backend.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class OBAKnowledgeModel(Base):
    __tablename__ = "oba_knowledge_objects"

    id = Column(String, primary_key=False, index=True)
    version = Column(Integer, primary_key=False, default=1)
    
    __table_args__ = (
        PrimaryKeyConstraint('id', 'version', name='pk_knowledge_id_version'),
    )

    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    
    # OBA Compatibility & Provenance
    source_platform = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation & Constitutional Status
    validation_status = Column(String, nullable=False)
    validated_by = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    constitutional_check_passed = Column(Boolean, nullable=False)
    
    # Relationships & Dependencies
    capabilities = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    dependencies = Column(JSON, default=list)
    
    # Versioning & Lifecycle State
    previous_version_id = Column(String, nullable=True)
    lifecycle_state = Column(String, default="ACTIVE_USABLE")
    is_active = Column(Boolean, default=True)
    audit_trail_notes = Column(String, nullable=True)

    def to_oba_machine_consumable_format(self):
        return {
            "oba_schema_version": "2.0.0",
            "object_identity": {
                "id": self.id,
                "title": self.title,
                "description": self.description,
                "category": self.category
            },
            "lifecycle_and_versioning": {
                "version": self.version,
                "previous_version_id": self.previous_version_id,
                "lifecycle_state": self.lifecycle_state,
                "is_active": self.is_active,
                "audit_trail_notes": self.audit_trail_notes
            },
            "provenance_and_source": {
                "source_platform": self.source_platform,
                "author_id": self.author_id,
                "source_reference_id": self.source_reference_id,
                "ingested_at": self.ingested_at.isoformat()
            },
            "validation_and_constitutional_state": {
                "validated_by": self.validated_by,
                "validation_status": self.validation_status,
                "confidence_score": self.confidence_score,
                "constitutional_check_passed": self.constitutional_check_passed
            },
            "relationships_and_dependencies": {
                "capabilities": self.capabilities,
                "technologies": self.technologies,
                "dependencies": self.dependencies
            }
        }

Base.metadata.create_all(bind=engine)


# ==========================================
# 2. PYDANTIC CONTRACTS & INTEGRITY RULES
# ==========================================
class ProvenanceInput(BaseModel):
    source_platform: str
    author_id: str
    source_reference_id: str

class ValidationInput(BaseModel):
    validated_by: str
    validation_status: str = Field(..., description="Must be APPROVED for OBA consumption")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = Field(..., description="Must be True for constitutional compliance")

class KnowledgeUpsertRequest(BaseModel):
    id: str = Field(..., description="Unique Knowledge Object ID")
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str
    provenance: ProvenanceInput
    validation: ValidationInput
    capabilities: List[str] = Field(default=[])
    technologies: List[str] = Field(default=[])
    dependencies: List[str] = Field(default=[])
    version: int = 1
    previous_version_id: Optional[str] = None
    audit_trail_notes: Optional[str] = None


# ==========================================
# 3. OBA BACKEND SERVICE & INTEGRITY ENGINE
# ==========================================
class OBAKnowledgeBackendEngine:
    @staticmethod
    def upsert_knowledge_with_integrity(db: Session, req: KnowledgeUpsertRequest) -> OBAKnowledgeModel:
        # Safeguard 1: Unvalidated Ingestion Prevention
        if not req.validation.constitutional_check_passed or req.validation.validation_status != "APPROVED":
            logger.error(f"Integrity Violation: Object '{req.id}' failed constitutional or approval validation.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity Safeguard Block: Unvalidated or unconstitutional knowledge cannot be operationalized for OBA."
            )

        # Safeguard 2: Missing Provenance Prevention
        if not req.provenance.source_platform or not req.provenance.author_id:
            logger.error(f"Integrity Violation: Object '{req.id}' is missing mandatory provenance metadata.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity Safeguard Block: Missing provenance metadata is strictly prohibited."
            )

        # Check existing active version for this ID
        existing_active = db.query(OBAKnowledgeModel).filter(
            OBAKnowledgeModel.id == req.id,
            OBAKnowledgeModel.is_active == True
        ).first()

        if existing_active:
            # Safeguard 3: Accidental Overwrite & Version Conflict Protection
            if req.version <= existing_active.version:
                logger.error(f"Version Conflict: Attempted to overwrite version {existing_active.version} with version {req.version}.")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Version Conflict Safeguard: New version ({req.version}) must be greater than current active version ({existing_active.version})."
                )

            # Archive / Deprecate previous active version for auditable historical state
            existing_active.is_active = False
            existing_active.lifecycle_state = "SUPERSEDED_HISTORICAL"
            db.commit()
            logger.info(f"Archived previous version of object '{req.id}' (v{existing_active.version}) as historical auditable state.")

        # Create new version record (composite primary key id + version allows multiple historical versions)
        db_obj = OBAKnowledgeModel(
            id=req.id,
            title=req.title.strip(),
            description=req.description.strip(),
            category=req.category,
            source_platform=req.provenance.source_platform,
            author_id=req.provenance.author_id,
            source_reference_id=req.provenance.source_reference_id,
            ingested_at=datetime.now(timezone.utc),
            validation_status=req.validation.validation_status,
            validated_by=req.validation.validated_by,
            confidence_score=req.validation.confidence_score,
            constitutional_check_passed=req.validation.constitutional_check_passed,
            capabilities=req.capabilities,
            technologies=req.technologies,
            dependencies=req.dependencies,
            version=req.version,
            previous_version_id=req.previous_version_id,
            lifecycle_state="ACTIVE_USABLE",
            is_active=True,
            audit_trail_notes=req.audit_trail_notes or f"Operationalized version {req.version} successfully."
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"OBA Knowledge Backend successfully persisted and operationalized object '{db_obj.id}' at v{db_obj.version}")
        return db_obj


# ==========================================
# 4. FASTAPI INTERFACE FOR MACHINE CONSUMPTION
# ==========================================
app = FastAPI(
    title="Antres OBA-Ready Knowledge Backend",
    description="Day 6 Engine: OBA Compatibility, Knowledge Integrity Safeguards, Versioning Engine & Machine Consumption APIs.",
    version="6.0.0"
)

@app.post("/api/v6/oba/knowledge", status_code=status.HTTP_201_CREATED)
def api_upsert_knowledge(payload: KnowledgeUpsertRequest):
    db = SessionLocal()
    try:
        obj = OBAKnowledgeBackendEngine.upsert_knowledge_with_integrity(db, payload)
        return {
            "message": "Knowledge successfully operationalized for OBA consumption with integrity safeguards.",
            "machine_consumable_output": obj.to_oba_machine_consumable_format()
        }
    finally:
        db.close()

@app.get("/api/v6/oba/knowledge/{knowledge_id}", status_code=status.HTTP_200_OK)
def api_get_machine_knowledge(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(OBAKnowledgeModel).filter(
            OBAKnowledgeModel.id == knowledge_id,
            OBAKnowledgeModel.is_active == True
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Active OBA-ready knowledge object not found.")
        return obj.to_oba_machine_consumable_format()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
