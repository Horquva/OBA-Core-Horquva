"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 2 Deliverables: Backend Foundation (Locked Antres Architecture)
- SQLAlchemy Database Models (Persistence Layer)
- Pydantic Validation Schemas
- Service Layer (Business Logic & Ingestion/Retrieval)
- FastAPI Endpoints (Basic Ingestion & Retrieval APIs)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ==========================================
# 1. PERSISTENCE LAYER (SQLAlchemy Database Setup)
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./antres_knowledge.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class KnowledgeObjectModel(Base):
    __tablename__ = "knowledge_objects"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    
    # Source & Provenance
    source_team = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    ingested_at = Column(DateTime, nullable=False)
    
    # Validation Reference
    is_validated = Column(Boolean, default=True)
    validated_by = Column(String, nullable=False)
    validation_status = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    constitutional_check_passed = Column(Boolean, default=True)
    
    # Relationships & Metadata (Stored as JSON for flexibility)
    related_capabilities = Column(JSON, default=list)
    related_technologies = Column(JSON, default=list)
    metadata_tags = Column(JSON, default=dict)
    
    # Versioning
    version = Column(Integer, default=1)
    previous_version_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    def to_response_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "source": {
                "source_team": self.source_team,
                "author_id": self.author_id,
                "source_reference_id": self.source_reference_id
            },
            "validation": {
                "validated_by": self.validated_by,
                "validation_status": self.validation_status,
                "confidence_score": self.confidence_score,
                "constitutional_check_passed": self.constitutional_check_passed
            },
            "related_capabilities": self.related_capabilities or [],
            "related_technologies": self.related_technologies or [],
            "metadata_tags": self.metadata_tags or {},
            "version": self.version,
            "previous_version_id": self.previous_version_id,
            "ingested_at": self.ingested_at,
            "is_active": self.is_active
        }

# Create database tables
Base.metadata.create_all(bind=engine)


# ==========================================
# 2. PYDANTIC SCHEMAS (Validation & API Contracts)
# ==========================================
class KnowledgeSourceSchema(BaseModel):
    source_team: str = Field(..., description="e.g., Capability Validation (Zara)")
    author_id: str = Field(..., description="ID or name of validator")
    source_reference_id: str = Field(..., description="External ref ID")

class ValidationReferenceSchema(BaseModel):
    validated_by: str = Field(..., description="Governance/Validation team member")
    validation_status: str = Field(..., description="APPROVED, CONDITIONAL, PENDING_REVIEW")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    constitutional_check_passed: bool = True

class KnowledgeObjectCreate(BaseModel):
    id: str = Field(..., description="Unique Knowledge Object ID")
    title: str
    description: str
    category: str
    source: KnowledgeSourceSchema
    validation: ValidationReferenceSchema
    related_capabilities: List[str] = []
    related_technologies: List[str] = []
    metadata_tags: Dict[str, Any] = {}
    version: int = 1
    previous_version_id: Optional[str] = None

class KnowledgeObjectResponse(KnowledgeObjectCreate):
    ingested_at: datetime
    is_active: bool


# ==========================================
# 3. SERVICE LAYER (Business Logic)
# ==========================================
class KnowledgeService:
    @staticmethod
    def ingest_knowledge(db: Session, data: KnowledgeObjectCreate) -> dict:
        # Integrity Safeguard: unapproved or unconstitutional knowledge must never be
        # accidentally persisted as validated/active operational knowledge.
        if not data.validation.constitutional_check_passed or data.validation.validation_status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity Safeguard Block: Unvalidated or unconstitutional knowledge cannot be operationalized."
            )

        existing = db.query(KnowledgeObjectModel).filter(KnowledgeObjectModel.id == data.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Knowledge Object with ID '{data.id}' already exists. Use versioning for updates."
            )
        
        db_obj = KnowledgeObjectModel(
            id=data.id,
            title=data.title,
            description=data.description,
            category=data.category,
            source_team=data.source.source_team,
            author_id=data.source.author_id,
            source_reference_id=data.source.source_reference_id,
            ingested_at=datetime.now(timezone.utc),
            is_validated=True,
            validated_by=data.validation.validated_by,
            validation_status=data.validation.validation_status,
            confidence_score=data.validation.confidence_score,
            constitutional_check_passed=data.validation.constitutional_check_passed,
            related_capabilities=data.related_capabilities,
            related_technologies=data.related_technologies,
            metadata_tags=data.metadata_tags,
            version=data.version,
            previous_version_id=data.previous_version_id,
            is_active=True
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj.to_response_dict()

    @staticmethod
    def get_knowledge(db: Session, knowledge_id: str) -> Optional[dict]:
        obj = db.query(KnowledgeObjectModel).filter(KnowledgeObjectModel.id == knowledge_id).first()
        return obj.to_response_dict() if obj else None

    @staticmethod
    def list_knowledge(db: Session, skip: int = 0, limit: int = 100) -> List[dict]:
        objs = db.query(KnowledgeObjectModel).filter(KnowledgeObjectModel.is_active == True).offset(skip).limit(limit).all()
        return [obj.to_response_dict() for obj in objs]


# ==========================================
# 4. FASTAPI INTERFACE (Ingestion & Retrieval APIs)
# ==========================================
app = FastAPI(
    title="Antres Knowledge Operationalization Platform",
    description="Backend Foundation APIs for Ingesting and Retrieving Operational Knowledge Objects.",
    version="1.0.0"
)

@app.post("/api/v1/knowledge", response_model=KnowledgeObjectResponse, status_code=status.HTTP_201_CREATED)
def api_ingest_knowledge(payload: KnowledgeObjectCreate):
    db = SessionLocal()
    try:
        return KnowledgeService.ingest_knowledge(db, payload)
    finally:
        db.close()

@app.get("/api/v1/knowledge/{knowledge_id}", response_model=KnowledgeObjectResponse)
def api_get_knowledge(knowledge_id: str):
    db = SessionLocal()
    try:
        obj = KnowledgeService.get_knowledge(db, knowledge_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Knowledge Object not found")
        return obj
    finally:
        db.close()

@app.get("/api/v1/knowledge", response_model=List[KnowledgeObjectResponse])
def api_list_knowledge(skip: int = 0, limit: int = 100):
    db = SessionLocal()
    try:
        return KnowledgeService.list_knowledge(db, skip=skip, limit=limit)
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    print("Starting Antres Backend Foundation Server on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
