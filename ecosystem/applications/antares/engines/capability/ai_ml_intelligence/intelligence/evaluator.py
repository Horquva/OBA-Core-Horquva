"""
Evaluation Harness — turns raw model output into measurable scores.
Owner: Muhammad Hasnain Ajmal
Part-2/3: Model Evaluation Foundation
"""

import re
from difflib import SequenceMatcher


def score_exact_match(output: str, expected: str) -> float:
    if output is None or expected is None:
        return 0.0
    return 1.0 if output.strip().lower() == expected.strip().lower() else 0.0


def score_similarity(output: str, expected: str) -> float:
    """Fuzzy textual similarity — useful when exact match is too strict."""
    if not output or not expected:
        return 0.0
    return SequenceMatcher(None, output.lower(), expected.lower()).ratio()


def score_contains_keywords(output: str, keywords: list) -> float:
    if not output:
        return 0.0
    text = output.lower()
    hits = sum(1 for k in keywords if k.lower() in text)
    return hits / max(len(keywords), 1)


def evaluate_case(output: str, expected, mode: str = "similarity", threshold: float = 0.6) -> dict:
    """
    Central evaluation dispatcher. Returns {score, passed}.
    mode: "exact" | "similarity" | "keywords"
    """
    if mode == "exact":
        s = score_exact_match(output, expected)
    elif mode == "keywords":
        s = score_contains_keywords(output, expected if isinstance(expected, list) else [expected])
    else:
        s = score_similarity(output, str(expected))

    return {"score": round(s, 4), "passed": s >= threshold}


def aggregate_summary(results: list) -> dict:
    """Compute aggregate metrics across a list of ExperimentResult-like dicts."""
    if not results:
        return {"count": 0}
    scores = [r.get("score") for r in results if r.get("score") is not None]
    latencies = [r.get("latency_ms", 0) for r in results]
    passed = [r for r in results if r.get("passed")]
    errors = [r for r in results if r.get("error")]
    return {
        "count": len(results),
        "pass_rate": round(len(passed) / len(results), 4),
        "avg_score": round(sum(scores) / len(scores), 4) if scores else None,
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else None,
        "error_rate": round(len(errors) / len(results), 4),
    }
