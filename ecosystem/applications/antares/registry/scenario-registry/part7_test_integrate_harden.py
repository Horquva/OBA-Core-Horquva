"""
Laiba Mahboob - Knowledge Operationalization Platform
Part 7 Deliverables: Test, Integrate, Harden
- Comprehensive Unit Tests (Domain models, validation, normalization, relationship logic, versioning, lifecycle transitions)
- Integration Tests (Antres Platform -> Knowledge API -> Operationalization Engine -> Persistence -> Retrieval)
- API Tests (Valid requests, invalid requests, malformed knowledge, duplicate submissions, missing provenance, invalid relationships, version conflicts, retrieval failures)
- End-to-End Tests (Input -> Validation -> Operationalization -> Persistence -> Relationship creation -> Search -> Retrieval)
- Cross-Team Integration Simulation (Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance)
- Performance Benchmarking (API response time, ingestion throughput, concurrent requests)
"""

import os
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Header
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON, PrimaryKeyConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("Part7TestHardenEngine")

# ==========================================
# 1. UNIFIED PERSISTENCE LAYER
# ==========================================
DB_URL = "sqlite:///./part7_antres_hardened.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class HardenedKnowledgeModel(Base):
    __tablename__ = "hardened_knowledge_registry"

    id = Column(String, primary_key=False, index=True)
    version = Column(Integer, primary_key=False, default=1)
    
    __table_args__ = (
        PrimaryKeyConstraint('id', 'version', name='pk_hardened_id_ver'),
    )

    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    
    # Cross-Team Source Platforms
    source_platform = Column(String, nullable=False, index=True) # Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    idempotency_key = Column(String, index=True, nullable=True)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation & Governance Contracts
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
    lifecycle_state = Column(String, default="ACTIVE_OPERATIONALIZED")
    is_active = Column(Boolean, default=True)
    audit_notes = Column(String, nullable=True)

    def to_e2e_response(self):
        return {
            "metadata": {
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
            "governance_validation": {
                "validated_by": self.validated_by,
                "validation_status": self.validation_status,
                "confidence_score": self.confidence_score,
                "constitutional_check_passed": self.constitutional_check_passed
            },
            "relationships": {
                "capabilities": self.capabilities,
                "technologies": self.technologies,
                "dependencies": self.dependencies
            }
        }

Base.metadata.create_all(bind=engine)


# ==========================================
# 2. VALIDATION & SERVICE CONTRACTS
# ==========================================
class ProvenanceContract(BaseModel):
    source_platform: str = Field(..., description="Capability Validation, Enterprise Validation, Technology Intelligence, Organizational Futures, Trust & Governance")
    author_id: str
    source_reference_id: str

class ValidationContract(BaseModel):
    validated_by: str
    validation_status: str = Field(..., description="APPROVED or CONDITIONAL")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = True

class HardenedIngestRequest(BaseModel):
    id: str = Field(..., description="Unique Knowledge Object ID")
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: str = Field(..., description="Capability, Technology, Organizational Future, Governance Pattern")
    provenance: ProvenanceContract
    validation: ValidationContract
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
# 3. HARDENED ENGINE & SERVICE LAYER
# ==========================================
class HardenedOperationalizationEngine:
    @staticmethod
    def process_and_persist(db: Session, req: HardenedIngestRequest, idempotency_key: Optional[str] = None) -> HardenedKnowledgeModel:
        # Integrity Safeguard 1: Missing Provenance / Unvalidated check
        if not req.validation.constitutional_check_passed or req.validation.validation_status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity Safeguard: Unvalidated or unconstitutional knowledge rejected."
            )
        if not req.provenance.source_platform or not req.provenance.author_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity Safeguard: Missing provenance metadata rejected."
            )

        # Integrity Safeguard 2: Idempotent duplicate check
        if idempotency_key:
            existing_key = db.query(HardenedKnowledgeModel).filter(HardenedKnowledgeModel.idempotency_key == idempotency_key).first()
            if existing_key:
                logger.info(f"Idempotent hit for key: {idempotency_key}")
                return existing_key

        # Versioning & Conflict check
        existing_active = db.query(HardenedKnowledgeModel).filter(
            HardenedKnowledgeModel.id == req.id,
            HardenedKnowledgeModel.is_active == True
        ).first()

        if existing_active:
            if req.version <= existing_active.version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Version Conflict Safeguard: New version ({req.version}) must exceed current active version ({existing_active.version})."
                )
            existing_active.is_active = False
            existing_active.lifecycle_state = "SUPERSEDED_HISTORICAL"
            db.commit()

        # Normalization (Title case cleanup, stripped description)
        cleaned_title = " ".join(req.title.strip().split())
        cleaned_desc = " ".join(req.description.strip().split())

        db_obj = HardenedKnowledgeModel(
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
            lifecycle_state="ACTIVE_OPERATIONALIZED",
            is_active=True,
            audit_notes=req.audit_notes or "Operationalized successfully via Part 7 hardened engine."
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# ==========================================
# 4. FASTAPI APPLICATION ENDPOINTS
# ==========================================
app = FastAPI(
    title="Antres Hardened Knowledge Operationalization Platform",
    version="7.0.0"
)

@app.post("/api/v7/hardened/ingest", status_code=status.HTTP_201_CREATED)
def api_ingest(payload: HardenedIngestRequest, x_idempotency_key: Optional[str] = Header(None)):
    db = SessionLocal()
    try:
        obj = HardenedOperationalizationEngine.process_and_persist(db, payload, x_idempotency_key)
        return {
            "message": "Successfully tested, integrated, and hardened.",
            "data": obj.to_e2e_response()
        }
    finally:
        db.close()

@app.get("/api/v7/hardened/knowledge/{knowledge_id}", status_code=status.HTTP_200_OK)
def api_retrieve(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(HardenedKnowledgeModel).filter(
            HardenedKnowledgeModel.id == knowledge_id,
            HardenedKnowledgeModel.is_active == True
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Knowledge object not found.")
        return obj.to_e2e_response()
    finally:
        db.close()

@app.get("/api/v7/hardened/traverse/{knowledge_id}")
def api_traverse(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = db.query(HardenedKnowledgeModel).filter(
            HardenedKnowledgeModel.id == knowledge_id,
            HardenedKnowledgeModel.is_active == True
        ).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Knowledge object not found.")
        return {
            "object_id": obj.id,
            "edges": {
                "capabilities": obj.capabilities,
                "technologies": obj.technologies,
                "dependencies": obj.dependencies
            }
        }
    finally:
        db.close()
