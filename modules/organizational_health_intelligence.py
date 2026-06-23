import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


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
    crit_unbacked = sum(1 for a in assets if (a.get("criticality") or "").lower() == "critical" and not a.get("backup_owner"))

    dims = {
        "Documentation": _pct(documented, total),
        "Continuity (backups)": _pct(backed, total),
        "Ownership spread": _pct(len(owners), total),
        "Critical safety": _pct(total - crit_unbacked, total),
    }
    index = round(sum(dims.values()) / len(dims))
    state = "CRITICAL" if index < 40 else ("WARNING" if index < 60 else "STABLE")

    hist = data.get("history", [])
    trend = "flat"
    if len(hist) >= 2:
        delta = hist[0].get("risk_index", 0) - hist[-1].get("risk_index", 0)
        trend = "improving" if delta > 0 else ("declining" if delta < 0 else "flat")
    summary = {"index": index, "state": state, "dims": dims, "trend": trend, "history": hist}
    return summary


def display_organizational_health(summary, company):
    console.print(f"\nM25 · ORGANIZATIONAL HEALTH INTELLIGENCE — {company}\n")
    console.print("A single composite health index across all resilience dimensions, with trend.\n")
    console.print(f"ORGANIZATIONAL HEALTH INDEX: {summary['index']}/100 — {summary['state']}  (trend: {summary['trend']})")
    t = Table(title="Health by dimension")
    t.add_column("Dimension"); t.add_column("Score")
    for k, v in summary["dims"].items():
        t.add_row(k, f"{v}/100")
    console.print(t)
    if summary["history"]:
        line = "  ".join(f"{h['month']}:{h['risk_index']}" for h in summary["history"])
        console.print(f"\nRisk-index trend (lower is better): {line}")
    console.print("")
