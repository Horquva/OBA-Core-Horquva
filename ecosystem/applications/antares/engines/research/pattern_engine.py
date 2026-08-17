"""
pattern_engine.py

Part-4 of the roadmap: "Organizational Evolution Pattern Engine".

    Multiple Observations -> Semantic/Structural Comparison
    -> Common Characteristics -> Pattern Candidate
    -> Evidence Aggregation -> Pattern Confidence
    -> Reusable Evolution Pattern

v1 keeps the comparison step simple on purpose: two signals are
considered part of the same pattern if the *set* of organizational
dimensions their Day-4 Impact Analysis matched is exactly the same
(and not empty). That's a structural comparison, not a semantic one -
real semantic similarity (embeddings, clustering) is a later Part-4
iteration once there's an AI/embeddings service wired into the
platform. This version is meant to prove the pattern pipeline works
end to end with real data, not to be the final matching logic.

Design decisions worth calling out:

- Only signals that have ALREADY been through the Day-4 impact engine
  are eligible for pattern detection. A signal with no impacts yet
  can't be grouped into anything - there's nothing to compare.

- A "pattern" only gets created if at least `min_signals` signals
  share the same dimension set (default 2 - the roadmap describes
  patterns as things found "across multiple organizational
  observations", so a single signal can never be a pattern by itself).

- If a pattern with the same auto-generated name already exists, we
  reuse it and just link any new signals into it via Relationship
  rows, instead of creating a second pattern for the same dimension
  set. This keeps re-running detection safe (idempotent) as more
  signals get added over time.

- Every new pattern starts with confidence=hypothesized and
  status=created, per the EvidenceState/PatternStatus rules from
  Day 2's model - a pattern found by grouping 2-3 signals with simple
  keyword overlap is not yet something the platform should treat as
  confirmed.
"""

from collections import defaultdict

from sqlalchemy.orm import Session

from app import crud, models, schemas


def dimension_set_for_signal(db: Session, signal_id: str) -> frozenset[str]:
    """
    Returns the set of dimension names (as plain strings) that Day 4's
    impact engine matched for one signal. Empty set if the signal
    hasn't been analyzed yet.

    Made public (no leading underscore) on Day 6 so
    app/model_engine.py can reuse it instead of duplicating the same
    lookup logic - both engines need "what dimensions does this signal
    touch," just for different purposes.
    """
    impacts = crud.list_impacts_for_signal(db, signal_id)
    return frozenset(impact.dimension.name.value for impact in impacts)


def group_signals_by_dimensions(
    signal_dimension_map: dict[str, frozenset[str]], min_group_size: int = 2
) -> list[tuple[frozenset[str], list[str]]]:
    """
    Pure function, no database access - groups signal_ids that share
    the exact same non-empty dimension set. Kept separate from the
    database-writing logic so the grouping logic itself is easy to
    unit test without needing a database session.

    Returns a list of (dimension_set, [signal_ids]) tuples, only for
    groups that meet min_group_size.
    """
    groups: dict[frozenset[str], list[str]] = defaultdict(list)
    for signal_id, dims in signal_dimension_map.items():
        if not dims:
            continue  # unanalyzed signal, or matched nothing - skip
        groups[dims].append(signal_id)

    return [
        (dims, signal_ids)
        for dims, signal_ids in groups.items()
        if len(signal_ids) >= min_group_size
    ]


def _pattern_name_for_dimensions(dims: frozenset[str]) -> str:
    """
    Deterministic, readable name for a dimension-set pattern, e.g.
    'Pattern: decision_making + workforce'. Deterministic naming is
    what lets detect_patterns() recognize "this pattern already
    exists" instead of creating duplicates every time it re-runs.
    """
    return "Pattern: " + " + ".join(sorted(dims))


def detect_patterns(db: Session, min_group_size: int = 2) -> list[models.Pattern]:
    """
    Runs v1 pattern detection across every signal currently in the
    database. For each group of signals that share the same
    dimension set, creates a Pattern (or reuses an existing one with
    the same name) and links each signal to it via a Relationship row.

    Returns the list of Pattern rows involved (both newly created and
    pre-existing ones that got new signals linked to them).
    """
    all_signals = crud.list_signals(db, skip=0, limit=1000)
    signal_dimension_map = {
        signal.id: dimension_set_for_signal(db, signal.id) for signal in all_signals
    }

    groups = group_signals_by_dimensions(signal_dimension_map, min_group_size)

    result_patterns = []
    for dims, signal_ids in groups:
        pattern_name = _pattern_name_for_dimensions(dims)
        pattern = crud.get_pattern_by_name(db, pattern_name)

        if pattern is None:
            pattern = crud.create_pattern(
                db,
                schemas.PatternCreate(
                    name=pattern_name,
                    description=(
                        "Signals repeatedly showing impact across: "
                        + ", ".join(sorted(dims))
                    ),
                ),
            )

        # Link every signal in this group to the pattern, skipping any
        # link that's already there so re-running detection doesn't
        # create duplicate relationship rows for signals already linked.
        existing_links = {
            r.source_id
            for r in crud.list_relationships(db)
            if r.target_id == pattern.id
            and r.target_type == "pattern"
            and r.relationship_type == "supports"
        }
        for signal_id in signal_ids:
            if signal_id in existing_links:
                continue
            crud.create_relationship(
                db,
                schemas.RelationshipCreate(
                    source_type="signal",
                    source_id=signal_id,
                    target_type="pattern",
                    target_id=pattern.id,
                    relationship_type="supports",
                ),
            )

        result_patterns.append(pattern)

    return result_patterns
