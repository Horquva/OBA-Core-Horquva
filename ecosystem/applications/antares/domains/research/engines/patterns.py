"""
Relationship, pattern detection, scoring and explainability engine
(roadmap Part-4, tasks 1-5).

Two hard rules encoded here:

  1. One observation is never a pattern. A pattern requires recurrence across
     independent signals AND independent sources.
  2. Every pattern must be able to explain itself. A pattern with no
     explanation block is not emitted.
"""

from __future__ import annotations

from typing import Any

from ..domain import taxonomy
from ..domain.models import (
    ConfidenceScore,
    FuturePatternCandidate,
    LifecycleState,
    SignalRelationship,
    Trajectory,
    normalize_text,
)
from ..storage import Repository
from .contradictions import ContradictionEngine
from .impact import ImpactEngine

MIN_SIGNALS_FOR_PATTERN = 2
MIN_DISTINCT_SOURCES_FOR_PATTERN = 2

#: Scoring weights. Sum to 1.0 before the contradiction penalty is applied.
SCORING_WEIGHTS = {
    "evidence_strength": 0.25,
    "recurrence": 0.20,
    "source_diversity": 0.20,
    "organizational_breadth": 0.15,
    "temporal_persistence": 0.20,
}


class RelationshipEngine:
    """Builds signal <-> signal edges (Part-4, task 1)."""

    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    @staticmethod
    def _jaccard(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    def correlate_all(self, actor: str = "system") -> list[SignalRelationship]:
        signals = self.repo.list_signals()
        created: list[SignalRelationship] = []

        for i, left in enumerate(signals):
            for right in signals[i + 1:]:
                theme_overlap = self._jaccard(set(left.themes), set(right.themes))
                dim_overlap = self._jaccard(set(left.dimensions), set(right.dimensions))
                token_overlap = self._jaccard(
                    set(normalize_text(left.description).split()),
                    set(normalize_text(right.description).split()),
                )
                strength = round(0.5 * theme_overlap + 0.3 * dim_overlap + 0.2 * token_overlap, 3)
                if strength < 0.15:
                    continue

                relation = "SIMILAR_TO" if strength >= 0.55 else "SUPPORTS"
                rel = SignalRelationship(
                    source_signal_id=left.id,
                    target_signal_id=right.id,
                    relation=relation,
                    strength=strength,
                    explanation=(
                        f"theme overlap {theme_overlap:.2f}, dimension overlap {dim_overlap:.2f}, "
                        f"description overlap {token_overlap:.2f}"
                    ),
                )
                self.repo.save_relationship(rel)
                created.append(rel)

        for signal in signals:
            if signal.state == LifecycleState.IMPACT_ANALYZED and self.repo.relationships_for(signal.id):
                signal.transition(LifecycleState.CORRELATED,
                                  note="relationships generated", actor=actor)
                self.repo.save_signal(signal, actor)
        return created


class PatternEngine:
    """Detects, scores and explains future organizational patterns."""

    def __init__(self, repo: Repository) -> None:
        self.repo = repo
        self.impacts = ImpactEngine(repo)
        self.contradictions = ContradictionEngine(repo)

    # -- scoring -----------------------------------------------------------
    def _score(self, signal_ids: list[str]) -> tuple[ConfidenceScore, dict[str, Any]]:
        all_evidence = [e for sid in signal_ids for e in self.repo.evidence_for(sid)]
        distinct_sources = {e.provenance.source_name for e in all_evidence}
        distinct_source_types = {e.provenance.source_type for e in all_evidence}

        # evidence strength: mean effective weight of every supporting item
        evidence_strength = (
            sum(e.weight for e in all_evidence) / len(all_evidence) if all_evidence else 0.0
        )

        # recurrence: how many independent signals carry the theme (saturates at 5)
        recurrence = min(len(signal_ids) / 5.0, 1.0)

        # source diversity: distinct source *types*, not just distinct names
        source_diversity = min(len(distinct_source_types) / 4.0, 1.0)

        # organizational breadth: how many dimensions the pattern touches
        dims = {imp.dimension for sid in signal_ids for imp in self.repo.impacts_for(sid)}
        organizational_breadth = min(len(dims) / 6.0, 1.0)

        # temporal persistence: spread of observation dates
        dates = sorted(e.observed_at[:10] for e in all_evidence if e.observed_at)
        distinct_months = len({d[:7] for d in dates})
        temporal_persistence = min(distinct_months / 4.0, 1.0)

        factors = {
            "evidence_strength": round(evidence_strength, 3),
            "recurrence": round(recurrence, 3),
            "source_diversity": round(source_diversity, 3),
            "organizational_breadth": round(organizational_breadth, 3),
            "temporal_persistence": round(temporal_persistence, 3),
        }
        raw = sum(SCORING_WEIGHTS[k] * v for k, v in factors.items())

        findings = self.contradictions.check_pattern(signal_ids)
        penalty = self.contradictions.penalty(findings)
        final = round(max(raw * (1 - penalty), 0.0), 3)
        factors["contradiction_penalty"] = round(penalty, 3)

        context = {
            "evidence_count": len(all_evidence),
            "distinct_sources": sorted(distinct_sources),
            "distinct_source_types": sorted(s.value for s in distinct_source_types),
            "dimensions": sorted(dims),
            "observation_window": {"first": dates[0] if dates else None,
                                   "last": dates[-1] if dates else None,
                                   "distinct_months": distinct_months},
            "findings": findings,
        }
        return ConfidenceScore(value=final, factors=factors), context

    # -- detection ---------------------------------------------------------
    def detect(self, actor: str = "system") -> list[FuturePatternCandidate]:
        signals = self.repo.list_signals()

        by_theme: dict[str, list[str]] = {}
        for signal in signals:
            for theme in signal.themes:
                by_theme.setdefault(theme, []).append(signal.id)

        candidates: list[FuturePatternCandidate] = []

        for theme, signal_ids in sorted(by_theme.items()):
            # rule 1: recurrence across independent signals
            if len(signal_ids) < MIN_SIGNALS_FOR_PATTERN:
                continue
            # rule 2: recurrence across independent sources
            sources = {
                e.provenance.source_name
                for sid in signal_ids for e in self.repo.evidence_for(sid)
            }
            if len(sources) < MIN_DISTINCT_SOURCES_FOR_PATTERN:
                continue

            confidence, context = self._score(signal_ids)

            explanation = {
                "why_detected": (
                    f"{len(signal_ids)} independent signals classified under "
                    f"'{taxonomy.FUTURE_THEMES[theme]['label']}', corroborated by "
                    f"{context['evidence_count']} evidence items across "
                    f"{len(context['distinct_sources'])} distinct sources."
                ),
                "supporting_signals": [
                    {"id": s.id, "title": s.title, "state": s.state.value}
                    for s in signals if s.id in signal_ids
                ],
                "supporting_evidence": [
                    {
                        "id": e.id, "title": e.title,
                        "source": e.provenance.source_name,
                        "source_type": e.provenance.source_type.value,
                        "status": e.status.value,
                        "weight": e.weight,
                        "url": e.provenance.source_url,
                    }
                    for sid in signal_ids for e in self.repo.evidence_for(sid)
                ],
                "evidence_strength": confidence.factors["evidence_strength"],
                "affected_dimensions": context["dimensions"],
                "observation_window": context["observation_window"],
                "scoring_method": {
                    "weights": SCORING_WEIGHTS,
                    "factors": confidence.factors,
                    "formula": "sum(weight_i * factor_i) * (1 - contradiction_penalty)",
                },
                "open_questions": self._open_questions(context),
            }

            candidate = FuturePatternCandidate(
                name=taxonomy.FUTURE_THEMES[theme]["label"],
                theme=theme,
                signal_ids=sorted(signal_ids),
                dimensions=context["dimensions"],
                confidence=confidence,
                explanation=explanation,
                contradictions=context["findings"],
            )
            self.repo.save_pattern(candidate)
            candidates.append(candidate)

            for signal in signals:
                if signal.id in signal_ids and signal.state == LifecycleState.CORRELATED:
                    signal.transition(LifecycleState.PATTERN_CANDIDATE,
                                      note=f"contributes to pattern {candidate.id}", actor=actor)
                    self.repo.save_signal(signal, actor)

        return candidates

    @staticmethod
    def _open_questions(context: dict[str, Any]) -> list[str]:
        questions: list[str] = []
        if len(context["distinct_source_types"]) < 3:
            questions.append(
                "Would this pattern survive if we added a peer-reviewed or "
                "internal-observation source type?"
            )
        if context["observation_window"]["distinct_months"] < 3:
            questions.append(
                "The observation window is narrow. Is this a durable pattern or a news cycle?"
            )
        if context["findings"]:
            questions.append(
                f"{len(context['findings'])} contradiction findings are unresolved. "
                f"Which are material to the claim?"
            )
        if not questions:
            questions.append("What would falsify this pattern? Name the counter-evidence to look for.")
        return questions
