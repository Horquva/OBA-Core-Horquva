import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def _baseline(assets):
    total = len(assets) or 1
    documented = sum(1 for a in assets if a.get("documented", False))
    backed = sum(1 for a in assets if a.get("backup_owner"))
    return round(100 * (0.5 * documented + 0.5 * backed) / total)


def run_simulation_universe(path):
    """M54 - Simulation Universe.
    Runs a whole 'universe' of what-if scenarios in parallel (key-person loss,
    top-owner loss, critical-tool outage, mass undocumented failure) and ranks
    them by resilience impact so leadership can see worst-case exposure at once.
    """
    with open(path) as f:
        data = json.load(f)

    assets = data.get("agents", []) + data.get("workflows", [])
    baseline = _baseline(assets)
    scenarios = []

    # Scenario A: each top owner leaves
    owners = {}
    for a in assets:
        o = a.get("owner")
        if o:
            owners.setdefault(o, []).append(a)
    for owner, owned in sorted(owners.items(), key=lambda kv: -len(kv[1]))[:3]:
        lost_crit = sum(1 for a in owned if (a.get("criticality") or "").lower() == "critical"
                        and not a.get("backup_owner"))
        impact = round(100 * lost_crit / (len(assets) or 1))
        scenarios.append({"scenario": f"Key person leaves: {owner}",
                          "assets_hit": len(owned), "unrecoverable": lost_crit,
                          "resilience_drop": impact})

    # Scenario B: critical tool outage
    for tool in data.get("ai_tools", []):
        if (tool.get("criticality") or "").lower() == "critical" and not tool.get("backup_tool"):
            dep = len(tool.get("workflows", [])) + len(tool.get("agents_using", []))
            scenarios.append({"scenario": f"Critical tool outage: {tool.get('name')}",
                              "assets_hit": dep, "unrecoverable": dep,
                              "resilience_drop": min(100, dep * 8)})

    # Scenario C: mass undocumented-loss shock
    undoc_crit = [a for a in assets if not a.get("documented", False)
                  and (a.get("criticality") or "").lower() in ("critical", "high")]
    scenarios.append({"scenario": "Documentation loss shock",
                      "assets_hit": len(undoc_crit), "unrecoverable": len(undoc_crit),
                      "resilience_drop": min(100, len(undoc_crit) * 10)})

    scenarios.sort(key=lambda s: -s["resilience_drop"])
    worst = scenarios[0] if scenarios else None
    survivability = max(0, baseline - (worst["resilience_drop"] if worst else 0))
    return {"baseline": baseline, "scenarios": scenarios, "worst": worst,
            "survivability": survivability}


def display_simulation_universe(summary, company):
    console.print(f"\nM54 - SIMULATION UNIVERSE - {company}\n")
    console.print("Runs many what-if scenarios at once and ranks worst-case resilience impact.\n")
    console.print(f"Baseline resilience: {summary['baseline']}/100 | "
                  f"Worst-case survivability: {summary['survivability']}/100")
    if summary["worst"]:
        console.print(f"Worst-case scenario: {summary['worst']['scenario']} "
                      f"(-{summary['worst']['resilience_drop']} pts)\n")
    t = Table(title="Scenario universe (ranked by impact)")
    t.add_column("Scenario"); t.add_column("Assets hit"); t.add_column("Unrecoverable"); t.add_column("Resilience drop")
    for s in summary["scenarios"]:
        t.add_row(s["scenario"], str(s["assets_hit"]), str(s["unrecoverable"]), f"-{s['resilience_drop']}")
    console.print(t)
    console.print("")
