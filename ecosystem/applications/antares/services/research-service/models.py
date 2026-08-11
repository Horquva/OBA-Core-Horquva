from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

class MaturityState(str, Enum):
    EMERGING = "Emerging"
    DEVELOPING = "Developing"
    MATURING = "Maturing"
    ESTABLISHED = "Established"
    DECLINING = "Declining"

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
    confidence_score: float = Field(ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TechnologyProfile(BaseModel):
    tech_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str
    description: str
    maturity_state: MaturityState = MaturityState.EMERGING
    evidence: List[EvidenceRecord] = []
    sources: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
