"""
Advanced Capability Validation Intelligence
Roadmap Reference: PART-6 — Capability Comparison & Portfolio Intelligence

Provides comparison and portfolio-level views on top of already-assessed
ValidationResults. Never re-invents scoring — always traces back to the
same explainable dimension findings produced by AssessmentEngine.
"""

from __future__ import annotations

from app.models.assessment import ValidationResult, ValidationState


class ComparisonEngine:

    def compare(self, results: list[ValidationResult]) -> list[dict]:
        """
        Multi-dimensional comparison, ranked by overall_score descending.
        Returns evidence-backed prioritization, not a bare ranking.
        """
        ranked = sorted(results, key=lambda r: r.overall_score, reverse=True)
        comparison = []
        for rank, r in enumerate(ranked, start=1):
            comparison.append({
                "rank": rank,
                "capability_id": r.capability_id,
                "overall_score": round(r.overall_score, 3),
                "state": r.state.value,
                "top_strengths": [s for f in r.findings for s in f.strengths][:3],
                "top_risks": r.risks[:3],
            })
        return comparison

    def portfolio_view(self, results: list[ValidationResult]) -> dict:
        """
        Portfolio Intelligence per PART-6: strongest, weakest, needing evidence,
        needing revision, high-value, high-risk, ready-for-downstream.
        """
        if not results:
            return {}

        by_score = sorted(results, key=lambda r: r.overall_score, reverse=True)

        needing_evidence = [
            r.capability_id for r in results
            if any("evidence" in m.lower() for m in r.missing_information)
        ]
        needing_revision = [
            r.capability_id for r in results if r.state == ValidationState.REVISION_REQUIRED
        ]
        high_value = [r.capability_id for r in by_score if r.overall_score >= 0.75]
        high_risk = [r.capability_id for r in results if len(r.risks) >= 3]
        ready_downstream = [
            r.capability_id for r in results
            if r.state in (ValidationState.VALIDATED, ValidationState.VALIDATION_READY)
        ]

        return {
            "strongest": by_score[0].capability_id if by_score else None,
            "weakest": by_score[-1].capability_id if by_score else None,
            "needing_evidence": needing_evidence,
            "needing_revision": needing_revision,
            "high_value": high_value,
            "high_risk": high_risk,
            "ready_for_downstream": ready_downstream,
        }

    def find_overlaps(self, capability_names: dict[str, str]) -> list[tuple[str, str]]:
        """
        Naive duplicate/overlap detector based on normalized name similarity.
        capability_names: {capability_id: capability_name}
        Returns pairs of capability_ids that look like potential duplicates.
        """
        overlaps = []
        items = list(capability_names.items())
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                id_a, name_a = items[i]
                id_b, name_b = items[j]
                norm_a = set(name_a.lower().split())
                norm_b = set(name_b.lower().split())
                if not norm_a or not norm_b:
                    continue
                overlap_ratio = len(norm_a & norm_b) / len(norm_a | norm_b)
                if overlap_ratio >= 0.5:
                    overlaps.append((id_a, id_b))
        return overlaps
