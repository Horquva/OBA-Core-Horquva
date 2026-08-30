import json
import re
from intelligence.models import Plan, PlanStep, new_id
from intelligence.model_adapter import ModelAdapter

PLAN_SYSTEM_PROMPT = """You are a planning engine inside an organizational AI system.
Given a goal and context, produce a structured JSON plan. Respond ONLY with JSON,
no preamble, no markdown fences. Schema:
{
  "steps": [{"description": "...", "action": "..."}],
  "confidence": 0.0-1.0,
  "reasoning": ["short reasoning point", "..."]
}
Keep plans to 3-6 concrete steps."""


class ReasoningEngine:
    def __init__(self, adapter: ModelAdapter = None):
        self.adapter = adapter or ModelAdapter()

    def plan(self, goal: str, context: str = "") -> Plan:
        prompt = f"Goal: {goal}\nContext: {context or 'none provided'}"
        response = self.adapter.run(prompt, system=PLAN_SYSTEM_PROMPT)
        if response["error"]:
            return Plan(id=new_id("plan"), goal=goal, steps=[], confidence=0.0,
                        reasoning_trace=[f"Planning failed: {response['error']}"])
        parsed = self._safe_json_parse(response["text"])
        if parsed is None:
            return Plan(id=new_id("plan"), goal=goal, steps=[], confidence=0.0,
                        reasoning_trace=["Failed to parse model output as JSON"])
        steps = [PlanStep(step_id=new_id("step"), description=s.get("description", ""), action=s.get("action", ""))
                 for s in parsed.get("steps", [])]
        return Plan(id=new_id("plan"), goal=goal, steps=steps,
                    confidence=float(parsed.get("confidence", 0.5)),
                    reasoning_trace=parsed.get("reasoning", []))

    def evaluate_plan(self, plan: Plan) -> dict:
        if not plan.steps:
            return {"viable": False, "reason": "empty plan"}
        issues = []
        if plan.confidence < 0.4:
            issues.append("low model confidence")
        if len(plan.steps) > 8:
            issues.append("plan too complex, consider decomposition")
        vague = [s for s in plan.steps if len(s.description.strip()) < 5]
        if vague:
            issues.append(f"{len(vague)} step(s) too vague")
        return {"viable": len(issues) == 0, "issues": issues, "step_count": len(plan.steps)}

    def replan(self, plan: Plan, failure_reason: str) -> Plan:
        """
        BUGFIX (Kamil, review pass): PART1_REALITY_BASELINE.md and README.md
        both claimed replan() was "IMPLEMENTED, RUNNABLE, UNTESTED" -- but no
        such method existed anywhere in this file. That was a real
        doc-vs-code mismatch (the doc's own honesty rule -- "nothing is
        claimed that hasn't been executed and observed" -- was violated by
        this one row). Implemented for real here: takes the failed plan and
        the reason evaluate_plan() rejected it, asks the model to produce a
        corrected plan, and returns a fresh Plan object the same way plan()
        does. Now backed by real unit tests (see tests/test_intelligence.py).
        """
        prompt = (
            f"Goal: {plan.goal}\n"
            f"Previous plan (rejected): {[s.description for s in plan.steps]}\n"
            f"Rejection reason: {failure_reason}\n"
            f"Produce a corrected plan that fixes this specific problem."
        )
        response = self.adapter.run(prompt, system=PLAN_SYSTEM_PROMPT)
        if response["error"]:
            return Plan(id=new_id("plan"), goal=plan.goal, steps=[], confidence=0.0,
                        reasoning_trace=[f"Replanning failed: {response['error']}"])
        parsed = self._safe_json_parse(response["text"])
        if parsed is None:
            return Plan(id=new_id("plan"), goal=plan.goal, steps=[], confidence=0.0,
                        reasoning_trace=["Failed to parse replan model output as JSON"])
        steps = [PlanStep(step_id=new_id("step"), description=s.get("description", ""), action=s.get("action", ""))
                 for s in parsed.get("steps", [])]
        return Plan(id=new_id("plan"), goal=plan.goal, steps=steps,
                    confidence=float(parsed.get("confidence", 0.5)),
                    reasoning_trace=[f"Replanned after: {failure_reason}"] + parsed.get("reasoning", []))

    @staticmethod
    def _safe_json_parse(text):
        if not text:
            return None
        text = text.strip()
        text = re.sub(r"^```(json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    return None
            return None
