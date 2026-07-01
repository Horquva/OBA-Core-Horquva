import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_opportunity_intelligence(path):
    """M38 - Opportunity Intelligence.
    Surfaces concrete improvement opportunities: documentation gaps to close,
    cost optimisation on AI tooling, and cross-training to remove single points
    of failure. Each opportunity is scored by impact vs effort.
    """
    with open(path) as f:
        data = json.load(f)

    opps = []
    assets = data.get("agents", []) + data.get("workflows", [])

    # 1. Documentation opportunities on critical undocumented assets
    undoc = [a for a in assets if not a.get("documented", False)
             and (a.get("criticality") or "").lower() in ("critical", "high")]
    if undoc:
        opps.append({"opportunity": "Document critical assets",
                     "detail": ", ".join(a.get("name", "?") for a in undoc[:5]),
                     "impact": "HIGH", "effort": "LOW", "count": len(undoc)})

    # 2. Cost optimisation on AI tools (high cost, few users)
    for tool in data.get("ai_tools", []):
        cost = tool.get("monthly_cost_usd", 0)
        users = len(tool.get("users", [])) or tool.get("users", 0) if isinstance(tool.get("users"), list) else tool.get("users", 0)
        users = users if isinstance(users, int) else len(tool.get("users", []))
        if cost and users and (cost / max(users, 1)) > 150:
            opps.append({"opportunity": f"Optimise spend on {tool.get('name')}",
                         "detail": f"${cost}/mo for {users} users (${round(cost/max(users,1))}/user)",
                         "impact": "MEDIUM", "effort": "LOW", "count": 1})

    # 3. Cross-training opportunities (single-holder critical knowledge)
    single = [ka for ka in data.get("knowledge_areas", [])
              if ka.get("criticality") in ("critical", "high") and len(ka.get("holders", [])) == 1]
    for ka in single:
        opps.append({"opportunity": f"Cross-train on '{ka.get('area')}'",
                     "detail": f"Only holder: {ka.get('holders', ['?'])[0]}",
                     "impact": "HIGH", "effort": "MEDIUM", "count": 1})

    # 4. Backup owner opportunities
    no_backup = [a for a in assets if not a.get("backup_owner")
                 and (a.get("criticality") or "").lower() == "critical"]
    if no_backup:
        opps.append({"opportunity": "Assign backup owners to critical assets",
                     "detail": ", ".join(a.get("name", "?") for a in no_backup[:5]),
                     "impact": "HIGH", "effort": "LOW", "count": len(no_backup)})

    # priority = impact high & effort low first
    rank = {("HIGH", "LOW"): 0, ("HIGH", "MEDIUM"): 1, ("MEDIUM", "LOW"): 2}
    opps.sort(key=lambda o: rank.get((o["impact"], o["effort"]), 5))
    quick_wins = [o for o in opps if o["impact"] == "HIGH" and o["effort"] == "LOW"]
    return {"opportunities": opps, "quick_wins": len(quick_wins)}


def display_opportunity_report(summary, company):
    console.print(f"\nM38 - OPPORTUNITY INTELLIGENCE - {company}\n")
    console.print("Turns weaknesses into a prioritised, actionable improvement backlog.\n")
    console.print(f"OPPORTUNITIES IDENTIFIED: {len(summary['opportunities'])}  "
                  f"(quick wins: {summary['quick_wins']})\n")
    if not summary["opportunities"]:
        console.print("No open opportunities. Organization is well optimised.\n")
        return
    t = Table(title="Prioritised opportunity backlog")
    t.add_column("Impact"); t.add_column("Effort"); t.add_column("Opportunity"); t.add_column("Detail")
    for o in summary["opportunities"]:
        t.add_row(o["impact"], o["effort"], o["opportunity"], o["detail"])
    console.print(t)
    console.print("")
