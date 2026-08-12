from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class MaturityState(str, Enum):
    EMERGING = "Emerging"
    DEVELOPING = "Developing"
    MATURING = "Maturing"
    ESTABLISHED = "Established"
    DECLINING = "Declining"

class EventType(str, Enum):
    EMERGENCE = "Emergence"
    MILESTONE = "Milestone"
    MAJOR_RELEASE = "Major Release"
    ADOPTION_SIGNAL = "Adoption Signal"
    ECOSYSTEM_GROWTH = "Ecosystem Growth"
    RESEARCH_BREAKTHROUGH = "Research Breakthrough"

class ConfidenceMetadata(BaseModel):
    """Detailed confidence and variance tracking for AI/ML inferences (Part-2 & Part-7)"""
    score: float = Field(ge=0.0, le=1.0, description="Base confidence score")
    variance: float = Field(default=0.0, ge=0.0, description="Statistical variance/uncertainty")
    sample_size: int = Field(default=1, ge=1, description="Number of evidence points supporting this")
    calibration_source: str = Field(default="heuristic", description="Source of confidence (e.g., llm, heuristic, ensemble)")

class EvolutionEvent(BaseModel):
    """Tracks technology evolution: Evidence -> Event -> Interpretation -> Maturity (Part-4)"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    description: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_refs: List[str] = [] 
    impact_score: float = Field(default=0.5, ge=0.0, le=1.0)
    llm_interpretation: Optional[str] = None

class SourceRecord(BaseModel):
    source_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    title: str
    author: Optional[str] = None
    publish_date: datetime
    credibility_score: float = Field(ge=0.0, le=1.0)
    raw_content: str

class EvidenceRecord(BaseModel):
    evidence_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str
    extracted_text: str
    # Upgraded from simple float to full ConfidenceMetadata
    confidence: ConfidenceMetadata 
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TechnologyProfile(BaseModel):
    tech_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str
    description: str
    maturity_state: MaturityState = MaturityState.EMERGING
    evidence: List[EvidenceRecord] = []
    sources: List[str] = []
    # New fields for Part-4 & Part-5
    evolution_history: List[EvolutionEvent] = []
    overall_confidence: ConfidenceMetadata = Field(default_factory=lambda: ConfidenceMetadata(score=0.5, variance=0.2, calibration_source="initial"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
