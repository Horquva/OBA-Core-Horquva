import json
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


@dataclass
class VerificationRecord:
    action_id: str
    actor_type: str        # 'human', 'agent', 'tool', 'workflow'
    actor_name: str
    action: str
    workflow_id: str
    status: str            # 'completed', 'pending', 'failed', 'flagged'
    policy_compliant: bool
    verified: bool
    flag_reason: str


def verify_action(actor_type: str, actor_name: str, action: str, workflow_id: str) -> VerificationRecord:
    """
    Takes an action and creates a verification record for it.
    Flags it if it looks risky.
    """
    flag_reason = ""
    policy_compliant = True
    verified = True
    status = "completed"

    # Flag if actor has no backup (single point of failure)
    risky_actors = ["Robert"]  # from sunrise_care data — owns 5 agents, no backup
    if actor_name in risky_actors and actor_type == "human":
        flag_reason = f"{actor_name} is a single point of failure with no backup owner"
        policy_compliant = False
        status = "flagged"

    # Flag undocumented agents acting in workflows
    if actor_type == "agent" and "undocumented" in action.lower():
        flag_reason = "Agent is undocumented — action cannot be fully verified"
        verified = False
        status = "flagged"

    return VerificationRecord(
        action_id=str(uuid.uuid4()),
        actor_type=actor_type,
        actor_name=actor_name,
        action=action,
        workflow_id=workflow_id,
        status=status,
        policy_compliant=policy_compliant,
        verified=verified,
        flag_reason=flag_reason,
    )


def run_verification_intelligence(data_path: str) -> list[VerificationRecord]:
    """
    Loops through all workflow steps in sunrise_care.json
    and creates a verification record for each action.
    """
    with open(data_path) as f:
        data = json.load(f)

    agent_map = {a["id"]: a["name"] for a in data.get("agents", [])}
    records = []

    for wf in data.get("workflows", []):
        for step in wf.get("steps", []):
            actor_name = step["name"]

            # Resolve agent ID to agent name
            if step["actor"] == "agent" and actor_name in agent_map:
                actor_name = agent_map[actor_name]

            record = verify_action(
                actor_type=step["actor"],
                actor_name=actor_name,
                action=step["action"],
                workflow_id=wf["id"],
            )
            records.append(record)

    return records


def display_verification_report(records: list[VerificationRecord], company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 15 — VERIFICATION INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Actor", min_width=25)
    table.add_column("Type", justify="center", min_width=8)
    table.add_column("Action", min_width=35)
    table.add_column("Workflow", min_width=10)
    table.add_column("Status", justify="center", min_width=10)
    table.add_column("Verified", justify="center", min_width=9)
    table.add_column("Compliant", justify="center", min_width=10)

    status_colors = {
        "completed": "green",
        "flagged": "bold red",
        "failed": "red",
        "pending": "yellow",
    }

    for r in records:
        color = status_colors.get(r.status, "white")
        table.add_row(
            r.actor_name,
            r.actor_type,
            r.action,
            r.workflow_id,
            f"[{color}]{r.status.upper()}[/{color}]",
            "[green]YES[/green]" if r.verified else "[red]NO[/red]",
            "[green]YES[/green]" if r.policy_compliant else "[red]NO[/red]",
        )

    console.print(table)

    # Summary
    total = len(records)
    flagged = [r for r in records if r.status == "flagged"]
    unverified = [r for r in records if not r.verified]
    non_compliant = [r for r in records if not r.policy_compliant]

    console.print(Panel(
        f"[bold]Total Actions Verified:[/bold] {total}\n"
        f"[bold red]Flagged:[/bold red] {len(flagged)}\n"
        f"[bold yellow]Unverified:[/bold yellow] {len(unverified)}\n"
        f"[bold red]Policy Violations:[/bold red] {len(non_compliant)}",
        title="[bold]Verification Summary[/bold]",
        box=box.ROUNDED
    ))

    if flagged:
        console.print("\n[bold red]Flagged Actions:[/bold red]")
        for r in flagged:
            console.print(f"  - [{r.actor_type}] {r.actor_name} | {r.action}")
            console.print(f"    Reason: {r.flag_reason}")


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        company = json.load(f)["company"]
    records = run_verification_intelligence("data/sunrise_care.json")
    display_verification_report(records, company)