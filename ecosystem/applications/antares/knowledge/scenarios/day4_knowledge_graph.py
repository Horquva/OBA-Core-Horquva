"""
Laiba Mahboob - Knowledge Operationalization Platform
Day 4 Deliverables: Build Knowledge Graph + Retrieval Intelligence
- Relationship Engine (Machine-readable relationships: Knowledge -> Capability, Technology, Governance, Problem, Validation, Evidence, Dependency)
- Search & Retrieval Layer (Exact lookup, metadata filtering, relationship traversal, relevance ranking, provenance-aware, context-rich retrieval)
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ==========================================
# 1. KNOWLEDGE GRAPH DATABASE SCHEMA
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./antres_knowledge_graph.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class KnowledgeGraphNodeModel(Base):
    __tablename__ = "knowledge_graph_nodes"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True) # Capability, Technology, Governance, Organizational Problem
    
    # Provenance & Validation
    source_team = Column(String, nullable=False)
    author_id = Column(String, nullable=False)
    validation_status = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    ingested_at = Column(DateTime, nullable=False)
    
    # Graph Relationships (Machine-Readable Edges)
    capabilities = Column(JSON, default=list)        # Knowledge -> Capability
    technologies = Column(JSON, default=list)        # Knowledge -> Technology
    governance_patterns = Column(JSON, default=list) # Knowledge -> Governance Pattern
    organizational_problems = Column(JSON, default=list) # Knowledge -> Organizational Problem
    evidence_links = Column(JSON, default=list)      # Knowledge -> Evidence
    dependencies = Column(JSON, default=list)        # Knowledge -> Dependency
    related_knowledge = Column(JSON, default=list)   # Knowledge -> Related Knowledge
    
    # Versioning & Context
    version = Column(Integer, default=1)
    metadata_tags = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)

    def to_context_rich_object(self):
        """Returns knowledge with full contextual intelligence, not just text."""
        return {
            "node_id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "provenance_and_validation": {
                "source_team": self.source_team,
                "author_id": self.author_id,
                "validation_status": self.validation_status,
                "confidence_score": self.confidence_score,
                "ingested_at": self.ingested_at.isoformat()
            },
            "knowledge_graph_edges": {
                "related_capabilities": self.capabilities,
                "related_technologies": self.technologies,
                "governance_patterns": self.governance_patterns,
                "organizational_problems": self.organizational_problems,
                "evidence_links": self.evidence_links,
                "dependencies": self.dependencies,
                "related_knowledge": self.related_knowledge
            },
            "version_history": {
                "version": self.version,
                "is_active": self.is_active
            },
            "metadata_tags": self.metadata_tags
        }

Base.metadata.create_all(bind=engine)


# ==========================================
# 2. PYDANTIC SCHEMAS
# ==========================================
class GraphNodeCreate(BaseModel):
    id: str = Field(..., description="Unique Knowledge Node ID")
    title: str
    description: str
    category: str = Field(..., description="Capability, Technology, Governance, Organizational Problem")
    source_team: str
    author_id: str
    validation_status: str = "APPROVED"
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    capabilities: List[str] = Field(default=[], description="Linked capability IDs")
    technologies: List[str] = Field(default=[], description="Linked technology IDs")
    governance_patterns: List[str] = Field(default=[], description="Linked governance IDs")
    organizational_problems: List[str] = Field(default=[], description="Linked problem IDs")
    evidence_links: List[str] = Field(default=[], description="Linked evidence IDs")
    dependencies: List[str] = Field(default=[], description="Linked dependency IDs")
    related_knowledge: List[str] = Field(default=[], description="Linked knowledge IDs")
    version: int = 1
    metadata_tags: Dict[str, Any] = Field(default={})


# ==========================================
# 3. KNOWLEDGE GRAPH SERVICE & RETRIEVAL ENGINE
# ==========================================
class KnowledgeGraphService:
    @staticmethod
    def create_node(db: Session, data: GraphNodeCreate) -> KnowledgeGraphNodeModel:
        existing = db.query(KnowledgeGraphNodeModel).filter(KnowledgeGraphNodeModel.id == data.id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Node ID '{data.id}' already exists.")
        
        node = KnowledgeGraphNodeModel(
            id=data.id,
            title=data.title,
            description=data.description,
            category=data.category,
            source_team=data.source_team,
            author_id=data.author_id,
            validation_status=data.validation_status,
            confidence_score=data.confidence_score,
            ingested_at=datetime.now(timezone.utc),
            capabilities=data.capabilities,
            technologies=data.technologies,
            governance_patterns=data.governance_patterns,
            organizational_problems=data.organizational_problems,
            evidence_links=data.evidence_links,
            dependencies=data.dependencies,
            related_knowledge=data.related_knowledge,
            version=data.version,
            metadata_tags=data.metadata_tags,
            is_active=True
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def intelligent_search(
        db: Session,
        query: Optional[str] = None,
        category: Optional[str] = None,
        linked_capability: Optional[str] = None,
        min_confidence: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Retrieval Layer supporting: exact/keyword lookup, metadata filtering, 
        relationship-based retrieval (traversal), and relevance/confidence ranking.
        """
        q = db.query(KnowledgeGraphNodeModel).filter(KnowledgeGraphNodeModel.is_active == True)
        
        if category:
            q = q.filter(KnowledgeGraphNodeModel.category == category)
        
        if min_confidence > 0.0:
            q = q.filter(KnowledgeGraphNodeModel.confidence_score >= min_confidence)
            
        nodes = q.all()
        results = []
        
        for node in nodes:
            # Relationship-based traversal filtering
            if linked_capability and linked_capability not in node.capabilities:
                continue
            
            # Keyword / Semantic search matching in title or description
            if query:
                q_lower = query.lower()
                if q_lower not in node.title.lower() and q_lower not in node.description.lower():
                    continue
            
            results.append(node)
            
        # Relevance & Confidence Ranking (Sort by confidence score descending)
        results.sort(key=lambda x: x.confidence_score, reverse=True)
        
        return [n.to_context_rich_object() for n in results]


# ==========================================
# 4. FASTAPI INTERFACE
# ==========================================
app = FastAPI(
    title="Antres Knowledge Graph & Retrieval Intelligence Platform",
    description="Day 4 Engine: Relationship Engine + Context-Rich Retrieval & Traversal",
    version="4.0.0"
)

@app.post("/api/v4/graph/nodes", status_code=status.HTTP_201_CREATED)
def api_create_node(payload: GraphNodeCreate):
    db = SessionLocal()
    try:
        node = KnowledgeGraphService.create_node(db, payload)
        return {
            "message": "Knowledge Graph node created with machine-readable relationships.",
            "node": node.to_context_rich_object()
        }
    finally:
        db.close()

@app.get("/api/v4/graph/search")
def api_intelligent_search(
    q: Optional[str] = Query(None, description="Search keyword for title/description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    linked_capability: Optional[str] = Query(None, description="Relationship traversal filter for capability ID"),
    min_confidence: float = Query(0.0, description="Minimum confidence score ranking filter")
):
    db = SessionLocal()
    try:
        results = KnowledgeGraphService.intelligent_search(
            db=db,
            query=q,
            category=category,
            linked_capability=linked_capability,
            min_confidence=min_confidence
        )
        return {
            "query_parameters": {
                "q": q,
                "category": category,
                "linked_capability": linked_capability,
                "min_confidence": min_confidence
            },
            "total_matches": len(results),
            "results": results
        }
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
