"""
M45 — Benchmark Intelligence
Constitutional Question: "How does the organization compare to others?"
Purpose: Compare performance against industry benchmarks and historical
         trends.

Owner: Tahir — Prediction Layer
"""

from typing import List, Dict, Any, Optional


def _estimate_percentile(m: Dict[str, Any]) -> Optional[float]:
    p25, p75, median, org_value = m.get("industryP25"), m.get("industryP75"), m["industryMedian"], m["orgValue"]
    if p25 is None or p75 is None:
        return None
    if org_value <= p25:
        return 25
    if org_value >= p75:
        return 75
    if org_value <= median:
        return round(25 + ((org_value - p25) / (median - p25)) * 25)
    return round(50 + ((org_value - median) / (p75 - median)) * 25)


def _evaluate_performance(m: Dict[str, Any], gap: float) -> str:
    favorable = gap > 0 if m["direction"] == "higher_is_better" else gap < 0
    magnitude = abs(gap) / (m["industryMedian"] or 1)
    if magnitude < 0.05:
        return "in-line-with-industry"
    return "outperforming" if favorable else "underperforming"


def compare_to_industry(metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    results = []
    for m in metrics:
        gap = round(m["orgValue"] - m["industryMedian"], 3)
        results.append({
            "metric": m["metric"],
            "orgValue": m["orgValue"],
            "industryMedian": m["industryMedian"],
            "gapFromMedian": gap,
            "estimatedPercentile": _estimate_percentile(m),
            "performance": _evaluate_performance(m, gap),
        })
    return results


def track_benchmark_trend(previous_metrics: List[Dict[str, Any]], current_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare current benchmark snapshot to a previous one to see if the org
    is closing or widening the gap with industry over time."""
    prev_by_metric = {m["metric"]: m for m in previous_metrics}
    current_results = compare_to_industry(current_metrics)

    output = []
    for cur in current_results:
        prev = prev_by_metric.get(cur["metric"])
        if not prev:
            output.append({**cur, "trend": "no-prior-data"})
            continue
        prev_gap = prev["orgValue"] - prev["industryMedian"]
        closing_gap = abs(cur["gapFromMedian"]) < abs(prev_gap)
        output.append({**cur, "trend": "closing-gap" if closing_gap else "widening-gap"})

    return output
