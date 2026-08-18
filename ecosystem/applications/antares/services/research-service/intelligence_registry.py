import json
import os
from models import TechnologyProfile
from typing import Dict, List

STATE_FILE = "registry_state.json"

class IntelligenceRegistry:
    def __init__(self):
        self.technologies: Dict[str, TechnologyProfile] = {}
        self._load_state()

    def _load_state(self):
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                data = json.load(f)
                for tech_id, tech_data in data.items():
                    self.technologies[tech_id] = TechnologyProfile(**tech_data)
            print(f"[Registry] Loaded {len(self.technologies)} technologies from persistent storage.")

    def _save_state(self):
        data = {tech_id: profile.model_dump() for tech_id, profile in self.technologies.items()}
        with open(STATE_FILE, "w") as f:
            json.dump(data, f, indent=2, default=str)

    def upsert_technology(self, profile: TechnologyProfile):
        is_new = profile.tech_id not in self.technologies
        if not is_new:
            existing = self.technologies[profile.tech_id]
            existing_evidence_ids = {e.evidence_id for e in existing.evidence}
            for ev in profile.evidence:
                if ev.evidence_id not in existing_evidence_ids: existing.evidence.append(ev)
            for src in profile.sources:
                if src not in existing.sources: existing.sources.append(src)
            existing_event_ids = {e.event_id for e in existing.evolution_history}
            for evt in profile.evolution_history:
                if evt.event_id not in existing_event_ids: existing.evolution_history.append(evt)
            print(f"[Merged] Updated profile: {profile.name}")
        else:
            self.technologies[profile.tech_id] = profile
            print(f"[New] Registered: {profile.name}")
        self._save_state()
            
    def get_all(self) -> List[TechnologyProfile]:
        return list(self.technologies.values())
