"""
impact_engine.py

Part-3 of the roadmap: "Signal Processing Engine" / Impact Analysis.

This is v1. Part-3 eventually wants:
    Input -> Normalization -> Entity/Concept Extraction
    -> Organizational Dimension Classification -> Impact Analysis
    -> Evidence Association -> Confidence Assessment
    -> Structured Organizational Intelligence

v1 only does the "Dimension Classification" + basic "Impact Analysis"
steps, using simple keyword matching instead of an LLM. There's no AI
service wired into this project yet (that's a later Part-3 iteration),
so this is deliberately the simplest thing that can actually work end
to end: take a Signal already in the database, scan its text, and
write real Impact rows for whichever of the 10 dimensions it matches.

Design decisions worth calling out:

- This works off Signals that are ALREADY in the database (created via
  POST /signals on Day 2), instead of taking raw text directly. That
  keeps this engine consistent with the rest of the platform - nothing
  gets analyzed unless it was ingested through the real signal pipeline
  first, so there's always a signal_id to trace the impact back to.

- Every dimension match becomes its own Impact row (not one big impact
  covering everything), because Part-3 describes impact analysis as
  being organized around the individual dimensions, and it also makes
  the data queryable later ("show me every impact tagged Governance").

- Confidence is always "inferred" for v1 matches, per the evidence_state
  spectrum from Day 2 - a keyword match is not the same thing as a
  human-confirmed observation, and the platform isn't allowed to treat
  it like one.

- If a signal has already been analyzed (it already has Impact rows),
  running the engine again on it does nothing by default. This avoids
  silently duplicating Impact rows every time someone re-runs analysis
  on the same signal. Pass force=True to re-run anyway.
"""

from sqlalchemy.orm import Session

from . import crud, models, schemas


# Keyword map for v1 classification. Deliberately simple - a starting
# point for Part-3, not the final semantic/LLM-based version.
DIMENSION_KEYWORDS = {
    models.DimensionName.LEADERSHIP: [
        "leader", "leadership", "executive", "manager", "ceo", "management layer",
    ],
    models.DimensionName.GOVERNANCE: [
        "governance", "policy", "compliance", "board", "regulation", "oversight",
    ],
    models.DimensionName.DECISION_MAKING: [
        "decision", "decide", "approval", "autonomous", "authority",
    ],
    models.DimensionName.WORKFORCE: [
        "employee", "workforce", "staff", "hiring", "layoff", "team", "headcount",
    ],
    models.DimensionName.COLLABORATION: [
        "collaborate", "collaboration", "cross-team", "communication", "coordination",
    ],
    models.DimensionName.ACCOUNTABILITY: [
        "accountability", "responsible", "ownership", "answerable",
    ],
    models.DimensionName.TRUST: [
        "trust", "transparency", "verification", "credibility",
    ],
    models.DimensionName.ORGANIZATIONAL_MEMORY: [
        "memory", "knowledge base", "documentation", "institutional knowledge",
    ],
    models.DimensionName.OPERATIONAL_EXECUTION: [
        "operations", "execution", "process", "workflow", "delivery",
    ],
    models.DimensionName.ORGANIZATIONAL_INTELLIGENCE: [
        "intelligence", "insight", "analytics", "data-driven", "sensing",
    ],
}


def classify_dimensions(signal_text: str) -> list[models.DimensionName]:
    """
    Pure function, no database access - scans text for keywords and
    returns which dimensions matched. Kept separate from the
    database-writing logic below so it's trivial to unit test on its
    own without needing a database session.
    """
    text_lower = signal_text.lower()
    matched = []
    for dimension, keywords in DIMENSION_KEYWORDS.items():
        if any(keyword in text_lower for keyword in keywords):
            matched.append(dimension)
    return matched


def analyze_signal(db: Session, signal_id: str, force: bool = False) -> list[models.Impact]:
    """
    Runs v1 impact analysis for one signal already stored in the
    database, and writes real Impact + Relationship rows.

    Returns the list of Impact rows (existing ones if already analyzed
    and force=False, newly created ones otherwise). Returns an empty
    list if the signal doesn't exist - the caller (API layer) is
    responsible for turning that into a 404.
    """
    signal = crud.get_signal(db, signal_id)
    if signal is None:
        return []

    existing_impacts = crud.list_impacts_for_signal(db, signal_id)
    if existing_impacts and not force:
        return existing_impacts

    combined_text = f"{signal.title} {signal.description}"
    matched_dimensions = classify_dimensions(combined_text)

    dimension_rows = {d.name: d for d in crud.list_dimensions(db)}

    created_impacts = []
    for dimension_name in matched_dimensions:
        dimension_row = dimension_rows.get(dimension_name)
        if dimension_row is None:
            # Dimension isn't seeded in the DB yet - skip rather than
            # crash, since seeding is main.py's responsibility, not
            # this engine's.
            continue

        impact_data = schemas.ImpactCreate(
            signal_id=signal.id,
            dimension_id=dimension_row.id,
            description=(
                f"Signal text matched keywords associated with "
                f"'{dimension_name.value}'."
            ),
            confidence=models.EvidenceState.INFERRED,
        )
        impact = crud.create_impact(db, impact_data)
        created_impacts.append(impact)

        # Record the Signal -> Impact relationship, per the
        # Relationship Engine idea introduced in Part-5 (used a bit
        # earlier here since the generic Relationship table already
        # exists from Day 2).
        crud.create_relationship(
            db,
            schemas.RelationshipCreate(
                source_type="signal",
                source_id=signal.id,
                target_type="impact",
                target_id=impact.id,
                relationship_type="produced",
            ),
        )

    return created_impacts
