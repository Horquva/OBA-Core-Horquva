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

SEV_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


@dataclass
class Insight:
    theme: str
    statement: str
    severity: str
    reasoning: list
    evidence: list


def _assets(data: dict) -> list[dict]:
    out = []
    for a in data.get("agents", []):
        out.append({"name": a["name"], "type": "AI Agent", "owner": a.get("owner"),
                    "backup": a.get("backup_owner"), "crit": (a.get("criticality") or "medium").lower(),
                    "documented": a.get("documented", False)})
    for wf in data.get("workflows", []):
        out.append({"name": wf["name"], "type": "Workflow", "owner": wf.get("owner"),
                    "backup": wf.get("backup_owner"), "crit": (wf.get("criticality") or "medium").lower(),
                    "documented": wf.get("documented", False)})
    for t in data.get("ai_tools", []):
        out.append({"name": t["name"], "type": "System", "owner": t.get("access_owner"),
                    "backup": t.get("backup_tool"), "crit": (t.get("criticality") or "medium").lower(),
                    "documented": t.get("documented", False)})
    return out


def _dependents_map(data: dict) -> dict:
    name_by_id = {a["id"]: a["name"] for a in data.get("agents", [])}
    deps = defaultdict(list)
    for d in data.get("dependencies", []):
        src = name_by_id.get(d.get("from"))
        tgt = name_by_id.get(d.get("to"))
        if src and tgt:
            deps[tgt].append(src)  # src depends on tgt -> tgt has dependent src
    return deps


def run_reasoning_layer(path: str):
    """Reasoning Layer (Kamran) — transforms raw module signals into understanding."""
    with open(path) as f:
        data = json.load(f)

    assets = _assets(data)
    dependents = _dependents_map(data)

    owner_assets = defaultdict(list)
    for a in assets:
        if a["owner"]:
            owner_assets[a["owner"]].append(a)

    insights: list[Insight] = []

    # Pattern 1 — knowledge concentration around a person
    for owner, owned in sorted(owner_assets.items(), key=lambda kv: -len(kv[1])):
        if len(owned) >= 3:
            undoc = [a["name"] for a in owned if not a["documented"]]
            no_backup = [a["name"] for a in owned if not a["backup"]]
            severity = "CRITICAL" if len(owned) >= 5 else "HIGH"
            insights.append(Insight(
                "Knowledge Concentration",
                f"{owner} is a structural single point of failure — owns {len(owned)} assets",
                severity,
                [f"{owner} owns {len(owned)} assets across the org",
                 f"{len(undoc)} of them are undocumented — knowledge lives only with {owner}",
                 f"{len(no_backup)} have no backup owner — nobody can step in",
                 f"Therefore, if {owner} is unavailable, this capability stops"],
                [a["name"] for a in owned]))

    # Pattern 2 — single point of failure with downstream cascade
    for a in assets:
        if not a["backup"] and a["crit"] == "critical":
            downstream = dependents.get(a["name"], [])
            insights.append(Insight(
                "Single Point of Failure",
                f"{a['name']} is critical, has no backup, and {len(downstream)} asset(s) depend on it",
                "CRITICAL" if downstream else "HIGH",
                [f"{a['name']} is marked critical",
                 f"Owned by {a['owner'] or 'no one'} with no backup owner",
                 f"Downstream impact if it fails: {', '.join(downstream) if downstream else 'no mapped dependents'}"],
                [a["name"]] + downstream))

    # Pattern 3 — compound risk (undocumented AND no backup)
    compound = [a for a in assets if not a["documented"] and not a["backup"]]
    if compound:
        insights.append(Insight(
            "Compound Risk",
            f"{len(compound)} assets are both undocumented AND have no backup — the highest-loss combination",
            "CRITICAL" if len(compound) >= 5 else "HIGH",
            ["Undocumented means the knowledge is not written down",
             "No backup means no second person holds it",
             "Together they guarantee permanent loss if the owner leaves"],
            [a["name"] for a in compound]))

    # Pattern 4 — systemic documentation gap
    undoc_total = [a for a in assets if not a["documented"]]
    if undoc_total:
        pct = int(len(undoc_total) / len(assets) * 100)
        insights.append(Insight(
            "Systemic Documentation Gap",
            f"{pct}% of all assets ({len(undoc_total)}/{len(assets)}) are undocumented",
            "HIGH" if pct >= 40 else "MEDIUM",
            ["Documentation is the cheapest form of resilience",
             f"At {pct}% undocumented, the organization is one resignation away from capability loss",
             "Reasoning concludes: documentation should be the first remediation, before tooling"],
            [a["name"] for a in undoc_total[:8]]))

    insights.sort(key=lambda i: SEV_ORDER.get(i.severity, 0), reverse=True)

    summary = {
        "insights": len(insights),
        "critical": sum(1 for i in insights if i.severity == "CRITICAL"),
        "high": sum(1 for i in insights if i.severity == "HIGH"),
        "themes": sorted({i.theme for i in insights}),
    }
    return insights, summary


def display_reasoning_report(insights: list, summary: dict, company: str):
    console.print(f"\n\U0001f9e0  REASONING LAYER — Turns Signals Into Understanding — {company}\n")
    console.print("Raw module signals are just facts. The Reasoning Layer connects them into")
    console.print("insight — the 'so what' and the 'why' behind the numbers.\n")

    table = Table(title="Reasoned Insights")
    table.add_column("Theme")
    table.add_column("Severity")
    table.add_column("Insight")
    for i in insights[:10]:
        table.add_row(i.theme, i.severity, i.statement)
    console.print(table)

    console.print(f"\nInsights generated: {summary['insights']}  ·  CRITICAL: {summary['critical']}  ·  HIGH: {summary['high']}")
    console.print(f"Themes reasoned about: {', '.join(summary['themes'])}")

    if insights:
        top = insights[0]
        console.print(f"\nReasoning chain — {top.theme}: {top.statement}")
        for step in top.reasoning:
            console.print(f"   → {step}")
    console.print("")
