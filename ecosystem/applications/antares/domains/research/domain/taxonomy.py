"""
Controlled taxonomy (roadmap Part-2, task 2).

Two vocabularies, kept separate on purpose:

  ORGANIZATIONAL_DIMENSIONS — *what part of the organization* a signal touches.
  FUTURE_THEMES             — *what kind of change* is emerging.

A controlled vocabulary is what stops the platform drifting into free text.
Anything not in these lists is refused at ingestion, not quietly accepted.
"""

from __future__ import annotations

ORGANIZATIONAL_DIMENSIONS: dict[str, str] = {
    "leadership": "How direction is set and authority is distributed",
    "governance": "Rules, oversight, policy and constraint enforcement",
    "decision_making": "How choices are made, escalated and recorded",
    "workforce": "Roles, skills, staffing shape and career structure",
    "collaboration": "How people and systems work together across boundaries",
    "organizational_memory": "How the organization retains and retrieves what it knows",
    "organizational_intelligence": "How the organization senses and interprets its environment",
    "operational_execution": "How work is planned, run and delivered",
    "accountability": "Who answers for outcomes, and how that is evidenced",
    "trust": "Confidence between people, systems and stakeholders",
    "human_ai_collaboration": "Division of labour between humans and AI systems",
    "autonomous_coordination": "Coordination performed by systems without human routing",
}

FUTURE_THEMES: dict[str, dict] = {
    "human_ai_collaboration": {
        "label": "Human-AI collaboration",
        "keywords": ["copilot", "human in the loop", "ai assistant", "augmentation",
                     "pair", "human ai", "assisted"],
        "default_dimensions": ["human_ai_collaboration", "workforce", "collaboration"],
    },
    "distributed_leadership": {
        "label": "Distributed leadership",
        "keywords": ["distributed leadership", "flat", "decentralised", "decentralized",
                     "autonomy", "self managing", "squad", "devolved"],
        "default_dimensions": ["leadership", "decision_making", "accountability"],
    },
    "ai_assisted_decision_making": {
        "label": "AI-assisted decision-making",
        "keywords": ["decision support", "recommendation", "ai assisted decision",
                     "predictive", "scoring", "triage"],
        "default_dimensions": ["decision_making", "organizational_intelligence"],
    },
    "organizational_memory": {
        "label": "Organizational memory",
        "keywords": ["knowledge base", "institutional memory", "retrieval",
                     "documentation", "knowledge graph", "provenance"],
        "default_dimensions": ["organizational_memory", "organizational_intelligence"],
    },
    "adaptive_governance": {
        "label": "Adaptive governance",
        "keywords": ["policy as code", "adaptive governance", "guardrail", "compliance",
                     "audit", "oversight", "regulation"],
        "default_dimensions": ["governance", "accountability", "trust"],
    },
    "autonomous_coordination": {
        "label": "Autonomous coordination",
        "keywords": ["agent", "multi agent", "orchestration", "autonomous",
                     "workflow automation", "self coordinating"],
        "default_dimensions": ["autonomous_coordination", "operational_execution"],
    },
    "continuous_organizational_learning": {
        "label": "Continuous organizational learning",
        "keywords": ["upskilling", "reskilling", "learning loop", "retrospective",
                     "continuous improvement", "feedback loop"],
        "default_dimensions": ["workforce", "organizational_intelligence"],
    },
    "trust_first_design": {
        "label": "Trust-first organization design",
        "keywords": ["transparency", "explainability", "trust", "psychological safety",
                     "consent", "fairness"],
        "default_dimensions": ["trust", "governance", "accountability"],
    },
}


class TaxonomyError(ValueError):
    """Raised when a caller uses a term outside the controlled vocabulary."""


def validate_dimension(dimension: str) -> str:
    if dimension not in ORGANIZATIONAL_DIMENSIONS:
        raise TaxonomyError(
            f"Unknown organizational dimension '{dimension}'. "
            f"Known: {sorted(ORGANIZATIONAL_DIMENSIONS)}"
        )
    return dimension


def validate_theme(theme: str) -> str:
    if theme not in FUTURE_THEMES:
        raise TaxonomyError(
            f"Unknown future theme '{theme}'. Known: {sorted(FUTURE_THEMES)}"
        )
    return theme


def classify(text: str) -> list[str]:
    """Deterministic keyword classification into future themes.

    This is intentionally boring and reproducible. An LLM may *propose*
    additional themes in review, but the stored classification comes from
    code so the same text always classifies the same way.
    """
    from .models import normalize_text

    haystack = normalize_text(text)
    hits: list[tuple[str, int]] = []
    for theme, spec in FUTURE_THEMES.items():
        score = sum(1 for kw in spec["keywords"] if kw in haystack)
        if score:
            hits.append((theme, score))
    hits.sort(key=lambda pair: (-pair[1], pair[0]))
    return [theme for theme, _ in hits]


def dimensions_for_themes(themes: list[str]) -> list[str]:
    out: list[str] = []
    for theme in themes:
        for dim in FUTURE_THEMES[theme]["default_dimensions"]:
            if dim not in out:
                out.append(dim)
    return out
