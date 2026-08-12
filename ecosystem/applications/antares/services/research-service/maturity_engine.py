from intelligence_registry import IntelligenceRegistry
from models import MaturityState, EventType
from typing import Dict, List
import logging

logger = logging.getLogger("antares.maturity")

class MaturityEngine:
    def evaluate_maturity(self, registry: IntelligenceRegistry) -> Dict[str, MaturityState]:
        radar = {}
        for tech_id, profile in registry.technologies.items():
            score = 0.0
            for event in profile.evolution_history:
                if event.event_type == EventType.EMERGENCE: score += 2.0
                elif event.event_type == EventType.ADOPTION_SIGNAL: score += 1.5
                elif event.event_type == EventType.MAJOR_RELEASE: score += 3.0
                elif event.event_type == EventType.ECOSYSTEM_GROWTH: score += 2.5
                score += (event.impact_score * 0.5)
            score += len(profile.sources) * 0.5

            if score >= 10.0: state = MaturityState.ESTABLISHED
            elif score >= 6.0: state = MaturityState.MATURING
            elif score >= 3.0: state = MaturityState.DEVELOPING
            else: state = MaturityState.EMERGING
                
            radar[profile.name] = state
            profile.maturity_state = state
            logger.info(f"[Maturity] {profile.name} scored {score:.1f} -> {state.value}")
        return radar

    def generate_technology_radar(self, registry: IntelligenceRegistry) -> Dict[str, List[str]]:
        radar_categories = {"Adopt (Established)": [], "Trial (Maturing)": [], "Assess (Developing)": [], "Hold/Monitor (Emerging)": []}
        for tech_name, state in self.evaluate_maturity(registry).items():
            if state == MaturityState.ESTABLISHED: radar_categories["Adopt (Established)"].append(tech_name)
            elif state == MaturityState.MATURING: radar_categories["Trial (Maturing)"].append(tech_name)
            elif state == MaturityState.DEVELOPING: radar_categories["Assess (Developing)"].append(tech_name)
            else: radar_categories["Hold/Monitor (Emerging)"].append(tech_name)
        return radar_categories
