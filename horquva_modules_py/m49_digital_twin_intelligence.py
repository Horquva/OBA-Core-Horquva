"""
M49 — Digital Twin Intelligence
Constitutional Question: "What is the organization's current and simulated state?"
Purpose: Maintain a synchronized digital representation of the organization
         for advanced forecasting and simulation.

Owner: Tahir — Prediction Layer
Depends on: M32 (Dependency Impact), M41 (Organizational DNA),
            M43 (Maturity), M42 (Culture) as input intelligence.
"""

from datetime import datetime
from typing import Dict, Any, Optional


def _clamp(value: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, value))


def compute_health_index(culture: Optional[Dict[str, Any]], maturity: Optional[Dict[str, Any]]) -> Optional[float]:
    culture_score = (culture["overallScore"] / 5) if culture and culture.get("overallScore") else None
    maturity_score = (maturity["overallScore"] / 5) if maturity and maturity.get("overallScore") else None

    scores = [s for s in (culture_score, maturity_score) if s is not None]
    if not scores:
        return None
    return round(sum(scores) / len(scores), 3)


def build_twin_snapshot(structure: Dict[str, Any], culture: Dict[str, Any], maturity: Dict[str, Any], dna: Dict[str, Any]) -> Dict[str, Any]:
    """Assemble a single synchronized Digital Twin snapshot."""
    return {
        "snapshotAt": datetime.utcnow().isoformat(),
        "structure": structure,
        "culture": culture,
        "maturity": maturity,
        "dna": dna,
        "healthIndex": compute_health_index(culture, maturity),
    }


def check_synchronization(twin_snapshot: Dict[str, Any], live_source_summary: Dict[str, Any], max_staleness_minutes: float = 60) -> Dict[str, Any]:
    """Verify the twin snapshot is actually in sync with reality."""
    snapshot_time = datetime.fromisoformat(twin_snapshot["snapshotAt"])
    twin_age = (datetime.utcnow() - snapshot_time).total_seconds() / 60
    stale = twin_age > max_staleness_minutes

    twin_node_count = (twin_snapshot.get("structure") or {}).get("nodes")
    twin_node_count = len(twin_node_count) if twin_node_count is not None else None
    live_node_count = live_source_summary.get("nodeCount")
    structural_drift = abs(twin_node_count - live_node_count) if twin_node_count is not None and live_node_count is not None else None

    return {
        "ageMinutes": round(twin_age, 1),
        "stale": stale,
        "structuralDrift": structural_drift,
        "inSync": (not stale) and (structural_drift is None or structural_drift == 0),
    }


def simulate_scenario(twin_snapshot: Dict[str, Any], scenario_adjustments: Dict[str, Any]) -> Dict[str, Any]:
    """Run a 'what-if' simulation on top of the current twin."""
    projected_culture_score = _clamp(
        (twin_snapshot.get("culture") or {}).get("overallScore", 0) + scenario_adjustments.get("cultureDelta", 0), 0, 5
    )
    projected_maturity_score = _clamp(
        (twin_snapshot.get("maturity") or {}).get("overallScore", 0) + scenario_adjustments.get("maturityDelta", 0), 0, 5
    )

    projected_health_index = compute_health_index(
        {"overallScore": projected_culture_score}, {"overallScore": projected_maturity_score}
    )

    baseline = twin_snapshot.get("healthIndex")
    delta = round(projected_health_index - baseline, 3) if baseline is not None and projected_health_index is not None else None

    return {
        "scenario": scenario_adjustments.get("label", "unnamed-scenario"),
        "baselineHealthIndex": baseline,
        "projectedHealthIndex": projected_health_index,
        "delta": delta,
    }
