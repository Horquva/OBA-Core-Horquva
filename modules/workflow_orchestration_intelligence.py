import json
import uuid
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


@dataclass
class OrchestrationState:
    workflow_id: str
    workflow_name: str
    current_step: int
    total_steps: int
    next_actor_type: str
    next_actor_name: str
    status: str               # 'running', 'paused', 'completed', 'blocked'
    collision_detected: bool
    collision_detail: str


@dataclass
class CollisionReport:
    workflow_id_1: str
    workflow_name_1: str
    workflow_id_2: str
    workflow_name_2: str
    shared_actor_type: str
    shared_actor_name: str
    conflict: str


def detect_collisions(workflows: list[dict], agent_map: dict) -> list[CollisionReport]:
    """
    Checks if two workflows are trying to use the same
    human, agent, or tool at the same time — collision risk.
    """
    # Build a map: actor_name -> list of workflows using it
    actor_usage: dict[str, list[dict]] = {}

    for wf in workflows:
        for step in wf.get("steps", []):
            actor_name = step["name"]
            if step["actor"] == "agent" and actor_name in agent_map:
                actor_name = agent_map[actor_name]

            key = f"{step['actor']}::{actor_name}"
            actor_usage.setdefault(key, [])
            actor_usage[key].append(wf)

    collisions = []
    for key, wf_list in actor_usage.items():
        # If more than one workflow uses the same actor — collision risk
        unique_wfs = {wf["id"]: wf for wf in wf_list}
        if len(unique_wfs) > 1:
            actor_type, actor_name = key.split("::", 1)
            wf_ids = list(unique_wfs.values())
            # Report each pair
            for i in range(len(wf_ids)):
                for j in range(i + 1, len(wf_ids)):
                    collisions.append(CollisionReport(
                        workflow_id_1=wf_ids[i]["id"],
                        workflow_name_1=wf_ids[i]["name"],
                        workflow_id_2=wf_ids[j]["id"],
                        workflow_name_2=wf_ids[j]["name"],
                        shared_actor_type=actor_type,
                        shared_actor_name=actor_name,
                        conflict=f"{actor_name} is used in both workflows — risk of duplication or overload",
                    ))

    return collisions


def orchestrate_workflow(wf: dict, agent_map: dict, collisions: list[CollisionReport]) -> OrchestrationState:
    """
    For a given workflow, determines current step,
    next actor, and whether it is blocked by a collision.
    """
    steps = wf.get("steps", [])
    total_steps = len(steps)

    if total_steps == 0:
        return OrchestrationState(
            workflow_id=wf["id"],
            workflow_name=wf["name"],
            current_step=0,
            total_steps=0,
            next_actor_type="none",
            next_actor_name="none",
            status="blocked",
            collision_detected=False,
            collision_detail="",
        )

    # Simulate: current step is step 1 (workflow just started)
    current_step = 1
    next_step = steps[current_step - 1]  # index 0

    next_actor_name = next_step["name"]
    if next_step["actor"] == "agent" and next_actor_name in agent_map:
        next_actor_name = agent_map[next_actor_name]

    # Check if this workflow has any collision
    wf_collisions = [c for c in collisions if c.workflow_id_1 == wf["id"] or c.workflow_id_2 == wf["id"]]
    collision_detected = len(wf_collisions) > 0
    collision_detail = wf_collisions[0].conflict if wf_collisions else ""

    status = "blocked" if collision_detected else "running"

    return OrchestrationState(
        workflow_id=wf["id"],
        workflow_name=wf["name"],
        current_step=current_step,
        total_steps=total_steps,
        next_actor_type=next_step["actor"],
        next_actor_name=next_actor_name,
        status=status,
        collision_detected=collision_detected,
        collision_detail=collision_detail,
    )


def run_workflow_orchestration_intelligence(data_path: str):
    with open(data_path) as f:
        data = json.load(f)

    agent_map = {a["id"]: a["name"] for a in data.get("agents", [])}
    workflows = data.get("workflows", [])

    collisions = detect_collisions(workflows, agent_map)
    states = [orchestrate_workflow(wf, agent_map, collisions) for wf in workflows]

    return states, collisions


def display_orchestration_report(states: list[OrchestrationState], collisions: list[CollisionReport], company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 16 — WORKFLOW ORCHESTRATION INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    # Orchestration State Table
    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Workflow", min_width=28)
    table.add_column("Step", justify="center", min_width=6)
    table.add_column("Total Steps", justify="center", min_width=12)
    table.add_column("Next Actor Type", justify="center", min_width=15)
    table.add_column("Next Actor", min_width=20)
    table.add_column("Status", justify="center", min_width=10)
    table.add_column("Collision", justify="center", min_width=10)

    status_colors = {
        "running": "green",
        "blocked": "bold red",
        "paused": "yellow",
        "completed": "cyan",
    }

    for s in states:
        color = status_colors.get(s.status, "white")
        table.add_row(
            s.workflow_name,
            str(s.current_step),
            str(s.total_steps),
            s.next_actor_type,
            s.next_actor_name,
            f"[{color}]{s.status.upper()}[/{color}]",
            "[bold red]YES[/bold red]" if s.collision_detected else "[green]NO[/green]",
        )

    console.print(table)

    # Collision Report
    if collisions:
        console.print(Panel("[bold red]Collision Detection Report[/bold red]", box=box.SIMPLE))

        col_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
        col_table.add_column("Workflow 1", min_width=28)
        col_table.add_column("Workflow 2", min_width=28)
        col_table.add_column("Shared Actor Type", justify="center", min_width=16)
        col_table.add_column("Shared Actor", min_width=20)
        col_table.add_column("Conflict", min_width=40)

        for c in collisions:
            col_table.add_row(
                c.workflow_name_1,
                c.workflow_name_2,
                c.shared_actor_type,
                c.shared_actor_name,
                c.conflict,
            )

        console.print(col_table)

    # Summary
    blocked = [s for s in states if s.status == "blocked"]
    running = [s for s in states if s.status == "running"]

    console.print(Panel(
        f"[bold]Total Workflows Orchestrated:[/bold] {len(states)}\n"
        f"[bold green]Running:[/bold green] {len(running)}\n"
        f"[bold red]Blocked (collision detected):[/bold red] {len(blocked)}\n"
        f"[bold red]Total Collisions Found:[/bold red] {len(collisions)}",
        title="[bold]Orchestration Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/company.json") as f:
        company = json.load(f)["company"]
    states, collisions = run_workflow_orchestration_intelligence("data/company.json")
    display_orchestration_report(states, collisions, company)