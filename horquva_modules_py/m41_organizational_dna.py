"""
M41 — Organizational DNA
Constitutional Question: "What fundamentally defines this organization?"
Purpose: Model the organization's unique identity, operating principles,
         and long-term characteristics from stable, low-drift signals.

Owner: Tahir — Prediction Layer
"""

from datetime import datetime
from typing import List, Dict, Any

DNA_DIMENSIONS = [
    "decision_making",     # centralized (0) <-> distributed (1)
    "risk_appetite",       # conservative (0) <-> experimental (1)
    "hierarchy",           # flat (0) <-> hierarchical (1)
    "pace",                # deliberate (0) <-> fast-moving (1)
    "formality",            # informal (0) <-> highly-process-driven (1)
    "collaboration_style", # siloed (0) <-> cross-functional (1)
]


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def describe_dna(core: List[Dict[str, Any]]) -> List[str]:
    out = []
    for c in core:
        label = "low" if c["score"] < 0.35 else "high" if c["score"] > 0.65 else "balanced"
        out.append(f"{c['dimension']}: {label} ({c['score']})")
    return out


def build_dna_profile(signals: List[Dict[str, Any]], core_min_observations: int = 5) -> Dict[str, Any]:
    """Build a DNA profile by averaging long-run signal values per dimension."""
    by_dimension: Dict[str, List[Dict[str, Any]]] = {}
    for s in signals:
        by_dimension.setdefault(s["dimension"], []).append(s)

    core, emerging = [], []

    for dim in DNA_DIMENSIONS:
        observations = sorted(by_dimension.get(dim, []), key=lambda o: _parse(o["observedAt"]))
        if not observations:
            continue

        avg = sum(o["value"] for o in observations) / len(observations)
        recent = observations[-min(5, len(observations)):]
        recent_avg = sum(o["value"] for o in recent) / len(recent)
        drift = round(recent_avg - avg, 3)

        entry = {
            "dimension": dim,
            "score": round(avg, 3),
            "recentScore": round(recent_avg, 3),
            "drift": drift,
            "observations": len(observations),
            "stability": "stable" if abs(drift) < 0.1 else "shifting" if abs(drift) < 0.25 else "volatile",
        }

        if len(observations) >= core_min_observations:
            core.append(entry)
        else:
            emerging.append(entry)

    return {
        "generatedAt": datetime.utcnow().isoformat(),
        "coreIdentity": core,
        "emergingTraits": emerging,
        "summary": describe_dna(core),
    }


def compare_dna_profiles(previous_profile: Dict[str, Any], current_profile: Dict[str, Any]) -> Dict[str, Any]:
    """Compare current DNA profile to a previous one to detect identity drift."""
    prev_by_dim = {d["dimension"]: d for d in previous_profile["coreIdentity"]}
    shifts = []

    for cur in current_profile["coreIdentity"]:
        prev = prev_by_dim.get(cur["dimension"])
        if not prev:
            continue
        change = round(cur["score"] - prev["score"], 3)
        if abs(change) >= 0.1:
            shifts.append({"dimension": cur["dimension"], "from": prev["score"], "to": cur["score"], "change": change})

    return {"significantShifts": shifts, "identityStable": len(shifts) == 0}
