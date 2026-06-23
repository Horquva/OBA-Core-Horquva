import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_executive_memory(path):
    with open(path) as f:
        data = json.load(f)
    incidents = data.get("incidents", [])
    decisions = data.get("decisions_log", [])

    memory = []  # (relevance, kind, text)
    # recurring incident patterns by type
    by_type = Counter(i.get("type") for i in incidents)
    for typ, n in by_type.most_common():
        if n >= 2:
            memory.append(("HIGH", "pattern", f"'{typ}' incidents happened {n} times — recurring, not one-off"))
    # critical incidents and their lessons
    for i in incidents:
        if i.get("impact") == "critical":
            memory.append(("HIGH", "lesson", f"{i['entity']} ({i['date']}): {i.get('lesson','')}"))
    # decisions that went bad
    for d in decisions:
        if d.get("outcome") == "negative":
            memory.append(("MEDIUM", "decision", f"Decision '{d['decision']}' ({d['area']}) turned out negative"))
    # owners repeatedly resolving incidents (hero dependency)
    resolver = Counter(i.get("resolved_by") for i in incidents if i.get("resolved_by"))
    for person, n in resolver.most_common(2):
        if n >= 2:
            memory.append(("MEDIUM", "hero-risk", f"{person} personally resolved {n} incidents — hero dependency"))
    summary = {"items": len(memory), "incidents": len(incidents), "memory": memory}
    return summary


def display_executive_memory(summary, company):
    console.print(f"\nM26 · EXECUTIVE MEMORY INTELLIGENCE — {company}\n")
    console.print("Remembers what leadership should not forget — patterns, lessons, and past mistakes.\n")
    console.print(f"Incidents on record: {summary['incidents']} · memory items surfaced: {summary['items']}")
    t = Table(title="What executives should remember")
    t.add_column("Relevance"); t.add_column("Kind"); t.add_column("Memory")
    for rel, kind, text in summary["memory"][:10]:
        t.add_row(rel, kind, text)
    console.print(t)
    console.print("")
