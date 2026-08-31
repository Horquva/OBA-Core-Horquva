"""
M37 — Pattern Intelligence
Constitutional Question: "What recurring organizational patterns exist?"
Purpose: Identify trends, recurring behaviors, anomalies, and hidden
         organizational signals from event/activity data.

Owner: Tahir — Prediction Layer
"""

from datetime import datetime, timedelta
from statistics import mean, pstdev
from typing import List, Dict, Any


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def classify_regularity(intervals: List[float]) -> str:
    if len(intervals) < 2:
        return "insufficient-data"
    m = mean(intervals)
    std_dev = pstdev(intervals)
    cv = 0 if m == 0 else std_dev / m
    if cv < 0.3:
        return "highly-regular"
    if cv < 0.7:
        return "somewhat-regular"
    return "irregular"


def detect_recurring_patterns(events: List[Dict[str, Any]], min_occurrences: int = 3) -> List[Dict[str, Any]]:
    """Group events into recurring patterns by (type, actor)."""
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for e in events:
        key = f"{e['type']}::{e['actor']}"
        groups.setdefault(key, []).append(e)

    patterns = []
    for key, group in groups.items():
        if len(group) < min_occurrences:
            continue
        event_type, actor = key.split("::")
        sorted_group = sorted(group, key=lambda e: _parse(e["timestamp"]))
        intervals = [
            (_parse(sorted_group[i]["timestamp"]) - _parse(sorted_group[i - 1]["timestamp"])).total_seconds() / 86400
            for i in range(1, len(sorted_group))
        ]
        avg_interval = round(mean(intervals), 1) if intervals else None

        patterns.append({
            "type": event_type,
            "actor": actor,
            "occurrences": len(group),
            "firstSeen": sorted_group[0]["timestamp"],
            "lastSeen": sorted_group[-1]["timestamp"],
            "averageIntervalDays": avg_interval,
            "regularity": classify_regularity(intervals),
        })

    patterns.sort(key=lambda p: p["occurrences"], reverse=True)
    return patterns


def detect_anomalies(events: List[Dict[str, Any]], window_days: int = 7, z_threshold: float = 2.0) -> List[Dict[str, Any]]:
    """Flag statistical anomalies using z-score over rolling windows."""
    if not events:
        return []

    sorted_events = sorted(events, key=lambda e: _parse(e["timestamp"]))
    start = _parse(sorted_events[0]["timestamp"])
    end = _parse(sorted_events[-1]["timestamp"])

    windows = []
    t = start
    while t <= end:
        window_end = t + timedelta(days=window_days)
        count = sum(1 for e in sorted_events if t <= _parse(e["timestamp"]) < window_end)
        windows.append({"windowStart": t.isoformat(), "count": count})
        t = window_end

    counts = [w["count"] for w in windows]
    m = mean(counts)
    std_dev = pstdev(counts) or 1

    anomalies = []
    for w in windows:
        z = round((w["count"] - m) / std_dev, 2)
        if abs(z) >= z_threshold:
            anomalies.append({**w, "zScore": z, "direction": "spike" if z > 0 else "drop"})

    return anomalies
