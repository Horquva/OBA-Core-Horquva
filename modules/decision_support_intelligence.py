import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

SCORE = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def run_decision_support(path):
    with open(path) as f:
        data = json.load(f)
    assets = data.get("agents", []) + data.get("workflows", [])
    decisions = []  # (priority, action, impact, effort, urgency)
    for a in assets:
        crit = (a.get("criticality") or "medium").lower()
        if crit in ("critical", "high") and not a.get("backup_owner"):
            decisions.append((SCORE[crit] + 2, f"Assign a backup owner to {a['name']}",
                              "Removes a single point of failure", "Low", "This week"))
        if crit in ("critical", "high") and not a.get("documented", False):
            decisions.append((SCORE[crit] + 1, f"Document {a['name']}",
                              "Protects knowledge if owner leaves", "Medium", "This month"))
    decisions.sort(key=lambda d: -d[0])

    # review past decisions that went negative / pending
    review = [d for d in data.get("decisions_log", []) if d.get("outcome") in ("negative", "mixed", "pending")]
    summary = {"queue": len(decisions), "top": decisions[:10],
               "review": review, "revisit": len(review)}
    return summary


def display_decision_support(summary, company):
    console.print(f"\nM24 · DECISION SUPPORT INTELLIGENCE — {company}\n")
    console.print("Turns raw risks into a prioritized 'what to do next' queue for executives.\n")
    t = Table(title="Recommended decision queue (highest priority first)")
    t.add_column("#"); t.add_column("Action"); t.add_column("Impact"); t.add_column("Effort"); t.add_column("Urgency")
    for i, (p, action, impact, effort, urg) in enumerate(summary["top"], 1):
        t.add_row(str(i), action, impact, effort, urg)
    console.print(t)
    console.print(f"\nTotal decisions queued: {summary['queue']}")
    if summary["review"]:
        console.print(f"Past decisions to revisit: {summary['revisit']}")
        for d in summary["review"][:4]:
            console.print(f"   · [{d.get('outcome')}] {d.get('decision')} ({d.get('area')}, {d.get('date')})")
    console.print("")
