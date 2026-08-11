from intelligence_registry import IntelligenceRegistry
from relationship_engine import RelationshipEngine

class TechnologyIntelligenceAPI:
    """
    The API layer that downstream platforms (Zara, Muzammel, etc.) will use 
    to consume structured technology intelligence.
    """
    def __init__(self, registry: IntelligenceRegistry):
        self.registry = registry
        self.relationship_engine = RelationshipEngine(registry)
        self.relationship_engine.analyze_co_occurrence()

    def get_full_intelligence_report(self, tech_name: str):
        # Search by name (case-insensitive)
        target_profile = None
        for profile in self.registry.technologies.values():
            if profile.name.lower() == tech_name.lower():
                target_profile = profile
                break
                
        if not target_profile:
            return {"error": "Technology not found", "tech_name": tech_name}

        related_techs = self.relationship_engine.get_related_technologies(target_profile.name)
        
        return {
            "technology": target_profile.name,
            "domain": target_profile.domain,
            "maturity_state": target_profile.maturity_state.value,
            "evidence_count": len(target_profile.evidence),
            "source_count": len(target_profile.sources),
            "related_technologies": related_techs,
            "latest_evidence": target_profile.evidence[-1].extracted_text if target_profile.evidence else None
        }
