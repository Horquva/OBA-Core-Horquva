"""
M25 - Organizational Health Intelligence
Constitutional Question: "How healthy is the organization right now, and where is it heading?"
Purpose: Produce a single composite Organizational Health Index from weighted
         resilience dimensions, break it down by dimension and department, and
         read the trend from historical time-series data.

Owner: Kamran - Intelligence Layer
Consumes: agents, workflows, incidents, knowledge_areas, history
Produces: composite index (0-100), per-dimension + per-department scores, trend, risk drivers
"""

import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)

# Dimension weights - continuity + critical safety matter most for resilience.
WEIGHTS = {
    "Documentation": 0.20,
    "Continuity (backups)": 0.25,
    "Ownership spread": 0.15,
    "Critical safety": 0.25,
    "Incident load": 0.15,
}


def _pct(n, d):
    return round(100 * n / d) if d else 0


def run_organizational_health(path):
    with open(path) as f:
        data = json.load(f)
    assets = data.get("agents", []) + data.get("workflows", [])
    total = len(assets) or 1

    documented = sum(1 for a in assets if a.get("documented", False))
    backed = sum(1 for a in assets if a.get("backup_owner"))
    owners = {a.get("owner") for a in assets if a.get("owner")}
    crit_assets = [a for a in assets if (a.get("criticality") or "").lower() == "critical"]
    crit_unbacked = sum(1 for a in crit_assets if not a.get("backup_owner"))
    open_incidents = sum(1 for i in data.get("incidents", []) if i.get("impact") in ("critical", "high"))

    dims = {
        "Documentation": _pct(documented, total),
        "Continuity (backups)": _pct(backed, total),
        "Ownership spread": min(100, _pct(len(owners), total)),
        "Critical safety": _pct(len(crit_assets) - crit_unbacked, len(crit_assets) or 1),
        "Incident load": max(0, 100 - open_incidents * 15),
    }
    # Weighted composite index.
    index = round(sum(dims[k] * WEIGHTS[k] for k in dims))
    state = "CRITICAL" if index < 40 else ("WARNING" if index < 60 else "STABLE")

    # Per-department health (share of documented + backed assets).
    dept_stat = defaultdict(lambda: {"n": 0, "doc": 0, "backup": 0})
    for a in assets:
        dept = a.get("department", "Unknown")
        dept_stat[dept]["n"] += 1
        dept_stat[dept]["doc"] += 1 if a.get("documented") else 0
        dept_stat[dept]["backup"] += 1 if a.get("backup_owner") else 0
    departments = []
    for dept, s in dept_stat.items():
        score = round((_pct(s["doc"], s["n"]) + _pct(s["backup"], s["n"])) / 2)
        departments.append((dept, s["n"], score))
    departments.sort(key=lambda x: x[2])

    # Trend from history (risk_index lower is better).
    hist = data.get("history", [])
    trend, delta = "flat", 0
    if len(hist) >= 2:
        delta = hist[0].get("risk_index", 0) - hist[-1].get("risk_index", 0)
        trend = "improving" if delta > 0 else ("declining" if delta < 0 else "flat")

    # Weakest dimensions become the headline risk drivers.
    drivers = sorted(dims.items(), key=lambda kv: kv[1])[:2]
    return {
        "index": index, "state": state, "dims": dims, "trend": trend, "delta": delta,
        "history": hist, "departments": departments, "drivers": drivers,
        "crit_unbacked": crit_unbacked,
    }


def display_organizational_health(summary, company):
    console.print(f"\nM25 - ORGANIZATIONAL HEALTH INTELLIGENCE - {company}\n")
    console.print("A single weighted health index across all resilience dimensions, with trend + department view.\n")
    console.print(f"ORGANIZATIONAL HEALTH INDEX: {summary['index']}/100 - {summary['state']}  (trend: {summary['trend']})")
    d = summary["drivers"]
    if d:
        console.print(f"Biggest drags: {d[0][0]} ({d[0][1]}/100)" + (f", {d[1][0]} ({d[1][1]}/100)" if len(d) > 1 else ""))
    t = Table(title="Health by dimension (weighted)")
    t.add_column("Dimension"); t.add_column("Score"); t.add_column("Weight")
    for k, v in summary["dims"].items():
        t.add_row(k, f"{v}/100", f"{int(WEIGHTS[k]*100)}%")
    console.print(t)
    dt = Table(title="Weakest departments first")
    dt.add_column("Department"); dt.add_column("Assets"); dt.add_column("Health")
    for dept, n, score in summary["departments"][:6]:
        dt.add_row(dept, str(n), f"{score}/100")
    console.print(dt)
    if summary["history"]:
        line = "  ".join(f"{h['month']}:{h['risk_index']}" for h in summary["history"])
        console.print(f"\nRisk-index trend (lower is better): {line}")
    console.print("")
