import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def _pct(n, d):
    return round(100 * n / d) if d else 0


def run_capability_intelligence(path):
    """M39 - Capability Intelligence.
    Measures how capable each department is at operating and sustaining its
    AI-augmented workflows: documentation, backup coverage and ownership depth.
    """
    with open(path) as f:
        data = json.load(f)

    assets = data.get("agents", []) + data.get("workflows", [])
    by_dept = defaultdict(list)
    for a in assets:
        by_dept[a.get("department", "Unassigned")].append(a)

    rows = []
    for dept, items in by_dept.items():
        total = len(items) or 1
        documented = sum(1 for a in items if a.get("documented", False))
        backed = sum(1 for a in items if a.get("backup_owner"))
        owners = {a.get("owner") for a in items if a.get("owner")}
        doc_score = _pct(documented, total)
        backup_score = _pct(backed, total)
        depth_score = _pct(len(owners), total)
        capability = round(0.4 * doc_score + 0.35 * backup_score + 0.25 * depth_score)
        band = "STRONG" if capability >= 70 else ("DEVELOPING" if capability >= 45 else "AT RISK")
        rows.append({"dept": dept, "assets": total, "documentation": doc_score,
                     "continuity": backup_score, "ownership_depth": depth_score,
                     "capability": capability, "band": band})

    rows.sort(key=lambda r: -r["capability"])
    org_capability = round(sum(r["capability"] for r in rows) / len(rows)) if rows else 0
    strengths = [r["dept"] for r in rows if r["band"] == "STRONG"]
    gaps = [r["dept"] for r in rows if r["band"] == "AT RISK"]
    return {"rows": rows, "org_capability": org_capability, "strengths": strengths, "gaps": gaps}


def display_capability_report(summary, company):
    console.print(f"\nM39 - CAPABILITY INTELLIGENCE - {company}\n")
    console.print("Scores each department's ability to sustain its AI-augmented operations.\n")
    console.print(f"ORGANIZATIONAL CAPABILITY INDEX: {summary['org_capability']}/100")
    console.print(f"Strengths: {', '.join(summary['strengths']) or 'none'}")
    console.print(f"Capability gaps: {', '.join(summary['gaps']) or 'none'}\n")
    t = Table(title="Capability by department")
    for c in ("Department", "Assets", "Docs", "Continuity", "Depth", "Capability", "Band"):
        t.add_column(c)
    for r in summary["rows"]:
        t.add_row(r["dept"], str(r["assets"]), f"{r['documentation']}%",
                  f"{r['continuity']}%", f"{r['ownership_depth']}%",
                  f"{r['capability']}/100", r["band"])
    console.print(t)
    console.print("")
