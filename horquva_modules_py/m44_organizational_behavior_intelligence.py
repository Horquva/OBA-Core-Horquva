"""
M44 — Organizational Behavior Intelligence
Constitutional Question: "How does the organization actually behave?"
Purpose: Analyze actual behavioral patterns (from activity data) rather
         than relying on documented processes.

Owner: Tahir — Prediction Layer
"""

from typing import List, Dict, Any


def compute_process_gap(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare documented process vs. actual behavior to find the 'process gap'."""
    by_process: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        by_process.setdefault(r["documentedProcess"], []).append(r)

    results = []
    for process, entries in by_process.items():
        deviations = [e for e in entries if not e["followedProcess"]]
        deviation_rate = round(len(deviations) / len(entries), 3)
        results.append({
            "process": process,
            "totalObservations": len(entries),
            "deviations": len(deviations),
            "deviationRate": deviation_rate,
            "status": "process-not-reflecting-reality" if deviation_rate > 0.4 else "process-mostly-followed",
        })

    results.sort(key=lambda r: r["deviationRate"], reverse=True)
    return results


def _classify_archetype(action_counts: Dict[str, int], deviation_rate: float) -> str:
    if deviation_rate > 0.5:
        return "process-bypasser"
    if action_counts.get("escalated", 0) > action_counts.get("approved", 0):
        return "escalator"
    if action_counts.get("delegated", 0) > 0:
        return "delegator"
    return "rule-follower"


def profile_actor_behavior(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Identify behavioral archetypes per actor based on their action distribution."""
    by_actor: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        by_actor.setdefault(r["actor"], []).append(r)

    profiles = []
    for actor, entries in by_actor.items():
        action_counts: Dict[str, int] = {}
        for e in entries:
            action_counts[e["action"]] = action_counts.get(e["action"], 0) + 1

        total = len(entries)
        deviation_rate = sum(1 for e in entries if not e["followedProcess"]) / total
        dominant_action = max(action_counts.items(), key=lambda kv: kv[1])[0] if action_counts else None

        profiles.append({
            "actor": actor,
            "totalActions": total,
            "actionBreakdown": action_counts,
            "dominantAction": dominant_action,
            "processDeviationRate": round(deviation_rate, 3),
            "archetype": _classify_archetype(action_counts, deviation_rate),
        })

    return profiles
