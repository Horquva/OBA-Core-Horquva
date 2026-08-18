"""
Reasoning & Planning Engine — the agent intelligence loop.
Owner: Muhammad Hasnain Ajmal
Part-4: Agent Reasoning, Planning & Intelligence Engineering

Loop:
Goal -> Context -> Plan -> Reason -> Evaluate -> Act/Recommend -> Observe -> Replan

This module engineers the INTELLIGENCE (planning/reasoning quality).
It does NOT own agent orchestration, tool execution, or platform
architecture — that remains Zeeshan's Future Organization Engineering
Platform. This module exposes a clean function the agent layer can call.
"""

import os
import sys
import json
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
Keep plans to 3-6 concrete steps. Confidence reflects how certain you are the plan
will achieve the goal given the context provided."""


class ReasoningEngine:
    def __init__(self, adapter: ModelAdapter = None):
        self.adapter = adapter or ModelAdapter()

    def plan(self, goal: str, context: str = "") -> Plan:
        """Goal -> Context -> Plan. Produces a structured, evaluable plan."""
        prompt = f"Goal: {goal}\nContext: {context or 'none provided'}"
        response = self.adapter.run(prompt, system=PLAN_SYSTEM_PROMPT)

        if response["error"]:
            return Plan(
                id=new_id("plan"), goal=goal, steps=[],
                confidence=0.0,
                reasoning_trace=[f"Planning failed: {response['error']}"],
            )

        parsed = self._safe_json_parse(response["text"])
        if parsed is None:
            return Plan(
                id=new_id("plan"), goal=goal, steps=[],
                confidence=0.0,
                reasoning_trace=["Failed to parse model output as JSON", response["text"][:300]],
            )

        steps = [
            PlanStep(step_id=new_id("step"), description=s.get("description", ""), action=s.get("action", ""))
            for s in parsed.get("steps", [])
        ]
        return Plan(
            id=new_id("plan"),
            goal=goal,
            steps=steps,
            confidence=float(parsed.get("confidence", 0.5)),
            reasoning_trace=parsed.get("reasoning", []),
        )

    def evaluate_plan(self, plan: Plan) -> dict:
        """
        Plan Evaluation — score a candidate plan before execution.
        Simple heuristic scorer (Part-4 baseline); can be replaced with a
        learned/model-based scorer later without changing the interface.
        """
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

        viable = len(issues) == 0
        return {"viable": viable, "issues": issues, "step_count": len(plan.steps)}

    def replan(self, original_plan: Plan, failure_reason: str) -> Plan:
        """Detect failed/invalid execution paths and generate an alternative."""
        new_context = (
            f"Previous plan failed. Reason: {failure_reason}. "
            f"Previous steps attempted: {[s.description for s in original_plan.steps]}. "
            f"Generate an alternative plan that avoids this failure."
        )
        return self.plan(original_plan.goal, context=new_context)

    @staticmethod
    def _safe_json_parse(text: str):
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


if __name__ == "__main__":
    engine = ReasoningEngine()
    plan = engine.plan(
        goal="Onboard a new AI agent into the organization's research workflow",
        context="Organization has ResearchAgent and ReviewAgent roles already defined.",
    )
    print(plan.to_json())
    print(json.dumps(engine.evaluate_plan(plan), indent=2))
