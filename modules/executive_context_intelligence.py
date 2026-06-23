import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

URG = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def run_executive_context(path):
    with open(path) as f:
        data = json.load(f)
    feed = []  # (urgency_score, label, context)
    # open incidents
    for i in data.get("incidents", []):
        feed.append((URG.get(i.get("impact"), 2), "incident",
                     f"{i['entity']} — {i['type']} ({i['impact']})"))
    # critical SPOFs
    for a in data.get("agents", []) + data.get("workflows", []):
        if (a.get("criticality") or "").lower() == "critical" and not a.get("backup_owner"):
            feed.append((4, "single-point-of-failure", f"{a['name']} has no backup owner"))
    # pending decisions
    for d in data.get("decisions_log", []):
        if d.get("outcome") == "pending":
            feed.append((3, "pending-decision", d.get("decision", "")))
    # declining metric
    hist = data.get("history", [])
    if len(hist) >= 2 and hist[-1].get("backup_pct", 0) < 50:
        feed.append((3, "weak-metric", f"Backup coverage only {hist[-1]['backup_pct']}%"))
    feed.sort(key=lambda x: -x[0])
    summary = {"items": len(feed), "feed": feed}
    return summary


def display_executive_context(summary, company):
    console.print(f"\nM27 · EXECUTIVE CONTEXT INTELLIGENCE — {company}\n")
    console.print("Ranks 'what matters right now' so leaders focus on the most urgent context first.\n")
    t = Table(title="What matters now (most urgent first)")
    t.add_column("Urgency"); t.add_column("Type"); t.add_column("Context")
    label = {4: "CRITICAL", 3: "HIGH", 2: "MEDIUM", 1: "LOW"}
    for score, typ, ctx in summary["feed"][:12]:
        t.add_row(label.get(score, "MEDIUM"), typ, ctx)
    console.print(t)
    console.print(f"\nContext items ranked: {summary['items']}")
    console.print("")
