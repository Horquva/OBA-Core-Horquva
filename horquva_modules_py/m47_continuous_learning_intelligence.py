"""
M47 — Continuous Learning Intelligence
Constitutional Question: "How can the Organizational Brain improve itself?"
Purpose: Feed validated lessons back into the Organizational Brain to
         improve future reasoning and prediction quality.

Owner: Tahir — Learning Layer
"""

from datetime import datetime
from typing import List, Dict, Any


def evaluate_prediction_accuracy(outcomes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Measure prediction accuracy per module."""
    by_module: Dict[str, List[Dict[str, Any]]] = {}
    for o in outcomes:
        by_module.setdefault(o["moduleId"], []).append(o)

    results = []
    for module_id, entries in by_module.items():
        errors = [abs(e["predictedValue"] - e["actualValue"]) for e in entries]
        mean_abs_error = sum(errors) / len(errors)
        actuals_avg = sum(e["actualValue"] for e in entries) / len(entries) or 1
        normalized_error = mean_abs_error / actuals_avg
        accuracy_score = round(max(0, 1 - normalized_error), 3)

        results.append({
            "moduleId": module_id,
            "sampleSize": len(entries),
            "meanAbsoluteError": round(mean_abs_error, 3),
            "accuracyScore": accuracy_score,
            "trustLevel": "high" if accuracy_score > 0.8 else "medium" if accuracy_score > 0.5 else "low",
        })

    results.sort(key=lambda r: r["accuracyScore"], reverse=True)
    return results


def validate_lessons(candidate_lessons: List[Dict[str, Any]], confidence_threshold: float = 0.6) -> Dict[str, List[Dict[str, Any]]]:
    """Validate raw lessons against a confidence threshold and cross-module corroboration."""
    by_description: Dict[str, List[Dict[str, Any]]] = {}
    for l in candidate_lessons:
        key = l["description"].lower().strip()
        by_description.setdefault(key, []).append(l)

    validated, pending, rejected = [], [], []

    for group in by_description.values():
        avg_confidence = sum(l["confidence"] for l in group) / len(group)
        corroborated = len(group) > 1
        final_confidence = round(min(1, avg_confidence + (0.1 if corroborated else 0)), 3)

        lesson = {
            "description": group[0]["description"],
            "moduleSources": list({l["moduleId"] for l in group}),
            "corroborated": corroborated,
            "finalConfidence": final_confidence,
        }

        if final_confidence >= confidence_threshold:
            validated.append({**lesson, "status": "validated"})
        elif final_confidence >= confidence_threshold - 0.2:
            pending.append({**lesson, "status": "pending"})
        else:
            rejected.append({**lesson, "status": "rejected"})

    return {"validated": validated, "pending": pending, "rejected": rejected}


def generate_feedback_packet(validated_lessons: List[Dict[str, Any]], accuracy_report: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Produce a feedback packet fed back into upstream modules."""
    return {
        "generatedAt": datetime.utcnow().isoformat(),
        "lessonsToApply": [
            {"description": l["description"], "confidence": l["finalConfidence"], "sourceModules": l["moduleSources"]}
            for l in validated_lessons
        ],
        "moduleTrustAdjustments": [
            {
                "moduleId": r["moduleId"],
                "trustLevel": r["trustLevel"],
                "suggestedWeightMultiplier": 1.1 if r["trustLevel"] == "high" else 1.0 if r["trustLevel"] == "medium" else 0.8,
            }
            for r in accuracy_report
        ],
    }
