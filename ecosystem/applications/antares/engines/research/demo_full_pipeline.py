"""
demo_full_pipeline.py

Day 10 - final walkthrough script. Not part of the core platform,
same idea as Day 2's seed_demo_data.py but taken all the way through
the pipeline: pushes a few realistic organizational signals through
the REAL API (never writes to the database directly), runs them
through every engine built across Days 4-9, and prints the result at
each stage - so this doubles as both a demo script and one more
end-to-end sanity check that the whole platform still works together.

Run this AFTER the server is running:
    uvicorn app.main:app --reload
    python demo_full_pipeline.py

Then open http://127.0.0.1:8000/dashboard to see the same data live.
"""

import httpx

BASE_URL = "http://127.0.0.1:8000"

# Two pairs of signals, each pair worded to trigger the same
# dimensions so pattern detection actually finds something - single
# signals never become a pattern (Part-4's rule: patterns need
# multiple observations).
DEMO_SIGNAL_PAIRS = [
    (
        "Flattened management at TechCorp",
        "Removed a layer of middle management and gave teams direct "
        "decision-making authority over hiring and daily operations.",
    ),
    (
        "Flattened management at Vantage Labs",
        "Removed a layer of middle management and gave teams direct "
        "decision-making authority over hiring and daily operations "
        "company-wide.",
    ),
    (
        "Governance overhaul at Meridian Group",
        "New governance policy changed how the board approves and "
        "oversees budget decisions across all departments.",
    ),
    (
        "Governance overhaul at Northbridge",
        "Board adopted a new governance policy requiring transparent "
        "budget approval and oversight at every level.",
    ),
]
# Note: the first two signals are worded almost identically on purpose.
# v1's keyword-based classifier (Day 4) is brittle to exact phrasing -
# "layer of middle management" and "management layer" (same words,
# different order) match different dimensions. Keeping the wording this
# close for the demo is a workaround, not a fix - the real fix is
# semantic/embedding-based classification, noted as future work back
# in DAY4_NOTES.md and DAY5_NOTES.md.


def section(title):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def run():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:

        section("STEP 1: Ingest organizational signals")
        signal_ids = []
        for title, description in DEMO_SIGNAL_PAIRS:
            resp = client.post(
                "/signals?check_duplicates=false",
                json={"title": title, "description": description, "source": "demo-script"},
            )
            resp.raise_for_status()
            signal = resp.json()
            signal_ids.append(signal["id"])
            print(f"  created signal: {signal['title']}  (id={signal['id']})")

        section("STEP 2: Impact analysis (Part-3)")
        for sid in signal_ids:
            resp = client.post(f"/signals/{sid}/analyze")
            impacts = resp.json()
            print(f"  signal {sid}: {len(impacts)} impact(s) found")

        section("STEP 3: Pattern detection (Part-4)")
        patterns = client.post("/patterns/detect").json()
        for p in patterns:
            print(f"  pattern: {p['name']}  (confidence={p['confidence']})")

        section("STEP 4: Future model building (Part-5)")
        model_ids = []
        for p in patterns:
            model = client.post("/models/build", json={"pattern_ids": [p["id"]]}).json()
            model_ids.append(model["id"])
            print(f"  model: {model['name']}  (confidence={model['confidence']})")

        section("STEP 5: Candidate capability generation (Part-6)")
        for mid in model_ids:
            capability = client.post("/capabilities/build", json={"model_id": mid}).json()
            print(f"  capability: {capability['name']}  (status={capability['status']})")

        section("STEP 6: Full intelligence trace for one signal")
        trace = client.get(f"/intelligence/trace/{signal_ids[0]}").json()
        print(f"  signal:      {trace['signal']['title']}")
        print(f"  impacts:     {len(trace['impacts'])}")
        print(f"  patterns:    {len(trace['patterns'])}")
        print(f"  models:      {len(trace['models'])}")
        print(f"  capabilities:{len(trace['candidate_capabilities'])}")

        section("Done")
        print("Open http://127.0.0.1:8000/dashboard to see this data live.")


if __name__ == "__main__":
    run()
