"""
M13 - Human-AI Collaboration Intelligence
Horquva | AI/ML Prediction Layer (Tahir)

Purpose:
    Analyze the HUMAN side of the AI ecosystem:

    1. AI Adoption Score    - How broadly is the workforce engaging with AI?
    2. AI Dependency Score  - Are individuals becoming over-relied-upon
                              (too many critical agents/workflows on one person)?
    3. Collaboration Score  - How effective is human-agent pairing
                              (documented + backed-up ownership)?

    Also surfaces the people at highest dependency risk and the departments
    with the weakest human-AI coverage.
"""

import io
import json
import sys
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class CollaborationReport:
    adoption_score: int
    dependency_score: int
    collaboration_score: int
    people: list
    dept_adoption: list
    signals: list


def _level(score: int, bands: list[tuple[int, str]]) -> str:
    for threshold, label in bands:
        if score >= threshold:
            return label
    return bands[-1][1]


def run_human_ai_collaboration_intelligence(data_path: str) -> CollaborationReport:
    with open(data_path) as f:
        data = json.load(f)

    agents = data.get("agents", [])
    tools = data.get("ai_tools", [])
    workflows = data.get("workflows", [])

    # --- Build the people universe from named roles across the org ------
    people = set()
    for a in agents:
        if a.get("owner"):
            people.add(a["owner"])
        if a.get("backup_owner"):
            people.add(a["backup_owner"])
    for wf in workflows:
        if wf.get("owner"):
            people.add(wf["owner"])
        if wf.get("backup_owner"):
            people.add(wf["backup_owner"])
    for t in tools:
        for u in t.get("users", []):
            people.add(u)
        if t.get("access_owner"):
            people.add(t["access_owner"])
    total_people = len(people) or 1

    # --- 1. AI ADOPTION -------------------------------------------------
    tool_users = set()
    for t in tools:
        tool_users.update(t.get("users", []))
    adoption_score = round(len(tool_users & people) / total_people * 100)

    all_departments = set()
    for a in agents:
        if a.get("department"):
            all_departments.add(a["department"])
    for wf in workflows:
        if wf.get("department"):
            all_departments.add(wf["department"])
    covered_departments = set()
    for t in tools:
        covered_departments.update(t.get("departments", []))
    dept_adoption = sorted(
        ({"department": d, "covered": d in covered_departments} for d in all_departments),
        key=lambda x: (x["covered"], x["department"]),
    )

    # --- 2. AI DEPENDENCY (per person concentration) -------------------
    crit_wf_owner_count = {}
    for wf in workflows:
        if wf.get("criticality") in ("critical", "high") and wf.get("owner"):
            crit_wf_owner_count[wf["owner"]] = crit_wf_owner_count.get(wf["owner"], 0) + 1

    owned_agents = {}
    crit_agents = {}
    for a in agents:
        o = a.get("owner")
        if not o:
            continue
        owned_agents[o] = owned_agents.get(o, 0) + 1
        if a.get("criticality") in ("critical", "high"):
            crit_agents[o] = crit_agents.get(o, 0) + 1

    people_rows = []
    for person in sorted(people):
        n_agents = owned_agents.get(person, 0)
        n_crit = crit_agents.get(person, 0)
        n_crit_wf = crit_wf_owner_count.get(person, 0)
        dep = min((n_crit * 18) + (n_crit_wf * 12) + (10 if n_agents >= 4 else 5 if n_agents >= 3 else 0), 100)
        people_rows.append({
            "person": person,
            "agents_owned": n_agents,
            "critical_agents": n_crit,
            "critical_workflows": n_crit_wf,
            "dependency_score": dep,
            "level": _level(dep, [(75, "CRITICAL"), (50, "HIGH"), (25, "MODERATE"), (0, "HEALTHY")]),
        })
    people_rows.sort(key=lambda r: r["dependency_score"], reverse=True)
    owners_only = [r for r in people_rows if r["agents_owned"] > 0] or people_rows
    dependency_score = round(sum(r["dependency_score"] for r in owners_only) / len(owners_only))

    # --- 3. COLLABORATION EFFECTIVENESS --------------------------------
    well_paired = len([a for a in agents if a.get("documented") and a.get("backup_owner")])
    collaboration_score = round(well_paired / (len(agents) or 1) * 100)

    signals = [
        ("Low AI adoption — most named staff are not active AI users"
         if adoption_score < 50 else
         "Growing adoption — room to scale across departments"
         if adoption_score < 75 else
         "Strong AI adoption across the workforce"),
        ("Dangerous human dependency concentration detected"
         if dependency_score >= 50 else
         "Some knowledge silos — spread critical ownership wider"
         if dependency_score >= 25 else
         "Human dependency is well balanced"),
        ("Weak human-agent pairing — most agents lack docs or backup"
         if collaboration_score < 40 else
         "Collaboration improving but inconsistent"
         if collaboration_score < 70 else
         "Effective, well-documented human-agent collaboration"),
    ]

    return CollaborationReport(
        adoption_score=adoption_score,
        dependency_score=dependency_score,
        collaboration_score=collaboration_score,
        people=people_rows,
        dept_adoption=dept_adoption,
        signals=signals,
    )


def display_human_ai_collaboration_report(report: CollaborationReport, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 13 - HUMAN-AI COLLABORATION INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE,
    ))

    def col(s, invert=False):
        good = s < 50 if invert else s >= 70
        mid = (25 <= s < 50) if invert else (50 <= s < 70)
        return "green" if good else "yellow" if mid else "red"

    a, d, c = report.adoption_score, report.dependency_score, report.collaboration_score
    console.print(Panel(
        f"[bold]AI Adoption:[/bold] [{col(a)}]{a}/100[/{col(a)}]    "
        f"[bold]Human Dependency:[/bold] [{col(d, invert=True)}]{d}/100[/{col(d, invert=True)}]    "
        f"[bold]Collaboration:[/bold] [{col(c)}]{c}/100[/{col(c)}]",
        title="[bold]Human-AI Scorecard[/bold]",
        box=box.ROUNDED,
    ))

    table = Table(title="Human Dependency Concentration", box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Person", style="white", min_width=12)
    table.add_column("Agents", justify="center")
    table.add_column("Critical Agents", justify="center")
    table.add_column("Critical WF", justify="center")
    table.add_column("Dependency", justify="center")
    table.add_column("Level", justify="center")
    level_color = {"CRITICAL": "bold red", "HIGH": "red", "MODERATE": "yellow", "HEALTHY": "green"}
    for r in report.people:
        if r["agents_owned"] == 0 and r["dependency_score"] == 0:
            continue
        lc = level_color.get(r["level"], "white")
        table.add_row(
            f"[bold]{r['person']}[/bold]", str(r["agents_owned"]), str(r["critical_agents"]),
            str(r["critical_workflows"]), f"[{lc}]{r['dependency_score']}/100[/{lc}]",
            f"[{lc}]{r['level']}[/{lc}]",
        )
    console.print(table)

    uncovered = [d["department"] for d in report.dept_adoption if not d["covered"]]
    if uncovered:
        console.print(f"\n[yellow]Departments with no dedicated AI tool coverage:[/yellow] {', '.join(uncovered)}")

    console.print("\n[bold]Signals:[/bold]")
    for s in report.signals:
        console.print(f"  - {s}")


if __name__ == "__main__":
    rep = run_human_ai_collaboration_intelligence("data/company.json")
    with open("data/company.json") as f:
        company_name = json.load(f)["company"]
    display_human_ai_collaboration_report(rep, company_name)
