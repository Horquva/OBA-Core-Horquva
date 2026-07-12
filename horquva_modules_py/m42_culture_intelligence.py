"""
M42 — Culture Intelligence
Constitutional Question: "What organizational culture exists?"
Purpose: Measure collaboration, communication, innovation, and cultural
         evolution over time.

Owner: Tahir — Prediction Layer
"""

from typing import List, Dict, Any

CULTURE_DIMENSIONS = ["collaboration", "communication", "innovation", "trust", "psychologicalSafety"]


def score_culture(responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not responses:
        return {"sampleSize": 0, "dimensions": {}, "overallScore": None}

    dimensions = {}
    for dim in CULTURE_DIMENSIONS:
        values = [r[dim] for r in responses if isinstance(r.get(dim), (int, float))]
        dimensions[dim] = round(sum(values) / len(values), 2) if values else None

    valid_scores = [v for v in dimensions.values() if v is not None]
    overall_score = round(sum(valid_scores) / len(CULTURE_DIMENSIONS), 2) if valid_scores else None

    return {"sampleSize": len(responses), "dimensions": dimensions, "overallScore": overall_score}


def score_culture_by_team(responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Break scores down per team so leaders can see relative culture health."""
    by_team: Dict[str, List[Dict[str, Any]]] = {}
    for r in responses:
        by_team.setdefault(r["team"], []).append(r)

    results = [{"team": team, **score_culture(team_responses)} for team, team_responses in by_team.items()]
    results.sort(key=lambda r: r["overallScore"] or 0, reverse=True)
    return results


def track_culture_trend(responses_oldest_first: List[Dict[str, Any]], bucket_by_month: bool = True) -> Dict[str, Any]:
    """Track culture evolution across time-ordered survey rounds."""
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for r in responses_oldest_first:
        key = r["submittedAt"][:7] if bucket_by_month else r["submittedAt"]
        buckets.setdefault(key, []).append(r)

    trend = [
        {"period": period, **score_culture(responses)}
        for period, responses in sorted(buckets.items())
    ]

    direction = "insufficient-data"
    if len(trend) >= 2:
        delta = (trend[-1]["overallScore"] or 0) - (trend[0]["overallScore"] or 0)
        direction = "improving" if delta > 0.15 else "declining" if delta < -0.15 else "stable"

    return {"trend": trend, "direction": direction}
