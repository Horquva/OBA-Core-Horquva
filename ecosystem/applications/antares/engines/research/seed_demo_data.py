"""
seed_demo_data.py

Not part of the core platform - this is just a script I wrote so I have
something to actually show when I demo Day 2 instead of an empty
database. Pushes a handful of realistic-ish signals, evidence, and
analysis through the real API endpoints (not by writing to the DB
directly) so it also doubles as one more end-to-end sanity check.

Run this AFTER the server is running:
    uvicorn app.main:app --reload
    python seed_demo_data.py
"""

import httpx

BASE_URL = "http://127.0.0.1:8000"

DEMO_SIGNALS = [
    {
        "title": "Squad-based budget authority at a mid-size SaaS company",
        "description": "Company removed a layer of middle management and gave "
        "product squads direct authority over their own budgets.",
        "source": "internal case study",
        "context": "Observed during Q2 2026 restructuring review",
        "evidence_state": "observed",
        "dimension": "governance",
        "impact_notes": "Decision rights moved down from directors to squad leads.",
    },
    {
        "title": "AI copilots added to on-call incident response",
        "description": "Engineering org gave every on-call engineer an AI copilot "
        "that drafts the initial incident summary and pages the right people.",
        "source": "public engineering blog post",
        "context": "Rolled out gradually over 6 months",
        "evidence_state": "supported",
        "dimension": "operational_execution",
        "impact_notes": "Time-to-first-response dropped, but engineers report "
        "needing to double check AI-drafted summaries before trusting them.",
    },
    {
        "title": "Company-wide shift to async decision logs instead of meetings",
        "description": "Leadership replaced most recurring status meetings with "
        "written decision logs that anyone can comment on asynchronously.",
        "source": "internal case study",
        "context": "Motivated by a distributed, multi-timezone workforce",
        "evidence_state": "observed",
        "dimension": "decision_making",
        "impact_notes": "Slower initial decisions but a much clearer paper trail "
        "of why a decision was made.",
    },
]


def main():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        dims = {d["name"]: d["id"] for d in client.get("/dimensions").json()}

        for demo in DEMO_SIGNALS:
            payload = {
                "title": demo["title"],
                "description": demo["description"],
                "source": demo["source"],
                "context": demo["context"],
                "evidence_state": demo["evidence_state"],
            }
            r = client.post("/signals", json=payload)
            if r.status_code == 409:
                print(f"[skip - looks like a duplicate] {demo['title']}")
                continue
            r.raise_for_status()
            signal = r.json()
            print(f"[created signal] {signal['id']}  {signal['title']}")

            client.post("/evidence", json={
                "signal_id": signal["id"],
                "description": f"Supporting source: {demo['source']}",
                "source_reference": demo["source"],
                "evidence_state": demo["evidence_state"],
            })

            dim_id = dims.get(demo["dimension"])
            if dim_id:
                client.post("/analysis", json={
                    "signal_id": signal["id"],
                    "dimension_id": dim_id,
                    "description": demo["impact_notes"],
                    "confidence": "supported",
                })

        print("\nDone. Try GET /signals or the /docs page to see everything.")


if __name__ == "__main__":
    main()
