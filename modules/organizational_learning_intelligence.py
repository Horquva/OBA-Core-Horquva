"""
M17 - Organizational Learning Intelligence
Horquva | AI/ML Prediction Layer (Tahir)

Purpose:
    Enable the system to LEARN from the organization's current state and
    surface where it should improve next:

    1. Learn from Failure Patterns - which assets are failure-prone
       (undocumented + unbacked + critical) and likely repeat offenders?
    2. Learn from Decisions        - how many known risks are still unmitigated
       (critical assets without backup / docs)?
    3. Learn from Incident Exposure - which departments are most incident-prone
       (weakest documentation + backup coverage)?

    Produces an overall Learning Maturity score reflecting how much
    institutional knowledge has been captured and acted upon.

    NOTE: This console build derives learning signals from the organizational
    snapshot (data/sunrise_care.json). In the hosted platform these same
    signals are continuously fed by failure_logs / incident_logs / decision
    history tables.
"""

import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class LearningReport:
    maturity_score: int
    maturity_level: str
    failure_prone: list = field(default_factory=list)
    unmitigated: list = field(default_factory=list)
    dept_exposure: list = field(default_factory=list)
    insights: list = field(default_factory=list)


def _maturity_level(score: int) -> str:
    if score >= 80:
        return "ADVANCED"
    if score >= 55:
        return "DEVELOPING"
    if score >= 30:
        return "EARLY STAGE"
    return "NASCENT"


def run_organizational_learning_intelligence(data_path: str) -> LearningReport:
    with open(data_path) as f:
        data = json.load(f)

    agents = data.get("agents", [])
    tools = data.get("ai_tools", [])
    workflows = data.get("workflows", [])

    # --- Learn from failure patterns -----------------------------------
    failure_prone = []
    for a in agents:
        risk_flags = []
        if not a.get("documented"):
            risk_flags.append("undocumented")
        if not a.get("owner"):
            risk_flags.append("orphaned")
        elif not a.get("backup_owner"):
            risk_flags.append("no backup")
        if a.get("criticality") in ("critical", "high"):
            risk_flags.append(a["criticality"])
        # repeat-offender-like: multiple compounding weaknesses on a key asset
        if a.get("criticality") in ("critical", "high") and len(risk_flags) >= 2:
            failure_prone.append({
                "name": a.get("name"),
                "department": a.get("department", "N/A"),
                "flags": risk_flags,
                "pattern": ("Currently fragile — immediate attention"
                            if "orphaned" in risk_flags else
                            "High likelihood of future failure based on weaknesses"),
            })
    failure_prone.sort(key=lambda x: len(x["flags"]), reverse=True)

    # --- Learn from decisions (mitigation follow-through) --------------
    critical_assets = [a for a in agents if a.get("criticality") in ("critical", "high")]
    unmitigated = []
    for a in critical_assets:
        if not a.get("backup_owner") or not a.get("documented"):
            gaps = []
            if not a.get("backup_owner"):
                gaps.append("no backup owner")
            if not a.get("documented"):
                gaps.append("no documentation")
            unmitigated.append({"name": a.get("name"), "gaps": gaps})
    mitigated = len(critical_assets) - len(unmitigated)
    decision_followthrough = round(mitigated / (len(critical_assets) or 1) * 100)

    # --- Learn from incident exposure by department -------------------
    dept_assets = {}
    for a in agents:
        d = a.get("department", "N/A")
        dept_assets.setdefault(d, []).append(a)
    dept_exposure = []
    for d, items in dept_assets.items():
        weak = len([a for a in items if not a.get("documented") or not a.get("backup_owner")])
        coverage = round((len(items) - weak) / len(items) * 100)
        dept_exposure.append({
            "department": d,
            "assets": len(items),
            "weak": weak,
            "coverage": coverage,
            "exposure": "HIGH" if coverage < 40 else "MEDIUM" if coverage < 70 else "LOW",
        })
    dept_exposure.sort(key=lambda x: x["coverage"])

    # --- Overall learning maturity ------------------------------------
    documented_assets = len([a for a in agents if a.get("documented")]) \
        + len([t for t in tools if t.get("documented")]) \
        + len([w for w in workflows if w.get("documented")])
    total_assets = (len(agents) + len(tools) + len(workflows)) or 1
    knowledge_capture = round(documented_assets / total_assets * 100)
    maturity_score = round(knowledge_capture * 0.5 + decision_followthrough * 0.5)

    insights = [
        f"Knowledge capture: {knowledge_capture}% of all assets are documented",
        f"Decision follow-through: {decision_followthrough}% of critical assets are mitigated",
        (f"{len(failure_prone)} failure-prone critical assets show repeatable weakness patterns"
         if failure_prone else "No repeat failure patterns detected"),
        (f"Most incident-prone area: {dept_exposure[0]['department']} "
         f"({dept_exposure[0]['coverage']}% coverage)" if dept_exposure else "No department exposure"),
    ]

    return LearningReport(
        maturity_score=maturity_score,
        maturity_level=_maturity_level(maturity_score),
        failure_prone=failure_prone,
        unmitigated=unmitigated,
        dept_exposure=dept_exposure,
        insights=insights,
    )


def display_organizational_learning_report(report: LearningReport, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 17 - ORGANIZATIONAL LEARNING INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE,
    ))

    color = "green" if report.maturity_score >= 70 else "yellow" if report.maturity_score >= 40 else "red"
    console.print(Panel(
        f"[bold]Learning Maturity:[/bold] [{color}]{report.maturity_score}/100 — {report.maturity_level}[/{color}]",
        title="[bold]How well is the organization learning?[/bold]",
        box=box.ROUNDED,
    ))

    if report.failure_prone:
        t = Table(title="Learn from Failures - Failure-Prone Assets", box=box.SIMPLE_HEAVY, show_lines=True)
        t.add_column("Asset", style="white", min_width=22)
        t.add_column("Dept", min_width=11)
        t.add_column("Weakness Pattern", min_width=28)
        t.add_column("Prediction", min_width=30)
        for fp in report.failure_prone:
            t.add_row(f"[bold]{fp['name']}[/bold]", fp["department"],
                      ", ".join(fp["flags"]), fp["pattern"])
        console.print(t)

    dt = Table(title="Learn from Incidents - Department Exposure", box=box.SIMPLE_HEAVY, show_lines=True)
    dt.add_column("Department", style="white", min_width=12)
    dt.add_column("Assets", justify="center")
    dt.add_column("Weak", justify="center")
    dt.add_column("Coverage", justify="center")
    dt.add_column("Exposure", justify="center")
    exp_color = {"HIGH": "bold red", "MEDIUM": "yellow", "LOW": "green"}
    for d in report.dept_exposure:
        ec = exp_color.get(d["exposure"], "white")
        dt.add_row(f"[bold]{d['department']}[/bold]", str(d["assets"]), str(d["weak"]),
                   f"[{ec}]{d['coverage']}%[/{ec}]", f"[{ec}]{d['exposure']}[/{ec}]")
    console.print(dt)

    console.print("\n[bold]Learning insights:[/bold]")
    for s in report.insights:
        console.print(f"  - {s}")


if __name__ == "__main__":
    rep = run_organizational_learning_intelligence("data/sunrise_care.json")
    display_organizational_learning_report(rep, "Sunrise Care")
