"""
M24 - Decision Support Intelligence
Constitutional Question: "What should leadership decide next, and in what order?"
Purpose: Convert raw organizational risk + intelligence into a prioritized,
         evidence-backed decision queue with an explicit priority score,
         expected impact, effort, and urgency for each recommended action.

Owner: Kamran - Intelligence Layer
Consumes: agents, workflows, incidents, decisions_log, knowledge_areas, dependencies
Produces: ranked decision queue + past-decision review for executives / M23 briefing
"""

import io
import json
import sys
from collections import Counter, defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

CRIT = {"critical": 4, "high": 3, "medium": 2, "low": 1}
EFFORT_RANK = {"Low": 1, "Medium": 2, "High": 3}


def _priority_score(impact, urgency, effort):
    """Weighted priority model: high impact + high urgency + low effort wins.
    Score is normalised to 0-100 so executives can compare actions directly."""
    raw = (impact * 2.0 + urgency * 1.5) / (EFFORT_RANK.get(effort, 2))
    return round(min(100, raw / 11 * 100))


def run_decision_support(path):
    with open(path) as f:
        data = json.load(f)

    assets = [dict(a, _kind="agent") for a in data.get("agents", [])] + \
             [dict(w, _kind="workflow") for w in data.get("workflows", [])]

    # How many active incidents touch each entity (adds urgency).
    incident_hits = Counter(i.get("entity") for i in data.get("incidents", []))
    # How many dependencies point at each owner/entity (adds blast radius).
    dep_load = Counter()
    for d in data.get("dependencies", []):
        dep_load[d.get("to") or d.get("target")] += 1

    decisions = []  # dicts
    for a in assets:
        name = a.get("name", a.get("id", "unknown"))
        crit = (a.get("criticality") or "medium").lower()
        base_impact = CRIT.get(crit, 2)
        has_incident = incident_hits.get(name, 0)
        blast = dep_load.get(name, 0)

        # Missing backup owner on a critical/high asset = single point of failure.
        if crit in ("critical", "high") and not a.get("backup_owner"):
            urgency = base_impact + (1 if has_incident else 0)
            effort = "Low"
            decisions.append({
                "action": f"Assign a backup owner to {name}",
                "impact": "Removes a single point of failure",
                "effort": effort,
                "urgency": "This week" if crit == "critical" else "This month",
                "score": _priority_score(base_impact + blast, urgency, effort),
                "driver": "single_point_of_failure",
            })
        # Undocumented critical/high asset = knowledge continuity risk.
        if crit in ("critical", "high") and not a.get("documented", False):
            effort = "Medium"
            urgency_val = base_impact
            decisions.append({
                "action": f"Document {name}",
                "impact": "Protects knowledge if the owner leaves",
                "effort": effort,
                "urgency": "This month",
                "score": _priority_score(base_impact, urgency_val, effort),
                "driver": "undocumented_knowledge",
            })
        # Entity with active incidents but critical = stabilise first.
        if has_incident and crit in ("critical", "high"):
            effort = "Medium"
            decisions.append({
                "action": f"Stabilise {name} after recent incident(s)",
                "impact": f"{has_incident} incident(s) recorded on this entity",
                "effort": effort,
                "urgency": "This week",
                "score": _priority_score(base_impact + 1, base_impact + 1, effort),
                "driver": "active_incident",
            })

    # De-duplicate identical actions, keep the highest score.
    best = {}
    for d in decisions:
        cur = best.get(d["action"])
        if cur is None or d["score"] > cur["score"]:
            best[d["action"]] = d
    ranked = sorted(best.values(), key=lambda d: -d["score"])

    # Review past decisions that went sideways or are still open.
    review = [d for d in data.get("decisions_log", [])
              if d.get("outcome") in ("negative", "mixed", "pending")]
    irreversible_bad = [d for d in review
                        if d.get("outcome") == "negative" and not d.get("reversible", True)]

    by_driver = Counter(d["driver"] for d in ranked)
    return {
        "queue": len(ranked),
        "top": ranked[:12],
        "by_driver": dict(by_driver),
        "review": review,
        "revisit": len(review),
        "irreversible_bad": irreversible_bad,
    }


def display_decision_support(summary, company):
    console.print(f"\nM24 - DECISION SUPPORT INTELLIGENCE - {company}\n")
    console.print("Turns raw risks into a scored, prioritized 'what to do next' queue for executives.\n")
    t = Table(title="Recommended decision queue (highest priority first)")
    t.add_column("#"); t.add_column("Score"); t.add_column("Action")
    t.add_column("Impact"); t.add_column("Effort"); t.add_column("Urgency")
    for i, d in enumerate(summary["top"], 1):
        t.add_row(str(i), f"{d['score']}/100", d["action"], d["impact"], d["effort"], d["urgency"])
    console.print(t)
    console.print(f"\nTotal decisions queued: {summary['queue']}")
    if summary["by_driver"]:
        drivers = ", ".join(f"{k}: {v}" for k, v in summary["by_driver"].items())
        console.print(f"Drivers: {drivers}")
    if summary["review"]:
        console.print(f"Past decisions to revisit: {summary['revisit']}")
        for d in summary["review"][:4]:
            console.print(f"   - [{d.get('outcome')}] {d.get('decision')} ({d.get('area')}, {d.get('date')})")
    if summary["irreversible_bad"]:
        console.print(f"[!] {len(summary['irreversible_bad'])} negative & irreversible decision(s) on record - learn from these.")
    console.print("")
