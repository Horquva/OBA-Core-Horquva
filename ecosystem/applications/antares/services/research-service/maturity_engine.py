from intelligence_registry import IntelligenceRegistry
from models import MaturityState
from typing import Dict, List

class MaturityEngine:
    """Calculates technology maturity based on evidence and source count (Data-Driven)"""
    
    def evaluate_maturity(self, registry: IntelligenceRegistry) -> Dict[str, MaturityState]:
        radar = {}
        for tech_id, profile in registry.technologies.items():
            # Heuristics for maturity (Rule-based AI Mock)
            source_count = len(profile.sources)
            evidence_count = len(profile.evidence)
            
            # Simple scoring logic based on evidence weight
            score = (source_count * 2) + evidence_count
            
            if score >= 6:
                state = MaturityState.ESTABLISHED
            elif score >= 4:
                state = MaturityState.MATURING
            elif score >= 2:
                state = MaturityState.DEVELOPING
            else:
                state = MaturityState.EMERGING
                
            radar[profile.name] = state
            # Update profile state dynamically
            profile.maturity_state = state
            
        return radar

    def generate_technology_radar(self, registry: IntelligenceRegistry) -> Dict[str, List[str]]:
        """Generates a data-driven Technology Radar categorized by maturity"""
        radar_categories = {
            "Adopt (Established)": [],
            "Trial (Maturing)": [],
            "Assess (Developing)": [],
            "Hold/Monitor (Emerging)": []
        }
        
        maturity_map = self.evaluate_maturity(registry)
        
        for tech_name, state in maturity_map.items():
            if state == MaturityState.ESTABLISHED:
                radar_categories["Adopt (Established)"].append(tech_name)
            elif state == MaturityState.MATURING:
                radar_categories["Trial (Maturing)"].append(tech_name)
            elif state == MaturityState.DEVELOPING:
                radar_categories["Assess (Developing)"].append(tech_name)
            else:
                radar_categories["Hold/Monitor (Emerging)"].append(tech_name)
                
        return radar_categories
