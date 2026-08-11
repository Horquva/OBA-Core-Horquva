from intelligence_registry import IntelligenceRegistry
from collections import defaultdict

class RelationshipEngine:
    """Discovers relationships between technologies based on co-occurrence in sources"""
    
    def __init__(self, registry: IntelligenceRegistry):
        self.registry = registry
        self.relationships = defaultdict(list) # tech_name -> [related_tech_names]

    def analyze_co_occurrence(self):
        # Group technologies by the sources they appear in
        source_to_techs = defaultdict(list)
        
        for tech_id, profile in self.registry.technologies.items():
            for src_id in profile.sources:
                source_to_techs[src_id].append(profile.name)
                
        # Build relationships (If tech A and tech B appear in same source, they are related)
        for src_id, techs in source_to_techs.items():
            if len(techs) > 1:
                for i in range(len(techs)):
                    for j in range(i + 1, len(techs)):
                        if techs[j] not in self.relationships[techs[i]]:
                            self.relationships[techs[i]].append(techs[j])
                        if techs[i] not in self.relationships[techs[j]]:
                            self.relationships[techs[j]].append(techs[i])
                            
        return self.relationships

    def get_related_technologies(self, tech_name: str):
        return self.relationships.get(tech_name, [])
