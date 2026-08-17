"""
main.py

Entry point for the Organizational Futures Platform - Day 2 build.

This wires up the "Initial APIs / Services" the roadmap asks for in
Part-2:
  - creating organizational signals
  - retrieving organizational models
  - querying organizational dimensions
  - storing organizational analysis (impacts)
  - retrieving relationships
  - accessing candidate patterns / capabilities

Run it with:
    uvicorn app.main:app --reload

Then open http://127.0.0.1:8000/docs to try the endpoints in the
browser - that's the fastest way I found to sanity check everything
without writing a separate client.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app import models, schemas, crud, impact_engine, pattern_engine, model_engine, capability_engine
from app.dashboard_html import DASHBOARD_HTML
from app.database import Base, engine, SessionLocal, get_db

# Create all the tables on startup if they don't already exist.
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # BUGFIX (pre-integration review): @app.on_event("startup") is
    # deprecated in current FastAPI and will eventually be removed -
    # switched to the lifespan handler so seed_dimensions() keeps
    # running on startup without relying on deprecated API.
    seed_dimensions()
    yield


app = FastAPI(
    title="Organizational Futures Platform",
    description="Part-1 through Part-8 of the roadmap: signal ingestion, "
    "impact analysis, pattern detection, future modeling, candidate "
    "capability generation, intelligence retrieval, and a live dashboard.",
    version="0.9.0",
    lifespan=lifespan,
)


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    """
    Day 9 / Part-8 "Final User Experience": a single-page live view of
    real platform data - signals, patterns, models, and candidate
    capabilities - with buttons that call the actual engines built in
    Days 4-7 directly. No hard-coded demo content; everything on this
    page comes from the same API a script or another service would use.
    """
    return DASHBOARD_HTML


def seed_dimensions():
    """
    The 10 organizational dimensions from Part-3 don't change often, so
    it's fine to seed them once on startup instead of forcing someone to
    POST them in by hand every time the DB is reset.
    """
    db = SessionLocal()
    try:
        existing = {d.name for d in crud.list_dimensions(db)}
        descriptions = {
            models.DimensionName.LEADERSHIP: "How leadership roles and authority are structured.",
            models.DimensionName.GOVERNANCE: "How rules, oversight, and decision rights are governed.",
            models.DimensionName.DECISION_MAKING: "How and where decisions actually get made.",
            models.DimensionName.WORKFORCE: "How work is staffed, organized, and distributed.",
            models.DimensionName.COLLABORATION: "How people (and AI systems) work together.",
            models.DimensionName.ACCOUNTABILITY: "Who is answerable for outcomes and how that's tracked.",
            models.DimensionName.TRUST: "How trust is built, verified, and maintained.",
            models.DimensionName.ORGANIZATIONAL_MEMORY: "How knowledge is captured and retained over time.",
            models.DimensionName.OPERATIONAL_EXECUTION: "How day-to-day operations actually get carried out.",
            models.DimensionName.ORGANIZATIONAL_INTELLIGENCE: "How the organization senses and reasons about itself.",
        }
        for name, desc in descriptions.items():
            if name not in existing:
                db.add(models.OrganizationalDimension(name=name, description=desc))
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "platform": "Organizational Futures Engineering Platform",
        "day": "Day 2 - Part-2 Engineering Foundation",
        "status": "running",
    }


# ---------- Signals ----------

@app.post("/signals", response_model=schemas.SignalOut)
def create_signal(
    signal: schemas.SignalCreate,
    check_duplicates: bool = True,
    db: Session = Depends(get_db),
):
    """
    Ingest a new organizational signal.

    check_duplicates defaults to True - before writing the signal, we run
    a naive similarity check against existing signals. If something looks
    like a likely duplicate we don't block the write (a human might really
    mean to log a second, similar observation), but we return a 409 so the
    caller can decide, instead of silently creating what might be a
    duplicate. Pass check_duplicates=false to skip this and force the
    write.
    """
    if check_duplicates:
        possible_dupes = crud.find_possible_duplicate_signals(
            db, signal.title, signal.description
        )
        if possible_dupes:
            top_matches = [
                {"signal_id": s.id, "title": s.title, "similarity": round(score, 2)}
                for s, score in possible_dupes[:3]
            ]
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "This looks similar to existing signal(s). "
                    "Retry with check_duplicates=false to create it anyway.",
                    "possible_duplicates": top_matches,
                },
            )
    return crud.create_signal(db, signal)


@app.get("/signals/{signal_id}", response_model=schemas.SignalOut)
def read_signal(signal_id: str, db: Session = Depends(get_db)):
    db_signal = crud.get_signal(db, signal_id)
    if db_signal is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return db_signal


@app.get("/signals", response_model=list[schemas.SignalOut])
def read_signals(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return crud.list_signals(db, skip, limit)


@app.patch("/signals/{signal_id}", response_model=schemas.SignalOut)
def patch_signal(
    signal_id: str, update: schemas.SignalUpdate, db: Session = Depends(get_db)
):
    """
    Update an existing signal. The pre-update state is written to
    signal_history automatically (see crud.update_signal) so nothing
    gets silently overwritten - this is the "updating analyses" +
    "maintaining provenance" + "versioning" requirement from Part-2.
    """
    db_signal = crud.update_signal(db, signal_id, update)
    if db_signal is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return db_signal


@app.get("/signals/{signal_id}/history", response_model=list[schemas.SignalHistoryOut])
def read_signal_history(signal_id: str, db: Session = Depends(get_db)):
    """Retrieve the version history for a signal."""
    if crud.get_signal(db, signal_id) is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return crud.get_signal_history(db, signal_id)


# ---------- Evidence ----------

@app.post("/evidence", response_model=schemas.EvidenceOut)
def create_evidence(evidence: schemas.EvidenceCreate, db: Session = Depends(get_db)):
    """Attach a piece of supporting evidence to a signal."""
    if crud.get_signal(db, evidence.signal_id) is None:
        raise HTTPException(status_code=404, detail="Signal not found for this evidence")
    return crud.create_evidence(db, evidence)


@app.get("/signals/{signal_id}/evidence", response_model=list[schemas.EvidenceOut])
def read_evidence_for_signal(signal_id: str, db: Session = Depends(get_db)):
    return crud.list_evidence_for_signal(db, signal_id)


# ---------- Organizational Dimensions ----------

@app.get("/dimensions", response_model=list[schemas.DimensionOut])
def read_dimensions(db: Session = Depends(get_db)):
    """Query the fixed list of organizational dimensions."""
    return crud.list_dimensions(db)


# ---------- Impacts / Organizational Analysis ----------

@app.post("/analysis", response_model=schemas.ImpactOut)
def create_analysis(impact: schemas.ImpactCreate, db: Session = Depends(get_db)):
    """
    Store a piece of organizational analysis (an Impact) linking a
    signal to a dimension. This is Day 2's stand-in for the full
    Signal Processing Engine that gets built in Part-3 - for now it just
    needs to prove the analysis can be written and read back correctly.
    """
    if crud.get_signal(db, impact.signal_id) is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return crud.create_impact(db, impact)


@app.get("/signals/{signal_id}/analysis", response_model=list[schemas.ImpactOut])
def read_analysis_for_signal(signal_id: str, db: Session = Depends(get_db)):
    return crud.list_impacts_for_signal(db, signal_id)


@app.post("/signals/{signal_id}/analyze", response_model=list[schemas.ImpactOut])
def analyze_signal(signal_id: str, force: bool = False, db: Session = Depends(get_db)):
    """
    Day 4 / Part-3: runs the v1 Impact Analysis Engine against a signal
    that's already in the database. Classifies which organizational
    dimensions it affects (keyword-based for v1) and writes real Impact
    + Relationship rows.

    If the signal was already analyzed, returns the existing impacts
    instead of creating duplicates - pass force=true to re-run analysis
    and add fresh impact rows anyway.
    """
    if crud.get_signal(db, signal_id) is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return impact_engine.analyze_signal(db, signal_id, force=force)


# ---------- Organizational Models ----------

@app.get("/models", response_model=list[schemas.OrganizationModelOut])
def read_organization_models(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return crud.list_organization_models(db, skip, limit)


@app.get("/models/{model_id}", response_model=schemas.OrganizationModelOut)
def read_organization_model(model_id: str, db: Session = Depends(get_db)):
    db_model = crud.get_organization_model(db, model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Organization model not found")
    return db_model


@app.post("/models/build", response_model=schemas.OrganizationModelOut)
def build_future_model(request: schemas.ModelBuildRequest, db: Session = Depends(get_db)):
    """
    Day 6 / Part-5: builds a Future Organizational Model from one or
    more existing patterns. The caller decides which pattern_ids to
    combine - the engine assembles the model's dimensions and evidence
    trail from the real signal/pattern relationship graph rather than
    anything hand-typed.

    Returns 404 if none of the given pattern_ids exist.
    """
    model = model_engine.build_future_model(db, request.pattern_ids, request.name)
    if model is None:
        raise HTTPException(
            status_code=404, detail="None of the given pattern_ids were found"
        )
    return model


@app.get("/models/{model_id}/support", response_model=list[schemas.RelationshipOut])
def read_model_support(model_id: str, db: Session = Depends(get_db)):
    """
    Queryable Intelligence (Part-5): 'which patterns support this
    model?' - answered directly from the relationship graph instead of
    re-deriving it, since build_future_model already wrote these edges
    down when the model was created.
    """
    if crud.get_organization_model(db, model_id) is None:
        raise HTTPException(status_code=404, detail="Organization model not found")
    return [
        r for r in crud.list_relationships(db)
        if r.target_type == "model" and r.target_id == model_id
    ]


# ---------- Patterns / Candidate Capabilities ----------

@app.get("/patterns", response_model=list[schemas.PatternOut])
def read_patterns(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return crud.list_patterns(db, skip, limit)


@app.post("/patterns/detect", response_model=list[schemas.PatternOut])
def detect_patterns(min_group_size: int = 2, db: Session = Depends(get_db)):
    """
    Day 5 / Part-4: runs the v1 Pattern Detection Engine across every
    signal currently in the database. Groups signals that share the
    exact same set of Day-4 impact dimensions and creates (or reuses)
    a Pattern for each group, linking every matching signal to it.

    min_group_size controls how many signals need to share a dimension
    set before it counts as a pattern - defaults to 2, since a single
    signal is just an observation, not yet a reusable pattern.
    """
    return pattern_engine.detect_patterns(db, min_group_size=min_group_size)


@app.get("/candidate-capabilities", response_model=list[schemas.CandidateCapabilityOut])
def read_candidate_capabilities(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Access candidate capabilities. These are proposals only - the
    platform never marks these as approved, that's Capability
    Validation's job, not ours."""
    return crud.list_candidate_capabilities(db, skip, limit)


