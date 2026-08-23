"""
Temporal intelligence, trajectory and convergence (roadmap Part-5, tasks 1-3).

Answers two questions the pattern engine cannot:
    * is this signal growing, flat or dying?
    * are separate patterns pointing at the same organizational transformation?
"""

from __future__ import annotations

from collections import Counter
from typing import Any

from ..domain.models import Trajectory
from ..storage import Repository


class TrajectoryEngine:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    # -- per-signal --------------------------------------------------------
    def signal_trajectory(self, signal_id: str) -> tuple[Trajectory, dict[str, Any]]:
        evidence = self.repo.evidence_for(signal_id)
        months = sorted(e.observed_at[:7] for e in evidence if e.observed_at)
        counts = Counter(months)
        series = [{"month": m, "evidence_count": c} for m, c in sorted(counts.items())]

        if len(counts) < 2:
            return Trajectory.INSUFFICIENT_DATA, {
                "series": series,
                "reason": "Fewer than two distinct observation months. "
                          "No trajectory can be claimed without a time series.",
            }

        values = [c for _, c in sorted(counts.items())]
        half = len(values) // 2
        early = sum(values[:half]) / max(half, 1)
        late = sum(values[half:]) / max(len(values) - half, 1)

        if late > early * 1.75:
            traj = Trajectory.ACCELERATING
        elif late > early:
            traj = Trajectory.EMERGING
        elif late < early * 0.5:
            traj = Trajectory.DECLINING
        else:
            traj = Trajectory.STABLE

        # gaps in the middle mean the signal is intermittent, not persistent
        if len(counts) >= 3 and min(values) == 0:
            traj = Trajectory.FRAGMENTED

        return traj, {
            "series": series,
            "early_mean": round(early, 2),
            "late_mean": round(late, 2),
            "reason": f"Mean evidence per month moved from {early:.2f} to {late:.2f}.",
        }

    # -- per-pattern -------------------------------------------------------
    def pattern_trajectory(self, pattern_id: str) -> tuple[Trajectory, dict[str, Any]]:
        pattern = self.repo.get_pattern(pattern_id)
        if not pattern:
            return Trajectory.INSUFFICIENT_DATA, {"reason": "Unknown pattern."}

        results = [self.signal_trajectory(sid) for sid in pattern.signal_ids]
        tallies = Counter(t.value for t, _ in results)
        if not tallies:
            return Trajectory.INSUFFICIENT_DATA, {"reason": "No signals."}

        dominant, count = tallies.most_common(1)[0]
        if count == 1 and len(tallies) > 1:
            return Trajectory.FRAGMENTED, {
                "per_signal": tallies,
                "reason": "No shared direction across the signals backing this pattern.",
            }
        return Trajectory(dominant), {
            "per_signal": dict(tallies),
            "reason": f"{count} of {len(results)} backing signals are {dominant}.",
        }

    # -- convergence -------------------------------------------------------
    def convergence(self, min_shared_dimensions: int = 2) -> list[dict[str, Any]]:
        """Detect separate patterns pointing at one organizational transformation.

        Example from the roadmap:
            AI Agents + Human-AI Collaboration + Autonomous Operations
            + AI Governance  ->  potential future organizational pattern
        """
        patterns = self.repo.list_patterns()
        clusters: list[dict[str, Any]] = []

        for i, left in enumerate(patterns):
            for right in patterns[i + 1:]:
                shared = sorted(set(left.dimensions) & set(right.dimensions))
                if len(shared) < min_shared_dimensions:
                    continue
                clusters.append({
                    "patterns": [
                        {"id": left.id, "name": left.name, "confidence": left.confidence.value},
                        {"id": right.id, "name": right.name, "confidence": right.confidence.value},
                    ],
                    "shared_dimensions": shared,
                    "convergence_strength": round(
                        len(shared) / len(set(left.dimensions) | set(right.dimensions)), 3
                    ),
                    "interpretation": (
                        f"'{left.name}' and '{right.name}' both reshape "
                        f"{', '.join(shared)} — candidate for a single higher-order "
                        f"organizational transformation rather than two separate patterns."
                    ),
                })

        clusters.sort(key=lambda c: -c["convergence_strength"])
        return clusters
