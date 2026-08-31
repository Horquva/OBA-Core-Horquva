"""
M27 - Executive Context Intelligence
Constitutional Question: "What matters right now, and in what order?"
Purpose: Produce a live, urgency-ranked executive context feed by fusing open
         incidents, single points of failure, pending decisions, dependency
         blast radius, and declining metrics into one prioritized view.

Owner: Kamran - Intelligence Layer
Consumes: incidents, agents, workflows, decisions_log, dependencies, history
Produces: ranked 'what matters now' feed for M21 avatar / M23 briefing
"""

import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

URG = {"critical": 4, "high": 3, "medium": 2, "low": 1}
LABEL = {4: "CRITICAL", 3: "HIGH", 2: "MEDIUM", 1: "LOW"}


def run_executive_context(path):
    with open(path) as f:
        data = json.load(f)

    # Dependency blast radius per entity - drives up urgency.
    dep_load = Counter()
    for d in data.get("dependencies", []):
        dep_load[d.get("to") or d.get("target")] += 1

    feed = []  # (urgency_score, label, type, context)

    # 1) Open / recent incidents.
    for i in data.get("incidents", []):
        score = URG.get(i.get("impact"), 2)
        feed.append((score, "incident",
                     f"{i.get('entity')} - {i.get('type')} ({i.get('impact')}), {i.get('date')}"))

    # 2) Critical single points of failure (no backup on critical asset).
    for a in data.get("agents", []) + data.get("workflows", []):
        name = a.get("name", a.get("id"))
        crit = (a.get("criticality") or "").lower()
        if crit == "critical" and not a.get("backup_owner"):
            blast = dep_load.get(name, 0)
            score = 4 if blast else 4
            extra = f" (feeds {blast} dependency/ies)" if blast else ""
            feed.append((score, "single-point-of-failure",
                         f"{name} has no backup owner{extra}"))
        elif crit == "high" and not a.get("backup_owner"):
            feed.append((3, "single-point-of-failure", f"{name} (high) has no backup owner"))

    # 3) Pending decisions awaiting leadership.
    for d in data.get("decisions_log", []):
        if d.get("outcome") == "pending":
            feed.append((3, "pending-decision",
                         f"{d.get('decision')} ({d.get('area')})"))

    # 4) Declining / weak metrics from latest history point.
    hist = data.get("history", [])
    if hist:
        latest = hist[-1]
        if latest.get("backup_pct", 100) < 50:
            feed.append((3, "weak-metric", f"Backup coverage only {latest['backup_pct']}%"))
        if latest.get("documented_pct", 100) < 50:
            feed.append((2, "weak-metric", f"Documentation only {latest['documented_pct']}%"))
        if len(hist) >= 2 and latest.get("risk_index", 0) > hist[-2].get("risk_index", 0):
            feed.append((3, "trend-alert",
                         f"Risk index rising ({hist[-2].get('risk_index')} -> {latest.get('risk_index')})"))

    # Rank by urgency, de-dup on context text.
    seen, ranked = set(), []
    for score, typ, ctx in sorted(feed, key=lambda x: -x[0]):
        if ctx in seen:
            continue
        seen.add(ctx)
        ranked.append((score, typ, ctx))

    by_type = Counter(t for _, t, _ in ranked)
    top_urgency = LABEL.get(ranked[0][0], "LOW") if ranked else "NONE"
    return {"items": len(ranked), "feed": ranked,
            "by_type": dict(by_type), "top_urgency": top_urgency}


def display_executive_context(summary, company):
    console.print(f"\nM27 - EXECUTIVE CONTEXT INTELLIGENCE - {company}\n")
    console.print("Ranks 'what matters right now' so leaders focus on the most urgent context first.\n")
    console.print(f"Highest live urgency: {summary['top_urgency']} - {summary['items']} context item(s) ranked")
    t = Table(title="What matters now (most urgent first)")
    t.add_column("Urgency"); t.add_column("Type"); t.add_column("Context")
    for score, typ, ctx in summary["feed"][:14]:
        t.add_row(LABEL.get(score, "MEDIUM"), typ, ctx)
    console.print(t)
    if summary["by_type"]:
        console.print("\nBy type: " + ", ".join(f"{k}: {v}" for k, v in summary["by_type"].items()))
    console.print("")
