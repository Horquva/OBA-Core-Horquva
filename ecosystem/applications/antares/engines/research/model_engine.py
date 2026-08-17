"""
model_engine.py

Part-5 of the roadmap: "Future Organization Modeling Engine".

    Organizational Signals + Impact Analyses + Evolution Patterns
    + Evidence + Organizational Dimensions
    -> Structured Future Organizational Models

v1 goal: take one or more existing Pattern rows (built on Day 5) and
combine them into a single OrganizationModel row that describes what
an organization following those patterns together might look like -
which dimensions are involved, and which patterns/signals back it up.

Design decisions worth calling out:

- The engine does NOT decide on its own which patterns belong
  together. The roadmap describes this as building "scenarios" from
  combinations of patterns, and deciding which combination is
  meaningful is still a judgment call - so the caller picks the
  pattern_ids to combine. This matches how POST /analysis and
  POST /relationships already work on this platform: the engine does
  the structuring, not the deciding-what-to-combine.

- A model's dimensions and supporting signal count are derived by
  walking the real relationship graph: Pattern -> (signals that
  support it, via Day 5's "supports" relationships) -> (dimensions
  those signals matched, via Day 4's impact engine). Nothing here is
  hand-typed - it's assembled from data that already exists in the
  database, which is the whole point of Part-5's "Relationship Engine"
  idea (Signal -> Impact -> Pattern -> Model).

- Confidence always starts at "hypothesized". A model built from 1-2
  patterns, each themselves only "hypothesized", has no business
  claiming to be more certain than the patterns it's made of. Moving a
  model toward "supported"/"validated" is explicitly Capability
  Validation's job later in the pipeline (Part-6+), not this engine's.

- If any of the given pattern_ids don't exist, they're skipped rather
  than failing the whole request - a model can still be built from
  whichever pattern_ids were valid. If NONE of them are valid, the
  engine returns None and the API layer turns that into a 404.
"""

from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.pattern_engine import dimension_set_for_signal


def _signals_supporting_pattern(db: Session, pattern_id: str) -> list[str]:
    """
    Returns the signal_ids that are linked to a pattern via Day 5's
    'signal -supports-> pattern' relationships.
    """
    return [
        r.source_id
        for r in crud.list_relationships(db)
        if r.target_type == "pattern"
        and r.target_id == pattern_id
        and r.relationship_type == "supports"
    ]


def _dimensions_for_pattern(db: Session, pattern_id: str) -> frozenset[str]:
    """
    Unions the dimension sets of every signal supporting this pattern.
    In practice this should usually just recover the same dimension
    set the pattern was named after in Day 5, but computing it fresh
    from the relationship graph (rather than parsing the pattern's
    name) keeps this engine correct even if pattern-naming ever
    changes later.
    """
    combined: set[str] = set()
    for signal_id in _signals_supporting_pattern(db, pattern_id):
        combined |= dimension_set_for_signal(db, signal_id)
    return frozenset(combined)


def build_future_model(
    db: Session, pattern_ids: list[str], name: str | None = None
) -> models.OrganizationModel | None:
    """
    Builds one OrganizationModel from one or more existing patterns.
    Returns None if none of the given pattern_ids exist.
    """
    valid_patterns = [
        p for p in (crud.get_pattern(db, pid) for pid in pattern_ids) if p is not None
    ]
    if not valid_patterns:
        return None

    combined_dimensions: set[str] = set()
    total_supporting_signals = 0
    for pattern in valid_patterns:
        combined_dimensions |= _dimensions_for_pattern(db, pattern.id)
        total_supporting_signals += len(_signals_supporting_pattern(db, pattern.id))

    dims_sorted = sorted(combined_dimensions)
    model_name = name or ("Future Model: " + " + ".join(dims_sorted))

    structure_notes = (
        f"Built from {len(valid_patterns)} pattern(s): "
        + ", ".join(p.name for p in valid_patterns)
        + f". Touches {len(dims_sorted)} dimension(s): "
        + ", ".join(dims_sorted)
        + f". Backed by {total_supporting_signals} supporting signal reference(s) "
        "across the contributing patterns."
    )
    purpose = (
        "A candidate future organizational shape suggested by the "
        "evolution patterns above - not yet validated."
    )

    model = crud.create_organization_model(
        db,
        schemas.OrganizationModelCreate(
            name=model_name,
            purpose=purpose,
            structure_notes=structure_notes,
            confidence=models.EvidenceState.HYPOTHESIZED,
        ),
    )

    # Link Pattern -> Model, per the roadmap's relationship chain
    # (Signal -> Impact -> Pattern -> Model).
    for pattern in valid_patterns:
        crud.create_relationship(
            db,
            schemas.RelationshipCreate(
                source_type="pattern",
                source_id=pattern.id,
                target_type="model",
                target_id=model.id,
                relationship_type="informs",
            ),
        )

    return model
