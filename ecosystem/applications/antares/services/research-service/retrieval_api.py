from intelligence_registry import IntelligenceRegistry
from relationship_engine import RelationshipEngine
from llm_client import GeminiClient

class TechnologyIntelligenceAPI:
    def __init__(self, registry: IntelligenceRegistry, llm_client: GeminiClient):
        self.registry = registry
        self.relationship_engine = RelationshipEngine(registry, llm_client)
        self.relationship_engine.analyze_co_occurrence()

    def get_full_intelligence_report(self, tech_name: str):
        target_profile = next((p for p in self.registry.technologies.values() if p.name.lower() == tech_name.lower()), None)
        if not target_profile: return {"error": "Technology not found", "tech_name": tech_name}

        return {
            "technology": target_profile.name, "domain": target_profile.domain,
            "maturity_state": target_profile.maturity_state.value,
            "evidence_count": len(target_profile.evidence), "source_count": len(target_profile.sources),
            "evolution_events": len(target_profile.evolution_history),
            "related_technologies": self.relationship_engine.get_related_technologies(target_profile.name),
            "latest_evidence": target_profile.evidence[-1].extracted_text if target_profile.evidence else None
        }