@app.get("/candidate-capabilities/{capability_id}", response_model=schemas.CandidateCapabilityOut)
def read_candidate_capability(capability_id: str, db: Session = Depends(get_db)):
    capability = crud.get_candidate_capability(db, capability_id)
    if capability is None:
        raise HTTPException(status_code=404, detail="Candidate capability not found")
    return capability


class CapabilityBuildRequest(schemas.BaseModel):
    # protected_namespaces=() silences pydantic's "model_id conflicts
    # with protected namespace 'model_'" warning - model_id here means
    # "id of an OrganizationModel", nothing to do with pydantic's own
    # model_* internals, so the warning was a false positive.
    model_config = {"protected_namespaces": ()}

    model_id: str
    name: str | None = None


@app.post("/capabilities/build", response_model=schemas.CandidateCapabilityOut)
def build_candidate_capability(request: CapabilityBuildRequest, db: Session = Depends(get_db)):
    """
    Day 7 / Part-6: turns an existing future model into a candidate
    capability suggestion. Always created with status="candidate" -
    this platform proposes, it never approves (that's Capability
    Validation's job downstream).
    """
    capability = capability_engine.build_candidate_capability(
        db, request.model_id, request.name
    )
    if capability is None:
        raise HTTPException(status_code=404, detail="Organization model not found")
    return capability


@app.get("/intelligence/trace/{signal_id}")
def read_intelligence_trace(signal_id: str, db: Session = Depends(get_db)):
    """
    Day 7 / Part-6 "Intelligence Retrieval": walks the full graph
    starting from one signal - its impacts, the patterns it supports,
    the models those patterns informed, and the candidate capabilities
    those models suggested - so the whole Signal -> Impact -> Pattern
    -> Model -> Capability trail is queryable in a single call.
    """
    trace = capability_engine.trace_signal(db, signal_id)
    if trace is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return trace


# ---------- Relationships ----------

@app.post("/relationships", response_model=schemas.RelationshipOut)
def create_relationship(rel: schemas.RelationshipCreate, db: Session = Depends(get_db)):
    return crud.create_relationship(db, rel)


@app.get("/relationships", response_model=list[schemas.RelationshipOut])
def read_relationships(source_id: str | None = None, db: Session = Depends(get_db)):
    """Retrieve relationships, optionally filtered by source_id."""
    return crud.list_relationships(db, source_id)
