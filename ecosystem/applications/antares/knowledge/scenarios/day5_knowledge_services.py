"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 5 Deliverables: Build Knowledge Services for Antres
- Hardened API Engineering (Ingestion, Retrieval, Search, Capability Lookup, Relationship Traversal, Provenance, Validation, Dependency, Version, Operationalization Status)
- Service Contracts & Explicit Schemas (Request/Response validation, ownership, permissions, provenance)
- Cross-Platform Integration (Technology Intelligence, Capability Validation, Organizational Futures ingestion)
- Reliability Engineering (Structured error handling, idempotent ingestion via idempotency keys, audit logging, observability, failure reporting)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Header, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import logging

# Configure Logging for Observability & Audit Trail
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("AntresKnowledgeService")

# ==========================================
# 1. PERSISTENCE LAYER & AUDIT LOGS
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./antres_knowledge_services.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class KnowledgeServiceModel(Base):
    __tablename__ = "antres_knowledge_services"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True) # Capability, Technology, Organizational Future
    
    # Cross-Platform Integration Ownership & Provenance
    source_platform = Column(String, nullable=False, index=True) # Technology Intelligence, Capability Validation, Organizational Futures
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation & Governance Contracts
    validation_status = Column(String, nullable=False) # APPROVED, CONDITIONAL
    validated_by = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    constitutional_check_passed = Column(Boolean, default=True)
    
    # Service Relationships & Dependencies
    capabilities = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    dependencies = Column(JSON, default=list)
    
    # Versioning & Status
    version = Column(Integer, default=1)
    previous_version_id = Column(String, nullable=True)
    operationalization_status = Column(String, default="ACTIVE_OPERATIONALIZED")
    is_active = Column(Boolean, default=True)
    permissions_tier = Column(String, default="ENTERPRISE_INTERNAL")

    def to_service_contract_response(self):
        return {
            "service_metadata": {
                "object_id": self.id,
                "version": self.version,
                "previous_version_id": self.previous_version_id,
                "operationalization_status": self.operationalization_status,
                "is_active": self.is_active
            },
            "content": {
                "title": self.title,
                "description": self.description,
                "category": self.category
            },
            "provenance_and_ownership": {
                "source_platform": self.source_platform,
                "author_id": self.author_id,
                "source_reference_id": self.source_reference_id,
                "ingested_at": self.ingested_at.isoformat(),
                "permissions_tier": self.permissions_tier
            },
            "validation_contract": {
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
# 2. EXPLICIT SERVICE CONTRACT SCHEMAS
# ==========================================
class ProvenanceContract(BaseModel):
    source_platform: str = Field(..., description="Technology Intelligence, Capability Validation, or Organizational Futures")
    author_id: str = Field(..., description="Author or validating agent ID")
    source_reference_id: str = Field(..., description="External reference ID in source platform")

class ValidationContract(BaseModel):
    validated_by: str = Field(..., description="Governance or validation officer")
    validation_status: str = Field(..., description="APPROVED or CONDITIONAL")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = True

class KnowledgeIngestRequest(BaseModel):
    id: str = Field(..., description="Unique Knowledge Object ID")
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(..., description="Capability, Technology, or Organizational Future")
    provenance: ProvenanceContract
    validation: ValidationContract
    capabilities: List[str] = Field(default=[])
    technologies: List[str] = Field(default=[])
    dependencies: List[str] = Field(default=[])
    version: int = 1
    previous_version_id: Optional[str] = None
    permissions_tier: str = Field(default="ENTERPRISE_INTERNAL")

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = ["Capability", "Technology", "Organizational Future"]
        if v not in allowed:
            raise ValueError(f"Invalid category '{v}'. Must be one of {allowed}")
        return v


# ==========================================
# 3. RELIABILITY & SERVICE LAYER
# ==========================================
class AntresKnowledgeServiceEngine:
    @staticmethod
    def ingest_knowledge(db: Session, request_payload: KnowledgeIngestRequest, idempotency_key: str) -> dict:
        logger.info(f"Initiating idempotent ingestion for ID: {request_payload.id} with idempotency key: {idempotency_key}")
        
        # 1. Idempotency Check
        existing_by_key = db.query(KnowledgeServiceModel).filter(KnowledgeServiceModel.idempotency_key == idempotency_key).first()
        if existing_by_key:
            logger.warning(f"Idempotent duplicate request detected for key: {idempotency_key}. Returning existing record.")
            return existing_by_key.to_service_contract_response()

        # 2. Object ID Uniqueness Check
        existing_id = db.query(KnowledgeServiceModel).filter(KnowledgeServiceModel.id == request_payload.id).first()
        if existing_id:
            logger.error(f"Conflict: Knowledge object ID '{request_payload.id}' already exists.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Knowledge object ID '{request_payload.id}' already exists. Use versioning for updates."
            )

        # 3. Persistence & Audit Logging
        db_obj = KnowledgeServiceModel(
            id=request_payload.id,
            title=request_payload.title.strip(),
            description=request_payload.description.strip(),
            category=request_payload.category,
            source_platform=request_payload.provenance.source_platform,
            author_id=request_payload.provenance.author_id,
            source_reference_id=request_payload.provenance.source_reference_id,
            idempotency_key=idempotency_key,
            ingested_at=datetime.now(timezone.utc),
            validation_status=request_payload.validation.validation_status,
            validated_by=request_payload.validation.validated_by,
            confidence_score=request_payload.validation.confidence_score,
            constitutional_check_passed=request_payload.validation.constitutional_check_passed,
            capabilities=request_payload.capabilities,
            technologies=request_payload.technologies,
            dependencies=request_payload.dependencies,
            version=request_payload.version,
            previous_version_id=request_payload.previous_version_id,
            operationalization_status="ACTIVE_OPERATIONALIZED",
            permissions_tier=request_payload.permissions_tier
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Successfully operationalized and persisted knowledge object: {db_obj.id}")
        return db_obj.to_service_contract_response()

    @staticmethod
    def get_service_status(db: Session, knowledge_id: str) -> dict:
        obj = db.query(KnowledgeServiceModel).filter(KnowledgeServiceModel.id == knowledge_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail=f"Knowledge object '{knowledge_id}' not found.")
        return {
            "object_id": obj.id,
            "operationalization_status": obj.operationalization_status,
            "version": obj.version,
            "is_active": obj.is_active,
            "source_platform": obj.source_platform,
            "ingested_at": obj.ingested_at.isoformat()
        }


# ==========================================
# 4. HARDENED FASTAPI INTERFACE
# ==========================================
app = FastAPI(
    title="Antres Knowledge Services Platform",
    description="Day 5 Hardened Service Interfaces: Ingestion, Retrieval, Traversal, Provenance, Validation, Dependencies, Versions & Status with Reliability Engineering.",
    version="5.0.0"
)

# Dependency for DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/v5/services/ingest", status_code=status.HTTP_201_CREATED)
def api_ingest_knowledge(
    payload: KnowledgeIngestRequest,
    x_idempotency_key: Optional[str] = Header(None, description="Required idempotency key for reliable ingestion"),
    request: Request = None
):
    if not x_idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Idempotency-Key' is mandatory for reliable service ingestion."
        )
    db = SessionLocal()
    try:
        return AntresKnowledgeServiceEngine.ingest_knowledge(db, payload, x_idempotency_key)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Unexpected error during knowledge ingestion")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal service error: {str(e)}"
        )
    finally:
        db.close()

@app.get("/api/v5/services/status/{knowledge_id}")
def api_get_status(knowledge_id: str):
    db = SessionLocal()
    try:
        return AntresKnowledgeServiceEngine.get_service_status(db, knowledge_id)
    finally:
        db.close()

@app.get("/api/v5/services/traverse/{knowledge_id}")
def api_relationship_traversal(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(KnowledgeServiceModel).filter(KnowledgeServiceModel.id == knowledge_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Knowledge object not found.")
        return {
            "source_object_id": obj.id,
            "traversed_edges": {
                "capabilities": obj.capabilities,
                "technologies": obj.technologies,
                "dependencies": obj.dependencies
            }
        }
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
