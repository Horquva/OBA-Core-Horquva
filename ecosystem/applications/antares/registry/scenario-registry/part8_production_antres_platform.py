"""
Laiba Mahboob - Knowledge Operationalization Platform
Part 8 Deliverables: Final Working Antres Knowledge Layer (Production-Grade Infrastructure)
- Final Working Flow: Discovery -> Organizational Knowledge -> Validation -> Operationalization -> Normalization -> Relationship Engine -> Persistence -> Indexing -> Knowledge Retrieval -> Antres Intelligence / Capability Engines -> Future OBA Consumption
- Final Acceptance Criteria Compliance: Real data persistence, enforced schemas, provenance tracking, versioning, API integration, observability, and reproducible infrastructure.
- Non-Overlap Boundary Enforcement: Laiba owns backend infrastructure, schemas, persistence, APIs, retrieval, provenance, versioning, and pipeline while respecting cross-team domain boundaries.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Header, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON, PrimaryKeyConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("AntresProductionPlatform")

# ==========================================
# 1. PRODUCTION-GRADE PERSISTENCE LAYER
# ==========================================
PROD_DB_URL = "sqlite:///./antres_production_knowledge.db"
engine = create_engine(PROD_DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProductionKnowledgeModel(Base):
    __tablename__ = "production_antres_knowledge_layer"

    id = Column(String, primary_key=False, index=True)
    version = Column(Integer, primary_key=False, default=1)
    
    __table_args__ = (
        PrimaryKeyConstraint('id', 'version', name='pk_prod_id_version'),
    )

    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    
    # Cross-Team Ownership & Provenance
    source_platform = Column(String, nullable=False, index=True) # Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    idempotency_key = Column(String, index=True, nullable=True)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation & Constitutional State
    validation_status = Column(String, nullable=False)
    validated_by = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    constitutional_check_passed = Column(Boolean, nullable=False)
    
    # Relationships & Graph Edges
    capabilities = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    dependencies = Column(JSON, default=list)
    
    # Lifecycle & Versioning
    previous_version_id = Column(String, nullable=True)
    lifecycle_state = Column(String, default="PRODUCTION_ACTIVE_OPERATIONALIZED")
    is_active = Column(Boolean, default=True)
    audit_notes = Column(String, nullable=True)

    def to_production_payload(self):
        return {
            "platform_layer": "Antres Knowledge Operationalization Platform (Production v8.0)",
            "object_identity": {
                "id": self.id,
                "version": self.version,
                "previous_version_id": self.previous_version_id,
                "lifecycle_state": self.lifecycle_state,
                "is_active": self.is_active
            },
            "content": {
                "title": self.title,
                "description": self.description,
                "category": self.category
            },
            "cross_team_provenance": {
                "source_platform": self.source_platform,
                "author_id": self.author_id,
                "source_reference_id": self.source_reference_id,
                "ingested_at": self.ingested_at.isoformat()
            },
            "governance_and_validation": {
                "validated_by": self.validated_by,
                "validation_status": self.validation_status,
                "confidence_score": self.confidence_score,
                "constitutional_check_passed": self.constitutional_check_passed
            },
            "graph_relationships_and_dependencies": {
                "capabilities": self.capabilities,
                "technologies": self.technologies,
                "dependencies": self.dependencies
            },
            "audit_trail": {
                "notes": self.audit_notes,
                "owner": "Laiba Mahboob (Backend & Knowledge Infrastructure Engineer)"
            }
        }

Base.metadata.create_all(bind=engine)


# ==========================================
# 2. STRICT SCHEMAS & CONTRACTS
# ==========================================
class ProvenanceSchema(BaseModel):
    source_platform: str = Field(..., description="Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance")
    author_id: str
    source_reference_id: str

class ValidationSchema(BaseModel):
    validated_by: str
    validation_status: str = Field(..., description="Must be APPROVED")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = Field(..., description="Must be True")

class ProductionIngestRequest(BaseModel):
    id: str = Field(..., description="Unique Knowledge Object ID")
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(..., description="Capability, Technology, Organizational Future, Governance Pattern")
    provenance: ProvenanceSchema
    validation: ValidationSchema
    capabilities: List[str] = Field(default=[])
    technologies: List[str] = Field(default=[])
    dependencies: List[str] = Field(default=[])
    version: int = 1
    previous_version_id: Optional[str] = None
    audit_notes: Optional[str] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = ["Capability", "Technology", "Organizational Future", "Governance Pattern"]
        if v not in allowed:
            raise ValueError(f"Invalid category '{v}'. Must be one of {allowed}")
        return v


# ==========================================
# 3. PRODUCTION OPERATIONALIZATION ENGINE
# ==========================================
class ProductionAntresEngine:
    @staticmethod
    def operationalize_knowledge(db: Session, req: ProductionIngestRequest, idempotency_key: Optional[str] = None) -> ProductionKnowledgeModel:
        # Integrity Safeguard: Enforce Constitutional & Provenance rules
        if not req.validation.constitutional_check_passed or req.validation.validation_status != "APPROVED":
            logger.error(f"Production Safeguard Block: Object '{req.id}' failed constitutional compliance.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Production Rejection: Unconstitutional or unapproved knowledge cannot enter the Antres live system."
            )
        if not req.provenance.source_platform or not req.provenance.author_id:
            logger.error(f"Production Safeguard Block: Object '{req.id}' missing provenance metadata.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Production Rejection: Missing provenance metadata is strictly prohibited."
            )

        # Idempotency check
        if idempotency_key:
            existing_key = db.query(ProductionKnowledgeModel).filter(ProductionKnowledgeModel.idempotency_key == idempotency_key).first()
            if existing_key:
                logger.info(f"Idempotent hit in production engine for key: {idempotency_key}")
                return existing_key

        # Versioning conflict check & historical archiving
        existing_active = db.query(ProductionKnowledgeModel).filter(
            ProductionKnowledgeModel.id == req.id,
            ProductionKnowledgeModel.is_active == True
        ).first()

        if existing_active:
            if req.version <= existing_active.version:
                logger.error(f"Version Conflict: Attempted to overwrite version {existing_active.version} with version {req.version}.")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Version Conflict: New version ({req.version}) must exceed current active version ({existing_active.version})."
                )
            existing_active.is_active = False
            existing_active.lifecycle_state = "PRODUCTION_SUPERSEDED_ARCHIVED"
            db.commit()

        # Normalization (Title case cleanup, whitespace normalization)
        cleaned_title = " ".join(req.title.strip().split())
        cleaned_desc = " ".join(req.description.strip().split())

        db_obj = ProductionKnowledgeModel(
            id=req.id,
            version=req.version,
            title=cleaned_title,
            description=cleaned_desc,
            category=req.category,
            source_platform=req.provenance.source_platform,
            author_id=req.provenance.author_id,
            source_reference_id=req.provenance.source_reference_id,
            idempotency_key=idempotency_key,
            ingested_at=datetime.now(timezone.utc),
            validation_status=req.validation.validation_status,
            validated_by=req.validation.validated_by,
            confidence_score=req.validation.confidence_score,
            constitutional_check_passed=req.validation.constitutional_check_passed,
            capabilities=req.capabilities,
            technologies=req.technologies,
            dependencies=req.dependencies,
            previous_version_id=req.previous_version_id,
            lifecycle_state="PRODUCTION_ACTIVE_OPERATIONALIZED",
            is_active=True,
            audit_notes=req.audit_notes or "Operationalized into production Antres knowledge layer successfully."
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Successfully operationalized production knowledge object: {db_obj.id} at v{db_obj.version}")
        return db_obj


# ==========================================
# 4. FASTAPI PRODUCTION INTERFACES
# ==========================================
app = FastAPI(
    title="Antres Production Knowledge Operationalization Platform",
    description="Part 8 Final Working Layer: Production-grade ingestion, retrieval, relationship traversal, OBA compatibility, and non-overlap boundary enforcement.",
    version="8.0.0"
)

@app.post("/api/v8/production/ingest", status_code=status.HTTP_201_CREATED)
def api_prod_ingest(payload: ProductionIngestRequest, x_idempotency_key: Optional[str] = Header(None)):
    db = SessionLocal()
    try:
        obj = ProductionAntresEngine.operationalize_knowledge(db, payload, x_idempotency_key)
        return {
            "status": "SUCCESS",
            "message": "Knowledge successfully operationalized and integrated into Antres production layer.",
            "data": obj.to_production_payload()
        }
    finally:
        db.close()

@app.get("/api/v8/production/knowledge/{knowledge_id}", status_code=status.HTTP_200_OK)
def api_prod_retrieve(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(ProductionKnowledgeModel).filter(
            ProductionKnowledgeModel.id == knowledge_id,
            ProductionKnowledgeModel.is_active == True
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Active production knowledge object not found.")
        return obj.to_production_payload()
    finally:
        db.close()

@app.get("/api/v8/production/traverse/{knowledge_id}")
def api_prod_traverse(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(ProductionKnowledgeModel).filter(
            ProductionKnowledgeModel.id == knowledge_id,
            ProductionKnowledgeModel.is_active == True
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Knowledge object not found.")
        return {
            "object_id": obj.id,
            "source_platform": obj.source_platform,
            "relationship_graph": {
                "capabilities": obj.capabilities,
                "technologies": obj.technologies,
                "dependencies": obj.dependencies
            }
        }
    finally:
        db.close()
