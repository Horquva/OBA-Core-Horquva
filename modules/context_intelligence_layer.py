import io
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class ContextPackage:
    scope: str
    headline: str
    asset_count: int
    risk_count: int
    owners: list
    tools: list
    highlights: list


def run_context_layer(path: str):
    """Context Intelligence Layer (Huzaifa) — real-time context for the Executive Avatar."""
    with open(path) as f:
        data = json.load(f)

    dept = defaultdict(lambda: {"assets": [], "owners": set(), "tools": set(), "risks": []})

    def add_asset(name, owner, department, backup, documented, crit):
        d = department or "Unassigned"
        dept[d]["assets"].append(name)
        if owner:
            dept[d]["owners"].add(owner)
        if not backup or not documented:
            reason = []
            if not backup:
                reason.append("no backup")
            if not documented:
                reason.append("undocumented")
            tag = " + ".join(reason)
            if (crit or "medium").lower() in ("critical", "high"):
                dept[d]["risks"].append(f"{name} ({tag})")

    for a in data.get("agents", []):
        add_asset(a["name"], a.get("owner"), a.get("department"), a.get("backup_owner"),
                  a.get("documented", False), a.get("criticality"))
    for wf in data.get("workflows", []):
        add_asset(wf["name"], wf.get("owner"), wf.get("department"), wf.get("backup_owner"),
                  wf.get("documented", False), wf.get("criticality"))
    for t in data.get("ai_tools", []):
        for d in t.get("departments", []):
            dept[d]["tools"].add(t["name"])

    packages = []
    for scope, info in sorted(dept.items()):
        risk_count = len(info["risks"])
        headline = (
            f"{scope}: {len(info['assets'])} assets, {risk_count} at risk"
            if risk_count else f"{scope}: {len(info['assets'])} assets, stable"
        )
        packages.append(ContextPackage(
            scope=scope,
            headline=headline,
            asset_count=len(info["assets"]),
            risk_count=risk_count,
            owners=sorted(info["owners"]),
            tools=sorted(info["tools"]),
            highlights=info["risks"][:4],
        ))

    # Org-wide executive context package
    total_assets = sum(p.asset_count for p in packages)
    total_risks = sum(p.risk_count for p in packages)
    packages.sort(key=lambda p: p.risk_count, reverse=True)

    summary = {
        "packages": len(packages),
        "total_assets": total_assets,
        "total_risks": total_risks,
        "hottest": packages[0].scope if packages else "—",
    }
    return packages, summary


def display_context_report(packages: list, summary: dict, company: str):
    console.print(f"\n\U0001f9ed  CONTEXT INTELLIGENCE LAYER — Real-Time Executive Context — {company}\n")
    console.print("Packages live organizational context per scope so the Executive Avatar")
    console.print("answers are situationally aware — not generic.\n")

    table = Table(title="Context Packages (by risk)")
    table.add_column("Scope")
    table.add_column("Assets")
    table.add_column("At Risk")
    table.add_column("Owners")
    table.add_column("Tools")
    for p in packages:
        table.add_row(p.scope, str(p.asset_count), str(p.risk_count),
                      str(len(p.owners)), str(len(p.tools)))
    console.print(table)

    console.print(f"\nContext packages built: {summary['packages']} scopes  ·  "
                  f"{summary['total_assets']} assets  ·  {summary['total_risks']} risk items")
    console.print(f"Highest-pressure scope right now: {summary['hottest']}")

    if packages and packages[0].highlights:
        p = packages[0]
        console.print(f"\nContext snapshot — {p.scope}:")
        console.print(f"   Owners: {', '.join(p.owners) if p.owners else '—'}")
        for h in p.highlights:
            console.print(f"   ⚠ {h}")
    console.print("")
