from intelligence_registry import IntelligenceRegistry
from llm_client import GeminiClient
from collections import defaultdict
import logging

logger = logging.getLogger("antares.relationships")

class RelationshipEngine:
    def __init__(self, registry: IntelligenceRegistry, llm_client: GeminiClient, semantic_threshold: float = 0.80):
        self.registry = registry
        self.llm = llm_client
        self.semantic_threshold = semantic_threshold
        self.relationships = defaultdict(list)

    def analyze_co_occurrence(self):
        source_to_techs = defaultdict(list)
        for profile in self.registry.technologies.values():
            for src_id in profile.sources: source_to_techs[src_id].append(profile.name)
                
        for techs in source_to_techs.values():
            if len(techs) > 1:
                for i in range(len(techs)):
                    for j in range(i + 1, len(techs)):
                        if techs[j] not in self.relationships[techs[i]]: self.relationships[techs[i]].append(techs[j])
                        if techs[i] not in self.relationships[techs[j]]: self.relationships[techs[j]].append(techs[i])
                            
        tech_names = [p.name for p in self.registry.technologies.values()]
        if len(tech_names) > 1:
            vectors = self.llm.embed(tech_names)
            if vectors and len(vectors) == len(tech_names):
                for i in range(len(tech_names)):
                    for j in range(i + 1, len(tech_names)):
                        sim = self.llm.cosine_similarity(vectors[i], vectors[j])
                        if sim >= self.semantic_threshold:
                            if tech_names[j] not in self.relationships[tech_names[i]]:
                                self.relationships[tech_names[i]].append(tech_names[j])
                                logger.info(f"[Semantic Rel] {tech_names[i]} <-> {tech_names[j]} (sim: {sim:.2f})")
                            if tech_names[i] not in self.relationships[tech_names[j]]:
                                self.relationships[tech_names[j]].append(tech_names[i])
        return self.relationships

    def get_related_technologies(self, tech_name: str):
        return self.relationships.get(tech_name, [])
