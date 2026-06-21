"""
M12 - Organizational Forecasting Intelligence
Horquva | AI/ML Prediction Layer (Tahir)

Purpose:
    Forecast the FUTURE STATE of the organization across three dimensions and
    project a 30 / 60 / 90 day outlook:

    1. Health Forecast     - Will the agent + tool ecosystem degrade?
    2. Memory Forecast     - Are we at risk of losing institutional knowledge
                             when key owners leave (no backup / no docs)?
    3. Continuity Forecast - Can workflows keep running under stress?
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
class Forecast:
    name: str
    score: int
    label: str
    signals: list
    details: dict


def _health_label(score: int) -> str:
    if score >= 80:
        return "HEALTHY"
    if score >= 60:
        return "STABLE"
    if score >= 40:
        return "AT RISK"
    if score >= 20:
        return "DEGRADING"
    return "CRITICAL"


def _trend(score: int) -> str:
    # simple directional projection from current posture
    if score >= 70:
        return "Stable to improving over the next 90 days"
    if score >= 50:
        return "Early stress signals — likely to slip within 60 days if unaddressed"
    return "On a declining trajectory — material degradation likely within 30 days"


def run_organizational_forecasting_intelligence(data_path: str) -> tuple[list[Forecast], int]:
    with open(data_path) as f:
        data = json.load(f)

    agents = data.get("agents", [])
    tools = data.get("ai_tools", [])
    workflows = data.get("workflows", [])

    total_agents = len(agents) or 1
    total_tools = len(tools) or 1
    total_wf = len(workflows) or 1

    # --- 1. HEALTH FORECAST ---------------------------------------------
    healthy_agents = len([a for a in agents if a.get("criticality") in ("low", "medium")])
    documented_tools = len([t for t in tools if t.get("documented")])
    agent_health = round(healthy_agents / total_agents * 100)
    tool_health = round(documented_tools / total_tools * 100)
    health_score = round(agent_health * 0.6 + tool_health * 0.4)
    health = Forecast(
        name="Health Forecast",
        score=health_score,
        label=_health_label(health_score),
        signals=[
            f"{healthy_agents}/{total_agents} agents are low/medium criticality",
            f"{documented_tools}/{total_tools} AI tools are documented",
            _trend(health_score),
        ],
        details={"agent_health_pct": agent_health, "tool_health_pct": tool_health},
    )

    # --- 2. MEMORY FORECAST ---------------------------------------------
    orphaned = [a for a in agents if not a.get("owner")]
    no_backup = [a for a in agents if a.get("owner") and not a.get("backup_owner")]
    owner_load = {}
    for a in agents:
        if a.get("owner"):
            owner_load[a["owner"]] = owner_load.get(a["owner"], 0) + 1
    concentrations = sorted(
        ({"person": p, "agents": n} for p, n in owner_load.items() if n >= 3),
        key=lambda x: x["agents"], reverse=True,
    )
    at_risk_ids = {a["id"] for a in orphaned} | {a["id"] for a in no_backup}
    memory_score = round((total_agents - len(at_risk_ids)) / total_agents * 100)
    memory = Forecast(
        name="Memory Forecast",
        score=memory_score,
        label=_health_label(memory_score),
        signals=[
            f"{len(orphaned)} orphaned agents (no owner)",
            f"{len(no_backup)} agents have an owner but no backup",
            (f"Knowledge concentrated on: "
             + ", ".join(f"{c['person']} ({c['agents']})" for c in concentrations)) if concentrations
            else "No single-person knowledge concentration",
        ],
        details={"orphaned": [a["name"] for a in orphaned],
                 "no_backup": [a["name"] for a in no_backup],
                 "concentrations": concentrations},
    )

    # --- 3. CONTINUITY FORECAST ----------------------------------------
    crit_w = {"critical": 3, "high": 2, "medium": 1, "low": 1}
    num = 0.0
    den = 0.0
    fragile = []
    for wf in workflows:
        w = crit_w.get(wf.get("criticality"), 1)
        survive = 0
        if wf.get("owner"):
            survive += 50
        if wf.get("backup_owner"):
            survive += 30
        if wf.get("documented"):
            survive += 20
        num += survive * w
        den += 100 * w
        if survive < 60:
            fragile.append(wf.get("name"))
    continuity_score = round(num / den * 100) if den else 100
    continuity = Forecast(
        name="Continuity Forecast",
        score=continuity_score,
        label=_health_label(continuity_score),
        signals=[
            f"{total_wf - len(fragile)}/{total_wf} workflows resilient (owner + backup + docs)",
            ("Fragile workflows: " + ", ".join(fragile)) if fragile else "No fragile workflows",
            _trend(continuity_score),
        ],
        details={"fragile_workflows": fragile},
    )

    forecasts = [health, memory, continuity]
    outlook = round(sum(fc.score for fc in forecasts) / len(forecasts))
    return forecasts, outlook


def display_organizational_forecasting_report(forecasts: list[Forecast], outlook: int, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 12 - ORGANIZATIONAL FORECASTING INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE,
    ))

    o_color = "green" if outlook >= 70 else "yellow" if outlook >= 50 else "red"
    console.print(Panel(
        f"[bold]90-Day Organizational Outlook:[/bold] [{o_color}]{outlook}/100 — {_health_label(outlook)}[/{o_color}]",
        title="[bold]Future State[/bold]",
        box=box.ROUNDED,
    ))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Forecast", style="white", min_width=20)
    table.add_column("Score", justify="center", min_width=10)
    table.add_column("Outlook", justify="center", min_width=12)
    table.add_column("Key Signals", min_width=46)
    for fc in forecasts:
        color = "green" if fc.score >= 70 else "yellow" if fc.score >= 50 else "red"
        table.add_row(
            f"[bold]{fc.name}[/bold]",
            f"[{color}]{fc.score}/100[/{color}]",
            f"[{color}]{fc.label}[/{color}]",
            "\n".join(f"- {s}" for s in fc.signals),
        )
    console.print(table)


if __name__ == "__main__":
    fcs, outlook = run_organizational_forecasting_intelligence("data/sunrise_care.json")
    display_organizational_forecasting_report(fcs, outlook, "Sunrise Care")
