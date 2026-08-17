"""
Intelligence Capability Registry
Owner: Muhammad Hasnain Ajmal
Part-6: Capability Intelligence & Antares Engine Integration

This is the clean interface through which Zeeshan's Agent layer (or any
other Antares platform) discovers and consumes validated AI/ML
capabilities. Only capabilities that pass evaluation are "promoted" and
eligible for downstream use.
"""

import os
import json

from intelligence.models import IntelligenceCapability, new_id


REGISTRY_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results", "capability_registry.json")


class CapabilityRegistry:
    def __init__(self, path: str = REGISTRY_PATH):
        self.path = path
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path) as f:
                self._data = json.load(f)
        else:
            self._data = {}

    def _save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w") as f:
            json.dump(self._data, f, indent=2)

    def register(self, capability: IntelligenceCapability):
        self._data[capability.id] = capability.__dict__
        self._save()
        return capability.id

    def promote(self, capability_id: str, evaluation_summary: dict, pass_threshold: float = 0.6):
        """
        Capability Evaluation Gate — only capabilities meeting the threshold
        become eligible for agent-layer use.
        """
        cap = self._data.get(capability_id)
        if not cap:
            raise ValueError(f"Unknown capability: {capability_id}")

        avg_score = evaluation_summary.get("avg_score") or 0
        cap["performance"] = evaluation_summary
        if avg_score >= pass_threshold:
            cap["evaluation_status"] = "passing"
            cap["promoted"] = True
        else:
            cap["evaluation_status"] = "failing"
            cap["promoted"] = False
        self._save()
        return cap

    def get_promoted(self, task_type: str = None):
        """What the Agent layer calls to discover usable capabilities."""
        results = [c for c in self._data.values() if c.get("promoted")]
        if task_type:
            results = [c for c in results if task_type in c.get("task_types", [])]
        return results

    def get(self, capability_id: str):
        return self._data.get(capability_id)

    def list_all(self):
        return list(self._data.values())


if __name__ == "__main__":
    reg = CapabilityRegistry()
    cap = IntelligenceCapability(
        id=new_id("cap"),
        name="goal_planning_v1",
        task_types=["planning", "reasoning"],
        model_ref="gemini-2.5-flash",
        evaluation_status="unevaluated",
    )
    reg.register(cap)
    reg.promote(cap.id, {"avg_score": 0.82, "pass_rate": 0.9, "avg_latency_ms": 900})
    print(json.dumps(reg.get_promoted(), indent=2))
