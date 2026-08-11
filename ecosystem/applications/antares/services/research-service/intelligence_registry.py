from models import TechnologyProfile
from typing import Dict

class IntelligenceRegistry:
    """Persistent memory for technology profiles (In-memory for now, DB later)"""
    def __init__(self):
        self.technologies: Dict[str, TechnologyProfile] = {}

    def upsert_technology(self, profile: TechnologyProfile):
        if profile.tech_id in self.technologies:
            existing = self.technologies[profile.tech_id]
            
            # Merge Evidence (Duplicate detection)
            existing_evidence_ids = {e.evidence_id for e in existing.evidence}
            for ev in profile.evidence:
                if ev.evidence_id not in existing_evidence_ids:
                    existing.evidence.append(ev)
                    
            # Merge Sources
            for src in profile.sources:
                if src not in existing.sources:
                    existing.sources.append(src)
                    
            print(f"🔄 [Merged] Added new evidence to existing profile: {profile.name}")
        else:
            self.technologies[profile.tech_id] = profile
            print(f"✨ [New] Registered new technology: {profile.name}")
            
    def get_all(self):
        return list(self.technologies.values())
