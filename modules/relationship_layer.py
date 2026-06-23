import io
import json
import sys
from collections import Counter
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

RELATIONSHIP_TYPES = ["owns", "depends_on", "governs", "collaborates_with"]


@dataclass
class Relationship:
    rel_type: str
    source: str
    target: str
    detail: str = ""


def run_relationship_layer(path: str):
    """Relationship Layer (Huzaifa) — defines how every entity connects."""
    with open(path) as f:
        data = json.load(f)

    rels: list[Relationship] = []
    agent_by_id = {a["id"]: a for a in data.get("agents", [])}

    # owns: owner -> asset
    for a in data.get("agents", []):
        if a.get("owner"):
            rels.append(Relationship("owns", a["owner"], a["name"], "AI agent"))
    for wf in data.get("workflows", []):
        if wf.get("owner"):
            rels.append(Relationship("owns", wf["owner"], wf["name"], "workflow"))
    for t in data.get("ai_tools", []):
        if t.get("access_owner"):
            rels.append(Relationship("owns", t["access_owner"], t["name"], "tool access"))

    # depends_on: explicit dependency edges (agent -> agent)
    for d in data.get("dependencies", []):
        src = agent_by_id.get(d.get("from"))
        tgt = agent_by_id.get(d.get("to"))
        if src and tgt:
            rels.append(Relationship("depends_on", src["name"], tgt["name"], d.get("type", "")))

    # depends_on: workflow step sequence (a step relies on the previous actor)
    for wf in data.get("workflows", []):
        steps = wf.get("steps", [])
        for i in range(1, len(steps)):
            prev = steps[i - 1].get("name")
            cur = steps[i].get("name")
            if prev and cur and prev != cur:
                rels.append(Relationship("depends_on", cur, prev, f"step in {wf['name']}"))

    # governs: the owner of an upstream asset governs the assets that depend on it
    for d in data.get("dependencies", []):
        src = agent_by_id.get(d.get("from"))
        tgt = agent_by_id.get(d.get("to"))
        if src and tgt and tgt.get("owner"):
            rels.append(Relationship("governs", tgt["owner"], src["name"], f"controls upstream {tgt['name']}"))

    # collaborates_with: people who share the same tool
    for t in data.get("ai_tools", []):
        users = list(dict.fromkeys(t.get("users", [])))
        for i in range(len(users)):
            for j in range(i + 1, len(users)):
                rels.append(Relationship("collaborates_with", users[i], users[j], f"share {t['name']}"))

    by_type = Counter(r.rel_type for r in rels)
    degree: Counter = Counter()
    for r in rels:
        degree[r.source] += 1
        degree[r.target] += 1

    stats = {
        "total": len(rels),
        "by_type": dict(by_type),
        "hubs": degree.most_common(5),
        "isolated": 0,
    }
    return rels, stats


def display_relationship_report(rels: list, stats: dict, company: str):
    console.print(f"\n\U0001f578\ufe0f  RELATIONSHIP LAYER — Defines How Everything Connects — {company}\n")
    console.print("The graph the Brain navigates when reasoning about the organization.\n")

    table = Table(title="Relationship Types Mapped")
    table.add_column("Relationship")
    table.add_column("Count")
    for t in RELATIONSHIP_TYPES:
        table.add_row(t, str(stats["by_type"].get(t, 0)))
    console.print(table)

    console.print(f"\nTotal relationships mapped: {stats['total']}")

    hub_table = Table(title="Most Connected Entities (graph hubs)")
    hub_table.add_column("Entity")
    hub_table.add_column("Connections")
    for name, deg in stats["hubs"]:
        hub_table.add_row(str(name), str(deg))
    console.print(hub_table)
    console.print("")
