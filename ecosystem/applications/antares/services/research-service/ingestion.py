from models import SourceRecord, EvidenceRecord, TechnologyProfile, MaturityState
from datetime import datetime, timezone

class TechnologyIntelligenceEngine:
    def __init__(self):
        self.sources = {}
        self.technologies = {}

    def register_source(self, source: SourceRecord):
        self.sources[source.source_id] = source
        return source.source_id

    def ingest_technology_signal(self, tech_name: str, domain: str, description: str, source_id: str, evidence_text: str, confidence: float):
        if source_id not in self.sources:
            raise ValueError("Source not registered.")
        
        evidence = EvidenceRecord(
            source_id=source_id,
            extracted_text=evidence_text,
            confidence_score=confidence
        )
        
        if tech_name in self.technologies:
            profile = self.technologies[tech_name]
            profile.evidence.append(evidence)
            if source_id not in profile.sources:
                profile.sources.append(source_id)
            profile.updated_at = datetime.now(timezone.utc)
        else:
            profile = TechnologyProfile(
                name=tech_name,
                domain=domain,
                description=description,
                maturity_state=MaturityState.EMERGING,
                evidence=[evidence],
                sources=[source_id]
            )
            self.technologies[tech_name] = profile
            
        return profile

    def retrieve_intelligence(self, tech_name: str):
        return self.technologies.get(tech_name, None)
