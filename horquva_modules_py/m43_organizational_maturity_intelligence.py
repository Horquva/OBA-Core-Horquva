"""
M43 — Organizational Maturity Intelligence
Constitutional Question: "How mature is the organization?"
Purpose: Assess organizational maturity across governance, operations,
         technology, knowledge, and leadership.

Owner: Tahir — Prediction Layer
"""

from typing import List, Dict, Any, Optional

MATURITY_PILLARS = ["governance", "operations", "technology", "knowledge", "leadership"]

MATURITY_LEVELS = [
    {"level": 1, "name": "Initial", "min": 0, "max": 1.5},
    {"level": 2, "name": "Developing", "min": 1.5, "max": 2.5},
    {"level": 3, "name": "Defined", "min": 2.5, "max": 3.5},
    {"level": 4, "name": "Managed", "min": 3.5, "max": 4.5},
    {"level": 5, "name": "Optimizing", "min": 4.5, "max": 5.01},
]

_PLAYBOOK = {
    "governance": "Formalize decision rights, policies, and accountability structures.",
    "operations": "Standardize repeatable processes and reduce ad-hoc execution.",
    "technology": "Invest in tooling, automation, and technical debt reduction.",
    "knowledge": "Build systematic knowledge capture and sharing mechanisms.",
    "leadership": "Strengthen leadership development and succession planning.",
}


def level_for(score: float) -> Dict[str, Any]:
    for lvl in MATURITY_LEVELS:
        if lvl["min"] <= score < lvl["max"]:
            return lvl
    return MATURITY_LEVELS[0]


def assess_maturity(pillar_scores: Dict[str, float]) -> Dict[str, Any]:
    pillars = []
    for pillar in MATURITY_PILLARS:
        score = pillar_scores.get(pillar)
        if not isinstance(score, (int, float)):
            pillars.append({"pillar": pillar, "score": None, "level": None})
            continue
        lvl = level_for(score)
        pillars.append({"pillar": pillar, "score": score, "level": lvl["level"], "levelName": lvl["name"]})

    scored = [p for p in pillars if p["score"] is not None]
    overall_score = round(sum(p["score"] for p in scored) / len(scored), 2) if scored else None
    overall_level = level_for(overall_score) if overall_score is not None else None

    weakest = sorted(scored, key=lambda p: p["score"])[:2]
    strongest = sorted(scored, key=lambda p: p["score"], reverse=True)[:2]

    return {
        "pillars": pillars,
        "overallScore": overall_score,
        "overallLevel": {"level": overall_level["level"], "name": overall_level["name"]} if overall_level else None,
        "weakestPillars": weakest,
        "strongestPillars": strongest,
        "recommendations": [{"pillar": p["pillar"], "recommendation": _PLAYBOOK[p["pillar"]]} for p in weakest],
    }


def track_maturity_trend(assessments_oldest_first: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Track maturity across multiple assessment periods to show growth trajectory."""
    timeline = [{"date": a["date"], **assess_maturity(a["pillarScores"])} for a in assessments_oldest_first]

    trajectory = "insufficient-data"
    if len(timeline) >= 2:
        first = timeline[0]["overallScore"] or 0
        last = timeline[-1]["overallScore"] or 0
        trajectory = "maturing" if last > first else "regressing" if last < first else "flat"

    return {"timeline": timeline, "trajectory": trajectory}
