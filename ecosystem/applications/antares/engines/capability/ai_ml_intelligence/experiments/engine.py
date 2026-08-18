"""
Experiment Engine — executes reproducible AI/ML experiments.
Owner: Muhammad Hasnain Ajmal
Part-3: Working Intelligence Experiment Engine

Flow:
Experiment Definition -> Input/Dataset -> Model Execution -> Inference
-> Evaluation -> Metrics -> Result Record -> Comparison
"""

import os
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from intelligence.models import ExperimentConfig, ExperimentResult, ExperimentRecord, new_id, now_ts
from intelligence.model_adapter import ModelAdapter
from intelligence.evaluator import evaluate_case, aggregate_summary


RESULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")


class ExperimentEngine:
    def __init__(self, adapter: ModelAdapter = None):
        self.adapter = adapter or ModelAdapter()

    def run_experiment(self, name: str, config: ExperimentConfig, cases: list, eval_mode: str = "similarity") -> ExperimentRecord:
        """
        cases: list of {"case_id": str, "input": str, "expected": Any}
        Returns a completed ExperimentRecord with results + summary.
        """
        record = ExperimentRecord(id=new_id("exp"), name=name, config=config, status="running")

        for case in cases:
            prompt = config.prompt_template.format(input=case["input"])
            model_out = self.adapter.run(prompt)

            if model_out["error"]:
                result = ExperimentResult(
                    experiment_id=record.id,
                    case_id=case["case_id"],
                    input=case["input"],
                    output=None,
                    expected=case.get("expected"),
                    score=0.0,
                    passed=False,
                    latency_ms=model_out["latency_ms"],
                    error=model_out["error"],
                )
            else:
                eval_result = evaluate_case(model_out["text"], case.get("expected"), mode=eval_mode)
                result = ExperimentResult(
                    experiment_id=record.id,
                    case_id=case["case_id"],
                    input=case["input"],
                    output=model_out["text"],
                    expected=case.get("expected"),
                    score=eval_result["score"],
                    passed=eval_result["passed"],
                    latency_ms=model_out["latency_ms"],
                )
            record.results.append(result)

        record.summary = aggregate_summary([r.__dict__ for r in record.results])
        record.status = "completed"
        record.completed_at = now_ts()
        self._persist(record)
        return record

    def _persist(self, record: ExperimentRecord):
        os.makedirs(RESULTS_DIR, exist_ok=True)
        path = os.path.join(RESULTS_DIR, f"{record.id}.json")
        with open(path, "w") as f:
            f.write(record.to_json())
        return path


if __name__ == "__main__":
    # Smoke test — requires GEMINI_API_KEY in env to actually call the model.
    config = ExperimentConfig(
        model="gemini-2.5-flash",
        task_type="reasoning",
        prompt_template="Answer briefly: {input}",
    )
    cases = [
        {"case_id": "c1", "input": "What is 2+2?", "expected": "4"},
        {"case_id": "c2", "input": "Capital of France?", "expected": "Paris"},
    ]
    engine = ExperimentEngine()
    record = engine.run_experiment("smoke_test", config, cases, eval_mode="similarity")
    print(json.dumps(record.summary, indent=2))
