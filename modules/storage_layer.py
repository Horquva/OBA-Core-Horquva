import json
import os
from datetime import datetime
from typing import Any


class IntelligenceStorage:
    def __init__(self, base_path: str = "data/intelligence"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)

    def _pillar_path(self, pillar: str) -> str:
        path = os.path.join(self.base_path, pillar)
        os.makedirs(path, exist_ok=True)
        return path

    def save_analysis(self, pillar: str, data: dict[str, Any], filename: str = "latest.json"):
        path = os.path.join(self._pillar_path(pillar), filename)
        data["_meta"] = {
            "timestamp": datetime.now().isoformat(),
            "pillar": pillar,
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)
        return path

    def load_analysis(self, pillar: str, filename: str = "latest.json") -> dict[str, Any] | None:
        path = os.path.join(self._pillar_path(pillar), filename)
        if not os.path.exists(path):
            return None
        with open(path) as f:
            return json.load(f)

    def save_governance_score(self, score: int, company: str):
        return self.save_analysis("governance", {
            "company": company,
            "governance_score": score,
        }, "governance_score.json")

    def save_accountability_map(self, links: list[dict], company: str):
        return self.save_analysis("accountability", {
            "company": company,
            "links": links,
        }, "accountability_map.json")

    def load_intelligence_index(self) -> dict[str, Any]:
        index_path = os.path.join(self.base_path, "index.json")
        if os.path.exists(index_path):
            with open(index_path) as f:
                return json.load(f)
        return {"pillars": {}, "last_updated": None}

    def update_intelligence_index(self, pillar: str, metadata: dict[str, Any]):
        index = self.load_intelligence_index()
        index["pillars"][pillar] = {
            **metadata,
            "updated_at": datetime.now().isoformat(),
        }
        index["last_updated"] = datetime.now().isoformat()
        index_path = os.path.join(self.base_path, "index.json")
        with open(index_path, "w") as f:
            json.dump(index, f, indent=2, default=str)
